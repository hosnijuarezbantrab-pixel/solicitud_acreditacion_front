import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Alert, Tag, Spinner, MiniCheck, Checkbox } from '../../ui/UI.jsx';
import { SectionTitle, StatCard } from '../../ui/Card.jsx';
import { useApp } from '../../../context/AppContext.jsx';
import {
  getLimitacionesFuncionales,
  getLimitacionAccionista,
  guardarLimitacionFuncional,
  getAcompanante,
  validarAcompanante,
  guardarAcompanante,
  eliminarAcompanante,
  getAsambleasActivas,
  getDetalleInversion,
  exportarReporteLimitacion,
  exportarReporteAcompanante,
  generarTokenFirma,
  consultarEstadoFirma,
  acreditarEnAsamblea,
  getEstadosExpediente,
} from '../../../services/api.js';
import { genRef } from '../../../utils/helpers.js';
import s from './ParticipacionForm.module.css';

// ── Selector múltiple de limitaciones funcionales ─────────────
function LimitacionSelector({ opciones, seleccionadas, onChange, disabled }) {
  function toggle(codigo) {
    if (disabled) return;
    const next = seleccionadas.includes(codigo)
      ? seleccionadas.filter(c => c !== codigo)
      : [...seleccionadas, codigo];
    onChange(next);
  }
  return (
    <div className={s.chipGrid}>
      {opciones.map(op => {
        const on = seleccionadas.includes(op.codigo);
        return (
          <button
            key={op.codigo}
            type="button"
            disabled={disabled}
            className={[s.limitChip, on ? s.limitChipOn : ''].join(' ')}
            onClick={() => toggle(op.codigo)}
            aria-pressed={on}
          >
            <span className={s.limitIco} aria-hidden>
              {op.codigo === 'AUD' ? '🦻' : op.codigo === 'VIS' ? '👁️' : op.codigo === 'MOV' ? '♿' : '🗣️'}
            </span>
            {op.descripcion}
          </button>
        );
      })}
    </div>
  );
}

