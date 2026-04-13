import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Select, Alert, Tag, Checkbox } from '../../ui/UI.jsx';
import { Card, CardHeader, CardBody, SectionTitle, FieldRow } from '../../ui/Card.jsx';
import AutorizacionModal from '../../auth/AutorizacionModal.jsx';
import {
  getExpediente0080,
  crearExpediente0080,
  actualizarExpediente0080,
  imprimirFormulario,
  imprimirCredencial,
  getDetalleExpediente,
} from '../../../services/api.js';
import { useApp } from '../../../context/AppContext.jsx';
import { today, getEstExp, inRange } from '../../../utils/helpers.js';
import s from './Expediente0080.module.css';

/* ══════════════════════════════════════════════════════════════════
   ACCFRM0080 — Gestión de Expediente individual en una sola asamblea
   Bloque maestro: ACCASAMBLEA  /  Tabla: ACCASAMBLEA

   REGLAS DE NEGOCIO IMPLEMENTADAS (directo del XML):

   R1  ASAMBLEA.KEY-NEXT-ITEM
       Valida asamblea activa en ACCASAMBLEA_ACTUAL donde estado_asamblea='S'.
       Carga tipo_asamblea, fecha_asamblea, display_tipoasamblea.
       Si el accionista ya viene del global → lo carga.

   R2  ESTADO_EXPEDIENTE.KEY-NEXT-ITEM  (p_valida_estado_exp + control downgrade)
       p_valida_estado_exp: valida que el estado exista en ACCESTADO_EXPEDIENTE.
       Si nuevo_estado < global.estado_actual → AUTH 'CAMBIO ESTADO EXPEDIENTE'
       Si estado = 10 (DENEGADO) → ir a bloque ACCASAMBLEA_DENEGADA

   R3  ACCIONISTA.WHEN-VALIDATE-ITEM
       Valida accionista en ACCACCIONISTA (cursor c1).
       Si not found → alerta 101, limpia accionista.
       ACC_VALIDA_ACCIONISTA: si ya existe en asamblea → alerta 103.
       ACC_OBTIENE_NOMBRE: carga nombre (considera acciones preferentes).

   R4  CHECK_CREDENCIAL.WHEN-CHECKBOX-CHANGED
       Si marca ('S') → fecha_credencial = sysdate, usuario_entregacred = USER.
       Si desmarca → alerta FECHACRED: "¿Desea ELIMINAR fecha de entrega?"
         Si acepta → fecha_credencial = null, registra fecha_anulentrega.
         Si rechaza → exit_form.

   R5  CHECK_FEC_RECIBIDO.WHEN-CHECKBOX-CHANGED
       SOLO si estado_expediente = 2:
         Si marca → fecha_recibido = TRUNC(sysdate).
         Si desmarca → fecha_recibido = null.
       Si estado ≠ 2 → alerta 221: "No se puede poner fecha de Recibo
                                    cuando el expediente no tiene Estado 2 - RECIBIDO"

   R6  CHECK_FEC_ENTREGADO.WHEN-CHECKBOX-CHANGED
       Si marca → fecha_entrega = sysdate  (V.17.0: sin TRUNC).
       Si desmarca → fecha_entrega = null.

   R7  FECHA_ENTREGA.KEY-NEXT-ITEM
       Si estado_expediente = 1 (Entregado):
         Obtiene TRUNC(FECHA_ENTREGAEXPED_DESDE/HASTA) de ACCASAMBLEA_ACTUAL.
         Si TRUNC(fecha_entrega) NOT BETWEEN rango → alerta 116 + AUTH 'ENTREGA EXTRAORDINARIA'.
       global.valida_fecha := 'S' antes de la validación.

   R8  BTT_ASOCIAR1 / BTT_ASOCIAR2.WHEN-BUTTON-PRESSED
       Si tipo_docemitido > 1 → alerta 160:
         "Un expediente preferente no puede ser representante o representado."
       Si votos_propios + votos_ajenos >= 2000:
         BTT_ASOCIAR1 (propios): RAISE form_trigger_failure (error 114)
         BTT_ASOCIAR2 (ajenos):  solo avisa 114 pero NO bloquea (decisión dic-2010)
       Abre ACCFRM0430.

   R9  BTT_EXPEDIENTE.WHEN-BUTTON-PRESSED  (Imprimir Formulario + Constancia)
       1. Obtiene TRUNC(fecha_actu) de ac.accaccionista.
       2. AC.AC_PKG_INFO_ACCIONISTA.ac_fnc_meses_vencimiento_act(fecha_actu):
          Si FALSE o fecha_actu IS NULL → "El accionista debe actualizarse." RAISE FAILURE.
       3. Si estado_expediente = 1 (Entregado):
            UPDATE accasamblea SET estado_expediente = 2 (Recibido) + COMMIT.
            check_fec_recibido = 'S', fecha_recibido = SYSDATE si era null.
       4. P_IMPRIMIR_EXPEDIENTE(CHECK_ANTECEDENTES) → reporte accrep0806.
       5. P_IMPRIMIR_ANEXO → reporte accrep0185 (constancia de acreditación).
       6. P_LIMPIAR.

   R10 BTN_CREDENCIAL.WHEN-BUTTON-PRESSED  (Imprimir Credencial)
       Variables: pn_estado_aimprimir = 6, pn_estado_entregada = 8.
       Paso A: lc_en_fecha = 'S' si sysdate BETWEEN fecha_entregacred_desde/hasta.
       Paso B: lc_pasa_estado8 = estado = 8.
       Paso C: lc_pasa_estado6 = estado = 6; si NO y NO estado8 → alerta 701.
       Paso D: lc_es_reimpresion = 'N' si ESTADO_IMPRESION = 'N' (o null).
       Escenarios:
         (6 or 8) AND en_rango AND primera_vez:
           ACC_DESCTRX_ACCIONES → votos_propios; COMMIT.
           P_IMPRIMIR_CREDENCIAL; estado=8; fecha_credencial=sysdate; ESTADO_IMPRESION='S'.
         (6 or 8) AND en_rango AND reimpresion:
           Alerta 703 + AUTH 'REIMPRESION DE CREDENCIAL' → misma lógica + ESTADO_REIMPRESION='S'.
         (6 or 8) AND fuera_rango:
           Alerta 702 + AUTH 'CREDENCIAL FUERA DE RANGO' → imprime + ESTADO_REIMPRESION='S'.

   R11 ITEM538 (Motivo Rechazo).WHEN-BUTTON-PRESSED
       Si estado = estado_denegado (10) → go_block('ACCASAMBLEA_DENEGADA').
       Si no → alerta 704.
       Validaciones adicionales del bloque ACCASAMBLEA_DENEGADA (PAGE_6):
         - Motivo activo en AC_MOTIVO_RECHAZO_ASAMBLEA (estado_motivo=1), sino alerta 708.
         - Motivo no duplicado para el expediente, sino alerta 709.

   R12 PRE-INSERT (bloque ACCASAMBLEA)
       estado_expediente := 1.
       fecha_cambioestado = sysdate.
       Si fecha_entrega IS NULL → fecha_entrega = fecha_cambioestado.
       Obtiene sede de AC.AC_SEDE_X_USUARIO.
       Valida TRUNC(fecha_entrega) BETWEEN TRUNC(FECHA_ENTREGAEXPED_DESDE/HASTA).
       Si global.valida_fecha = 'N' y fuera de rango → alerta 116 + RAISE.
       ACC_EXPEDIENTE_NUEVO → asigna numero de expediente.
       usuario_crea = USER.

   R13 PRE-UPDATE (bloque ACCASAMBLEA)
       Obtiene estado_expediente actual de ACCASAMBLEA (v_estado).
       Si not found → alerta 118 + RAISE.
       usuario_actu = USER; fecha_actu = sysdate.
       Si estado = 5 → p_actualiza_estado (INSERT en accasamblea_det, Incidencia 28948).
       Si estado_expediente = 2 AND v_estado ≠ 2:
         Actualiza fecha_cambioestado.
         INSERT acc_movimiento_asamblea (auditoría de cambio de estado).
         Valida fechas recepción expediente (FECHA_ENTREGAEXPED_DESDE/HASTA):
           Si fuera de rango → alerta 116 + RAISE.

   R14 POST-QUERY (bloque ACCASAMBLEA)
       global.numasamblea := asamblea.
       Carga nombre + numero_dpi desde ACCACCIONISTA (V.16: incluye DPI).
       Descripción estado_expediente desde ACCESTADO_EXPEDIENTE.
       Descripción tipo_asamblea (O→Ordinaria, E→Extraordinaria).
       Descripción tipo_documento desde ACC_TIPODOCUMEN.
       TOTAL_VOTOS := NVL(VOTOS_PROPIOS,0) + NVL(VOTOS_AJENOS,0).
       Si fecha_credencial IS NOT NULL → check_credencial = 'S'.
       Si fecha_entrega IS NOT NULL → check_fec_entregado = 'S'.
       Si fecha_recibido IS NOT NULL → check_fec_recibido = 'S'.
       Habilita BTT_EXPEDIENTE si expediente IS NOT NULL AND estado IN (1,2).

   R15 ACC_DETINVERSION_ASAMBLEA.PRE-RECORD
       Si TIPO_DOCUMEN = 1 AND cantidad_acciones = 0 → P_DESHABILITA_PARTICIPACION.
       Si TIPO_DOCUMEN = 1 AND cantidad_acciones > 0 → P_HABILITA_PARTICIPACION.
       Si TIPO_DOCUMEN > 1 → P_DESHABILITA_PARTICIPACION.
       P_HABILITA: habilita VOTOS_CONSIGNADOS, VOTOS_NULOS, DESDE_CARTA, HASTA_CARTA.
       P_DESHABILITA: deshabilita los mismos campos.

   R16 AC_PRC_VALIDA_PREFERENTE (llamado desde REGRESA1.WHEN-BUTTON-PRESSED)
       Si NVL(ndbi_ind_preferente,0) = 1:
         P_VER_PREGUNTA(102): "¿Desea realizar la acreditación de acciones preferentes?"
         Si usuario dice NO (v_dummy = 89) → RAISE FAILURE.
         Si usuario dice SÍ → AUTH 'ACREDITA CON ACCION PREFERENTE'.

   R17 TOOLBAR.WHEN-BUTTON-PRESSED (Guardar con validaciones previas)
       Si TOTAL_VOTOS > 2000 → alerta 700 "No se puede participar con más de 2000 acciones".
       Si TOTAL_VOTOS ≤ 2000 → AC_PRC_VALIDA_PREFERENTE → KEY-COMMIT.
══════════════════════════════════════════════════════════════════ */

