import { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const ALL_STATUSES  = ['Placed', 'Stock Verified', 'In Kitchen', 'Ready', 'Picked Up'];
const STATUS_BADGE  = {
  'Placed':         'badge-blue',
  'Stock Verified': 'badge-purple',
  'In Kitchen':     'badge-yellow',
  'Ready':          'badge-green',
  'Picked Up':      'badge-teal',
  'Cancelled':      'badge-red',
};

const STATUS_COLORS = {
  'Placed':         { bg: '#dbeafe', color: '#1d4ed8', icon: '📝' },
  'Stock Verified': { bg: '#ede9fe', color: '#6d28d9', icon: '✅' },
  'In Kitchen':     { bg: '#fef3c7', color: '#b45309', icon: '👨‍🍳' },
  'Ready':          { bg: '#dcfce7', color: '#15803d', icon: '🍱' },
  'Picked Up':      { bg: '#ccfbf1', color: '#0f766e', icon: '🎉' },
  'Cancelled':      { bg: '#fee2e2', color: '#b91c1c', icon: '❌' },
};

export default function AdminOrdersPage() {
  const toast = useToast();
  const [tab, setTab]                   = useState('live');
  const [liveOrders, setLive]           = useState([]);
  const [completedOrders, setCompleted] = useState([]);
  const [liveTotal, setLiveTotal]       = useState(0);
  const [compTotal, setCompTotal]       = useState(0);
  const [filter, setFilter]             = useState('');
  const [loading, setLoading]           = useState(true);
  const [actionId, setActionId]         = useState('');

  const fetchLive = async () => {
    setLoading(true);
    try {
      const q = filter ? `&status=${filter}` : '';
      const res = await api.get(`/orders/admin/all?limit=25${q}`);
      setLive(res.data.orders || []); setLiveTotal(res.data.total);
    } finally { setLoading(false); }
  };

  const fetchCompleted = async () => {
    try {
      const res = await api.get('/orders/admin/completed?limit=25');
      setCompleted(res.data.orders || []); setCompTotal(res.data.total);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchLive(); fetchCompleted();
    const t = setInterval(() => { fetchLive(); fetchCompleted(); }, 8000);
    return () => clearInterval(t);
  }, [filter]);

  const handleStatus = async (orderId, status) => {
    setActionId(orderId + status);
    try {
      await api.put(`/orders/admin/${orderId}/status`, { status });
      toast(
        status === 'Picked Up' ? '🎉 Order picked up!' :
        status === 'In Kitchen' ? '👨‍🍳 Order sent to kitchen!' :
        status === 'Ready' ? '🍱 Order is ready!' :
        `Status → ${status}`,
        'success'
      );
      fetchLive(); fetchCompleted();
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setActionId(''); }
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm('Cancel this order and refund the student?')) return;
    setActionId(orderId + 'cancel');
    try {
      await api.post(`/orders/admin/${orderId}/cancel`);
      toast('Order cancelled. Balance refunded.', 'success');
      fetchLive();
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setActionId(''); }
  };

  // Live order cards (card view on mobile, table on desktop)
  const OrderCard = ({ o }) => {
    const s = STATUS_COLORS[o.status] || STATUS_COLORS['Placed'];
    const isBusy = !!actionId;

    return (
      <div style={{
        background: 'white', borderRadius: 14, border: `2px solid ${s.bg}`,
        padding: '1.1rem 1.25rem', marginBottom: '0.75rem',
        boxShadow: '0 2px 8px rgba(99,102,241,0.06)',
        transition: 'all 0.2s',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Left */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{o.userId?.name || '—'}</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--muted)', background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                #{o._id.slice(-6).toUpperCase()}
              </span>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
              {o.userId?.studentId && <span style={{ marginRight: '0.5rem' }}>🎓 {o.userId.studentId}</span>}
              <span>📅 {new Date(o.createdAt).toLocaleString()}</span>
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
              🍽️ {o.mealCategory} — {o.selectedOption}
            </div>
          </div>
          {/* Right */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--success)', marginBottom: '0.4rem' }}>৳{o.price}</div>
            <span className={`badge ${STATUS_BADGE[o.status] || 'badge-gray'}`}>{o.status}</span>
          </div>
        </div>

        {/* Actions */}
        {o.status !== 'Cancelled' && (
          <div style={{ marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: `1px solid ${s.bg}`, display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, marginRight: '0.25rem' }}>Update:</span>
            {ALL_STATUSES.map(st => (
              <button
                key={st}
                className={`btn btn-sm ${o.status === st ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                onClick={() => o.status !== st && handleStatus(o._id, st)}
                disabled={isBusy || o.status === st}
              >
                {STATUS_COLORS[st]?.icon} {st}
              </button>
            ))}
            <button
              className="btn btn-danger btn-sm"
              style={{ marginLeft: 'auto', fontSize: '0.72rem' }}
              onClick={() => handleCancel(o._id)}
              disabled={isBusy}
            >✕ Cancel</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="page-header" style={{ margin: 0 }}>
          <h1>📋 Orders</h1>
          <p>Manage all orders — auto-refreshes every 8s</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Live</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button className={`btn ${tab === 'live' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('live')}>
          🔄 Live Orders
          <span style={{ background: tab === 'live' ? 'rgba(255,255,255,0.25)' : 'var(--primary-light)', color: tab === 'live' ? 'white' : 'var(--primary)', borderRadius: 999, padding: '0.1rem 0.55rem', marginLeft: '0.4rem', fontSize: '0.78rem', fontWeight: 800 }}>
            {liveTotal}
          </span>
        </button>
        <button className={`btn ${tab === 'completed' ? 'btn-success' : 'btn-outline'}`} onClick={() => setTab('completed')}>
          ✅ Completed
          <span style={{ background: tab === 'completed' ? 'rgba(255,255,255,0.25)' : '#dcfce7', color: tab === 'completed' ? 'white' : 'var(--success)', borderRadius: 999, padding: '0.1rem 0.55rem', marginLeft: '0.4rem', fontSize: '0.78rem', fontWeight: 800 }}>
            {compTotal}
          </span>
        </button>
      </div>

      {/* Live Orders */}
      {tab === 'live' && (
        <>
          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${!filter ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter('')}>All</button>
            {[...ALL_STATUSES, 'Cancelled'].map(s => {
              const sc = STATUS_COLORS[s];
              return (
                <button
                  key={s}
                  className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setFilter(s)}
                  style={filter === s ? {} : { borderColor: sc?.bg, color: sc?.color }}
                >
                  {sc?.icon} {s}
                </button>
              );
            })}
          </div>

          {loading ? <div className="spinner" /> : (
            <>
              {liveOrders.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📭</div>
                  <div style={{ fontWeight: 700 }}>No {filter || 'active'} orders</div>
                </div>
              ) : (
                <>
                  {/* Desktop: table */}
                  <div className="card" style={{ display: 'none' }} id="orders-table-view">
                  </div>
                  {/* Card view (works on all sizes) */}
                  <div>
                    {liveOrders.map(o => <OrderCard key={o._id} o={o} />)}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Completed Orders */}
      {tab === 'completed' && (
        <div className="card">
          {loading ? <div className="spinner" /> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Student</th><th>Meal</th><th>Option</th><th>Amount</th><th>Status</th><th>Picked Up</th>
                  </tr>
                </thead>
                <tbody>
                  {completedOrders.map(o => (
                    <tr key={o._id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--muted)' }}>#{o._id.slice(-6).toUpperCase()}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{o.userId?.name || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{o.userId?.studentId || o.userId?.email}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{o.mealCategory}</td>
                      <td style={{ fontSize: '0.83rem', color: 'var(--muted)' }}>{o.selectedOption}</td>
                      <td style={{ fontWeight: 800, color: 'var(--success)' }}>৳{o.price}</td>
                      <td><span className={`badge ${STATUS_BADGE[o.status] || 'badge-gray'}`}>{o.status}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{new Date(o.pickedUpAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {completedOrders.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem' }}>No completed orders yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
