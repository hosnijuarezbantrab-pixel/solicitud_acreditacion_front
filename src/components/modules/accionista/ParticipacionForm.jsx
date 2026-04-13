import { useState, useEffect, useCallback } from 'react';
import { Button, Alert, Tag, Spinner } from '../../ui/UI.jsx';
import { SectionTitle, FieldRow } from '../../ui/Card.jsx';
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
  exportarReporteLimitacion,
  exportarReporteAcompanante,
} from '../../../services/api.js';
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
          guardarLimitacionFuncional(acc.codigo, id, {
            limitaciones: seleccionadas,
            observaciones,
          })
        )
      );
      setOriginal(seleccionadas);
      setObsOrig(observaciones);
      notify('success', 'Limitación funcional guardada correctamente.');
    } catch (e) {
      notify('error', e.message);
    } finally { setSaving(false); }
  }

  function handleDescartar() {
    setSelec(original);
    setObs(obsOriginal);
  }

  async function handleExportar() {
    setExporting(true);
    try {
      if (!asmIds.length) throw new Error('Seleccione al menos una asamblea.');
      for (const id of asmIds) {
        const blob = await exportarReporteLimitacion(id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_limitacion_funcional_${id}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      notify('error', e.message);
    } finally { setExporting(false); }
  }

  if (loading) return <div className={s.loadWrap}><Spinner /> Cargando datos…</div>;

  return (
    <div>
      <div className={s.secHeader}>
        <SectionTitle icon="♿">Limitación Funcional</SectionTitle>
        <Button variant="secondary" size="sm" loading={exporting} onClick={handleExportar}>
          📊 Exportar Excel
        </Button>
      </div>

      <Alert type="info" style={{ marginBottom: 16 }}>
        Registre las limitaciones funcionales del accionista si aplica. Esta información
        no aparece en el formulario de acreditación, pero está disponible para reportería operativa.
      </Alert>

      <LimitacionSelector
        opciones={opciones}
        seleccionadas={seleccionadas}
        onChange={setSelec}
      />

      {seleccionadas.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <label className={s.obsLabel}>Observaciones (opcional)</label>
          <textarea
            className={s.obsInput}
            rows={2}
            maxLength={300}
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
          <Button variant="ghost" size="md" onClick={handleDescartar}>
            Descartar cambios
          </Button>
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
  const [acompanante, setAcomp] = useState(undefined); // undefined=cargando, null=sin acomp
  const [dpiInput, setDpiInput] = useState('');
  const [candidato, setCandidato] = useState(null);   // resultado de validarAcompanante
  const [buscando, setBuscando] = useState(false);
  const [confirmando, setConfirm] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const firstAsmId = asmIds.length > 0 ? asmIds[0] : null;
    if (!firstAsmId) { setAcomp(null); return; }
    getAcompanante(acc.codigo, firstAsmId).then(res => {
      if (mounted) setAcomp(res ?? null);
    }).catch(() => { if (mounted) setAcomp(null); });
    return () => { mounted = false; };
  }, [acc.codigo, JSON.stringify(asmIds)]);

  async function handleBuscar() {
    if (dpiInput.trim().length < 5) {
      setErrorMsg('Ingrese un DPI válido (mínimo 5 dígitos).');
      return;
    }
    setBuscando(true);
    setErrorMsg('');
    setCandidato(null);
    try {
      const res = await Promise.all(
        asmIds.map(id => validarAcompanante(dpiInput.trim(), acc.codigo, id))
      );
      setCandidato(res[0]);
    } catch (e) {
      setErrorMsg(e.message);
    } finally { setBuscando(false); }
  }

  async function handleConfirmar() {
    setConfirm(true);
    try {
      await Promise.all(
        asmIds.map(id => guardarAcompanante(acc.codigo, id, candidato.codigo))
      );
      setAcomp(candidato);
      setCandidato(null);
      setDpiInput('');
      notify('success', 'Acompañante accionista registrado correctamente.');
    } catch (e) {
      notify('error', e.message);
    } finally { setConfirm(false); }
  }

  async function handleEliminar() {
    setEliminando(true);
    try {
      await Promise.all(
        asmIds.map(id => eliminarAcompanante(acc.codigo, id))
      );
      setAcomp(null);
      notify('success', 'Acompañante removido.');
    } catch (e) {
      notify('error', e.message);
    } finally { setEliminando(false); }
  }

  async function handleExportar() {
    setExporting(true);
    try {
      if (!asmIds.length) throw new Error('Seleccione al menos una asamblea.');
      for (const id of asmIds) {
        const blob = await exportarReporteAcompanante(id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_acompanante_${id}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      notify('error', e.message);
    } finally { setExporting(false); }
  }

  if (acompanante === undefined) return <div className={s.loadWrap}><Spinner /> Cargando datos…</div>;

  return (
    <div>
      <div className={s.secHeader}>
        <SectionTitle icon="🤝">Acompañante Accionista</SectionTitle>
        <Button variant="secondary" size="sm" loading={exporting} onClick={handleExportar}>
          📊 Exportar Excel
        </Button>
      </div>

      <Alert type="info" style={{ marginBottom: 16 }}>
        El acompañante debe ser un accionista existente y estar acreditado en la misma asamblea.
        No puede ser el mismo accionista titular.
      </Alert>

      {/* Acompañante ya registrado */}
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
          <Button variant="danger" size="sm" loading={eliminando} onClick={handleEliminar}
            style={{ flexShrink: 0 }}>
            ✕ Remover
          </Button>
        </div>
      )}

      {/* Sin acompañante — formulario de búsqueda */}
      {!acompanante && (
        <>
          <div className={s.dpiRow}>
            <div className={s.dpiWrap}>
              <input
                type="text"
                inputMode="numeric"
                className={s.dpiInput}
                placeholder="Ingrese DPI del acompañante (13 dígitos)"
                maxLength={13}
                value={dpiInput}
                onChange={e => { setDpiInput(e.target.value.replace(/\D/g, '')); setErrorMsg(''); setCandidato(null); }}
                onKeyDown={e => e.key === 'Enter' && handleBuscar()}
              />
              <Button variant="teal" size="md" loading={buscando}
                disabled={dpiInput.length < 5}
                onClick={handleBuscar}
                style={{ flexShrink: 0 }}>
                🔍 Buscar
              </Button>
            </div>
            {errorMsg && (
              <div className={s.errMsg} role="alert">⚠️ {errorMsg}</div>
            )}
          </div>

          {/* Vista previa del candidato antes de confirmar */}
          {candidato && (
            <div className={s.candidatoBox}>
              <div className={s.candidatoHdr}>
                <span className={s.candidatoIco} aria-hidden>👤</span>
                <div className={s.candidatoTtl}>Accionista encontrado — confirme antes de asignar</div>
              </div>
              <div className={s.candidatoDatos}>
                <div className={s.candidatoCampo}>
                  <span className={s.candidatoLbl}>Nombre completo</span>
                  <span className={s.candidatoVal}>{candidato.nombre}</span>
                </div>
                <div className={s.candidatoCampo}>
                  <span className={s.candidatoLbl}>Expediente</span>
                  <span className={s.candidatoVal} style={{ color: 'var(--teal-dk)', fontFamily: 'monospace', fontWeight: 700 }}>
                    {candidato.expediente}
                  </span>
                </div>
                <div className={s.candidatoCampo}>
                  <span className={s.candidatoLbl}>Código</span>
                  <span className={s.candidatoVal}>{candidato.codigo}</span>
                </div>
                <div className={s.candidatoCampo}>
                  <span className={s.candidatoLbl}>Estado</span>
                  <Tag color="green">✓ Acreditado</Tag>
                </div>
              </div>
              <div className={s.candidatoFtr}>
                <Button variant="ghost" size="sm" onClick={() => { setCandidato(null); setDpiInput(''); }}>
                  ← Cancelar
                </Button>
                <Button variant="teal" size="md" loading={confirmando} onClick={handleConfirmar}
                  style={{ width: 'auto', padding: '10px 24px' }}>
                  ✓ &nbsp;Confirmar Acompañante
                </Button>
              </div>
            </div>
          )}

          {!candidato && !buscando && !errorMsg && (
            <p className={s.emptyHint}>
              No se ha registrado ningún acompañante. Ingrese el DPI para buscar y asignar.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function ParticipacionForm({ acc }) {
  const [asambleas, setAsambleas] = useState([]);
  const [asmIds, setAsmIds] = useState([]);
  const [loadingAsm, setLoadingAsm] = useState(true);

  useEffect(() => {
    getAsambleasActivas().then(list => {
      setAsambleas(list);
      if (list.length > 0) setAsmIds(list.map(a => a.id));
      setLoadingAsm(false);
    }).catch(() => setLoadingAsm(false));
  }, []);

  if (loadingAsm) return <div className={s.loadWrap}><Spinner /> Cargando asambleas…</div>;

  if (!asambleas.length) {
    return <Alert type="warning">No hay asambleas activas. La información complementaria se registra en el contexto de una asamblea habilitada.</Alert>;
  }

  return (
    <div>
      <Alert type="info">
        Esta información es <strong>opcional</strong> y no aparece en el formulario final de acreditación.
        Está disponible para reportería operativa y control interno del área de Capitalización.
      </Alert>

      {/* Selector multiselección de asamblea */}
      {asambleas.length > 1 && (
        <div className={s.asmSelector}>
          <label className={s.asmLabel}>Aplica para las siguientes asambleas (Selección múltiple)</label>
          <div className={s.asmBtns} style={{ flexWrap: 'wrap' }}>
            {asambleas.map(a => {
              const on = asmIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  className={[s.asmBtn, on ? s.asmBtnOn : ''].join(' ')}
                  onClick={() => {
                    if (on) {
                      if (asmIds.length > 1) setAsmIds(asmIds.filter(id => id !== a.id));
                    } else {
                      setAsmIds([...asmIds, a.id]);
                    }
                  }}
                >
                  <span className={[s.asmPillSm, a.tipo === 'O' ? s.pOrd : s.pExt].join(' ')}>
                    {a.descripcion}
                  </span>
                  {a.num} — {a.ordinal}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={s.sections}>
        <SeccionLimitacion acc={acc} asmIds={asmIds} />
        <hr className={s.hr} />
        <SeccionAcompanante acc={acc} asmIds={asmIds} />
      </div>
    </div>
  );
}
