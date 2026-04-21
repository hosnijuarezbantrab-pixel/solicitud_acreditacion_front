import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Alert, Tag, Spinner, MiniCheck, Checkbox, Select, Modal } from '../../ui/UI.jsx';


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
              {op.codigo === 'AUD' ? '🦻' : op.codigo === 'VIS' ? '👁️' : op.codigo === 'MOV' ? '♿' : op.codigo === 'PAR' ? '👪' : op.codigo === 'ENF' ? '🩺' : '🗣️'}
            </span>
            {op.descripcion}
          </button>
        );
      })}
    </div>
  );
}

// ── Sección Limitación Funcional ──────────────────────────────
function SeccionLimitacion({
  acc, asmIds, seleccionadas, setSelec, enfermedad, setEnfermedad,
  tipoMovilidad, setTipoMovilidad, parentezcoAcomp, setParentezcoAcomp,
  original, setOriginal, enfOriginal, setEnfOrig, movOriginal, setMovOrig,
  parOriginal, setParOrig
}) {
  const { notify, setSummary } = useApp();
  const [opcionesFull, setOpcionesFull] = useState([]);

  // ... (inside SeccionLimitacion)
  useEffect(() => {
    setSummary({ limitaciones: seleccionadas, enfermedad, tipoMovilidad, parentezcoAcomp });
  }, [seleccionadas, enfermedad, tipoMovilidad, parentezcoAcomp, setSummary]);

  const [opciones, setOpciones] = useState([]);
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

      // Cargar tipo_movilidad y parentezco si existe en alguno de los registros
      let mergedMov = '';
      let mergedPar = '';
      regs.forEach(reg => {
        if (reg?.tipo_movilidad) mergedMov = reg.tipo_movilidad;
        if (reg?.parentezco_acomp) mergedPar = reg.parentezco_acomp;
      });
      setTipoMovilidad(mergedMov);
      setMovOrig(mergedMov);
      setParentezcoAcomp(mergedPar);
      setParOrig(mergedPar);

      setLoading(false);
    }).catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [acc.codigo, JSON.stringify(asmIds)]);

  const dirty = JSON.stringify(seleccionadas.slice().sort()) !== JSON.stringify(original.slice().sort())
    || observaciones !== obsOriginal || enfermedad !== enfOriginal || tipoMovilidad !== movOriginal || parentezcoAcomp !== parOriginal;

  async function handleGuardar() {
    setSaving(true);
    try {
      await Promise.all(
        asmIds.map(id =>
          guardarLimitacionFuncional(acc.codigo, id, {
            limitaciones: seleccionadas,
            observaciones,
            enfermedad,
            tipo_movilidad: tipoMovilidad,
            parentezco_acomp: parentezcoAcomp
          })
        )
      );
      setOriginal(seleccionadas);
      setObsOrig(observaciones);
      setEnfOrig(enfermedad);
      setMovOrig(tipoMovilidad);
      setParOrig(parentezcoAcomp);
      notify('success', 'Limitación funcional guardada correctamente.');
    } catch (e) {
      notify('error', e.message);
    } finally { setSaving(false); }
  }

  function handleDescartar() {
    setSelec(original);
    setObs(obsOriginal);
    setEnfermedad(enfOriginal);
    setTipoMovilidad(movOriginal);
    setParentezcoAcomp(parOriginal);
  }

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div style={{ flex: '0 1 auto' }}>
          <LimitacionSelector opciones={opciones} seleccionadas={seleccionadas} onChange={next => {
            setSelec(next);
            if (!next.includes('MOV')) setTipoMovilidad('');
            if (!next.includes('PAR')) setParentezcoAcomp('');
            if (!next.includes('ENF')) setEnfermedad('');
          }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {seleccionadas.includes('ENF') && (
            <div className={s.reveal}>
              <Select label="Parentezco de Enfermedades" value={enfermedad} onChange={e => setEnfermedad(e.target.value)}>
                <option value="">-- Seleccione --</option>
                <option value="corazon">Corazón</option>
                <option value="diabetes">Diabetes</option>
                <option value="cancer">Cáncer</option>
              </Select>
            </div>
          )}

          {seleccionadas.includes('MOV') && (
            <div className={s.reveal}>
              <Select label="Tipo de Movilidad" value={tipoMovilidad} onChange={e => setTipoMovilidad(e.target.value)}>
                <option value="">-- Seleccione opción --</option>
                <option value="Silla de Ruedas">Silla de Ruedas</option>
                <option value="Bastón">Bastón</option>
                <option value="Muletas">Muletas</option>
              </Select>
            </div>
          )}

          {seleccionadas.includes('PAR') && (
            <div className={s.reveal}>
              <Select label="Vínculo de Parentezco" value={parentezcoAcomp} onChange={e => setParentezcoAcomp(e.target.value)}>
                <option value="">-- Seleccione relación --</option>
                <option value="hijo">Hijo</option>
                <option value="conyugue">Conyugue</option>
                <option value="nieto">Nieto</option>
                <option value="hermano">Hermano</option>
                <option value="padre">Padre</option>
                <option value="madre">Madre</option>
                <option value="otro">Otro</option>
              </Select>
            </div>
          )}
        </div>
      </div>

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
            let extra = '';
            if (c === 'MOV' && movOriginal) extra = ` (${movOriginal})`;
            if (c === 'PAR' && parOriginal) extra = ` (${parOriginal})`;
            if (c === 'ENF' && enfOriginal) extra = ` (${enfOriginal})`;
            return <Tag key={c} color="teal">{op?.descripcion ?? c}{extra}</Tag>;
          })}
        </div>
      )}
    </div>
  );
}

