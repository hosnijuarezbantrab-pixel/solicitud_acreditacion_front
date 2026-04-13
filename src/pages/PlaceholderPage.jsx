import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/UI.jsx';
import s from './PlaceholderPage.module.css';

const CONFIG = {
  '/asambleas':     { icon: '🏛️', title: 'Gestión de',     accent: 'Asambleas'   },
  '/expedientes':   { icon: '📄', title: 'Consulta de',    accent: 'Expedientes' },
  '/dividendos':    { icon: '💰', title: 'Liquidación de', accent: 'Dividendos'  },
  '/seguridad':     { icon: '🔐', title: 'Módulo de',      accent: 'Seguridad'   },
  '/configuracion': { icon: '⚙️', title: 'Configuración del', accent: 'Sistema'  },
};

export default function PlaceholderPage({ path }) {
  const navigate = useNavigate();
  const conf = CONFIG[path] || { icon: '📋', title: 'Módulo', accent: path };

  return (
    <div className={s.wrap}>
      <div className={s.icon}>{conf.icon}</div>
      <h2 className={s.title}>
        <span style={{ color: 'var(--navy)' }}>{conf.title}&nbsp;</span>
        <span style={{ color: 'var(--teal-dk)' }}>{conf.accent}</span>
      </h2>
      <p className={s.sub}>Este módulo está disponible en el prototipo completo.</p>
      <Button
        variant="teal" size="lg"
        onClick={() => navigate('/')}
        style={{ width: 'auto', padding: '12px 28px' }}
      >
        ← Ir al módulo principal
      </Button>
    </div>
  );
}
