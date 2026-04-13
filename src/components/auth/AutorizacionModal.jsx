import { useState, useRef, useEffect } from 'react';
import { Button, Input, Alert } from '../ui/UI.jsx';
import { validarSupervisor } from '../../services/api.js';
import s from './AutorizacionModal.module.css';

/**
 * AUTORIZACION block — ACEPTAR_LOG.WHEN-BUTTON-PRESSED (ACCFRM0080)
 * Valida: ACCUSUARIO.FLAGCOORDINADOR='S' OR FLAGJEFEDEPTO='S'
 *
 * 5 tipos ACCFRM0080:
 *  [1] CAMBIO ESTADO EXPEDIENTE       — estado < estado_actual → go_block('AUTORIZACION')
 *  [2] ENTREGA EXTRAORDINARIA         — fecha entrega fuera de rango (error 116)
 *  [3] REIMPRESION DE CREDENCIAL      — estado_impresion='S' (error 703)
 *  [4] CREDENCIAL FUERA DE RANGO      — fuera rango fechas credencial (error 702)
 *  [5] ACREDITA CON ACCION PREFERENTE — ndbi_ind_preferente=1 (AC_PRC_VALIDA_PREFERENTE)
 */
const TIPO_META = {
  'CAMBIO ESTADO EXPEDIENTE': {
    ico: '🔄', c: 'amber',
    desc: 'El nuevo estado es MENOR al estado actual del expediente. Se requiere autorización de supervisor (FLAGCOORDINADOR / FLAGJEFEDEPTO) para revertir el estado. [ESTADO_EXPEDIENTE.KEY-NEXT-ITEM]',
  },
  'ENTREGA EXTRAORDINARIA': {
    ico: '📅', c: 'amber',
    desc: 'Fecha de entrega FUERA del rango parametrizado (FECHA_ENTREGAEXPED_DESDE / HASTA). Error 116: "Fechas para Entrega de Expedientes ha Expirado o es incorrecta." [FECHA_ENTREGA.KEY-NEXT-ITEM]',
  },
  'REIMPRESION DE CREDENCIAL': {
    ico: '🖨️', c: 'amber',
    desc: 'La credencial ya fue impresa anteriormente (ESTADO_IMPRESION = S). Error 703: "La impresión ya fue realizada una vez." Se requiere autorización para reimprimir. [BTN_CREDENCIAL]',
  },
  'CREDENCIAL FUERA DE RANGO': {
    ico: '📅', c: 'red',
    desc: 'Fecha actual FUERA del rango de entrega de credenciales (FECHA_ENTREGACRED_DESDE / HASTA). Error 702. [BTN_CREDENCIAL]',
  },
  'ACREDITA CON ACCION PREFERENTE': {
    ico: '⭐', c: 'pink',
    desc: 'El accionista posee acciones preferentes (ndbi_ind_preferente = 1). Requiere autorización especial. [AC_PRC_VALIDA_PREFERENTE → P_VER_PREGUNTA(102)]',
  },
  'ACTUALIZACION SIN EMAIL': {
    ico: '✉️', c: 'amber',
    desc: 'La casilla de correo electrónico está vacía. Se requiere autorización del supervisor para continuar. [ACCFRM0803]',
  },
};

export default function AutorizacionModal({ tipo, onClose, onAutorizado }) {
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const meta = TIPO_META[tipo] || { ico: '🔐', c: 'amber', desc: tipo };


  async function submit(e) {
    e?.preventDefault();
    if (!usuario.trim()) { setError('Debe ingresar el usuario supervisor.'); return; }
    if (!clave.trim()) { setError('Debe ingresar la contraseña.'); return; }
    setLoading(true); setError('');
    try {
      const res = await validarSupervisor({ usuario: usuario.trim(), clave });
      onAutorizado(res);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className={s.modal}>
        <div className={s.hdr}>
          <div className={[s.ico, s[`ico-${meta.c}`]].join(' ')} aria-hidden>{meta.ico}</div>
          <div>
            <div id="auth-title" className={s.ttl}>Autorización Requerida</div>
            <div className={s.sub}>{tipo}</div>
          </div>
        </div>
        <form className={s.body} onSubmit={submit}>
          <Alert type="warning">
            {meta.desc}
            <br /><br />
            <strong>Demo:</strong> usuario <code>supervisor</code> / clave <code>1234</code>
          </Alert>
          {error && <Alert type="error">{error}</Alert>}
          <Input ref={ref} label="Usuario Supervisor" required mono placeholder="usuario.supervisor"
            value={usuario} onChange={e => setUsuario(e.target.value)} autoComplete="username" />
          <Input label="Contraseña" required mono type="password" placeholder="••••••••"
            value={clave} onChange={e => setClave(e.target.value)}
            autoComplete="current-password" onKeyDown={e => e.key === 'Enter' && submit()} />
        </form>
        <div className={s.ftr}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="pink" onClick={submit} loading={loading}>✓ &nbsp;Autorizar</Button>
        </div>
      </div>
    </div>
  );
}
