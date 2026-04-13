import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, MiniCheck, Checkbox, Tag, Alert, Spinner } from '../../ui/UI.jsx';
import { Card, CardHeader, CardBody, SectionTitle, FieldRow, StatCard } from '../../ui/Card.jsx';
import { Select, Input } from '../../ui/UI.jsx';
import AutorizacionModal from '../../auth/AutorizacionModal.jsx';
import {
  getAsambleasActivas, getDetalleInversion,
  acreditarEnAsamblea, getEstadosExpediente,
  generarTokenFirma, consultarEstadoFirma,
} from '../../../services/api.js';
import { useApp } from '../../../context/AppContext.jsx';
import { genRef, today } from '../../../utils/helpers.js';
import s from './AcreditacionWizard.module.css';

// ── Stepper ──────────────────────────────────────────────────
function Stepper({ step }) {
  const steps = ['Seleccionar Asambleas', 'Confirmar y Registrar'];
  return (
    <div className={s.stepper}>
      {steps.map((lbl, i) => (
        <div key={i} className={[s.step, step === i + 1 ? s.act : ''].join(' ')}>
          <span className={s.stepN}>{i + 1}</span>{lbl}
        </div>
      ))}
    </div>
  );
}

// ── Banner de token de firma ──────────────────────────────────
// Muestra el token generado, el tiempo restante y permite regenerar
// solo cuando el token ya expiró. Hace polling cada 5s para detectar
// cuando el accionista completa la firma en la tablet.
const TOKEN_TTL = 300; // segundos — debe coincidir con backend