// ── Sección Acompañante Accionista ───────────────────────────
function SeccionAcompanante({ acc, asmIds }) {
  const { notify, setSummary } = useApp();
  const [acompanantes, setAcomps] = useState(undefined);

  useEffect(() => {
    setSummary({ acompanantes });
  }, [acompanantes, setSummary]);

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
    if (!firstAsmId) { setAcomps([]); return; }
    getAcompanante(acc.codigo, firstAsmId)
      .then(res => { 
        if (mounted) setAcomps(res ? [res] : []); 
      })
      .catch(() => { if (mounted) setAcomps([]); });
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
    if (acompanantes.length >= 2) { notify('error', 'Solo se permiten hasta 2 acompañantes.'); return; }
    setConfirm(true);
    try {
      // Nota: Aquí se asume que la API permite agregar. 
      // Por simplicidad en mocks, enviamos la solicitud.
      await Promise.all(asmIds.map(id => guardarAcompanante(acc.codigo, id, candidato.codigo)));
      setAcomps(prev => [...prev, candidato]); 
      setCandidato(null); 
      setDpiInput('');
      notify('success', 'Acompañante accionista registrado correctamente.');
    } catch (e) { notify('error', e.message); }
    finally { setConfirm(false); }
  }

  async function handleEliminar(codigo) {
    setEliminando(true);
    try {
      await Promise.all(asmIds.map(id => eliminarAcompanante(acc.codigo, id)));
      setAcomps(prev => prev.filter(a => a.codigo !== codigo)); 
      notify('success', 'Acompañante removido.');
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

  if (acompanantes === undefined) return <div className={s.loadWrap}><Spinner /> Cargando datos…</div>;

  return (
    <div>
      <div className={s.secHeader}>
        <SectionTitle icon="🤝">Acompañante Accionista ({acompanantes.length}/2)</SectionTitle>
      </div>

      <Alert type="info" style={{ marginBottom: 16 }}>
        El acompañante debe ser un accionista acreditado. Puede agregar hasta 2 acompañantes.
      </Alert>

      {acompanantes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {acompanantes.map((acompanante, idx) => (
            <div key={acompanante.codigo || idx} className={s.acompBox}>
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
              <Button variant="danger" size="sm" loading={eliminando} onClick={() => handleEliminar(acompanante.codigo)} style={{ flexShrink: 0 }}>
                ✕ Remover
              </Button>
            </div>
          ))}
        </div>
      )}

      {acompanantes.length < 2 && (
        <>
          <div className={s.dpiRow}>
            <div className={s.dpiWrap}>
              <input
                type="text" inputMode="numeric" className={s.dpiInput}
                placeholder="Ingrese DPI del nuevo acompañante"
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
                <div className={s.candidatoTtl}>Asignar nuevo acompañante</div>
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

          {!candidato && !buscando && !errorMsg && acompanantes.length === 0 && (
            <p className={s.emptyHint}>No se ha registrado ningún acompañante. Ingrese el DPI para buscar.</p>
          )}
        </>
      )}
    </div>
  );
}

// ── Banner de token de firma ─────────────────────────────────
const TOKEN_TTL = 300;