// ── Sección Limitación Funcional ──────────────────────────────
function SeccionLimitacion({ acc, asmIds }) {
  const { notify } = useApp();
  const [opcionesFull, setOpcionesFull] = useState([]);
  const [opciones, setOpciones] = useState([]);
  const [seleccionadas, setSelec] = useState([]);
  const [original, setOriginal] = useState([]);
  const [observaciones, setObs] = useState('');
  const [obsOriginal, setObsOrig] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (asmIds.length === 0) { setLoading(false); return; }

    Promise.all([
      getLimitacionesFuncionales(),
      ...asmIds.map(id => getLimitacionAccionista(acc.codigo, id))
    ]).then(([cats, ...regs]) => {
      if (!mounted) return;
      setOpcionesFull(cats || []);
      setOpciones((cats || []).filter(c => c.activo));

      const mergedLims = new Set();
      let mergedObs = '';
      regs.forEach(reg => {
        if (reg) {
          (reg.limitaciones || []).forEach(l => mergedLims.add(l));
          if (reg.observaciones) {
            if (!mergedObs.includes(reg.observaciones)) {
              mergedObs = mergedObs ? `${mergedObs}\n${reg.observaciones}` : reg.observaciones;
            }
          }
        }
      });

      const finalLims = Array.from(mergedLims);
      setSelec(finalLims);
      setOriginal(finalLims);
      setObs(mergedObs);
      setObsOrig(mergedObs);
      setLoading(false);
    }).catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [acc.codigo, JSON.stringify(asmIds)]);

  const dirty = JSON.stringify(seleccionadas.slice().sort()) !== JSON.stringify(original.slice().sort())
    || observaciones !== obsOriginal;

  async function handleGuardar() {
    setSaving(true);
    try {
      await Promise.all(
        asmIds.map(id =>
          guardarLimitacionFuncional(acc.codigo, id, { limitaciones: seleccionadas, observaciones })
        )
      );
      setOriginal(seleccionadas);
      setObsOrig(observaciones);
      notify('success', 'Limitación funcional guardada correctamente.');
    } catch (e) {
      notify('error', e.message);
    } finally { setSaving(false); }
  }

  function handleDescartar() { setSelec(original); setObs(obsOriginal); }

  async function handleExportar() {
    setExporting(true);
    try {
      if (!asmIds.length) throw new Error('Seleccione al menos una asamblea.');
      for (const id of asmIds) {
        const blob = await exportarReporteLimitacion(id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `reporte_limitacion_funcional_${id}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
      }
    } catch (e) { notify('error', e.message); }
    finally { setExporting(false); }
  }

  if (loading) return <div className={s.loadWrap}><Spinner /> Cargando datos…</div>;

  return (
    <div>
      <div className={s.secHeader}>
        <SectionTitle icon="♿">Limitación Funcional</SectionTitle>
      </div>

      <Alert type="info" style={{ marginBottom: 16 }}>
        Registre las limitaciones funcionales del accionista si aplica.
      </Alert>

      <LimitacionSelector opciones={opciones} seleccionadas={seleccionadas} onChange={setSelec} />

      {seleccionadas.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <label className={s.obsLabel}>Observaciones (opcional)</label>
          <textarea
            className={s.obsInput} rows={2} maxLength={300}
            placeholder="Información adicional sobre la limitación funcional…"
            value={observaciones}
            onChange={e => setObs(e.target.value)}
          />
          <div className={s.obsCount}>{observaciones.length}/300</div>
        </div>
      )}

      {dirty && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Button variant="teal" size="md" loading={saving} onClick={handleGuardar}
            style={{ width: 'auto', padding: '11px 28px' }}>
            💾 &nbsp;Guardar
          </Button>
          <Button variant="ghost" size="md" onClick={handleDescartar}>Descartar cambios</Button>
        </div>
      )}

      {!dirty && original.length === 0 && (
        <p className={s.emptyHint}>No se ha registrado ninguna limitación funcional.</p>
      )}

      {!dirty && original.length > 0 && (
        <div className={s.savedRow}>
          <span className={s.savedIco}>✅</span>
          <span>Limitaciones registradas: </span>
          {original.map(c => {
            const op = opcionesFull.find(o => o.codigo === c);
            return <Tag key={c} color="teal">{op?.descripcion ?? c}</Tag>;
          })}
        </div>
      )}
    </div>
  );
}

// ── Sección Acompañante Accionista ───────────────────────────
function SeccionAcompanante({ acc, asmIds }) {
  const { notify } = useApp();
  const [acompanante, setAcomp] = useState(undefined);
  const [dpiInput, setDpiInput] = useState('');
  const [candidato, setCandidato] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [confirmando, setConfirm] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const firstAsmId = asmIds.length > 0 ? asmIds[0] : null;
    if (!firstAsmId) { setAcomp(null); return; }
    getAcompanante(acc.codigo, firstAsmId)
      .then(res => { if (mounted) setAcomp(res ?? null); })
      .catch(() => { if (mounted) setAcomp(null); });
    return () => { mounted = false; };
  }, [acc.codigo, JSON.stringify(asmIds)]);

  async function handleBuscar() {
    if (dpiInput.trim().length < 5) { setErrorMsg('Ingrese un DPI válido (mínimo 5 dígitos).'); return; }
    setBuscando(true); setErrorMsg(''); setCandidato(null);
    try {
      const res = await Promise.all(asmIds.map(id => validarAcompanante(dpiInput.trim(), acc.codigo, id)));
      setCandidato(res[0]);
    } catch (e) { setErrorMsg(e.message); }
    finally { setBuscando(false); }
  }

  async function handleConfirmar() {
    setConfirm(true);
    try {
      await Promise.all(asmIds.map(id => guardarAcompanante(acc.codigo, id, candidato.codigo)));
      setAcomp(candidato); setCandidato(null); setDpiInput('');
      notify('success', 'Acompañante accionista registrado correctamente.');
    } catch (e) { notify('error', e.message); }
    finally { setConfirm(false); }
  }

  async function handleEliminar() {
    setEliminando(true);
    try {
      await Promise.all(asmIds.map(id => eliminarAcompanante(acc.codigo, id)));
      setAcomp(null); notify('success', 'Acompañante removido.');
    } catch (e) { notify('error', e.message); }
    finally { setEliminando(false); }
  }

  async function handleExportar() {
    setExporting(true);
    try {
      if (!asmIds.length) throw new Error('Seleccione al menos una asamblea.');
      for (const id of asmIds) {
        const blob = await exportarReporteAcompanante(id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `reporte_acompanante_${id}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
      }
    } catch (e) { notify('error', e.message); }
    finally { setExporting(false); }
  }

  if (acompanante === undefined) return <div className={s.loadWrap}><Spinner /> Cargando datos…</div>;

  return (
    <div>
      <div className={s.secHeader}>
        <SectionTitle icon="🤝">Acompañante Accionista</SectionTitle>
      </div>

      <Alert type="info" style={{ marginBottom: 16 }}>
        El acompañante debe ser un accionista existente y estar acreditado en la misma asamblea.
        No puede ser el mismo accionista titular.
      </Alert>

      {acompanante && (
        <div className={s.acompBox}>
          <div className={s.acompAv} aria-hidden>
            {(acompanante.nombre?.split(' ').slice(0, 2).map(w => w[0]).join('') || '??').toUpperCase()}
          </div>
          <div className={s.acompInfo}>
            <div className={s.acompNombre}>{acompanante.nombre}</div>
            <div className={s.acompMeta}>
              DPI {acompanante.dpi} &nbsp;·&nbsp; Expediente{' '}
              <strong style={{ color: 'var(--teal-dk)' }}>{acompanante.expediente}</strong>
            </div>
            <div style={{ marginTop: 6 }}>
              <Tag color="green">✓ Acreditado</Tag>
              <Tag color="teal" className={s.tagGap}>{acompanante.codigo}</Tag>
            </div>
          </div>
          <Button variant="danger" size="sm" loading={eliminando} onClick={handleEliminar} style={{ flexShrink: 0 }}>
            ✕ Remover
          </Button>
        </div>
      )}

      {!acompanante && (
        <>
          <div className={s.dpiRow}>
            <div className={s.dpiWrap}>
              <input
                type="text" inputMode="numeric" className={s.dpiInput}
                placeholder="Ingrese DPI del acompañante (13 dígitos)"
                maxLength={13} value={dpiInput}
                onChange={e => { setDpiInput(e.target.value.replace(/\D/g, '')); setErrorMsg(''); setCandidato(null); }}
                onKeyDown={e => e.key === 'Enter' && handleBuscar()}
              />
              <Button variant="teal" size="md" loading={buscando} disabled={dpiInput.length < 5}
                onClick={handleBuscar} style={{ flexShrink: 0 }}>
                🔍 Buscar
              </Button>
            </div>
            {errorMsg && <div className={s.errMsg} role="alert">⚠️ {errorMsg}</div>}
          </div>

          {candidato && (
            <div className={s.candidatoBox}>
              <div className={s.candidatoHdr}>
                <span className={s.candidatoIco} aria-hidden>👤</span>
                <div className={s.candidatoTtl}>Accionista encontrado — confirme antes de asignar</div>
              </div>
              <div className={s.candidatoDatos}>
                <div className={s.candidatoCampo}><span className={s.candidatoLbl}>Nombre completo</span><span className={s.candidatoVal}>{candidato.nombre}</span></div>
                <div className={s.candidatoCampo}><span className={s.candidatoLbl}>Expediente</span><span className={s.candidatoVal} style={{ color: 'var(--teal-dk)', fontFamily: 'monospace', fontWeight: 700 }}>{candidato.expediente}</span></div>
                <div className={s.candidatoCampo}><span className={s.candidatoLbl}>Código</span><span className={s.candidatoVal}>{candidato.codigo}</span></div>
                <div className={s.candidatoCampo}><span className={s.candidatoLbl}>Estado</span><Tag color="green">✓ Acreditado</Tag></div>
              </div>
              <div className={s.candidatoFtr}>
                <Button variant="ghost" size="sm" onClick={() => { setCandidato(null); setDpiInput(''); }}>← Cancelar</Button>
                <Button variant="teal" size="md" loading={confirmando} onClick={handleConfirmar}
                  style={{ width: 'auto', padding: '10px 24px' }}>
                  ✓ &nbsp;Confirmar Acompañante
                </Button>
              </div>
            </div>
          )}

          {!candidato && !buscando && !errorMsg && (
            <p className={s.emptyHint}>No se ha registrado ningún acompañante. Ingrese el DPI para buscar y asignar.</p>
          )}
        </>
      )}
    </div>
  );
}

