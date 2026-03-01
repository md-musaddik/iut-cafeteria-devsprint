import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import api from '../services/api';

const STATUS_BADGE = {
  'Placed': 'badge-blue', 'Stock Verified': 'badge-purple',
  'In Kitchen': 'badge-yellow', 'Ready': 'badge-green',
  'Picked Up': 'badge-teal', 'Cancelled': 'badge-red',
};
const STATUS_ICON = {
  'Placed': '📝', 'Stock Verified': '✅', 'In Kitchen': '👨‍🍳',
  'Ready': '🍱', 'Picked Up': '🎉', 'Cancelled': '❌',
};

export default function AdminDashboard() {
  const [metrics, setMetrics]     = useState(null);
  const [recentOrders, setRecent] = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchData = async () => {
    try {
      const [m, o] = await Promise.all([
        api.get('/admin/metrics'),
        api.get('/orders/admin/all?limit=10'),
      ]);
      setMetrics(m.data); setRecent(o.data.orders || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 10000); return () => clearInterval(t); }, []);

  const stats = [
    { label: 'Total Students', value: metrics?.totalStudents || 0,                   icon: '👥', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
    { label: 'Total Orders',   value: metrics?.totalOrders || 0,                      icon: '📋', gradient: 'linear-gradient(135deg,#3b82f6,#06b6d4)' },
    { label: 'Revenue',        value: `৳${(metrics?.totalRevenue || 0).toFixed(0)}`,  icon: '💰', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
    { label: 'Active Orders',  value: metrics?.activeOrders || 0,                     icon: '🔄', gradient: 'linear-gradient(135deg,#f59e0b,#f97316)' },
  ];

  const quickActions = [
    { to: '/admin/students', icon: '👥', label: 'Students',  color: '#6366f1', bg: '#e0e7ff' },
    { to: '/admin/orders',   icon: '📋', label: 'Orders',    color: '#10b981', bg: '#dcfce7' },
    { to: '/admin/inventory',icon: '🗃️', label: 'Inventory', color: '#f59e0b', bg: '#fef3c7' },
    { to: '/admin/metrics',  icon: '📈', label: 'Analytics', color: '#ec4899', bg: '#fce7f3' },
  ];

  if (loading) return <AdminLayout><div className="spinner" /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1>📊 Dashboard</h1>
        <p>Live overview · auto-refreshes every 10s</p>
      </div>

      {/* Stats — 4 cols desktop → 2 cols tablet/mobile */}
      <div className="grid-stats-4">
        {stats.map(s => (
          <div key={s.label} className="stat-card" style={{ background: s.gradient }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Content — 2 cols desktop → 1 col tablet */}
      <div className="grid-2col">

        {/* Quick Actions */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 800, marginBottom: '1.25rem', fontSize: '1.05rem' }}>⚡ Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {quickActions.map(item => (
              <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '1.1rem', borderRadius: 12,
                  background: item.bg, textAlign: 'center',
                  cursor: 'pointer', transition: 'all 0.2s',
                  border: `2px solid transparent`,
                }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; }}
                  onMouseOut={e  => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>{item.icon}</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: item.color }}>{item.label}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.05rem' }}>🕐 Recent Orders</h3>
            <Link to="/admin/orders" style={{ fontSize: '0.82rem', fontWeight: 700 }}>View all →</Link>
          </div>
          {recentOrders.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
              <div style={{ fontWeight: 600 }}>No orders yet</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {recentOrders.map(o => (
                <div key={o._id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.65rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{STATUS_ICON[o.status] || '📋'}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {o.userId?.name || 'N/A'}
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                        {o.mealCategory} · {o.selectedOption}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                    <span className={`badge ${STATUS_BADGE[o.status] || 'badge-gray'}`}>{o.status}</span>
                    <span style={{ color: 'var(--success)', fontWeight: 800, fontSize: '0.82rem' }}>৳{o.price}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kitchen Status Legend */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 800, marginBottom: '1.25rem', fontSize: '1.05rem' }}>🗺️ Order Flow Guide</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { status: 'Placed',         icon: '📝', desc: 'Student placed an order',             color: '#1d4ed8', bg: '#dbeafe' },
              { status: 'Stock Verified', icon: '✅', desc: 'Confirm stock is available',           color: '#6d28d9', bg: '#ede9fe' },
              { status: 'In Kitchen',     icon: '👨‍🍳', desc: 'Order is being prepared',              color: '#b45309', bg: '#fef3c7' },
              { status: 'Ready',          icon: '🍱', desc: 'Order ready for pickup',               color: '#15803d', bg: '#dcfce7' },
              { status: 'Picked Up',      icon: '🎉', desc: 'Student collected the order',          color: '#0f766e', bg: '#ccfbf1' },
            ].map(item => (
              <div key={item.status} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0.75rem', borderRadius: 10, background: item.bg }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: item.color }}>{item.status}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics snapshot */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 800, marginBottom: '1.25rem', fontSize: '1.05rem' }}>⚡ System Snapshot</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'Avg Response Time', value: `${metrics?.avgResponseTime || 0}ms`,           icon: '⚡', color: 'var(--warning)' },
              { label: 'Active Orders',     value: metrics?.activeOrders || 0,                     icon: '🔄', color: 'var(--primary)' },
              { label: 'Total Revenue',     value: `৳${(metrics?.totalRevenue || 0).toFixed(2)}`,  icon: '💰', color: 'var(--success)' },
              { label: 'Total Students',    value: metrics?.totalStudents || 0,                    icon: '👥', color: 'var(--purple)' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderRadius: 10, background: '#f8faff', border: '1px solid rgba(99,102,241,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--muted)' }}>{item.label}</span>
                </div>
                <span style={{ fontWeight: 900, fontSize: '1rem', color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
