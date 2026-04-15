import { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Input, Select, Alert } from '../../ui/UI.jsx';
import { FieldRow } from '../../ui/Card.jsx';
import {
  actualizarDatosPersonales,
  solicitarTokenVerificacion,
  verificarTokensActualizacion,
} from '../../../services/api.js';
import { useApp } from '../../../context/AppContext.jsx';
import s from './DatosPersonalesForm.module.css';

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
            onChange={() => { }}
            aria-label={`Dígito ${i + 1} de ${label}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MODAL DE VERIFICACIÓN OTP
══════════════════════════════════════════════════════════ */
function ModalVerificacion({ acc, formData, onClose, onVerificado }) {
  const [fase, setFase] = useState('enviando');
  const [tokenSms, setTokenSms] = useState('    ');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(120);
  const [demoToken, setDemoToken] = useState('');

  useEffect(() => { enviarTokens(); }, []);

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
    if (sms.length < 4) { setErrorMsg('Ingrese el código completo de 4 dígitos recibido por SMS.'); return; }
    if (expirado) { setErrorMsg('Los códigos han expirado. Solicite nuevos códigos.'); return; }
    setFase('verificando');
    setErrorMsg('');
    try {
      await verificarTokensActualizacion({ accId: acc.codigo, tokenSms: sms, tokenEmail: sms });
      onVerificado();
    } catch (e) {
      setErrorMsg(e.message);
      setFase('ingresando');
    }
  }

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={s.modal}>
        <div className={s.modalHdr}>
          <div className={s.modalIco} aria-hidden>🔐</div>
          <div>
            <div id="modal-title" className={s.modalTtl}>Verificación de Identidad</div>
            <div className={s.modalSub}>Actualización de datos — Banco de los Trabajadores</div>
          </div>
        </div>

        <div className={s.modalBody}>
          <div className={s.infoBox}>
            <div className={s.infoBoxTitle}>🛡️ Verificación requerida</div>
            <p>Se enviará un código de <strong>4 dígitos</strong> por SMS al número de celular registrado para confirmar la actualización.</p>
          </div>

          {demoToken && (
            <div className={s.demoBanner}>
              <span>🧪</span>
              <div>
                <strong>Modo demo:</strong> Token generado: <code className={s.demoCode}>{demoToken}</code>
              </div>
            </div>
          )}

          {fase === 'enviando' && (
            <div className={s.enviandoWrap}>
              <span className={s.spinner} />
              <span>Enviando código de verificación…</span>
            </div>
          )}

          {(fase === 'ingresando' || fase === 'verificando') && (
            <>
              <div className={[s.timer, expirado ? s.timerExp : ''].join(' ')}>
                <span className={s.timerIco}>{expirado ? '⏰' : '⏱️'}</span>
                {expirado
                  ? <span>Código expirado — solicite uno nuevo</span>
                  : <span>Expira en <strong>{mm}:{ss}</strong></span>
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
                ¿No recibió el código?{' '}
                {expirado
                  ? <button className={s.reenvioBtn} onClick={enviarTokens}>Solicitar nuevo código</button>
                  : <span style={{ color: 'var(--gray-400)' }}>Espere {mm}:{ss} para reenviar</span>
                }
              </p>
            </>
          )}

          {fase === 'error' && (
            <div className={s.errorBanner} role="alert">
              <span>⚠️</span>{errorMsg}
              <button className={s.reenvioBtn} style={{ marginLeft: 12 }} onClick={enviarTokens}>Reintentar</button>
            </div>
          )}
        </div>

        <div className={s.modalFtr}>
          <Button variant="secondary" onClick={onClose} disabled={fase === 'verificando'}>Cancelar</Button>
          <Button
            variant="teal"
            loading={fase === 'verificando'}
            disabled={fase !== 'ingresando' || expirado || tokenSms.trim().length < 4}
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

/* ══════════════════════════════════════════════════════════
   ACORDEÓN — sección desplegable reutilizable
══════════════════════════════════════════════════════════ */
function Acordeon({ id, icon, title, accent = 'var(--teal)', badge, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={s.acordeon}>
      {/* Cabecera */}
      <button
        id={id}
        type="button"
        className={s.acordeonHdr}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={`${id}-body`}
      >
        <span className={s.acordeonAccent} style={{ background: accent }} />
        <span className={s.acordeonIco} aria-hidden>{icon}</span>
        <span className={s.acordeonTitle}>{title}</span>
        {badge && <span className={s.acordeonBadge}>{badge}</span>}
        <span className={[s.acordeonChevron, open ? s.acordeonChevronOpen : ''].join(' ')} aria-hidden>
          ›
        </span>
      </button>

      {/* Cuerpo animado */}
      <div
        id={`${id}-body`}
        className={[s.acordeonBody, open ? s.acordeonBodyOpen : ''].join(' ')}
        role="region"
        aria-labelledby={id}
      >
        <div className={s.acordeonInner}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FORMULARIO PRINCIPAL
══════════════════════════════════════════════════════════ */
export default function DatosPersonalesForm({ acc }) {
  const { notify } = useApp();

  const [form, setForm] = useState({
    email:         acc.email         || '',
    tel_celular:   acc.tel_celular   || '',
    tel_casa:      acc.tel_casa      || '',
    tel_trabajo:   acc.tel_trabajo   || '',
    nit:           acc.nit           || '',
    lugar_trabajo: acc.lugar_trabajo || '',
    pais:          acc.pais          || 'GTM',
    cod_depto:     acc.cod_depto     || '',
    cod_municipio: acc.cod_municipio || '',
    direccion:     acc.direccion     || '',
    zona:          acc.zona          || '',
  });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [saving, setSaving] = useState(false);

  const upd = useCallback((k, v) => setForm(p => ({ ...p, [k]: v })), []);

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

  async function handleVerificado() {
    setModalAbierto(false);
    setSaving(true);
    try {
      await actualizarDatosPersonales(acc.codigo, { ...acc, ...form });
      notify('success', 'Datos personales actualizados correctamente.');
    } catch (e) {
      notify('error', e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleRestaurar() {
    setForm({
      email:         acc.email         || '',
      tel_celular:   acc.tel_celular   || '',
      tel_casa:      acc.tel_casa      || '',
      tel_trabajo:   acc.tel_trabajo   || '',
      nit:           acc.nit           || '',
      lugar_trabajo: acc.lugar_trabajo || '',
      pais:          acc.pais          || 'GTM',
      cod_depto:     acc.cod_depto     || '',
      cod_municipio: acc.cod_municipio || '',
      direccion:     acc.direccion     || '',
      zona:          acc.zona          || '',
    });
  }

  return (
    <div className={s.formRoot}>

      {/* Aviso global de edición */}
      <div className={s.editNotice}>
        <span>✏️</span>
        Los campos a continuación son editables. Al guardar, se solicitará verificación de identidad
        por <strong>SMS</strong> y <strong>correo electrónico</strong>.
      </div>

      {/* ── ACORDEÓN CONTACTO ── */}
      <Acordeon
        id="sec-contacto"
        icon="📞"
        title="Contacto"
        badge="EDITABLE"
        accent="var(--teal)"
        defaultOpen={true}
      >
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

        <FieldRow cols={2}>
          <Input
            label="Teléfono Casa"
            mono
            value={form.tel_casa}
            onChange={e => upd('tel_casa', e.target.value.replace(/\D/g, ''))}
          />
          <Input
            label="Teléfono Trabajo"
            mono
            value={form.tel_trabajo}
            onChange={e => upd('tel_trabajo', e.target.value.replace(/\D/g, ''))}
          />
        </FieldRow>

        <FieldRow cols={2}>
          <Input
            label="NIT"
            mono
            value={form.nit}
            onChange={e => upd('nit', e.target.value)}
          />
          <Input
            label="Lugar de Trabajo"
            value={form.lugar_trabajo}
            onChange={e => upd('lugar_trabajo', e.target.value)}
          />
        </FieldRow>
      </Acordeon>

      {/* ── ACORDEÓN DIRECCIÓN ── */}
      <Acordeon
        id="sec-direccion"
        icon="📍"
        title="Dirección"
        badge="EDITABLE"
        accent="var(--corp-magenta, #e91e63)"
        defaultOpen={true}
      >
        <FieldRow cols={2}>
          <Select
            label="País"
            value={form.pais}
            onChange={e => upd('pais', e.target.value)}
          >
            <option value="GTM">Guatemala</option>
            <option value="HND">Honduras</option>
            <option value="MEX">México</option>
          </Select>
          <Select
            label="Departamento"
            value={form.cod_depto}
            onChange={e => upd('cod_depto', e.target.value)}
          >
            <option value="01">Guatemala</option>
            <option value="02">Sacatepéquez</option>
            <option value="03">Escuintla</option>
          </Select>
        </FieldRow>

        <FieldRow cols={2}>
          <Select
            label="Municipio"
            value={form.cod_municipio}
            onChange={e => upd('cod_municipio', e.target.value)}
          >
            <option value="101">Guatemala</option>
            <option value="102">Mixco</option>
            <option value="103">Villa Nueva</option>
          </Select>
          <Input
            label="Zona"
            mono
            value={form.zona}
            onChange={e => upd('zona', e.target.value.replace(/\D/g, ''))}
          />
        </FieldRow>

        <FieldRow cols={1}>
          <Input
            label="Dirección completa"
            required
            value={form.direccion}
            onChange={e => upd('direccion', e.target.value)}
          />
        </FieldRow>
      </Acordeon>

      {/* ── ACCIONES ── */}
      <div className={s.actions}>
        <Button
          id="btn-guardar-datos"
          variant="teal"
          size="md"
          loading={saving}
          onClick={handleGuardar}
          style={{ width: 'auto', padding: '12px 32px' }}
        >
          🔐 &nbsp;Guardar con Verificación
        </Button>
        <Button variant="secondary" onClick={handleRestaurar}>
          Restaurar
        </Button>
        <span style={{ flex: 1 }} />
        {acc.ultima_actualizacion && (
          <span style={{ fontSize: '.67rem', color: 'var(--gray-400)' }}>
            Última modificación: {acc.ultima_actualizacion}
          </span>
        )}
      </div>

      {/* Modal de verificación */}
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