// ── Banner de token de firma ─────────────────────────────────
const TOKEN_TTL = 300;

function FirmaTokenBanner({ acc, solicitudId, onFirmaCompletada }) {
  const [tokenData, setTokenData] = useState(null);
  const [estado, setEstado] = useState('idle');
  const [ttlLeft, setTtlLeft] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const intervalRef = useRef(null);
  const pollRef = useRef(null);

  const startCountdown = useCallback((seconds) => {
    clearInterval(intervalRef.current);
    setTtlLeft(seconds);
    intervalRef.current = setInterval(() => {
      setTtlLeft(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current); setEstado('expirado'); stopPoll(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopPoll = useCallback(() => clearInterval(pollRef.current), []);

  const startPoll = useCallback((token, solId) => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const res = await consultarEstadoFirma(solId, token);
        if (res.estado === 'USADO' || res.firmado) {
          stopPoll(); clearInterval(intervalRef.current);
          setEstado('completado'); onFirmaCompletada?.();
        } else if (res.estado === 'EXPIRADO' || res.ttlRemainingSeconds === 0) {
          stopPoll(); clearInterval(intervalRef.current);
          setEstado('expirado'); setTtlLeft(0);
        }
      } catch { /* silencioso */ }
    }, 5000);
  }, [stopPoll, onFirmaCompletada]);

  const generar = useCallback(async () => {
    setEstado('generando'); setErrorMsg('');
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
      setTokenData(res); setEstado('activo');
      startCountdown(res.ttlSeconds ?? TOKEN_TTL);
      startPoll(res.token, solicitudId);
    } catch (e) { setErrorMsg(e.message || 'Error al generar el token.'); setEstado('idle'); }
  }, [acc, solicitudId, startCountdown, startPoll]);

  useEffect(() => () => { clearInterval(intervalRef.current); stopPoll(); }, [stopPoll]);

  const fmtTtl = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
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
          <div className={s.tokenSub}>Genere el token y entrégueselo al accionista para que lo ingrese en la tablet de firma.</div>
        </div>
        {(estado === 'idle' || estado === 'expirado') && (
          <Button variant={estado === 'expirado' ? 'secondary' : 'teal'} size="sm" onClick={generar} style={{ flexShrink: 0 }}>
            {estado === 'expirado' ? '🔄 Regenerar token' : '🔑 Generar token'}
          </Button>
        )}
        {estado === 'generando' && <Spinner size="sm" />}
      </div>
      {errorMsg && <div style={{ marginTop: 8, fontSize: '.73rem', color: 'var(--red)', paddingLeft: 36 }}>⚠️ {errorMsg}</div>}
      {estado === 'activo' && tokenData && (
        <div className={s.tokenBody}>
          <div className={s.tokenCode}>
            {tokenData.token.split('').map((d, i) => <span key={i} className={s.tokenDigit}>{d}</span>)}
          </div>
          <div className={s.tokenTtlRow}>
            <span className={s.tokenTtlLabel}>Vigencia</span>
            <span className={s.tokenTtlVal} style={{ color: barColor }}>{fmtTtl(ttlLeft)}</span>
            <div className={s.tokenBar}><div className={s.tokenBarFill} style={{ width: `${pct}%`, background: barColor }} /></div>
          </div>
          <div style={{ fontSize: '.68rem', color: 'var(--gray-400)', marginTop: 6, textAlign: 'center' }}>Esperando que el accionista firme en la tablet…</div>
        </div>
      )}
      {estado === 'expirado' && (
        <div style={{ marginTop: 10, padding: '8px 14px', background: 'rgba(239,68,68,.06)', borderRadius: 8, border: '1px solid rgba(239,68,68,.2)', fontSize: '.73rem', color: 'var(--red)' }}>
          ⏱ El token expiró. Regenere uno nuevo para que el accionista pueda firmar.
        </div>
      )}
    </div>
  );
}