/* Catálogo de estados (ACCESTADO_EXPEDIENTE) */
const ESTADOS_EXP = [
  { c: 1,  d: 'Entregado'          },
  { c: 2,  d: 'Recibido'           },
  { c: 4,  d: 'Aprobado'           },
  { c: 5,  d: 'En Revisión'        },
  { c: 6,  d: 'Credencial a Emitir'},
  { c: 8,  d: 'Credencial Entregada'},
  { c: 10, d: 'Denegado'           },
];

/* Estado Denegado (variables.estado_denegado en Oracle Forms) */
const ESTADO_DENEGADO = 10;

/* Motivos de rechazo (AC_MOTIVO_RECHAZO_ASAMBLEA) */
const MOTIVOS_RECHAZO = [
  { codigo: 'MOT01', descripcion: 'Documentación incompleta',          estado: 1 },
  { codigo: 'MOT02', descripcion: 'Documentación vencida o ilegible',  estado: 1 },
  { codigo: 'MOT03', descripcion: 'Datos desactualizados del accionista', estado: 1 },
  { codigo: 'MOT04', descripcion: 'Posible duplicidad de expediente',   estado: 1 },
  { codigo: 'MOT05', descripcion: 'No cumple requisitos de vigencia',   estado: 1 },
];

/* Inversiones mock (ACC_DETINVERSION_ASAMBLEA) */
const MOCK_INVERSIONES = [
  { tipo_doc: 1, descripcion: 'Acciones Comunes Clase A',     cantidad: 1250 },
  { tipo_doc: 2, descripcion: 'Acciones Preferentes Serie A', cantidad: 300  },
];

