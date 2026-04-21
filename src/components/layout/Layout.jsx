import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import s from './Layout.module.css';
const NAV = [
  { to: '/', label: 'Consulta Accionista', icon: '👤', badge: null, end: true },
  { to: '/expedientes', label: 'Expedientes', icon: '📄', badge: null, end: false },
  { to: '/dividendos', label: 'Dividendos', icon: '💰', badge: null, end: false },
];
const ADM = [
  { to: '/seguridad', label: 'Seguridad', icon: '🔐' },
  { to: '/configuracion', label: 'Configuración', icon: '⚙️' },
];
export function Topbar() {
  const { state: { usuario } } = useApp();
  return (
    <header className={s.topbar}>
      <div className={s.brand}><span className={s.dot} /> CORE ACCESS BT</div>
      <nav className={s.tnav}>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => [s.tlink, isActive ? s.tact : ''].join(' ')}>
            {n.label}{n.badge && <span className={s.tbadge}>{n.badge}</span>}
          </NavLink>
        ))}
      </nav>
      <div className={s.uchip}>
        <div className={s.uav}>{usuario.nombre.slice(0, 2)}</div>
        <div><div className={s.uname}>{usuario.nombre}</div><div className={s.urole}>{usuario.agencia_nombre}</div></div>
      </div>
    </header>
  );
}
export function Sidebar() {
  return (
    <nav className={s.sidebar}>
      <p className={s.sec}>Módulo Accionistas</p>
      {NAV.map(n => (
        <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => [s.nitem, isActive ? s.nact : ''].join(' ')}>
          <span className={s.nico}>{n.icon}</span><span className={s.nlbl}>{n.label}</span>
          {n.badge && <span className={s.nbadge}>{n.badge}</span>}
        </NavLink>
      ))}
      <p className={s.sec} style={{ marginTop: 16 }}>Administración</p>
      {ADM.map(n => (
        <NavLink key={n.to} to={n.to} className={({ isActive }) => [s.nitem, isActive ? s.nact : ''].join(' ')}>
          <span className={s.nico}>{n.icon}</span><span className={s.nlbl}>{n.label}</span>
        </NavLink>
      ))}
      <div style={{ flex: 1 }} />
      <button className={s.nitem} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
        <span className={s.nico}>🚪</span><span className={s.nlbl}>Salir</span>
      </button>
    </nav>
  );
}
export function StatusBar() {
  const now = new Date();
  return (
    <footer className={s.sbar}>
      <span className={s.scode}>Banco de los Trabajadores</span>
      <div className={s.sright}>
        <span>{now.toLocaleDateString('es-GT')} {now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</span>
        <div className={s.rpill}><span className={s.rdot} />READY</div>
      </div>
    </footer>
  );
}
export function Toasts() {
  const { state: { notifications } } = useApp();
  if (!notifications.length) return null;
  return (
    <div className={s.toasts} role="status" aria-live="polite">
      {notifications.map(n => (
        <div key={n.id} className={[s.toast, s[`t-${n.type}`]].join(' ')}>
          <span>{n.type === 'success' ? '✅' : n.type === 'error' ? '❌' : n.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
          {n.message}
        </div>
      ))}
    </div>
  );
}
export function AppShell({ children }) {
  return (
    <div className={s.shell}>
      <div className={s.body}><main className={s.content}>{children}</main></div>
      <StatusBar /><Toasts />
    </div>
  );
}
