import { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Input, Select, Alert } from '../../ui/UI.jsx';
import { SectionTitle, FieldRow } from '../../ui/Card.jsx';
import {
  actualizarDatosPersonales,
  solicitarTokenVerificacion,
  verificarTokensActualizacion,
} from '../../../services/api.js';
import { useApp } from '../../../context/AppContext.jsx';
import s from './DatosPersonalesForm.module.css';

/* ══════════════════════════════════════════════════════════
   Campo de solo lectura — diseño diferenciado con badge
   "Sistema Central" para dejar claro que es dato de origen.
══════════════════════════════════════════════════════════ */
function ReadOnlyField({ label, value, mono }) {
  return (
    <div className={s.roField}>
      <div className={s.roLabel}>
        {label}
      </div>
      <div className={[s.roValue, mono ? s.roMono : ''].join(' ')}>
        {value || <span className={s.roEmpty}>—</span>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SECCIÓN DESPLEGABLE — encabezado clicable con animación
   suave. Inicia colapsada para mantener el formulario limpio.
══════════════════════════════════════════════════════════ */
function CollapsibleSection({ title, icon, summary, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={[s.collapsible, open ? s.collapsibleOpen : ''].join(' ')}>
      <button
        type="button"
        className={s.collapsibleHdr}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className={s.collapsibleIco}>{icon}</span>
        <span className={s.collapsibleTitle}>{title}</span>
        {!open && summary && (
          <span className={s.collapsibleSummary}>{summary}</span>
        )}
        <span className={[s.collapsibleChevron, open ? s.chevronUp : ''].join(' ')} aria-hidden>
          ▾
        </span>
      </button>
      <div className={s.collapsibleBody} style={{ display: open ? 'block' : 'none' }}>
        <div className={s.collapsibleInner}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TOKEN INPUT — 4 dígitos con auto-avance entre celdas.
══════════════════════════════════════════════════════════ */
function TokenInput({ value, onChange, disabled, label, id }) {
  const refs = [useRef(), useRef(), useRef(), useRef()];
  const digits = (value || '    ').split('').slice(0, 4);

  function handleKey(i, e) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = digits.map((d, idx) => (idx === i ? ' ' : d)).join('');
      onChange(next.replace(/ /g, '').padEnd(4, ' ').slice(0, 4));
      if (i > 0) refs[i - 1].current?.focus();
      return;
    }
    if (e.key === 'ArrowLeft' && i > 0) { refs[i - 1].current?.focus(); return; }
    if (e.key === 'ArrowRight' && i < 3) { refs[i + 1].current?.focus(); return; }
    if (!/^\d$/.test(e.key)) { e.preventDefault(); return; }
    e.preventDefault();
    const next = digits.map((d, idx) => (idx === i ? e.key : d)).join('');
    onChange(next);
    if (i < 3) refs[i + 1].current?.focus();
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    onChange(pasted.padEnd(4, ' '));
    refs[Math.min(pasted.length, 3)].current?.focus();
  }

  return (
    <div className={s.tokenWrap}>
      {label && <div className={s.tokenLabel}>{label}</div>}
      <div id={id} className={s.tokenRow}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d.trim()}
            disabled={disabled}
            className={[s.tokenCell, d.trim() ? s.tokenFilled : ''].join(' ')}
            onKeyDown={e => handleKey(i, e)}
            onPaste={handlePaste}
            onChange={() => { }}   /* controlled via onKeyDown */
            aria-label={`Dígito ${i + 1} de ${label}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MODAL DE DOBLE VERIFICACIÓN OTP
   Flujo:
     1. Usuario pulsa "Guardar Actualización"
     2. Backend envía código de 4 dígitos por SMS + por email
     3. Modal solicita ambos códigos
     4. Al confirmar ambos → ejecuta la actualización
══════════════════════════════════════════════════════════ */
function ModalVerificacion({ acc, formData, onClose, onVerificado }) {
  const [fase, setFase] = useState('enviando'); // enviando | ingresando | verificando | error
  const [tokenSms, setTokenSms] = useState('    ');
  const [tokenEmail, setTokenEmail] = useState('    ');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(120); // 2 min TTL
  const [demoToken, setDemoToken] = useState('');

  /* Envía los tokens al montar */
  useEffect(() => {
    enviarTokens();
  }, []);

  /* Countdown timer */
  useEffect(() => {
    if (fase !== 'ingresando') return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [fase, countdown]);

  const mm = String(Math.floor(countdown / 60)).padStart(2, '0');
  const ss = String(countdown % 60).padStart(2, '0');
  const expirado = countdown <= 0;

  async function enviarTokens() {
    setFase('enviando');
    setCountdown(120);
    setErrorMsg('');
    try {
      const r = await solicitarTokenVerificacion({
        accId: acc.codigo,
        telefono: formData.tel_celular || acc.tel_celular,
        email: formData.email || acc.email,
      });
      setDemoToken(r._demo_token || '');
      setFase('ingresando');
    } catch (e) {
      setErrorMsg(e.message);
      setFase('error');
    }
  }

  async function confirmar() {
    const sms = tokenSms.replace(/ /g, '');
    const email = tokenEmail.replace(/ /g, '');

    if (sms.length < 4) { setErrorMsg('Ingrese el código completo de 4 dígitos recibido por SMS.'); return; }
    if (expirado) { setErrorMsg('Los códigos han expirado. Solicite nuevos códigos.'); return; }

    setFase('verificando');
    setErrorMsg('');
    try {
      await verificarTokensActualizacion({ accId: acc.codigo, tokenSms: sms, tokenEmail: email });
      onVerificado();
    } catch (e) {
      setErrorMsg(e.message);
      setFase('ingresando');
    }
  }

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={s.modal}>

        {/* ── Cabecera ── */}
        <div className={s.modalHdr}>
          <div className={s.modalIco} aria-hidden>🔐</div>
          <div>
            <div id="modal-title" className={s.modalTtl}>Verificación de Identidad</div>
            <div className={s.modalSub}>Actualización de datos personales — Banco de los Trabajadores</div>
          </div>
        </div>

        {/* ── Cuerpo ── */}
        <div className={s.modalBody}>

          {/* Mensaje informativo de doble verificación */}
          <div className={s.infoBox}>
            <div className={s.infoBoxTitle}>🛡️ Doble verificación requerida</div>
            <p>
              Para proteger la integridad de su información, la actualización de datos personales
              requiere confirmar su identidad a través de <strong>dos canales independientes</strong>:
              mensaje de texto (SMS) y correo electrónico.
            </p>
            <p style={{ marginTop: 8 }}>
              Se ha enviado un código de <strong>4 dígitos</strong> a cada uno de sus medios de
              contacto registrados. Ambos códigos son necesarios para completar la actualización.
            </p>
          </div>

          {/* Destinos de envío */}
          <div className={s.destinosRow}>
            <div className={s.destino}>
              <span className={s.destinoIco}>📱</span>
              <div>
                <div className={s.destinoLbl}>SMS enviado a</div>
                <div className={s.destinoVal}>
                  {maskTel(formData.tel_celular || acc.tel_celular)}
                </div>
              </div>
            </div>
            <div className={s.destinoSep} />
            <div className={s.destino}>
              <span className={s.destinoIco}>✉️</span>
              <div>
                <div className={s.destinoLbl}>Email enviado a</div>
                <div className={s.destinoVal}>
                  {maskEmail(formData.email || acc.email)}
                </div>
              </div>
            </div>
          </div>

          {/* Demo token hint */}
          {demoToken && (
            <div className={s.demoBanner}>
              <span>🧪</span>
              <div>
                <strong>Modo demo:</strong> El mismo código sirve para ambos campos.
                Token generado: <code className={s.demoCode}>{demoToken}</code>
              </div>
            </div>
          )}

          {/* Estado: enviando */}
          {fase === 'enviando' && (
            <div className={s.enviandoWrap}>
              <span className={s.spinner} />
              <span>Enviando códigos de verificación…</span>
            </div>
          )}

          {/* Estado: ingresando / verificando */}
          {(fase === 'ingresando' || fase === 'verificando') && (
            <>
              {/* Timer */}
              <div className={[s.timer, expirado ? s.timerExp : ''].join(' ')}>
                <span className={s.timerIco}>{expirado ? '⏰' : '⏱️'}</span>
                {expirado
                  ? <span>Códigos expirados — solicite nuevos</span>
                  : <span>Los códigos expiran en <strong>{mm}:{ss}</strong></span>
                }
              </div>

              {errorMsg && (
                <div className={s.errorBanner} role="alert">
                  <span>⚠️</span>{errorMsg}
                </div>
              )}

              <div className={s.tokensGrid}>
                <TokenInput
                  id="token-sms"
                  label="Código SMS (4 dígitos)"
                  value={tokenSms}
                  onChange={setTokenSms}
                  disabled={fase === 'verificando' || expirado}
                />
              </div>

              <p className={s.reenvioHint}>
                ¿No recibió los códigos?{' '}
                {expirado
                  ? <button className={s.reenvioBtn} onClick={enviarTokens}>Solicitar nuevos códigos</button>
                  : <span style={{ color: 'var(--gray-400)' }}>Espere {mm}:{ss} para reenviar</span>
                }
              </p>
            </>
          )}

          {/* Estado: error de envío */}
          {fase === 'error' && (
            <div className={s.errorBanner} role="alert">
              <span>⚠️</span>
              {errorMsg}
              <button className={s.reenvioBtn} style={{ marginLeft: 12 }} onClick={enviarTokens}>
                Reintentar
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={s.modalFtr}>
          <Button variant="secondary" onClick={onClose} disabled={fase === 'verificando'}>
            Cancelar
          </Button>
          <Button
            variant="teal"
            loading={fase === 'verificando'}
            disabled={fase !== 'ingresando' || expirado ||
              tokenSms.trim().length < 4}
            onClick={confirmar}
            style={{ width: 'auto', padding: '11px 28px' }}
          >
            ✓ &nbsp;Confirmar y Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers de enmascarado ── */
function maskTel(tel) {
  if (!tel) return '—';
  const t = String(tel).replace(/\D/g, '');
  return t.length >= 4 ? `${'•'.repeat(t.length - 4)}${t.slice(-4)}` : '••••';
}
function maskEmail(email) {
  if (!email) return '—';
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

/* ══════════════════════════════════════════════════════════
   FORMULARIO PRINCIPAL
══════════════════════════════════════════════════════════ */
export default function DatosPersonalesForm({ acc }) {
  const { notify } = useApp();

  /* Campos editables en estado local */
  const [form, setForm] = useState({
    email: acc.email || '',
    tel_celular: acc.tel_celular || '',
  });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [saving, setSaving] = useState(false);

  const upd = useCallback((k, v) => setForm(p => ({ ...p, [k]: v })), []);

  /* 1. Guardar → abre modal de verificación */
  function handleGuardar() {
    if (!form.email.trim()) {
      notify('warning', 'El correo electrónico es obligatorio para la verificación.');
      return;
    }
    if (!form.tel_celular.trim()) {
      notify('warning', 'El número de celular es obligatorio para la verificación por SMS.');
      return;
    }
    setModalAbierto(true);
  }

  /* 2. Callback: ambos tokens válidos → actualizar */
  async function handleVerificado() {
    setModalAbierto(false);
    setSaving(true);
    try {
      await actualizarDatosPersonales(acc.codigo, { ...acc, ...form });
      notify('success', 'Datos personales actualizados correctamente. Vigencia renovada.');
    } catch (e) {
      notify('error', e.message);
    } finally {
      setSaving(false);
    }
  }

  /* Mapeos de solo lectura */
  const GENERO = { M: 'Masculino', F: 'Femenino' };
  const ESTADO_CIVIL = { C: 'Casado/a', S: 'Soltero/a', D: 'Divorciado/a', V: 'Viudo/a', U: 'Unido/a' };
  const ACTIVIDAD = { K6499: 'K6499 – Actividades Financieras', G4711: 'G4711 – Comercio' };
  const PROFESION = { ING: 'Ingeniero/a', ABG: 'Abogado/a', MED: 'Médico/a', ADM: 'Administrador/a' };
  const NIVEL = { UNI: 'Universitario', DIV: 'Diversificado', POS: 'Postgrado' };

  return (
    <div>
      <Alert type="info">
        Los campos marcados como provienen de RENAP y el core bancario —
        no son editables en este módulo. Solo los campos de contacto, dirección y datos laborales
        pueden actualizarse previa verificación de identidad.
      </Alert>

      {/* ── DATOS NO EDITABLES (Sistema Central) ── */}
      <CollapsibleSection
        icon="🔒"
        title="Datos Personales — Solo Lectura"
        summary="CARLOS MENDOZA ARRIAGA"
      >
        <FieldRow cols={4}>
          <ReadOnlyField label="Primer Nombre" value="CARLOS" />
          <ReadOnlyField label="Segundo Nombre" value="" />
          <ReadOnlyField label="Primer Apellido" value="MENDOZA" />
          <ReadOnlyField label="Segundo Apellido" value="ARRIAGA" />
        </FieldRow>
        <FieldRow cols={3}>
          <ReadOnlyField label="Apellido de Casada/o" value="" />
          <ReadOnlyField label="No. DPI" value={acc.dpi} mono />
          <ReadOnlyField label="NIT" value={acc.nit} mono />
        </FieldRow>
        <FieldRow cols={3}>
          <ReadOnlyField label="Fecha de Nacimiento" value={acc.fecha_nacimiento} />
          <ReadOnlyField label="Género" value={GENERO[acc.genero] || acc.genero} />
          <ReadOnlyField label="Estado Civil" value={ESTADO_CIVIL[acc.estado_civil] || acc.estado_civil} />
        </FieldRow>
        <FieldRow cols={3}>
          <ReadOnlyField label="Actividad Económica" value={ACTIVIDAD[acc.actividad_economica] || acc.actividad_economica} />
          <ReadOnlyField label="Profesión" value={PROFESION[acc.profesion] || acc.profesion} />
          <ReadOnlyField label="Nivel de Estudios" value={NIVEL[acc.nivel_estudios] || acc.nivel_estudios} />
        </FieldRow>
        <SectionTitle icon="📍">Dirección</SectionTitle>
        <FieldRow cols={3}>
          <Select label="País" value={form.pais} disabled onChange={() => { }}>
            <option value="GTM">Guatemala</option>
            <option value="HND">Honduras</option>
            <option value="MEX">México</option>
          </Select>
          <Select label="Departamento" value={form.cod_depto} disabled onChange={() => { }}>
            <option value="01">Guatemala</option>
            <option value="02">Sacatepéquez</option>
            <option value="03">Escuintla</option>
          </Select>
          <Select label="Municipio" value={form.cod_municipio} disabled onChange={() => { }}>
            <option value="101">Guatemala</option>
            <option value="102">Mixco</option>
            <option value="103">Villa Nueva</option>
          </Select>
        </FieldRow>
        <FieldRow cols={3}>
          <div style={{ gridColumn: '1 / 3' }}>
            <Input
              label="Dirección"
              readOnly
              value={form.direccion}
              onChange={() => { }}
            />
          </div>
          <Input
            label="Zona"
            mono
            readOnly
            value={form.zona}
            onChange={() => { }}
          />
        </FieldRow>
      </CollapsibleSection>

      {/* ── DATOS EDITABLES ── */}
      <CollapsibleSection
        icon="✏️"
        title="Contacto — Editable"
        variant="editable"
        defaultOpen
      >
        <div className={s.editNotice}>
          <span>✏️</span>
          Los siguientes campos pueden actualizarse. Al guardar se solicitará verificación
          de identidad por <strong>SMS</strong> y <strong>correo electrónico</strong>.
        </div>

        <FieldRow cols={2}>
          <Input
            label="Correo Electrónico"
            required
            type="email"
            value={form.email}
            onChange={e => upd('email', e.target.value)}
            hint="Se usará para el código de verificación"
          />
          <Input
            label="Teléfono Celular"
            mono
            required
            value={form.tel_celular}
            onChange={e => upd('tel_celular', e.target.value.replace(/\D/g, ''))}
            hint="Se usará para el código SMS"
          />
        </FieldRow>
      </CollapsibleSection>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Button
          variant="teal"
          size="md"
          loading={saving}
          onClick={handleGuardar}
          style={{ width: 'auto', padding: '12px 32px' }}
        >
          🔐 &nbsp;Guardar con Verificación
        </Button>
        <Button variant="secondary" onClick={() => setForm({
          email: acc.email || '',
          tel_celular: acc.tel_celular || '',
        })}>
          Restaurar
        </Button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: '.67rem', color: 'var(--gray-400)' }}>
          Última modificación: {acc.ultima_actualizacion}
        </span>
      </div>

      {/* Modal de doble verificación */}
      {modalAbierto && (
        <ModalVerificacion
          acc={acc}
          formData={form}
          onClose={() => setModalAbierto(false)}
          onVerificado={handleVerificado}
        />
      )}
    </div>
  );
}