function FirmaTokenBanner({ acc, solicitudId, onFirmaCompletada }) {
  const { state } = useApp();
  const { summary } = state;
  const { notify } = useApp();
  const [showSummary, setShowSummary] = useState(false);
  const [tokenData, setTokenData] = useState(null);
  const [estado, setEstado] = useState('idle');
  const [ttlLeft, setTtlLeft] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const needsCompanion = summary.limitaciones?.includes('MOV') && (!summary.acompanantes || summary.acompanantes.length === 0);
  const intervalRef = useRef(null);
  const pollRef = useRef(null);

  const startCountdown = useCallback((seconds) => {
    // ... countdown logic (same as before)
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
    setShowSummary(false); // Cierra modal
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

  const SRow = ({ l, v, i }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--gray-50)' }}>
      <span style={{ fontSize: '.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>{i} {l}</span>
      <span style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--navy)' }}>{v}</span>
    </div>
  );

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
    <>
      <Modal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        title="Resumen de Información"
        footer={(
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowSummary(false)}>Regresar</Button>
            <Button variant="teal" onClick={generar}>✅ Confirmar y Generar Token</Button>
          </div>
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Alert type="info">Verifique que la siguiente información sea correcta antes de proceder con el token de firma.</Alert>

          <div>
            <SectionTitle icon="⚖️">Relación con Bantrab</SectionTitle>
            <SRow l="¿Es Proveedor?" v={summary.conflicto?.proveedor ? 'SÍ' : 'NO'} />
            <SRow l="¿Es Empleado?" v={summary.conflicto?.empleado ? 'SÍ' : 'NO'} />
            <SRow l="¿Tiene Parentesco?" v={summary.conflicto?.pariente ? 'SÍ' : 'NO'} />
          </div>

          <div>
            <SectionTitle icon="♿">Limitaciones Funcionales</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {summary.limitaciones.length === 0 && <span style={{ fontSize: '.75rem', color: 'var(--gray-400)' }}>Ninguna</span>}
              {summary.limitaciones.map(l => <Tag key={l} color="teal">{l}</Tag>)}
              {summary.tipoMovilidad && <Tag color="teal">MOV: {summary.tipoMovilidad.toUpperCase()}</Tag>}
              {summary.parentezcoAcomp && <Tag color="teal">PAR: {summary.parentezcoAcomp.toUpperCase()}</Tag>}
              {summary.enfermedad && <Tag color="amber">{summary.enfermedad.toUpperCase()}</Tag>}
            </div>
          </div>

          <div>
            <SectionTitle icon="🤝">Acompañantes ({summary.acompanantes?.length || 0})</SectionTitle>
            {summary.acompanantes?.length > 0 ? (
              summary.acompanantes.map((a, i) => (
                <SRow key={i} l={`Acompañante ${i + 1}`} v={a.nombre} />
              ))
            ) : (
              <span style={{ fontSize: '.75rem', color: 'var(--gray-400)' }}>Sin acompañantes registrados</span>
            )}
          </div>
        </div>
      </Modal>

      <div className={s.tokenBanner}>
        <div className={s.tokenBannerRow}>
          <span className={s.tokenIco}>✍️</span>
          <div style={{ flex: 1 }}>
            <div className={s.tokenTitle}>Firma digital de rúbrica</div>
            <div className={s.tokenSub}>Genere el token y entrégueselo al accionista para que lo ingrese en la tablet de firma.</div>
          </div>
          {(estado === 'idle' || estado === 'expirado') && (
            <Button
              variant={needsCompanion ? 'ghost' : (estado === 'expirado' ? 'secondary' : 'teal')}
              size="sm"
              disabled={needsCompanion}
              onClick={() => setShowSummary(true)}
              style={{ flex_shrink: 0, opacity: needsCompanion ? .5 : 1 }}
            >
              {estado === 'expirado' ? '🔄 Regenerar token' : '🔑 Generar token'}
            </Button>
          )}
          {estado === 'generando' && <Spinner size="sm" />}
        </div>

        {needsCompanion && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, fontSize: '.73rem', color: '#991b1b', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span>⚠️</span>
            <span><strong>Requerimiento de Seguridad:</strong> El accionista posee limitaciones de movilidad. Es obligatorio registrar al menos un <strong>acompañante</strong> para habilitar la firma digital.</span>
          </div>
        )}

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
    </>
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

  // Estados lift-up para condicionales
  const [seleccionadas, setSelec] = useState([]);
  const [original, setOriginal] = useState([]);
  const [enfermedad, setEnfermedad] = useState('');
  const [enfOriginal, setEnfOrig] = useState('');
  const [tipoMovilidad, setTipoMovilidad] = useState('');
  const [movOriginal, setMovOrig] = useState('');
  const [parentezcoAcomp, setParentezcoAcomp] = useState('');
  const [parOriginal, setParOrig] = useState('');

  const hasLimitaciones = seleccionadas.length > 0 || enfermedad !== '' || tipoMovilidad !== '' || parentezcoAcomp !== '';


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
        <SeccionLimitacion
          acc={acc}
          asmIds={selected}
          seleccionadas={seleccionadas} setSelec={setSelec}
          enfermedad={enfermedad} setEnfermedad={setEnfermedad}
          tipoMovilidad={tipoMovilidad} setTipoMovilidad={setTipoMovilidad}
          parentezcoAcomp={parentezcoAcomp} setParentezcoAcomp={setParentezcoAcomp}
          original={original} setOriginal={setOriginal}
          enfOriginal={enfOriginal} setEnfOrig={setEnfOrig}
          movOriginal={movOriginal} setMovOrig={setMovOrig}
          parOriginal={parOriginal} setParOrig={setParOrig}
        />

        {hasLimitaciones && (
          <div className={s.reveal}>
            <hr className={s.hr} />
            <SeccionAcompanante acc={acc} asmIds={selected} />
          </div>
        )}

        <hr className={s.hr} />
        <SeccionFirma acc={acc} asmIds={selected} />
      </div>
    </div>
  );

}
