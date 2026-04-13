import { delay, genRef, today } from '../utils/helpers.js';
import {
  MOCK_ACCIONISTA, MOCK_ASAMBLEAS, MOCK_INVERSIONES, MOCK_TITULOS,
  MOCK_ESTADOS, MOCK_EXPEDIENTE_0080, MOCK_DETALLE_EXPEDIENTE,
  MOCK_MOTIVOS_RECHAZO, MOCK_PAISES, MOCK_DEPTOS, MOCK_MUNICIPIOS,
  MOCK_ACTIVIDADES, MOCK_PROFESIONES, MOCK_NIVELES,
  MOCK_LIMITACIONES_FUNCIONALES, MOCK_LIMITACION_ACCIONISTA,
  MOCK_ACOMPANANTE, MOCK_ACOMPANANTE_VALIDO,
} from '../data/mockData.js';

// ── Configuración ─────────────────────────────────────────────────────────────
// G-01 FIX: URL base sin /v1 — el backend ahora usa prefijo /api
const API   = import.meta.env.VITE_API_URL  || 'http://localhost:3001/api';
const MOCK  = import.meta.env.VITE_USE_MOCK !== 'false';

// G-02 FIX: clave de API y usuario para headers de autenticación
const API_KEY = import.meta.env.VITE_API_KEY || 'dev-frontend-key';

// G-09 FIX: la firma ahora va a través del backend Core (proxy)
// El frontend ya NO llama directamente al microservicio de firma.
// VITE_FIRMA_API_URL y VITE_FIRMA_CORE_KEY ya NO son necesarios en el frontend.

// ── Helper: cabeceras estándar ────────────────────────────────────────────────
// G-02 FIX: incluye X-Api-Key y X-Usuario en todas las llamadas
function getHeaders(extra = {}) {
  // El usuario activo se lee del AppContext vía sessionStorage
  // (se guarda allí por AppContext al hacer login)
  const usuario = sessionStorage.getItem('usuario_actual') || 'SISTEMA';
  return {
    'Content-Type':  'application/json',
    'X-Api-Key':     API_KEY,
    'X-Usuario':     usuario,   // G-16 FIX: trazabilidad de usuario
    ...extra,
  };
}

// ── Helper: llamada HTTP con desempaquetado de respuesta ──────────────────────
// G-03 FIX: desempaqueta { ok, data } si el backend lo devuelve envuelto
async function call(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    headers: getHeaders(opts.headers),
    ...opts,
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.message || `HTTP ${r.status}: ${r.statusText}`);
  }
  const json = await r.json();
  // G-03 FIX: desempaquetar envelope { ok: true, data: ... } si existe
  return (json && typeof json === 'object' && 'data' in json && 'ok' in json)
    ? json.data
    : json;
}

// ── Accionistas ───────────────────────────────────────────────────────────────

export async function getAccionistaPorDPI(dpi) {
  if (MOCK) {
    await delay(900);
    if (dpi.length < 5) throw new Error('DPI inválido o no encontrado');
    return { ...MOCK_ACCIONISTA, dpi };
  }
  // G-06 FIX: ruta correcta con query param
  return call(`/accionistas/buscar?dpi=${encodeURIComponent(dpi)}`);
}

export async function validarVigenciaActualizacion(accId) {
  if (MOCK) { await delay(300); return { vigente: true, fecha_actualizacion: '2025-01-15' }; }
  // G-10 FIX: ruta existente en el backend
  return call(`/accionistas/${accId}/vigencia`);
}

export async function actualizarDatosPersonales(id, datos) {
  if (MOCK) { await delay(800); return { ok: true, message: 'Datos actualizados correctamente.' }; }
  // G-17 FIX: usa PUT (el backend ahora tiene ambos PATCH y PUT)
  return call(`/accionistas/${id}/datos-personales`, {
    method: 'PUT', body: JSON.stringify(datos),
  });
}

export async function actualizarConflictoInteres(id, datos) {
  if (MOCK) { await delay(700); return { ok: true }; }
  // G-10 FIX: ruta alineada con PATCH /datos-editables (backend solo tiene campos editables)
  return call(`/accionistas/${id}/datos-editables`, {
    method: 'PATCH', body: JSON.stringify(datos),
  });
}

export async function getTitulos(id) {
  if (MOCK) { await delay(400); return MOCK_TITULOS; }
  // G-10 FIX: endpoint disponible en catalogos
  return call(`/accionistas/${id}/titulos`);
}

// ── Asambleas ─────────────────────────────────────────────────────────────────

export async function getAsambleasActivas() {
  if (MOCK) { await delay(500); return MOCK_ASAMBLEAS; }
  return call('/asambleas/activas');
}

