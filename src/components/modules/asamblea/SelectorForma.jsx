import { useState } from 'react';
import { Button, Alert } from '../../ui/UI.jsx';
import Expediente0080 from './Expediente0080.jsx';
import AcreditacionWizard from './AcreditacionWizard.jsx';
import s from './SelectorForma.module.css';

/**
 * SelectorForma
 *
 * Punto de entrada al módulo de acreditación.
 * Implementa la lógica de selección de ACCFRM0803 (BTN_CONSULTA):
 *
 *   — Si hay EXACTAMENTE 1 asamblea activa  → llama ACCFRM0080 (una asamblea)
 *   — Si hay MÁS DE 1 asamblea activa       → llama ACCFRM0081 (múltiples)
 *   — Ambas opciones se pueden elegir manualmente desde este selector
 */
export default function SelectorForma({ acc, asambleas, onClose }) {
  const [modo, setModo] = useState(null);   // null | 'single' | 'multi'
  const [asmSingle, setAsmSingle] = useState(null);

  if (!modo) {
    return (
      <div>
        <Alert type="info">
          Hay <strong>{asambleas.length}</strong> asamblea(s) activa(s).
          Seleccione la asamblea para gestionar el expediente individual,
          o acredite en múltiples asambleas a la vez.
        </Alert>

        <div className={s.grid}>
          {asambleas.map(a => (
            <div
              key={a.id}
              className={s.card}
              onClick={() => { setAsmSingle(a); setModo('single'); }}
            >
              <div className={s.cardTop}>
                <span className={[s.pill, a.tipo === 'O' ? s.pOrd : s.pExt].join(' ')}>
                  {a.descripcion}
                </span>
                <span className={s.num}>{a.num}</span>
              </div>
              <div className={s.ordinal}>{a.ordinal}</div>
              <div className={s.fecha}>📅 {a.fecha}</div>
              <div className={s.formLabel}>📋 Gestión Individual →</div>
            </div>
          ))}
        </div>

        {asambleas.length > 1 && (
          <div style={{ marginTop: 14 }}>
            <Button
              variant="secondary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px 20px' }}
              onClick={() => setModo('multi')}
            >
              🏛️ &nbsp;Acreditar en MÚLTIPLES asambleas
            </Button>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1.5px solid var(--gray-100)', margin: '16px 0' }} />
        <Button variant="ghost" size="sm" onClick={onClose}>← Volver al Perfil</Button>
      </div>
    );
  }

  if (modo === 'single' && asmSingle) {
    return (
      <Expediente0080
        acc={acc}
        asamblea={asmSingle}
        onClose={() => setModo(null)}
      />
    );
  }

  if (modo === 'multi') {
    return (
      <AcreditacionWizard
        acc={acc}
        onClose={onClose}
      />
    );
  }

  return null;
}
