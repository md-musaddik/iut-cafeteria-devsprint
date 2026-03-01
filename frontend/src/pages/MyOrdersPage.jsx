import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StudentLayout from '../layouts/StudentLayout';
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

export default function MyOrdersPage() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/orders/my').then(r => setOrders(r.data)).finally(() => setLoading(false)); }, []);

  if (loading) return <StudentLayout><div className="spinner" /></StudentLayout>;

  return (
    <StudentLayout>
      <div className="page-header">
        <h1>📋 My Orders</h1>
        <p>Track all your cafeteria orders</p>
      </div>

      {orders.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🍽️</div>
          <h3 style={{ fontWeight: 700 }}>No orders yet</h3>
          <p style={{ color: 'var(--muted)', margin: '0.5rem 0 1.5rem' }}>Place your first order from the menu!</p>
          <Link to="/menu" className="btn btn-primary">Browse Menu</Link>
        </div>
      ) : (
        <div className="grid-2col-cards">
          {orders.map(o => (
            <Link key={o._id} to={`/order/${o._id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '1.1rem 1.4rem', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'all 0.2s', cursor: 'pointer', height: '100%' }}
                onMouseOver={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={e  => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: o.status === 'Picked Up' ? 'linear-gradient(135deg,#10b981,#059669)' : o.status === 'Cancelled' ? '#fee2e2' : o.status === 'Ready' ? 'linear-gradient(135deg,#10b981,#059669)' : o.status === 'In Kitchen' ? 'linear-gradient(135deg,#f59e0b,#f97316)' : 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                  {STATUS_ICON[o.status] || '📋'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.mealCategory} — {o.selectedOption}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                    #{o._id.slice(-6).toUpperCase()} · {new Date(o.createdAt).toLocaleDateString()}
                  </div>
                  <span className={`badge ${STATUS_BADGE[o.status] || 'badge-gray'}`} style={{ marginTop: '0.3rem' }}>{o.status}</span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--success)' }}>৳{o.price}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </StudentLayout>
  );
}
