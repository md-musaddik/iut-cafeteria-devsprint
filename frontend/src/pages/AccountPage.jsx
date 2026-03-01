import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import StudentLayout from '../layouts/StudentLayout';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function AccountPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [amount, setAmount]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleRecharge = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/admin/recharge', { amount: parseFloat(amount) });
      await refreshUser();
      toast(`৳${amount} added to your balance!`, 'success');
      setAmount('');
    } catch (err) {
      toast(err.response?.data?.message || 'Recharge failed', 'error');
    } finally { setLoading(false); }
  };

  return (
    <StudentLayout>
      <div className="page-header">
        <h1>👤 Account</h1>
        <p>Your profile and balance</p>
      </div>

      {/* 2 cols desktop → 1 col mobile */}
      <div className="grid-2col-cards">
        {/* Profile Card */}
        <div className="card" style={{ padding: '1.75rem' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white', fontSize: '1.6rem', flexShrink: 0, boxShadow: '0 4px 14px rgba(236,72,153,0.3)' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.15rem' }}>{user?.name}</div>
              <span className="badge badge-green" style={{ marginTop: '0.3rem' }}>Active Student</span>
            </div>
          </div>
          {[
            ['📧 Email',       user?.email],
            ['🎓 Student ID',  user?.studentId || '—'],
            ['🏷️ Role',        'Student'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{k}</span>
              <span style={{ fontWeight: 700, maxWidth: '55%', textAlign: 'right', wordBreak: 'break-all' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Balance Card */}
        <div className="card" style={{ padding: '1.75rem' }}>
          {/* Balance Display */}
          <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 14, padding: '1.75rem', color: 'white', marginBottom: '1.5rem', textAlign: 'center', boxShadow: '0 6px 20px rgba(99,102,241,0.3)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ fontSize: '0.82rem', opacity: 0.9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available Balance</div>
            <div style={{ fontSize: '3rem', fontWeight: 900, marginTop: '0.25rem', position: 'relative', zIndex: 1 }}>
              ৳{user?.balance?.toFixed(2) || '0.00'}
            </div>
          </div>

          <h3 style={{ fontWeight: 800, marginBottom: '0.85rem', fontSize: '1rem' }}>💳 Recharge Balance</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {[50, 100, 200, 500].map(a => (
              <button key={a} className="btn btn-ghost btn-sm"
                style={{ fontWeight: 800, flex: '1 0 auto' }}
                onClick={() => setAmount(String(a))}>৳{a}</button>
            ))}
          </div>
          <form onSubmit={handleRecharge} style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="number" min="1" max="10000" value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount (৳)" required />
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flexShrink: 0, fontWeight: 800 }}>
              {loading ? '...' : 'Add'}
            </button>
          </form>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.6rem', fontWeight: 500 }}>
            ⚠️ Simulation only — no real payment processed
          </p>
        </div>
      </div>
    </StudentLayout>
  );
}