// ── Sección Firma Digital + Confirmar Acreditación ────────────
function SeccionFirma({ acc, asmIds }) {
  const { notify } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [firmaOk, setFirmaOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const solicitudId = useRef(genRef('SOL')).current;

  async function handleConfirmar() {
    if (!asmIds.length) { notify('error', 'Seleccione al menos una asamblea.'); return; }
    setSaving(true);
    try {
      const asmDefs = asmIds.map(id => ({ id }));
      await acreditarEnAsamblea({ accionista: acc.codigo, cod_estado: '1', asambleas: asmDefs });
      setDone(true);
      notify('success', `Acreditación completada en ${asmIds.length} asamblea(s).`);
    } catch (e) { notify('error', e.message); }
    finally { setSaving(false); }
  }

  if (done) {
    return (
      <div className={s.firmaOkBox}>
        <span style={{ fontSize: '2rem' }}>🎫</span>
        <div>
          <div className={s.firmaOkTtl}>¡Acreditación exitosa!</div>
          <div className={s.firmaOkSub}>El accionista fue acreditado en {asmIds.length} asamblea(s).</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle icon="✍️">Firma Digital de Rúbrica</SectionTitle>
      <FirmaTokenBanner acc={acc} solicitudId={solicitudId} onFirmaCompletada={() => setFirmaOk(true)} />

      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <Checkbox
          label={<>Confirmo que deseo acreditar a <strong>{acc.nombre}</strong> en la(s) asamblea(s) activa(s).</>}
          checked={confirm}
          onChange={setConfirm}
        />
      </div>

      {!firmaOk && (
        <Alert type="warning" style={{ marginBottom: 12 }}>
          El botón de confirmación se habilitará una vez que el accionista complete la firma en la tablet.
        </Alert>
      )}

      <hr style={{ border: 'none', borderTop: '1.5px solid var(--gray-100)', margin: '16px 0' }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <Button
          id="btn-confirmar-acreditacion"
          variant="teal"
          size="lg"
          disabled={!confirm || !firmaOk || saving}
          loading={saving}
          onClick={handleConfirmar}
          style={{ width: 'auto', padding: '12px 32px' }}
        >
          🎫 &nbsp;Confirmar Acreditación
        </Button>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function ParticipacionForm({ acc }) {
  const [asambleas, setAsambleas] = useState([]);
  const [selected, setSelected] = useState([]);
  const [inversiones, setInv] = useState([]);
  const [loadingAsm, setLoadingAsm] = useState(true);

  useEffect(() => {
    Promise.all([
      getAsambleasActivas(),
      getDetalleInversion(null, acc.codigo),
    ]).then(([list, inv]) => {
      setAsambleas(list);
      setSelected(list.map(a => a.id));
      setInv(inv || []);
      setLoadingAsm(false);
    }).catch(() => setLoadingAsm(false));
  }, [acc.codigo]);

  const toggleAsm = id =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  if (loadingAsm) return <div className={s.loadWrap}><Spinner /> Cargando asambleas…</div>;

  if (!asambleas.length) {
    return (
      <Alert type="warning">
        No hay asambleas activas. La información complementaria se registra en el contexto de una asamblea habilitada.
      </Alert>
    );
  }

  return (
    <div>
      <div className={s.sections}>
        <SeccionLimitacion acc={acc} asmIds={selected} />
        <hr className={s.hr} />
        <SeccionAcompanante acc={acc} asmIds={selected} />
        <hr className={s.hr} />
        <SeccionFirma acc={acc} asmIds={selected} />
      </div>
    </div>
  );
}
