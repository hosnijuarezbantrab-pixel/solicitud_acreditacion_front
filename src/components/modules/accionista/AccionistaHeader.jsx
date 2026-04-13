import { useState } from 'react';
import { Button, Chip } from '../../ui/UI.jsx';
import { fmt, maskDPI, getEstatus } from '../../../utils/helpers.js';
import s from './AccionistaHeader.module.css';

export default function AccionistaHeader({ acc, onAccreditar }) {
  const est = getEstatus(acc.estatus);
  const [imgError, setImgError] = useState(false);

  return (
    <div className={s.banner}>
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
      <div className={s.info}>
        <div className={s.nombre}>{acc.nombre}</div>
        <div className={s.code}>{acc.codigo} · DPI {maskDPI(acc.dpi)}</div>
        <div className={s.chips}>
          <Chip color={est.color}>{est.label}</Chip>
          <Chip color="teal">Est. {acc.estatus}</Chip>
          <Chip color="amber">Act. {acc.ultima_actualizacion}</Chip>
        </div>
      </div>
      <div className={s.metrics}>
        <div className={s.met}><div className={`${s.mv} ${s.tl}`}>{(acc.acciones_comunes || 0).toLocaleString()}</div><div className={s.ml}>Acc. Comunes</div></div>
        <div className={s.sep} />
        <div className={s.met}><div className={s.mv}>{(acc.acciones_preferentes_a || 0).toLocaleString()}</div><div className={s.ml}>Acc. Pref. A</div></div>
        <div className={s.sep} />
        <div className={s.met}><div className={`${s.mv} ${s.gd}`}>{fmt(acc.dividendos || 0)}</div><div className={s.ml}>Dividendos</div></div>
      </div>
      <Button variant="teal" size="lg" style={{ flexShrink: 0, marginLeft: 16 }} onClick={onAccreditar}>
        🎫 &nbsp;Acreditar en Asamblea
      </Button>
    </div>
  );
}
