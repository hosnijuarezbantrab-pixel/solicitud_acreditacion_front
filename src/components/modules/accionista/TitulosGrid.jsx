import { useState, useEffect } from 'react';
import { Button, Tag } from '../../ui/UI.jsx';
import { SectionTitle } from '../../ui/Card.jsx';
import { getTitulos } from '../../../services/api.js';
import s from './TitulosGrid.module.css';

export default function TitulosGrid({ accId }) {
  const [titulos, setTitulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fecIni, setFecIni]   = useState('2024-01-01');
  const [fecFin, setFecFin]   = useState('2025-12-31');

  useEffect(() => { load(); }, [accId]);

  async function load() {
    setLoading(true);
    try { setTitulos(await getTitulos(accId)); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className={s.toolbar}>
        <SectionTitle icon="📜">Títulos / Certificados Pendientes</SectionTitle>
        <div className={s.filters}>
          <input className={s.date} type="date" value={fecIni}
            onChange={e => setFecIni(e.target.value)} aria-label="Fecha inicial" />
          <span className={s.dash}>—</span>
          <input className={s.date} type="date" value={fecFin}
            onChange={e => setFecFin(e.target.value)} aria-label="Fecha final" />
          <Button variant="secondary" size="sm" onClick={load}>Filtrar</Button>
        </div>
      </div>

      {loading ? (
        <div className={s.empty}><span className={s.spin} /> Cargando títulos…</div>
      ) : titulos.length === 0 ? (
        <div className={s.empty}>No se encontraron títulos pendientes para el rango seleccionado.</div>
      ) : (
        <table className={s.tbl} aria-label="Títulos pendientes">
          <thead>
            <tr><th>No. Título</th><th>Tipo</th><th>Estado</th><th>Fecha Emisión</th><th>Acción</th></tr>
          </thead>
          <tbody>
            {titulos.map((t, i) => (
              <tr key={i}>
                <td className={s.mono}>{t.num}</td>
                <td><Tag color="navy">{t.tipo}</Tag></td>
                <td><Tag color="amber">{t.estado}</Tag></td>
                <td className={s.mono}>{t.emision}</td>
                <td><Button variant="ghost" size="sm">Ver detalle</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
