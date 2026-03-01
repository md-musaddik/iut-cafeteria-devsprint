import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const nav = [
  { path: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/admin/inventory', icon: '🗃️', label: 'Inventory' },
  { path: '/admin/orders',    icon: '📋', label: 'Orders' },
  { path: '/admin/students',  icon: '👥', label: 'Students' },
  { path: '/admin/metrics',   icon: '📈', label: 'Metrics' },
{ path: '/admin/system',    icon: '🖥️', label: 'System Health' },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPage = nav.find(n => location.pathname === n.path);

  return (
    <div style={{ display: 'flex' }}>
      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)' }}>
        <div style={{ padding: '1.75rem 1.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', boxShadow: '0 4px 14px rgba(99,102,241,0.4)', flexShrink: 0 }}>⚙️</div>
            <div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: '1rem', lineHeight: 1.2 }}>IUT Cafeteria</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 500 }}>Admin Panel</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: '1rem', flexShrink: 0 }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Administrator</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0.75rem 0' }}>
          {nav.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={`sidebar-nav-item ${active ? 'active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {active && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'white', opacity: 0.7 }} />}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => { logout(); navigate('/admin/login'); }}
            style={{ width: '100%', padding: '0.65rem', borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <div className="mobile-header">
        <div className="mobile-header-logo">
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>⚙️</div>
          <div>
            <div className="mobile-header-title">IUT Cafeteria</div>
            <div className="mobile-header-subtitle">{currentPage?.label || 'Admin'}</div>
          </div>
        </div>
        <div className="mobile-header-user" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <button onClick={() => { logout(); navigate('/admin/login'); }}
          style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '1.1rem', padding: '0.3rem', borderRadius: 8 }}
          title="Logout">🚪</button>
      </div>

      {/* ── Main Content ── */}
      <main className="main-content">{children}</main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-items">
          {nav.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={`bottom-nav-item ${active ? 'active' : ''}`}>
                <span className="bnav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