function FirmaTokenBanner({ acc, solicitudId, onFirmaCompletada }) {
  const [tokenData, setTokenData] = useState(null);   // { token, expiresAt, ttlSeconds }
  const [estado, setEstado] = useState('idle');  // idle | generando | activo | expirado | completado
  const [ttlLeft, setTtlLeft] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const intervalRef = useRef(null);
  const pollRef = useRef(null);

  // ── Countdown local ────────────────────────────────────────
  const startCountdown = useCallback((seconds) => {
    clearInterval(intervalRef.current);
    setTtlLeft(seconds);
    intervalRef.current = setInterval(() => {
      setTtlLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setEstado('expirado');
          stopPoll();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── Polling de estado ──────────────────────────────────────
  const stopPoll = useCallback(() => clearInterval(pollRef.current), []);

  const startPoll = useCallback((token, solId) => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const res = await consultarEstadoFirma(solId, token);
        if (res.estado === 'USADO' || res.firmado) {
          stopPoll();
          clearInterval(intervalRef.current);
          setEstado('completado');
          onFirmaCompletada?.();
        } else if (res.estado === 'EXPIRADO' || res.ttlRemainingSeconds === 0) {
          stopPoll();
          clearInterval(intervalRef.current);
          setEstado('expirado');
          setTtlLeft(0);
        }
      } catch {
        // silencioso — el polling no debe interrumpir el flujo
      }
    }, 5000);
  }, [stopPoll, onFirmaCompletada]);

  // ── Generar token ──────────────────────────────────────────
  const generar = useCallback(async () => {
    setEstado('generando');
    setErrorMsg('');
    try {
      const res = await generarTokenFirma({
        solicitudId,
        accionistaId: acc.codigo,
        accionista: acc.nombre,
        dpi: acc.dpi,
        accionesComunes: acc.acciones_comunes,
        accionesPreferentes: acc.acciones_preferentes_a,
        dividendos: acc.dividendos ? `Q${Number(acc.dividendos).toLocaleString('es-GT', { minimumFractionDigits: 2 })}` : undefined,
      });
      setTokenData(res);
      setEstado('activo');
      startCountdown(res.ttlSeconds ?? TOKEN_TTL);
      startPoll(res.token, solicitudId);
    } catch (e) {
      setErrorMsg(e.message || 'Error al generar el token.');
      setEstado('idle');
    }
  }, [acc, solicitudId, startCountdown, startPoll]);

  // Limpiar timers al desmontar
  useEffect(() => () => { clearInterval(intervalRef.current); stopPoll(); }, [stopPoll]);

  // ── Formatear tiempo ───────────────────────────────────────
  const fmtTtl = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Render ─────────────────────────────────────────────────
  const pct = tokenData ? (ttlLeft / (tokenData.ttlSeconds ?? TOKEN_TTL)) * 100 : 0;
  const barColor = pct > 50 ? 'var(--teal)' : pct > 20 ? 'var(--amber)' : 'var(--red)';

  if (estado === 'completado') {
    return (
      <div className={s.tokenBanner} style={{ borderColor: 'var(--green)', background: 'rgba(16,185,129,.06)' }}>
        <div className={s.tokenBannerRow}>
          <span className={s.tokenIco}>✅</span>
          <div style={{ flex: 1 }}>
            <div className={s.tokenTitle} style={{ color: 'var(--green)' }}>Firma completada</div>
            <div className={s.tokenSub}>El accionista registró su rúbrica correctamente en la tablet.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.tokenBanner}>
      <div className={s.tokenBannerRow}>
        <span className={s.tokenIco}>✍️</span>
        <div style={{ flex: 1 }}>
          <div className={s.tokenTitle}>Firma digital de rúbrica</div>
          <div className={s.tokenSub}>
            Genere el token y entrégueselo al accionista para que lo ingrese en la tablet de firma.
          </div>
        </div>

        {/* Botón generar / regenerar */}
        {(estado === 'idle' || estado === 'expirado') && (
          <Button
            variant={estado === 'expirado' ? 'secondary' : 'teal'}
            size="sm"
            onClick={generar}
            style={{ flexShrink: 0 }}
          >
            {estado === 'expirado' ? '🔄 Regenerar token' : '🔑 Generar token'}
          </Button>
        )}

        {estado === 'generando' && <Spinner size="sm" />}
      </div>

      {errorMsg && (
        <div style={{ marginTop: 8, fontSize: '.73rem', color: 'var(--red)', paddingLeft: 36 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Token activo */}
      {(estado === 'activo') && tokenData && (
        <div className={s.tokenBody}>
          {/* Código */}
          <div className={s.tokenCode}>
            {tokenData.token.split('').map((d, i) => (
              <span key={i} className={s.tokenDigit}>{d}</span>
            ))}
          </div>

          {/* Countdown */}
          <div className={s.tokenTtlRow}>
            <span className={s.tokenTtlLabel}>Vigencia</span>
            <span className={s.tokenTtlVal} style={{ color: barColor }}>{fmtTtl(ttlLeft)}</span>
            <div className={s.tokenBar}>
              <div className={s.tokenBarFill} style={{ width: `${pct}%`, background: barColor }} />
            </div>
          </div>

          <div style={{ fontSize: '.68rem', color: 'var(--gray-400)', marginTop: 6, textAlign: 'center' }}>
            Esperando que el accionista firme en la tablet…
          </div>
        </div>
      )}

      {/* Token expirado */}
      {estado === 'expirado' && (
        <div style={{ marginTop: 10, padding: '8px 14px', background: 'rgba(239,68,68,.06)', borderRadius: 8, border: '1px solid rgba(239,68,68,.2)', fontSize: '.73rem', color: 'var(--red)' }}>
          ⏱ El token expiró. Regenere uno nuevo para que el accionista pueda firmar.
        </div>
      )}
    </div>
  );
}

// ── Step 1: Seleccionar asambleas ─────────────────────────────
function Step1({ acc, selected, inversiones, asambleas, onNext }) {
  const votos = inversiones.reduce((sum, inv) => sum + inv.cantidad, 0);

  return (
    <>
      <Alert type="info" style={{ marginBottom: 20 }}>
        Se ha indicado acreditación múltiple. El accionista será acreditado en las siguientes <strong>{asambleas.length}</strong> asambleas activas:
      </Alert>

      <SectionTitle icon="🏛️">Asambleas a Acreditar</SectionTitle>
      <Card style={{ marginBottom: 20, borderRadius: 16 }}>
        {asambleas.map(a => (
          <div
            key={a.id}
            className={[s.asmRow, s.asmSel].join(' ')}
            style={{ cursor: 'default' }}
          >
            <span className={[s.asmPill, a.tipo === 'O' ? s.pOrd : s.pExt].join(' ')}>
              {a.descripcion}
            </span>
            <div className={s.asmInfo} style={{ marginLeft: 12 }}>
              <div className={s.asmName}>{a.num} — {a.ordinal}</div>
              <div className={s.asmDate}>📅 {a.fecha}</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <Tag color="teal">✅ Seleccionada por default</Tag>
            </div>
          </div>
        ))}
      </Card>


      <div className={s.statsRow}>
        <StatCard label="Votos Propios" value={votos.toLocaleString()} color="teal" accent="var(--teal)" />
        <StatCard label="Votos Ajenos" value="0" color="" accent="var(--gray-200)" />
        <StatCard label="Total Votos" value={votos.toLocaleString()} color="gold" accent="var(--gold-dk)" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="teal" size="lg"
          disabled={selected.length === 0}
          onClick={onNext}
          style={{ width: 'auto', padding: '12px 32px' }}
        >
          Continuar →
        </Button>
      </div>
    </>
  );
}

// ── Step 2: Confirmar y Registrar ─────────────────────────────
// Cambios respecto al original:
//   - Se eliminó el bloque de Términos y Condiciones
//   - Se agregó el banner FirmaTokenBanner
//   - El botón "Confirmar Acreditación" solo se habilita cuando
//     el accionista completa la firma (estado === 'USADO')
function Step2({ acc, selected, asmDefs, solicitudId, onBack, onConfirmar, saving }) {
  const [estado, setEstado] = useState('1');
  const [estados, setEstados] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const [firmaOk, setFirmaOk] = useState(false);
  const [needAuth, setNeedAuth] = useState(false);

  useEffect(() => { getEstadosExpediente().then(setEstados); }, []);

  function handleConfirmar() {
    if (estado === '3') { setNeedAuth(true); return; }
    onConfirmar(estado);
  }

  const puedeConfirmar = confirm && firmaOk && !saving;

  return (
    <>
      <Alert type="info">
        Revise los datos antes de confirmar. Esta operación generará expedientes y credenciales para cada asamblea seleccionada.
      </Alert>

      <SectionTitle icon="📋">Datos de Acreditación</SectionTitle>
      <FieldRow cols={2}>
        <Select label="Estado del Expediente" required value={estado} onChange={e => setEstado(e.target.value)}>
          {estados.map(e => <option key={e.codigo} value={e.codigo}>{e.codigo} – {e.descripcion}</option>)}
        </Select>
        <Input label="Fecha de Entrega" readOnly mono value={today()} onChange={() => { }} />
      </FieldRow>

      <SectionTitle icon="👤">Accionista a Acreditar</SectionTitle>
      <div className={s.accBox}>
        <div className={s.accBoxItem}>
          <div className={s.accBoxLbl}>Nombre</div>
          <div className={s.accBoxVal}>{acc.nombre}</div>
        </div>
        <div className={s.accBoxItem}>
          <div className={s.accBoxLbl}>Código</div>
          <div className={s.accBoxVal} style={{ color: 'var(--teal-dk)' }}>{acc.codigo}</div>
        </div>
        <div className={s.accBoxItem}>
          <div className={s.accBoxLbl}>DPI</div>
          <div className={s.accBoxVal} style={{ fontFamily: 'monospace', color: 'var(--gray-500)' }}>{acc.dpi}</div>
        </div>
      </div>

      <SectionTitle icon="🏛️">Asambleas Seleccionadas</SectionTitle>
      {(asmDefs || []).filter(a => selected.includes(a.id)).map(a => (
        <div key={a.id} className={s.asmConfirm}>
          <Tag color="green">✓ Seleccionada</Tag>
          <span className={[s.asmPill, a.tipo === 'O' ? s.pOrd : s.pExt].join(' ')}>{a.descripcion}</span>
          <span className={s.asmConfirmName}>{a.num} — {a.ordinal}</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: '.68rem', color: 'var(--gray-400)' }}>
            {a.fecha}
          </span>
        </div>
      ))}

      {/* ── Banner de firma digital ─────────────────────────── */}
      <SectionTitle icon="✍️" style={{ marginTop: 20 }}>Firma Digital de Rúbrica</SectionTitle>
      <FirmaTokenBanner
        acc={acc}
        solicitudId={solicitudId}
        onFirmaCompletada={() => setFirmaOk(true)}
      />

      {estado === '3' && (
        <Alert type="warning" style={{ marginTop: 12 }}>
          El estado <strong>Suspendido</strong> requiere <strong>autorización de supervisor</strong> antes de confirmar.
        </Alert>
      )}

      {/* Checkbox de confirmación — sin T&C */}
      <div style={{ marginTop: 16, marginBottom: 20 }}>
        <Checkbox
          label={<>Confirmo que deseo acreditar a <strong>{acc.nombre}</strong> en la(s) asamblea(s) seleccionadas.</>}
          checked={confirm}
          onChange={setConfirm}
        />
      </div>

      {/* Aviso cuando la firma aún no se ha completado */}
      {!firmaOk && (
        <Alert type="warning" style={{ marginBottom: 12 }}>
          El botón de confirmación se habilitará una vez que el accionista complete la firma en la tablet.
        </Alert>
      )}

      <hr style={{ border: 'none', borderTop: '1.5px solid var(--gray-100)', margin: '20px 0' }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="secondary" onClick={onBack}>← Volver</Button>
        <Button
          variant="teal" size="lg"
          disabled={!puedeConfirmar}
          loading={saving}
          onClick={handleConfirmar}
          style={{ width: 'auto', padding: '12px 32px' }}
        >
          🎫 &nbsp;Confirmar Acreditación
        </Button>
      </div>

      {needAuth && (
        <AutorizacionModal
          tipo="CAMBIO ESTADO EXPEDIENTE"
          onClose={() => setNeedAuth(false)}
          onAutorizado={() => { setNeedAuth(false); onConfirmar(estado); }}
        />
      )}
    </>
  );
}

// ── Step 3: Resultado ─────────────────────────────────────────
function Step3({ resultado, onReset }) {
  return (
    <div className={s.success}>
      <div className={s.sucEm}>🎫</div>
      <div className={s.sucTtl}>¡Acreditación <span style={{ color: 'var(--teal-dk)' }}>Exitosa</span>!</div>
      <div className={s.sucSub}>
        El accionista fue acreditado correctamente en {resultado.expedientes.length} asamblea(s).
      </div>
      <Card style={{ textAlign: 'left', maxWidth: 560, margin: '0 auto 28px', borderRadius: 16 }}>
        <CardHeader title="📦 Expedientes Generados" />
        <CardBody style={{ padding: 0 }}>
          <table className={s.tbl} style={{ margin: 0 }}>
            <thead>
              <tr><th>Asamblea</th><th>Expediente</th><th>Credencial</th><th>Entrega</th></tr>
            </thead>
            <tbody>
              {resultado.expedientes.map((e, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: '.74rem' }}>{e.asamblea}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '.74rem', color: 'var(--teal-dk)', fontWeight: 700 }}>{e.expediente}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '.74rem', color: 'var(--pink)', fontWeight: 700 }}>{e.credencial}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '.74rem' }}>{e.fecha_entrega}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <Button variant="teal" size="lg" onClick={onReset} style={{ width: 'auto', padding: '12px 28px' }}>
          ← Nueva Consulta
        </Button>
        <Button variant="secondary">🖨️ Imprimir</Button>
      </div>
    </div>
  );
}

