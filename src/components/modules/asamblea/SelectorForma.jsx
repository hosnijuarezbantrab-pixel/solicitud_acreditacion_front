import { useState, useEffect } from 'react';
import { Button, Alert, Tag, MiniCheck } from '../../ui/UI.jsx';
import { SectionTitle, StatCard } from '../../ui/Card.jsx';
import { getDetalleInversion } from '../../../services/api.js';
import AcreditacionWizard from './AcreditacionWizard.jsx';
import s from './AcreditacionWizard.module.css';

/**
 * SelectorForma
 *
 * Muestra las asambleas activas con checkboxes seleccionables y los
 * StatCards de votos. Al confirmar, monta AcreditacionWizard con las
 * asambleas seleccionadas.
 *
 * Las asambleas llegan como prop desde ConsultaPage (ya cargadas).
 */
export default function SelectorForma({ acc, asambleas = [], onClose }) {
  const [selected, setSelected] = useState(() => asambleas.map(a => a.id));
  const [inversiones, setInv] = useState([]);
  const [listo, setListo] = useState(false);

  // Sincronizar selección cuando cambian las asambleas del padre
  useEffect(() => {
    setSelected(asambleas.map(a => a.id));
  }, [asambleas]);

  // Cargar votos del accionista
  useEffect(() => {
    if (acc?.codigo) {
      getDetalleInversion(null, acc.codigo)
        .then(res => setInv(res || []))
        .catch(() => { });
    }
  }, [acc?.codigo]);

  const toggleAsm = (id) =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const votos = inversiones.reduce((sum, inv) => sum + (inv.cantidad || 0), 0);
  const asmSeleccionadas = asambleas.filter(a => selected.includes(a.id));

  // ── Wizard montado tras confirmar ──
  if (listo) {
    return (
      <AcreditacionWizard
        acc={acc}
        asambleas={asmSeleccionadas}
        onClose={onClose}
      />
    );
  }

  // ── Pantalla de selección ──
  return (
    <div>
      <Alert type="info" style={{ marginBottom: 20 }}>
        Seleccione las asambleas en las que desea acreditar al accionista.
        Todas están marcadas por defecto — puede desmarcar las que no apliquen.
        Se requiere al menos <strong>una</strong> para continuar.
      </Alert>

      <SectionTitle icon="🏛️">
        Asambleas a Acreditar ({selected.length} / {asambleas.length})
      </SectionTitle>

      {/* Lista de asambleas con checkboxes */}
      <div style={{ border: '1.5px solid var(--gray-200)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
        {asambleas.map(a => {
          const isSel = selected.includes(a.id);
          return (
            <div
              key={a.id}
              className={[s.asmRow, isSel ? s.asmSel : s.asmUnsel].join(' ')}
              role="checkbox"
              aria-checked={isSel}
              tabIndex={0}
              onClick={() => toggleAsm(a.id)}
              onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && toggleAsm(a.id)}
            >
              <MiniCheck checked={isSel} />
              <span className={[s.asmPill, a.tipo === 'O' ? s.pOrd : s.pExt].join(' ')}>
                {a.descripcion}
              </span>
              <div className={s.asmInfo}>
                <div className={s.asmName}>{a.num} — {a.ordinal}</div>
                <div className={s.asmDate}>📅 {a.fecha}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                {isSel
                  ? <Tag color="teal">✅ Seleccionada</Tag>
                  : <Tag color="">Sin seleccionar</Tag>
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* StatCards de votos */}
      <div className={s.statsRow}>
        <StatCard label="Votos Propios" value={votos.toLocaleString()} color="teal" accent="var(--teal)" />
        <StatCard label="Votos Ajenos" value="0" color="" accent="var(--gray-200)" />
        <StatCard label="Total Votos" value={votos.toLocaleString()} color="gold" accent="var(--gold-dk)" />
      </div>

    </div>
  );
}