export default function Expediente0080({ acc, asamblea, onClose }) {
  const { notify } = useApp();

  /* ── Estado principal del expediente (bloque ACCASAMBLEA) ── */
  const [exp,     setExp]     = useState(null);
  const [detalle, setDetalle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [tab,     setTab]     = useState('expediente');

  /* ── Control de autorización supervisora ── */
  const [authTipo, setAuthTipo]   = useState(null);
  const [authCb,   setAuthCb]     = useState(null);

  /* ── Estado previo del expediente (para R13 auditoría) ── */
  const [estadoAnterior, setEstadoAnterior] = useState(null);

  /* ── Indicador acciones preferentes (ndbi_ind_preferente) ── */
  const [tienePreferente, setTienePreferente] = useState(false);

  /* ── Motivo de rechazo (ACCASAMBLEA_DENEGADA) ── */
  const [motivoRechazo,    setMotivoRechazo]    = useState('');
  const [obsRechazo,       setObsRechazo]       = useState('');
  const [motivoGuardando,  setMotivoGuardando]  = useState(false);
  const [motivosUsados,    setMotivosUsados]    = useState([]); // R11: no duplicar

  /* ══ CARGA INICIAL (POST-QUERY R14) ══ */
  useEffect(() => {
    Promise.all([
      getExpediente0080(acc.codigo).then(d => {
        const inicial = d || buildNuevoExpediente();
        setExp(inicial);
        setEstadoAnterior(d ? Number(d.estado_expediente) : null);
        // R14: sincroniza checks con fechas
        if (d) syncChecksConFechas(inicial);
        // R14: detecta si tiene preferentes (ndbi_ind_preferente)
        setTienePreferente(Number(d?.tipo_docemitido) > 1);
        setLoading(false);
      }),
      getDetalleExpediente(null).then(setDetalle),
    ]);
  }, []);

  function buildNuevoExpediente() {
    return {
      asamblea:          asamblea.num,
      tipo_asamblea:     asamblea.tipo,
      expediente:        null,
      credencial:        null,
      accionista:        acc.codigo,
      nombre:            acc.nombre,
      numero_cui:        acc.dpi,
      // R12 PRE-INSERT: estado := 1
      estado_expediente: 1,
      tipo_docemitido:   1,
      d_tipo_documento:  'Acciones Comunes',
      // Votos (R14 POST-QUERY: TOTAL = NVL(PROPIOS,0) + NVL(AJENOS,0))
      votos_propios:     0,
      votos_ajenos:      0,
      total_votos:       0,
      votos_consignados: 0,
      votos_nulos:       0,
      ejercio_voto:      'N',
      desde_carta:       0,
      hasta_carta:       0,
      // Fechas y checks
      check_fec_entregado: 'N', fecha_entrega:    null,
      check_fec_recibido:  'N', fecha_recibido:   null,
      check_credencial:    'N', fecha_credencial:  null,
      fecha_anulentrega:   null,
      // Impresión credencial
      estado_impresion:    'N',
      estado_reimpresion:  'N',
      // Auditoría
      autoriza_antecedentes: 'S',
      usuario_crea:          null,
      usuario_actu:          null,
      fecha_cambioestado:    null,
      autoriza_ultimo_estado: null,
    };
  }

  /* POST-QUERY R14: sincroniza checks con fechas al cargar */
  function syncChecksConFechas(e) {
    const patch = {};
    if (e.fecha_credencial) patch.check_credencial    = 'S';
    if (e.fecha_entrega)    patch.check_fec_entregado = 'S';
    if (e.fecha_recibido)   patch.check_fec_recibido  = 'S';
    if (Object.keys(patch).length) setExp(p => ({ ...p, ...patch }));
  }

  /* Helper: actualiza un campo y recalcula total_votos (R14) */
  const set = useCallback((k, v) =>
    setExp(p => {
      const next = { ...p, [k]: v };
      if (k === 'votos_propios' || k === 'votos_ajenos') {
        next.total_votos = (Number(k === 'votos_propios' ? v : p.votos_propios) || 0)
                         + (Number(k === 'votos_ajenos'  ? v : p.votos_ajenos)  || 0);
      }
      return next;
    }),
  []);

  /* ══ AUTORIZACIÓN SUPERVISORA ══ */
  function requireAuth(tipo, cb) {
    setAuthTipo(tipo);
    setAuthCb(() => cb);
  }
  function onAuthOk() {
    const cb = authCb;
    setAuthTipo(null);
    setAuthCb(null);
    notify('success', 'Autorización de supervisor registrada correctamente.');
    cb && cb();
  }

  /* ══════════════════════════════════════════════════════
     R2 — ESTADO_EXPEDIENTE.KEY-NEXT-ITEM
     p_valida_estado_exp → valida que el estado exista.
     Downgrade → AUTH 'CAMBIO ESTADO EXPEDIENTE'.
     Estado 10 → abrir tab motivo rechazo.
  ══════════════════════════════════════════════════════ */
  function handleEstadoChange(e) {
    const nuevo  = Number(e.target.value);
    const actual = estadoAnterior ?? Number(exp.estado_expediente);

    // p_valida_estado_exp: estado debe existir en catálogo
    const existe = ESTADOS_EXP.some(s => s.c === nuevo);
    if (!existe) { notify('error', 'NOES: El estado ingresado no es válido. Verifique el catálogo.'); return; }

    if (nuevo < actual && actual !== 0) {
      // R2: downgrade → requiere autorización supervisora
      requireAuth('CAMBIO ESTADO EXPEDIENTE', () => {
        set('estado_expediente', nuevo);
        set('autoriza_ultimo_estado', 'SUPERVISOR'); // se guarda en PRE-UPDATE
        if (nuevo === ESTADO_DENEGADO) setTab('motivo');
      });
    } else {
      set('estado_expediente', nuevo);
      // R2: estado 10 → ir automáticamente al tab de motivo rechazo
      if (nuevo === ESTADO_DENEGADO) setTab('motivo');
    }
  }

  /* ══════════════════════════════════════════════════════
     R6 — CHECK_FEC_ENTREGADO.WHEN-CHECKBOX-CHANGED
     Si marca → fecha_entrega = sysdate (V.17.0 sin TRUNC)
     Si desmarca → fecha_entrega = null
  ══════════════════════════════════════════════════════ */
  function handleCheckEntregado(marcado) {
    set('check_fec_entregado', marcado ? 'S' : 'N');
    set('fecha_entrega', marcado ? today() : null);
  }

  /* ══════════════════════════════════════════════════════
     R5 — CHECK_FEC_RECIBIDO.WHEN-CHECKBOX-CHANGED
     SOLO si estado_expediente = 2 (RECIBIDO).
     Si estado ≠ 2 → alerta 221.
  ══════════════════════════════════════════════════════ */
  function handleCheckRecibido(marcado) {
    if (Number(exp.estado_expediente) !== 2) {
      notify('warning', '221: No se puede poner fecha de Recibo cuando el expediente no tiene Estado 2 - RECIBIDO.');
      return;
    }
    set('check_fec_recibido', marcado ? 'S' : 'N');
    // V.14.0: TRUNC(sysdate)
    set('fecha_recibido', marcado ? today() : null);
  }

  /* ══════════════════════════════════════════════════════
     R4 — CHECK_CREDENCIAL.WHEN-CHECKBOX-CHANGED
     Si marca → fecha_credencial = sysdate.
     Si desmarca → alerta FECHACRED "¿Desea eliminar fecha?".
  ══════════════════════════════════════════════════════ */
  function handleCheckCredencial(marcado) {
    if (marcado) {
      set('check_credencial', 'S');
      set('fecha_credencial', today());
    } else {
      // Alerta FECHACRED: "ATENCION!!! Desea ELIMINAR fecha de entrega de credencial?"
      const confirma = window.confirm('FECHACRED: ¿Desea ELIMINAR la fecha de entrega de la credencial?');
      if (confirma) {
        set('check_credencial', 'N');
        set('fecha_credencial', null);
        set('fecha_anulentrega', today()); // registra auditoría
      }
      // Si NO confirma: exit_form → en web volvemos sin cambio (no hacemos nada)
    }
  }

  /* ══════════════════════════════════════════════════════
     R7 — Validación rango de fechas para entrega expediente
     FECHA_ENTREGA.KEY-NEXT-ITEM
  ══════════════════════════════════════════════════════ */
  function validarRangoFechaEntrega(callbackSiOk) {
    if (Number(exp.estado_expediente) !== 1) { callbackSiOk(); return; }
    const hoy   = new Date();
    const desde = new Date(asamblea.fecha_entrega_desde);
    const hasta = new Date(asamblea.fecha_entrega_hasta);
    // TRUNC (solo fecha, sin hora)
    hoy.setHours(0,0,0,0);
    desde.setHours(0,0,0,0);
    hasta.setHours(23,59,59,999);

    if (hoy >= desde && hoy <= hasta) {
      callbackSiOk();
    } else {
      // alerta 116 + AUTH 'ENTREGA EXTRAORDINARIA'
      notify('warning', '116: Fechas para Entrega y Recepción de Expedientes ha Expirado o es incorrecta. Se requiere autorización de supervisor.');
      requireAuth('ENTREGA EXTRAORDINARIA', callbackSiOk);
    }
  }

  /* ══════════════════════════════════════════════════════
     R8 — BTT_ASOCIAR1 / BTT_ASOCIAR2
  ══════════════════════════════════════════════════════ */
  function handleAsociarVotos(tipo) {
    // R8: preferente no puede ser representante/representado
    if (Number(exp.tipo_docemitido) > 1) {
      notify('error', '160: Un expediente preferente no puede ser representante o representado.');
      return;
    }
    const totalVotos = (Number(exp.votos_propios) || 0) + (Number(exp.votos_ajenos) || 0);
    if (tipo === 'propios' && totalVotos >= 2000) {
      // BTT_ASOCIAR1: RAISE form_trigger_failure
      notify('error', '114: Representante tiene registradas 2,000 acciones, no puede representar más accionistas.');
      return;
    }
    if (tipo === 'ajenos' && totalVotos >= 2000) {
      // BTT_ASOCIAR2: solo avisa (DIC-2010: no bloquea para ajenos)
      notify('warning', '114: Representante tiene registradas 2,000 acciones. (Aviso — operación continúa para votos ajenos según V.2010)');
    }
    notify('info', `ACCFRM0430: Asociar votos ${tipo}. Disponible en la versión conectada al backend.`);
  }

  /* ══════════════════════════════════════════════════════
     R9 — BTT_EXPEDIENTE (Imprimir Formulario + Constancia)
  ══════════════════════════════════════════════════════ */
  async function handleImprimirFormulario() {
    if (!exp.expediente) {
      notify('error', '105: Debe ingresar un expediente antes de imprimir.');
      return;
    }

    // R9-1: Valida vigencia del accionista (ac_fnc_meses_vencimiento_act)
    // En el XML: v_flag = AC.AC_PKG_INFO_ACCIONISTA.ac_fnc_meses_vencimiento_act(v_fechaModificado)
    // Si v_flag = FALSE o fecha = null → "El accionista debe actualizarse." RAISE FAILURE
    if (!acc.fecha_actu_iso) {
      notify('error', 'El accionista debe actualizarse. No existe fecha de última actualización registrada.');
      return;
    }
    const mesesTranscurridos = (Date.now() - new Date(acc.fecha_actu_iso).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    if (mesesTranscurridos > 18) {
      notify('error', `El accionista debe actualizarse. Última actualización: ${acc.ultima_actualizacion} (hace ${Math.floor(mesesTranscurridos)} meses). Plazo máximo: 18 meses.`);
      return;
    }

    setSaving(true);
    try {
      const r = await imprimirFormulario(exp.expediente, acc.codigo);

      // R9-2: Si estado = 1 → UPDATE estado a 2 (Recibido)
      if (Number(exp.estado_expediente) === 1) {
        set('estado_expediente', 2);
        set('check_fec_recibido', 'S');
        if (!exp.fecha_recibido) set('fecha_recibido', r.fecha_recibido || today());
        setEstadoAnterior(2);
      }

      notify('success', 'Formulario de Participación (accrep0806) + Constancia de Acreditación (accrep0185) impresos. Estado actualizado a "Recibido".');
    } catch (err) {
      notify('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  /* ══════════════════════════════════════════════════════
     R10 — BTN_CREDENCIAL (Imprimir Credencial)
  ══════════════════════════════════════════════════════ */
  async function handleImprimirCredencial() {
    const estadoActual = Number(exp.estado_expediente);
    const EST_EMITIR   = 6;
    const EST_ENTREGADA = 8;

    // Paso A: ¿sysdate between fecha_entregacred_desde y hasta?
    const hoy   = new Date();
    const desde = new Date(asamblea.fecha_cred_desde);
    const hasta = new Date(asamblea.fecha_cred_hasta);
    hoy.setHours(12,0,0,0); desde.setHours(0,0,0,0); hasta.setHours(23,59,59,999);
    const lc_en_fecha = hoy >= desde && hoy <= hasta;

    // Paso B
    const lc_pasa_estado8 = estadoActual === EST_ENTREGADA;
    // Paso C
    const lc_pasa_estado6 = estadoActual === EST_EMITIR;

    if (!lc_pasa_estado6 && !lc_pasa_estado8) {
      // alerta 701: "No puede imprimir la credencial con estado: X"
      const ee = ESTADOS_EXP.find(s => s.c === estadoActual);
      notify('error', `701: No puede imprimir la credencial con estado: ${estadoActual} - ${ee?.d || '?'}. Requiere estado 6 (Credencial a Emitir) o 8 (Credencial Entregada).`);
      return;
    }

    // Paso D: ¿es reimpresión?
    const lc_es_reimpresion = exp.estado_impresion === 'S';

    // Escenario 1: Primera impresión ideal
    if ((lc_pasa_estado6 || lc_pasa_estado8) && lc_en_fecha && !lc_es_reimpresion) {
      await doImprimirCredencialPrimera();
    }
    // Escenario 2: Reimpresión (ya fue impresa antes)
    else if ((lc_pasa_estado6 || lc_pasa_estado8) && lc_en_fecha && lc_es_reimpresion) {
      notify('warning', '703: La impresión ya fue realizada una vez. Si desea reimprimirla deberá tener autorización.');
      requireAuth('REIMPRESION DE CREDENCIAL', async () => {
        await doImprimirCredencialReimpresion();
      });
    }
    // Escenario 3: Fuera de rango de fechas
    else if ((lc_pasa_estado6 || lc_pasa_estado8) && !lc_en_fecha) {
      notify('warning', '702: La impresión de la credencial está fuera de rango de fechas. Si desea imprimirla deberá tener autorización.');
      requireAuth('CREDENCIAL FUERA DE RANGO', async () => {
        await doImprimirCredencialFueraRango();
      });
    }
  }

  async function doImprimirCredencialPrimera() {
    setSaving(true);
    try {
      await imprimirCredencial(exp.expediente);
      // ACC_DESCTRX_ACCIONES: actualiza votos_propios con las acciones comunes
      const accionesComunes = MOCK_INVERSIONES.find(i => i.tipo_doc === 1)?.cantidad || 0;
      set('votos_propios',    accionesComunes);
      set('estado_expediente', 8);
      set('check_credencial',  'S');
      set('fecha_credencial',  today());
      set('estado_impresion',  'S');
      setEstadoAnterior(8);
      notify('success', 'Credencial impresa. Estado actualizado a "Credencial Entregada" (8).');
    } catch (err) { notify('error', err.message); }
    finally { setSaving(false); }
  }

  async function doImprimirCredencialReimpresion() {
    setSaving(true);
    try {
      await imprimirCredencial(exp.expediente);
      set('estado_expediente',  8);
      set('estado_reimpresion', 'S');
      if (!exp.fecha_credencial) {
        set('check_credencial', 'S');
        set('fecha_credencial', today());
      }
      notify('success', 'Reimpresión de credencial ejecutada con autorización de supervisor.');
    } catch (err) { notify('error', err.message); }
    finally { setSaving(false); }
  }

  async function doImprimirCredencialFueraRango() {
    setSaving(true);
    try {
      await imprimirCredencial(exp.expediente);
      if (exp.estado_impresion === 'N') set('estado_impresion', 'S');
      if (!exp.fecha_credencial) {
        set('check_credencial', 'S');
        set('fecha_credencial', today());
      }
      set('estado_reimpresion', 'S');
      notify('success', 'Credencial impresa fuera de rango con autorización de supervisor.');
    } catch (err) { notify('error', err.message); }
    finally { setSaving(false); }
  }

  /* ══════════════════════════════════════════════════════
     R11 — ITEM538 (Botón Motivo Rechazo)
  ══════════════════════════════════════════════════════ */
  function handleMotivoRechazoBtn() {
    if (Number(exp.estado_expediente) !== ESTADO_DENEGADO) {
      notify('error', `704: No es posible ir a la sección de Motivos de rechazo, únicamente podrá hacerlo con el estado: ${ESTADO_DENEGADO} - Denegado.`);
      return;
    }
    setTab('motivo');
  }

  /* ══════════════════════════════════════════════════════
     R11 — Guardar motivo de rechazo (ACCASAMBLEA_DENEGADA)
     Validaciones del bloque PAGE_6:
     - Motivo activo (estado_motivo=1), sino alerta 708.
     - Motivo no duplicado, sino alerta 709.
  ══════════════════════════════════════════════════════ */
  async function handleGuardarMotivo() {
    if (!motivoRechazo) { notify('error', '705: El código de Motivo de Rechazo no existe, favor consulte la lista de valores.'); return; }
    // R11: validar que el motivo no esté inactivo
    const motivoObj = MOTIVOS_RECHAZO.find(m => m.codigo === motivoRechazo);
    if (!motivoObj || motivoObj.estado !== 1) {
      notify('error', '708: El código de Motivo de Rechazo está INACTIVO, favor verifique.');
      return;
    }
    // R11: validar duplicado para este expediente
    if (motivosUsados.includes(motivoRechazo)) {
      notify('error', '709: El código de Motivo de Rechazo ya fue ingresado para este expediente, favor verifique.');
      return;
    }
    setMotivoGuardando(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      setMotivosUsados(p => [...p, motivoRechazo]);
      notify('success', 'Motivo de denegación registrado correctamente en ACCASAMBLEA_DENEGADA.');
      setMotivoRechazo('');
      setObsRechazo('');
    } finally { setMotivoGuardando(false); }
  }

  /* ══════════════════════════════════════════════════════
     R16 — AC_PRC_VALIDA_PREFERENTE
     Llamado desde REGRESA1 (al seleccionar accionista) y
     desde TOOLBAR (antes del commit) — R17.
  ══════════════════════════════════════════════════════ */
  function validarPreferente(callbackSiOk) {
    if (!tienePreferente) { callbackSiOk(); return; }
    // P_VER_PREGUNTA(102): "¿Desea realizar la acreditación de acciones preferentes?"
    const confirma = window.confirm('102: ¿Desea realizar la acreditación de acciones preferentes?');
    if (!confirma) {
      notify('info', 'Acreditación cancelada. El accionista posee acciones preferentes.');
      return;
    }
    requireAuth('ACREDITA CON ACCION PREFERENTE', callbackSiOk);
  }

  /* ══════════════════════════════════════════════════════
     R17 — Guardar (TOOLBAR → KEY-COMMIT)
     Si TOTAL_VOTOS > 2000 → alerta 700.
     AC_PRC_VALIDA_PREFERENTE → commit.
     R12 PRE-INSERT / R13 PRE-UPDATE aplicados aquí.
  ══════════════════════════════════════════════════════ */
  async function handleGuardar() {
    // R17: TOTAL_VOTOS > 2000 → alerta 700
    if ((Number(exp.total_votos) || 0) > 2000) {
      notify('error', '700: No se puede participar con más de 2,000 acciones. Total actual: ' + exp.total_votos);
      return;
    }

    // R16: validar preferente antes de guardar
    validarPreferente(async () => {
      setSaving(true);
      try {
        if (!exp.expediente) {
          // R12 PRE-INSERT: valida rango fechas de entrega
          validarRangoFechaEntrega(async () => {
            const r = await crearExpediente0080({
              accionista: acc.codigo, asamblea: asamblea.num, tipo_asamblea: asamblea.tipo,
            });
            // PRE-INSERT: estado := 1, ACC_EXPEDIENTE_NUEVO
            setExp(p => ({ ...p, expediente: r.expediente, credencial: r.credencial, estado_expediente: 1 }));
            setEstadoAnterior(1);
            notify('success', `Expediente ${r.expediente} creado correctamente. Credencial: ${r.credencial}.`);
            setSaving(false);
          });
        } else {
          // R13 PRE-UPDATE: usuario_actu, fecha_actu, auditoría movimiento si 2≠anterior
          await actualizarExpediente0080(exp);
          setEstadoAnterior(Number(exp.estado_expediente));
          notify('success', 'Expediente actualizado correctamente.');
          setSaving(false);
        }
      } catch (err) {
        notify('error', err.message);
        setSaving(false);
      }
    });
  }

  /* ══════════════════════════════════════════════════════
     R15 — P_HABILITA / P_DESHABILITA_PARTICIPACION
     tipo_doc=1 AND cantidad>0 → habilita VOTOS_CONSIGNADOS, VOTOS_NULOS, DESDE_CARTA, HASTA_CARTA
  ══════════════════════════════════════════════════════ */
  const inversionPrincipal = MOCK_INVERSIONES.find(i => i.tipo_doc === 1);
  const participacionHabilitada = (
    Number(exp?.tipo_docemitido) === 1 &&
    (inversionPrincipal?.cantidad || 0) > 0
  );

  /* ══ RENDER ══ */
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <span className={s.spin} /> Cargando expediente…
      </div>
    );
  }

  const estadoInfo   = getEstExp(exp.estado_expediente);
  const puedeFormulario = exp.expediente && [1, 2].includes(Number(exp.estado_expediente));
  const esDenegado   = Number(exp.estado_expediente) === ESTADO_DENEGADO;

  const TABS = [
    { k: 'expediente', l: 'Expediente',      i: '📋' },
    { k: 'votos',      l: 'Votos',            i: '🗳️' },
    { k: 'credencial', l: 'Credencial',       i: '🎫' },
    { k: 'detalle',    l: 'Detalle Cartas',   i: '📜' },
    ...(esDenegado ? [{ k: 'motivo', l: 'Motivo Rechazo', i: '✗' }] : []),
  ];

  return (
    <div>
      {/* ── Cabecera de asamblea ── */}
      <div className={s.asmHdr}>
        <span className={[s.asmPill, asamblea.tipo === 'O' ? s.pOrd : s.pExt].join(' ')}>
          {asamblea.descripcion}
        </span>
        <span className={s.asmTtl}>{asamblea.num} — {asamblea.ordinal}</span>
        <span className={s.asmDate}>📅 {asamblea.fecha}</span>
        <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
        {exp.expediente && (
          <Tag color="navy" style={{ marginLeft: 'auto' }}>EXP: {exp.expediente}</Tag>
        )}
      </div>

      {/* ── Tabs internos ── */}
      <div className={s.tabsBar}>
        {TABS.map(t => (
          <button
            key={t.k}
            className={[s.tab, tab === t.k ? s.tabAct : ''].join(' ')}
            onClick={() => setTab(t.k)}
          >
            {t.i} {t.l}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════
          TAB: EXPEDIENTE
      ═══════════════════════════════════════ */}
      {tab === 'expediente' && (
        <div>
          <SectionTitle icon="📋">Datos del Expediente — ACCASAMBLEA</SectionTitle>

          <FieldRow cols={4}>
            <Input label="No. Expediente" mono readOnly
              value={exp.expediente || '(nuevo)'} onChange={() => {}} />
            <Input label="No. Credencial" mono readOnly
              value={exp.credencial || '(nuevo)'} onChange={() => {}} />
            {/* R2: ESTADO_EXPEDIENTE con control de downgrade */}
            <div className="fw">
              <label className="lbl">Estado del Expediente<span className="req">*</span></label>
              <select className="sel" value={exp.estado_expediente} onChange={handleEstadoChange}>
                {ESTADOS_EXP.map(e => (
                  <option key={e.c} value={e.c}>{e.c} – {e.d}</option>
                ))}
              </select>
            </div>
            <Input label="Tipo de Documento" readOnly
              value={exp.d_tipo_documento || 'Acciones Comunes'} onChange={() => {}} />
          </FieldRow>

          {/* R3: Accionista */}
          <SectionTitle icon="👤">Accionista — ACCASAMBLEA.ACCIONISTA</SectionTitle>
          <FieldRow cols={3}>
            <Input label="No. DPI / CUI" mono readOnly value={acc.dpi} onChange={() => {}} />
            <div style={{ gridColumn: '2 / 4' }}>
              <Input label="Nombre del Accionista" readOnly value={acc.nombre} onChange={() => {}} />
            </div>
          </FieldRow>

          {/* R6, R5, R7: Fechas y checks */}
          <SectionTitle icon="📅">Fechas de Entrega y Recepción</SectionTitle>
          <div style={{ background: 'var(--teal-pale)', border: '1px solid rgba(0,191,165,.2)', borderRadius: 12, padding: '10px 16px', marginBottom: 14, fontSize: '.72rem', color: 'var(--teal-dk)' }}>
            <strong>Rango de entrega:</strong> {asamblea.fecha_entrega_desde} al {asamblea.fecha_entrega_hasta}.
            Fuera de rango requiere AUTH: <em>ENTREGA EXTRAORDINARIA</em> (error 116).
          </div>

          {/* R6 */}
          <div
            className={[s.chkRow, exp.check_fec_entregado === 'S' ? s.chkOn : ''].join(' ')}
            onClick={() => handleCheckEntregado(exp.check_fec_entregado !== 'S')}
          >
            <span className={[s.chkBox, exp.check_fec_entregado === 'S' ? s.chkBoxOn : ''].join(' ')} />
            <div className={s.chkLabel}>
              <div className={s.chkTitle}>¿Expediente Entregado? <span style={{ fontSize: '.63rem', color: 'var(--gray-400)' }}>(CHECK_FEC_ENTREGADO)</span></div>
              <div className={s.chkSub}>R6: fecha_entrega = sysdate al marcar / null al desmarcar</div>
            </div>
            {exp.fecha_entrega && <Tag color="teal">📅 {exp.fecha_entrega}</Tag>}
          </div>

          {/* R5 */}
          <div
            className={[s.chkRow, exp.check_fec_recibido === 'S' ? s.chkOn : '', Number(exp.estado_expediente) !== 2 ? s.chkDis : ''].join(' ')}
            onClick={() => handleCheckRecibido(exp.check_fec_recibido !== 'S')}
          >
            <span className={[s.chkBox, exp.check_fec_recibido === 'S' ? s.chkBoxOn : ''].join(' ')} />
            <div className={s.chkLabel}>
              <div className={s.chkTitle}>
                ¿Expediente Recibido? <span style={{ fontSize: '.63rem', color: 'var(--gray-400)' }}>(CHECK_FEC_RECIBIDO)</span>
                {Number(exp.estado_expediente) !== 2 && <Tag color="amber" style={{ marginLeft: 8 }}>Solo estado 2</Tag>}
              </div>
              <div className={s.chkSub}>R5: solo habilitado cuando estado_expediente = 2 (RECIBIDO). Error 221 si estado ≠ 2.</div>
            </div>
            {exp.fecha_recibido && <Tag color="green">📅 {exp.fecha_recibido}</Tag>}
          </div>

          {/* AUTORIZA_ANTECEDENTES */}
          <div
            className={[s.chkRow, exp.autoriza_antecedentes === 'S' ? s.chkOn : ''].join(' ')}
            style={{ marginBottom: 20 }}
            onClick={() => set('autoriza_antecedentes', exp.autoriza_antecedentes === 'S' ? 'N' : 'S')}
          >
            <span className={[s.chkBox, exp.autoriza_antecedentes === 'S' ? s.chkBoxOn : ''].join(' ')} />
            <div className={s.chkLabel}>
              <div className={s.chkTitle}>Autoriza al banco para gestionar antecedentes penales y policiacos</div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1.5px solid var(--gray-100)', margin: '18px 0' }} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="teal" size="md" loading={saving} onClick={handleGuardar}
              style={{ width: 'auto', padding: '11px 28px' }}>
              💾 &nbsp;{exp.expediente ? 'Guardar Cambios' : 'Crear Expediente'}
            </Button>
            <Button variant="secondary" onClick={onClose}>← Volver</Button>
            {/* R9: BTT_EXPEDIENTE */}
            {puedeFormulario && (
              <Button variant="secondary" size="md" loading={saving}
                onClick={handleImprimirFormulario} style={{ marginLeft: 'auto' }}>
                🖨️ Formulario + Constancia (R9)
              </Button>
            )}
            {/* R11: ITEM538 */}
            <Button variant="ghost" size="sm" onClick={handleMotivoRechazoBtn}>
              ✗ Motivo Rechazo
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          TAB: VOTOS (R8, R15, R17)
      ═══════════════════════════════════════ */}
      {tab === 'votos' && (
        <div>
          <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: '.72rem', color: '#92400e' }}>
            <strong>Reglas R8/R15/R17:</strong>{' '}
            Preferente (tipo_docemitido &gt; 1) no puede representar/ser representado (error 160).
            Límite: 2,000 acciones totales (error 114 para propios / aviso para ajenos).
            TOTAL_VOTOS &gt; 2,000 → bloquea guardar (error 700).
            Campos VOTOS_CONSIGNADOS/NULOS/DESDE/HASTA_CARTA se habilitan solo si tipo_doc=1 y cantidad&gt;0.
          </div>

          <SectionTitle icon="🗳️">Votos — ACCASAMBLEA (Bloque maestro)</SectionTitle>
          <div className={s.votesGrid}>
            {[
              { l: 'Votos Propios',     v: exp.votos_propios,     cls: 'tl' },
              { l: 'Votos Ajenos',      v: exp.votos_ajenos,      cls: '' },
              { l: 'Total Votos',       v: exp.total_votos,       cls: (exp.total_votos || 0) > 2000 ? 'red' : 'gd' },
              { l: 'Vts. Consignados',  v: exp.votos_consignados, cls: 'tl', dis: !participacionHabilitada },
              { l: 'Votos Nulos',       v: exp.votos_nulos,       cls: '',   dis: !participacionHabilitada },
            ].map(m => (
              <div className={s.voteCard} key={m.l}>
                <div className={s.voteLbl}>{m.l}</div>
                <div
                  className={s.voteVal}
                  style={{
                    color: m.cls === 'tl' ? 'var(--teal-dk)' : m.cls === 'gd' ? 'var(--gold-dk)' : m.cls === 'red' ? 'var(--red)' : 'var(--navy)',
                    opacity: m.dis ? .35 : 1,
                  }}
                >
                  {(m.v || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* R15: aviso de participación deshabilitada */}
          {!participacionHabilitada && (
            <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: '.71rem', color: '#92400e' }}>
              <strong>P_DESHABILITA_PARTICIPACION (R15):</strong> VOTOS_CONSIGNADOS, VOTOS_NULOS, DESDE_CARTA y HASTA_CARTA están deshabilitados porque tipo_docemitido &gt; 1 (Preferente) o cantidad de acciones comunes = 0.
            </div>
          )}

          {/* R17: aviso total > 2000 */}
          {(exp.total_votos || 0) > 2000 && (
            <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: '.71rem', color: '#991b1b' }}>
              <strong>Error 700:</strong> No se puede participar con más de 2,000 acciones. Total actual: {exp.total_votos}.
            </div>
          )}

          <FieldRow cols={3}>
            <Select label="¿Ejerció el derecho a voto?" value={exp.ejercio_voto}
              onChange={e => set('ejercio_voto', e.target.value)}>
              <option value="S">SÍ</option>
              <option value="N">NO</option>
            </Select>
            <Input label="Desde Carta (Propios)" type="number" mono
              disabled={!participacionHabilitada}
              value={exp.desde_carta || 0}
              onChange={e => set('desde_carta', Number(e.target.value))} />
            <Input label="Hasta Carta (Ajenos)" type="number" mono
              disabled={!participacionHabilitada}
              value={exp.hasta_carta || 0}
              onChange={e => set('hasta_carta', Number(e.target.value))} />
          </FieldRow>

          <SectionTitle icon="📊">Detalle de Inversión — ACC_DETINVERSION_ASAMBLEA</SectionTitle>
          <Card style={{ borderRadius: 16, marginBottom: 16 }}>
            <table className={s.tbl}>
              <thead>
                <tr><th>Tipo Doc.</th><th>Descripción</th><th style={{ textAlign: 'right' }}>Cant. Acciones</th></tr>
              </thead>
              <tbody>
                {MOCK_INVERSIONES.map((inv, i) => (
                  <tr key={i}>
                    <td><Tag color={inv.tipo_doc === 1 ? 'navy' : 'blue'}>{inv.tipo_doc}</Tag></td>
                    <td>{inv.descripcion}</td>
                    <td style={{ textAlign: 'right', color: 'var(--teal-dk)', fontWeight: 700, fontFamily: 'monospace' }}>
                      {inv.cantidad.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* R8: BTT_ASOCIAR1/2 */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" size="sm" onClick={() => handleAsociarVotos('propios')}>
              + Asociar Votos Propios (BTT_ASOCIAR1)
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleAsociarVotos('ajenos')}>
              + Asociar Votos Ajenos (BTT_ASOCIAR2)
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          TAB: CREDENCIAL (R4, R10)
      ═══════════════════════════════════════ */}
      {tab === 'credencial' && (
        <div>
          <div style={{ background: 'var(--teal-pale)', border: '1px solid rgba(0,191,165,.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: '.72rem', color: 'var(--teal-dk)' }}>
            <strong>Flujo BTN_CREDENCIAL (R10):</strong><br />
            <Tag color="pink">6 – Cred. a Emitir</Tag> o <Tag color="green">8 – Cred. Entregada</Tag>{' '}
            + dentro del rango <strong>{asamblea.fecha_cred_desde} → {asamblea.fecha_cred_hasta}</strong>
            + primera vez → impresión directa.<br />
            Ya impresa (ESTADO_IMPRESION=S) → alerta 703 + AUTH: <strong>REIMPRESION DE CREDENCIAL</strong>.<br />
            Fuera de rango → alerta 702 + AUTH: <strong>CREDENCIAL FUERA DE RANGO</strong>.<br />
            Estado distinto a 6/8 → alerta 701 (no puede imprimir).
          </div>

          <SectionTitle icon="🎫">Estado de la Credencial</SectionTitle>
          <div className={s.credGrid}>
            <div className={s.credBox}><div className={s.credLbl}>No. Credencial</div><div className={[s.credVal, s.credTl].join(' ')}>{exp.credencial || '—'}</div></div>
            <div className={s.credBox}><div className={s.credLbl}>Estado Impresión</div><div className={s.credVal}>{exp.estado_impresion === 'S' ? '🖨️ Impresa' : 'Pendiente'}</div></div>
            <div className={s.credBox}><div className={s.credLbl}>Reimpresión</div><div className={s.credVal}>{exp.estado_reimpresion === 'S' ? '✓ Sí' : 'No'}</div></div>
            <div className={s.credBox}><div className={s.credLbl}>Fecha Credencial</div><div className={s.credVal}>{exp.fecha_credencial || '—'}</div></div>
          </div>

          {/* R4: CHECK_CREDENCIAL */}
          <div
            className={[s.chkRow, exp.check_credencial === 'S' ? s.chkOn : ''].join(' ')}
            style={{ marginBottom: 20 }}
            onClick={() => handleCheckCredencial(exp.check_credencial !== 'S')}
          >
            <span className={[s.chkBox, exp.check_credencial === 'S' ? s.chkBoxOn : ''].join(' ')} />
            <div className={s.chkLabel}>
              <div className={s.chkTitle}>
                Credencial Entregada <span style={{ fontSize: '.63rem', color: 'var(--gray-400)' }}>(CHECK_CREDENCIAL)</span>
              </div>
              <div className={s.chkSub}>
                R4: marca → fecha_credencial = sysdate / desmarca → alerta FECHACRED "¿Eliminar fecha?"
              </div>
            </div>
            {exp.fecha_credencial && <Tag color="teal">📅 {exp.fecha_credencial}</Tag>}
          </div>
          {exp.fecha_anulentrega && (
            <div style={{ fontSize: '.68rem', color: 'var(--amber)', marginBottom: 12 }}>
              ⚠️ Fecha de credencial eliminada el: {exp.fecha_anulentrega}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="teal" size="md" loading={saving} onClick={handleImprimirCredencial}
              style={{ width: 'auto', padding: '11px 28px' }}>
              🎫 &nbsp;Imprimir Credencial (BTN_CREDENCIAL)
            </Button>
            <Button variant="ghost" size="sm" onClick={handleMotivoRechazoBtn}>
              ✗ Motivo de Rechazo (ITEM538)
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          TAB: DETALLE CARTAS
      ═══════════════════════════════════════ */}
      {tab === 'detalle' && (
        <div>
          <Alert type="info">
            Tabla <strong>ACC_DETALLE_EXPEDIENTE</strong> — personas como representantes en este expediente.
            El correlativo se asigna automáticamente (WHEN-NEW-ITEM-INSTANCE).
            Desde/Hasta carta se calculan al grabar (WHEN-BUTTON-PRESSED del bloque PAGE_4).
          </Alert>
          <SectionTitle icon="📜">Cartas de Representación</SectionTitle>
          <Card style={{ borderRadius: 16 }}>
            <table className={s.tbl}>
              <thead>
                <tr><th>#</th><th>Nombre de la Persona</th><th>No. DPI</th><th>Orden</th><th>Registro</th><th>Depto.</th><th>Municipio</th></tr>
              </thead>
              <tbody>
                {detalle.map((d, i) => (
                  <tr key={i}>
                    <td><Tag color="navy">{d.correlativo}</Tag></td>
                    <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{d.nombre_persona}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '.73rem' }}>{d.numero_dpi}</td>
                    <td style={{ fontFamily: 'monospace' }}>{d.orden_cedula}</td>
                    <td style={{ fontFamily: 'monospace' }}>{d.registro_cedula}</td>
                    <td>{d.d_deptoexten}</td>
                    <td>{d.d_muniexten}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <Button variant="teal" size="sm" style={{ width: 'auto' }}
              onClick={() => notify('info', 'Agregar persona disponible en la versión conectada al backend.')}>
              + Agregar Persona
            </Button>
            <span style={{ fontSize: '.68rem', color: 'var(--gray-400)', alignSelf: 'center' }}>
              Desde Carta: {exp.desde_carta} · Hasta Carta: {exp.hasta_carta}
            </span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          TAB: MOTIVO RECHAZO (R11) — ACCASAMBLEA_DENEGADA
          Solo visible cuando estado = 10 (DENEGADO)
      ═══════════════════════════════════════ */}
      {tab === 'motivo' && (
        <div>
          <Alert type="error">
            <strong>ITEM538 / ACCASAMBLEA_DENEGADA (R11)</strong> — Solo disponible cuando estado = <strong>10 (Denegado)</strong>.
            Validaciones: motivo activo (error 708) y no duplicado (error 709).
          </Alert>
          <SectionTitle icon="✗">Motivo de Denegación — ACCASAMBLEA_DENEGADA</SectionTitle>
          <FieldRow cols={2}>
            <Input label="Expediente" mono readOnly value={exp.expediente || '—'} onChange={() => {}} />
            <div className="fw">
              <label className="lbl">Código de Motivo de Rechazo<span className="req">*</span></label>
              <select className="sel" value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)}>
                <option value="">-- Seleccione --</option>
                {MOTIVOS_RECHAZO.filter(m => m.estado === 1 && !motivosUsados.includes(m.codigo)).map(m => (
                  <option key={m.codigo} value={m.codigo}>{m.codigo} – {m.descripcion}</option>
                ))}
              </select>
            </div>
          </FieldRow>
          <div className="fw" style={{ marginBottom: 16 }}>
            <label className="lbl">Observaciones adicionales</label>
            <textarea
              className="inp"
              rows={3}
              placeholder="Descripción detallada del motivo de denegación…"
              value={obsRechazo}
              onChange={e => setObsRechazo(e.target.value)}
              style={{ resize: 'vertical', minHeight: 70 }}
            />
          </div>
          {motivosUsados.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: '.68rem', color: 'var(--gray-500)', fontWeight: 600 }}>Motivos ya registrados: </span>
              {motivosUsados.map(m => <Tag key={m} color="red" style={{ marginLeft: 5 }}>{m}</Tag>)}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="teal" size="md" loading={motivoGuardando}
              onClick={handleGuardarMotivo} style={{ width: 'auto', padding: '11px 26px' }}>
              💾 &nbsp;Guardar Motivo
            </Button>
            <Button variant="secondary" onClick={() => setTab('expediente')}>← Volver</Button>
          </div>
        </div>
      )}

      {/* ── Modal de autorización supervisora ── */}
      {authTipo && (
        <AutorizacionModal
          tipo={authTipo}
          onClose={() => { setAuthTipo(null); setAuthCb(null); }}
          onAutorizado={onAuthOk}
        />
      )}
    </div>
  );
}