// ── WIZARD ROOT ───────────────────────────────────────────────
export default function AcreditacionWizard({ acc, onClose }) {
  const { notify } = useApp();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState([]);
  const [inversiones, setInv] = useState([]);
  const [asmDefs, setAsmDefs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [resultado, setResult] = useState(null);

  // solicitudId estable por sesión de acreditación
  const solicitudId = useRef(genRef('SOL')).current;

  useEffect(() => {
    getAsambleasActivas().then(list => {
      setAsmDefs(list);
      setSelected(list.map(a => a.id)); // Seleccionadas todas por default
    });
    getDetalleInversion(null, acc.codigo).then(setInv);
  }, [acc.codigo]);

  const toggleAsm = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  async function confirmar(estado) {
    setSaving(true);
    try {
      const asmSel = asmDefs.filter(a => selected.includes(a.id));
      const res = await acreditarEnAsamblea({ accionista: acc.codigo, cod_estado: estado, asambleas: asmSel });
      setResult(res);
      setStep(3);
      notify('success', `Acreditación completada en ${res.expedientes.length} asamblea(s).`);
    } catch (e) {
      notify('error', e.message);
    } finally { setSaving(false); }
  }

  return (
    <>
      {step < 3 && <Stepper step={step} />}

      {step === 1 && (
        <Step1
          acc={acc}
          selected={selected}
          inversiones={inversiones}
          asambleas={asmDefs}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <Step2
          acc={acc}
          selected={selected}
          asmDefs={asmDefs}
          solicitudId={solicitudId}
          onBack={() => setStep(1)}
          onConfirmar={confirmar}
          saving={saving}
        />
      )}
      {step === 3 && resultado && (
        <Step3 resultado={resultado} onReset={onClose} />
      )}
    </>
  );
}
