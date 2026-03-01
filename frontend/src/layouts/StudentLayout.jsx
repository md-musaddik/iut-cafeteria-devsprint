import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const nav = [
  { path: '/dashboard', icon: '🏠', label: 'Home' },
  { path: '/menu',      icon: '🍽️', label: 'Menu' },
  { path: '/orders',    icon: '📋', label: 'Orders' },
  { path: '/account',   icon: '👤', label: 'Account' },
];

export default function StudentLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPage = nav.find(n =>
    n.path === '/dashboard'
      ? location.pathname === n.path
      : location.pathname.startsWith(n.path)
  );

  return (
    <div style={{ display: 'flex' }}>
      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar" style={{ background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)' }}>
        <div style={{ padding: '1.75rem 1.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', boxShadow: '0 4px 14px rgba(239,68,68,0.3)', flexShrink: 0 }}>🍛</div>
            <div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: '1rem', lineHeight: 1.2 }}>IUT Cafeteria</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', fontWeight: 500 }}>Student Portal</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: '1rem', flexShrink: 0 }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.73rem', fontWeight: 600 }}>৳{user?.balance?.toFixed(2) || '0.00'}</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0.75rem 0' }}>
          {nav.map(item => {
            const active = item.path === '/dashboard'
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path} className={`sidebar-nav-item ${active ? 'active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {active && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'white', opacity: 0.7 }} />}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={() => { logout(); navigate('/login'); }}
            style={{ width: '100%', padding: '0.65rem', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <div className="mobile-header">
        <div className="mobile-header-logo">
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🍛</div>
          <div>
            <div className="mobile-header-title">IUT Cafeteria</div>
            <div className="mobile-header-subtitle">{currentPage?.label || 'Portal'}</div>
          </div>
        </div>
        <div style={{ color: 'var(--success)', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
          ৳{user?.balance?.toFixed(2) || '0.00'}
        </div>
        <div className="mobile-header-user" style={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}>
          {user?.name?.[0]?.toUpperCase()}
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="main-content">{children}</main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-items">
          {nav.map(item => {
            const active = item.path === '/dashboard'
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
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
