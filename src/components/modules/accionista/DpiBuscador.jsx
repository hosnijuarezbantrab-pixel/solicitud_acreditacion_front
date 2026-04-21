import { useState, useRef, useEffect } from 'react';
import { Alert } from '../../ui/UI.jsx';
import s from './DpiBuscador.module.css';

export default function DpiBuscador({ onSearch, loading = false, error = null, autoFocus = true }) {
  const [dpi, setDpi] = useState('');
  const ref = useRef(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  const go = () => { if (dpi.trim().length >= 5) onSearch(dpi.trim()); };
  return (
    <div className={s.hero}>
      <div className={s.lbl}><span aria-hidden>🪪</span> Identificación del Accionista</div>
      <div className={s.wrap}>
        <input ref={ref} type="text" inputMode="numeric" className={s.input}
          placeholder="Ingrese No. de DPI (13 dígitos)" maxLength={13}
          value={dpi} onChange={e => setDpi(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && go()} aria-label="Número de DPI" />
        <button type="button" className={s.btn} onClick={go} disabled={dpi.length < 5 || loading}>
          {loading ? <span className={s.spin} /> : <><span aria-hidden>🔍</span>Consultar</>}
        </button>
      </div>
      <p className={s.hint}>También puede ingresar el código de accionista directamente</p>
      {error && <Alert type="error" style={{ marginTop: 12, marginBottom: 0 }}>{error}</Alert>}
      {/* {!error&&<div className={s.tip}><strong>💡 Sobre esta búsqueda</strong><span>Los datos se cargan desde el sistema central (RENAP) y el core bancario. Verifique vigencia de datos antes de acreditar.</span></div>} */}
    </div>
  );
}