export async function getDetalleInversion(asmId, accId) {
  if (MOCK) { await delay(400); return MOCK_INVERSIONES; }
  // G-10 FIX: asmId ahora es el campo `id` ('O|ASM-2025-01') que devuelve el backend
  return call(`/asambleas/${encodeURIComponent(asmId)}/detalle-inversion/${accId}`);
}

export async function validarDuplicidad(asmId, accId) {
  if (MOCK) { await delay(300); return { existe: false, expediente: null }; }
  // G-10 FIX: ruta con id de asamblea
  return call(`/asambleas/${encodeURIComponent(asmId)}/valida-accionista/${accId}`);
}

// ── Acreditación ACCFRM0081 ───────────────────────────────────────────────────

export async function acreditarEnAsamblea(payload) {
  if (MOCK) {
    await delay(1300);
    const expedientes = (payload.asambleas || []).map(a => ({
      asamblea: a.num || a.asamblea, expediente: genRef('EXP'),
      credencial: genRef('CRED'), fecha_entrega: today(),
    }));
    return { ok: true, expedientes, correlativos: expedientes };
  }
  // G-07 FIX: ruta correcta — POST /acreditacion (no /asambleas/acreditar)
  // El payload ahora incluye cod_estado y asambleas (el backend lo acepta)
  return call('/acreditacion', { method: 'POST', body: JSON.stringify(payload) });
}

// ── ACCFRM0080 — Expediente individual ───────────────────────────────────────

export async function getExpediente0080(asmId, accId) {
  if (MOCK) {
    await delay(600);
    if (accId && accId.startsWith('ACC')) return { ...MOCK_EXPEDIENTE_0080 };
    return null;
  }
  // G-10 FIX: ruta correcta con id de asamblea
  return call(`/asambleas/${encodeURIComponent(asmId)}/expediente/${accId}`);
}

export async function crearExpediente0080(payload) {
  if (MOCK) {
    await delay(800);
    const exp = Math.floor(Math.random() * 90000 + 10000);
    return { ok: true, expediente: exp, credencial: exp };
  }
  // G-10 FIX: creación va por acreditación individual (POST /acreditacion)
  return call('/acreditacion', { method: 'POST', body: JSON.stringify(payload) });
}

export async function actualizarExpediente0080(payload) {
  if (MOCK) { await delay(700); return { ok: true }; }
  const { tipoAsamblea, asamblea, expediente, tipoDocemitido, ...rest } = payload;
  return call(`/acreditacion/${tipoAsamblea}/${asamblea}/${expediente}/${tipoDocemitido}`, {
    method: 'PATCH', body: JSON.stringify(rest),
  });
}

export async function imprimirFormulario(expediente, acc) {
  if (MOCK) { await delay(600); return { ok: true, estado_nuevo: 2, fecha_recibido: today() }; }
  // Requiere tipoAsamblea, asamblea, tipoDocemitido — que vienen en el objeto exp
  const { tipoAsamblea, asamblea, tipoDocemitido } = acc || {};
  return call(
    `/expedientes/${tipoAsamblea}/${asamblea}/${expediente}/${tipoDocemitido || 1}/imprimir-formulario`,
    { method: 'POST', body: JSON.stringify({ accionista: acc }) },
  );
}

export async function imprimirCredencial(expediente) {
  if (MOCK) { await delay(600); return { ok: true, fecha_impresion: today() }; }
  return call(`/expedientes/O/default/${expediente}/1/imprimir-credencial`, { method: 'POST' });
}

export async function getDetalleExpediente(expediente) {
  if (MOCK) { await delay(400); return MOCK_DETALLE_EXPEDIENTE; }
  // G-10 FIX: endpoint disponible
  return call(`/expedientes/${expediente}/detalle`);
}

export async function guardarDetalleExpediente(expediente, filas) {
  if (MOCK) { await delay(600); return { ok: true }; }
  return call(`/expedientes/${expediente}/detalle`, {
    method: 'PUT', body: JSON.stringify(filas),
  });
}

export async function getMotivosRechazo(expediente) {
  if (MOCK) { await delay(300); return MOCK_MOTIVOS_RECHAZO; }
  // G-10 FIX: endpoint disponible
  return call(`/expedientes/${expediente}/motivos-rechazo`);
}

export async function guardarMotivoRechazo(expediente, motivo) {
  if (MOCK) { await delay(500); return { ok: true }; }
  return call(`/expedientes/${expediente}/motivos-rechazo`, {
    method: 'POST', body: JSON.stringify({ motivo }),
  });
}

