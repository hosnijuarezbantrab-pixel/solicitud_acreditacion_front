import { useState } from 'react';
import { getEstatus } from '../../../utils/helpers.js';
import s from './AccionistaHeader.module.css';

export default function AccionistaHeader({ acc, onAccreditar }) {
  const est = getEstatus(acc.estatus);
  const [imgError, setImgError] = useState(false);

  const GENERO = { M: 'MASCULINO', F: 'FEMENINO' };
  const ESTADO_CIVIL = {
    C: 'CASADO/A', S: 'SOLTERO/A', D: 'DIVORCIADO/A',
    V: 'VIUDO/A', U: 'UNIDO/A',
  };

  const rows = [
    [
      { label: 'REGISTRO:', value: acc.codigo },
      { label: 'DPI:', value: acc.dpi },
      { label: 'FECHA DE NACIMIENTO:', value: acc.fecha_nacimiento },
    ],
    [
      { label: 'ESTADO:', value: `${acc.estatus} – ${acc.descripEstatus || est.label}` },
      { label: 'VENCE:', value: acc.vencimiento_dpi },
      { label: 'ESTADO CIVIL:', value: (ESTADO_CIVIL[acc.estado_civil] || acc.estado_civil || '—').toUpperCase() },
    ],
    [
      { label: 'FECHA:', value: acc.ultima_actualizacion },
      { label: 'CORRELATIVO:', value: acc.correlativo ?? '—' },
      { label: 'GÉNERO:', value: (GENERO[acc.genero] || acc.genero || '—').toUpperCase() },
    ],
  ];

  return (
    <div className={s.banner}>
      {/* Accent lateral */}
      <div className={s.accent} />

      {/* Avatar */}
      {acc.foto && !imgError ? (
        <img
          src={acc.foto}
          alt={`Foto de ${acc.nombre}`}
          className={`${s.av} ${s.avPic}`}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={s.av} aria-hidden>
          {(acc.iniciales || acc.nombre?.slice(0, 2) || '??').toUpperCase()}
        </div>
      )}

      {/* Bloque derecho: nombre + grilla */}
      <div className={s.right}>
        <div className={s.nombre}>{acc.nombre}</div>

        <div className={s.grid}>
          {rows.map((row, ri) =>
            row.map((cell, ci) => (
              <div className={s.cell} key={`${ri}-${ci}`}>
                <span className={s.cellLabel}>{cell.label}</span>
                <span className={s.cellValue}>{cell.value ?? '—'}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