export async function asociarVotos(payload) {
  if (MOCK) { await delay(800); return { ok: true, votos_propios: payload.votos_propios || 0, votos_ajenos: payload.votos_ajenos || 0 }; }
  return call('/expedientes/asociar-votos', { method: 'POST', body: JSON.stringify(payload) });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function validarSupervisor({ usuario, clave }) {
  if (MOCK) {
    await delay(1000);
    if (usuario === 'supervisor' && clave === '1234')
      return { autorizado: true, nombre: 'SUPERVISOR BANTRAB' };
    throw new Error('Credenciales incorrectas o usuario sin permisos de supervisor.');
  }
  // G-12 FIX: ruta correcta
  return call('/auth/supervisor', { method: 'POST', body: JSON.stringify({ usuario, clave }) });
}

// ── Catálogos ─────────────────────────────────────────────────────────────────
// G-10 FIX: todos los catálogos ahora tienen endpoint real en el backend

export async function getEstadosExpediente() {
  if (MOCK) { await delay(200); return MOCK_ESTADOS; }
  return call('/estados-expediente');
}
export async function getPaises() {
  if (MOCK) { await delay(150); return MOCK_PAISES; }
  return call('/catalogos/paises');
}
export async function getDeptos(pais) {
  if (MOCK) { await delay(150); return MOCK_DEPTOS.filter(d => d.pais === pais); }
  return call(`/catalogos/deptos?pais=${pais}`);
}
export async function getMunicipios(dep) {
  if (MOCK) { await delay(150); return MOCK_MUNICIPIOS.filter(m => m.depto === dep); }
  return call(`/catalogos/municipios?depto=${dep}`);
}
export async function getActividades() {
  if (MOCK) { await delay(150); return MOCK_ACTIVIDADES; }
  return call('/catalogos/actividades');
}
export async function getProfesiones() {
  if (MOCK) { await delay(150); return MOCK_PROFESIONES; }
  return call('/catalogos/profesiones');
}
export async function getNiveles() {
  if (MOCK) { await delay(150); return MOCK_NIVELES; }
  return call('/catalogos/niveles');
}

// ── Auditoría ─────────────────────────────────────────────────────────────────

export async function registrarHistorial(payload) {
  if (MOCK) { return { ok: true }; }
  // No existe endpoint formal en el backend — se omite silenciosamente
  return { ok: true };
}

// ── OTP doble verificación (actualización datos personales) ──────────────────
// G-11 FIX: ahora va a través del backend Core (no directo al microservicio)

export async function solicitarTokenVerificacion({ accId, telefono, email }) {
  if (MOCK) {
    await delay(1200);
    const token = Math.floor(1000 + Math.random() * 9000).toString();
    console.info(`[MOCK] Token → ${telefono} / ${email}: ${token}`);
    sessionStorage.setItem(`otp_${accId}`, token);
    return { ok: true, mensaje: 'Códigos enviados correctamente.', _demo_token: token };
  }
  return call(`/accionistas/${accId}/solicitar-verificacion`, {
    method: 'POST', body: JSON.stringify({ telefono, email }),
  });
}

export async function verificarTokensActualizacion({ accId, tokenSms, tokenEmail }) {
  if (MOCK) {
    await delay(800);
    const stored = sessionStorage.getItem(`otp_${accId}`);
    if (!stored) throw new Error('Los códigos han expirado. Solicite nuevos códigos.');
    if (tokenSms !== stored)
      throw new Error('Uno o ambos códigos son incorrectos. Verifique e intente nuevamente.');
    sessionStorage.removeItem(`otp_${accId}`);
    return { ok: true };
  }
  return call(`/accionistas/${accId}/verificar-tokens`, {
    method: 'POST',
    body: JSON.stringify({ token_sms: tokenSms, token_email: tokenEmail }),
  });
}

// ── Firma Digital — a través del backend Core (proxy) ─────────────────────────
// G-09 FIX: el frontend ya NO llama directamente al microservicio.
// Las funciones generarTokenFirma y consultarEstadoFirma usan el backend Core.

export async function generarTokenFirma({ solicitudId, accionistaId, accionista, dpi, accionesComunes, accionesPreferentes, dividendos }) {
  if (MOCK) {
    await delay(800);
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    sessionStorage.setItem(`firma_token_${solicitudId}`, JSON.stringify({
      token, solicitudId, accionistaId, expiresAt, ttlSeconds: 300, estado: 'ACTIVO', firmado: false,
    }));
    return { token, solicitudId, accionistaId, expiresAt, ttlSeconds: 300 };
  }
  // G-09 FIX: POST al backend Core (proxy), no al microservicio directamente
  return call('/firma/token', {
    method: 'POST',
    body: JSON.stringify({ solicitudId, accionistaId, accionista, dpi, accionesComunes, accionesPreferentes, dividendos }),
  });
}

export async function consultarEstadoFirma(solicitudId, token) {
  if (MOCK) {
    await delay(400);
    const raw = sessionStorage.getItem(`firma_token_${solicitudId}`);
    if (!raw) return { token, estado: 'NO_ENCONTRADO', ttlRemainingSeconds: 0 };
    const data = JSON.parse(raw);
    const ttlRemainingSeconds = Math.max(0, Math.floor((new Date(data.expiresAt) - Date.now()) / 1000));
    if (ttlRemainingSeconds === 0 && data.estado === 'ACTIVO') {
      data.estado = 'EXPIRADO';
      sessionStorage.setItem(`firma_token_${solicitudId}`, JSON.stringify(data));
    }
    return { token: data.token, estado: data.estado, solicitudId, ttlRemainingSeconds, firmado: data.firmado };
  }
  // G-09+G-20 FIX: consulta a través del backend Core (proxy)
  return call(`/firma/token/${token}/estado`);
}

// ── Limitación Funcional y Acompañante (HU-XXXX) ──────────────────────────────

export async function getLimitacionesFuncionales() {
  if (MOCK) { await delay(300); return MOCK_LIMITACIONES_FUNCIONALES; }
  return call('/catalogos/limitaciones-funcionales');
}

export async function getLimitacionAccionista(accId, asmId) {
  if (MOCK) {
    await delay(400);
    if (accId === MOCK_LIMITACION_ACCIONISTA.codigo) return MOCK_LIMITACION_ACCIONISTA;
    return null;
  }
  return call(`/accionistas/${accId}/limitacion-funcional?asamblea=${asmId}`);
}

export async function guardarLimitacionFuncional(accId, asmId, payload) {
  if (MOCK) { await delay(700); return { ok: true }; }
  return call(`/accionistas/${accId}/limitacion-funcional`, {
    method: 'POST', body: JSON.stringify({ asamblea: asmId, ...payload }),
  });
}

export async function getAcompanante(accId, asmId) {
  if (MOCK) { await delay(400); return MOCK_ACOMPANANTE; }
  return call(`/accionistas/${accId}/acompanante?asamblea=${asmId}`);
}

export async function validarAcompanante(dpiAcompanante, accIdTitular, asmId) {
  if (MOCK) {
    await delay(900);
    if (dpiAcompanante === MOCK_ACOMPANANTE_VALIDO.dpi) {
      if (MOCK_ACOMPANANTE_VALIDO.codigo === accIdTitular)
        throw new Error('El acompañante no puede ser el mismo accionista titular de la solicitud.');
      if (!MOCK_ACOMPANANTE_VALIDO.acreditado)
        throw new Error('El acompañante no se encuentra acreditado en esta asamblea.');
      return MOCK_ACOMPANANTE_VALIDO;
    }
    throw new Error('El DPI ingresado no corresponde a un accionista registrado en el sistema.');
  }
  return call('/accionistas/validar-acompanante', {
    method: 'POST',
    body: JSON.stringify({ dpi: dpiAcompanante, titular: accIdTitular, asamblea: asmId }),
  });
}

export async function guardarAcompanante(accId, asmId, acompananteId) {
  if (MOCK) { await delay(600); return { ok: true }; }
  return call(`/accionistas/${accId}/acompanante`, {
    method: 'POST', body: JSON.stringify({ asamblea: asmId, acompanante_id: acompananteId }),
  });
}

export async function eliminarAcompanante(accId, asmId) {
  if (MOCK) { await delay(500); return { ok: true }; }
  return call(`/accionistas/${accId}/acompanante`, {
    method: 'DELETE', body: JSON.stringify({ asamblea: asmId }),
  });
}

export async function exportarReporteLimitacion(asmId) {
  if (MOCK) {
    await delay(1000);
    const csv = ['DPI,Nombre,Expediente,No. Gestión,Limitación Funcional',
      '2456789012345,MENDOZA ARRIAGA CARLOS ROBERTO,12345,GES-001,Movilidad'].join('\n');
    return new Blob([csv], { type: 'text/csv;charset=utf-8' });
  }
  const r = await fetch(`${API}/reportes/limitacion-funcional?asamblea=${encodeURIComponent(asmId)}`, {
    headers: getHeaders(),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'Error al generar el reporte de limitaciones.'); }
  return r.blob();
}

export async function exportarReporteAcompanante(asmId) {
  if (MOCK) {
    await delay(1000);
    const csv = ['DPI,Nombre,Expediente,No. Gestión',
      '2456789012345,MENDOZA ARRIAGA CARLOS ROBERTO,12345,GES-001'].join('\n');
    return new Blob([csv], { type: 'text/csv;charset=utf-8' });
  }
  const r = await fetch(`${API}/reportes/acompanante-accionista?asamblea=${encodeURIComponent(asmId)}`, {
    headers: getHeaders(),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'Error al generar el reporte de acompañantes.'); }
  return r.blob();
}
