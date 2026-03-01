import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StudentLayout from '../layouts/StudentLayout';
import api from '../services/api';

const MEAL_THEMES = {
  Breakfast: { icon: '🌅', gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)', light: '#fef3c7' },
  Lunch:     { icon: '☀️', gradient: 'linear-gradient(135deg,#10b981,#059669)', light: '#dcfce7' },
  Dinner:    { icon: '🌙', gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)', light: '#e0e7ff' },
  Iftar:     { icon: '✨', gradient: 'linear-gradient(135deg,#f97316,#ec4899)', light: '#ffedd5' },
};

const STATUS_BADGE = {
  'Placed': 'badge-blue', 'Stock Verified': 'badge-purple',
  'In Kitchen': 'badge-yellow', 'Ready': 'badge-green',
  'Cancelled': 'badge-red', 'Picked Up': 'badge-teal',
};
const STATUS_ICON = {
  'Placed': '📝', 'Stock Verified': '✅', 'In Kitchen': '👨‍🍳',
  'Ready': '🍱', 'Picked Up': '🎉', 'Cancelled': '❌',
};

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const [meals, setMeals]               = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([api.get('/meals'), api.get('/orders/my')])
      .then(([m, o]) => {
        setMeals(m.data);
        setActiveOrders(o.data.filter(x => !['Ready', 'Cancelled', 'Picked Up'].includes(x.status)).slice(0, 3));
      })
      .finally(() => setLoading(false));
    refreshUser();
  }, []);

  if (loading) return <StudentLayout><div className="spinner" /></StudentLayout>;

  return (
    <StudentLayout>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
          Hey, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '0.3rem', fontSize: '0.95rem' }}>What would you like to eat today?</p>
      </div>

      {/* Stats — 4 cols desktop → 2 cols mobile */}
      <div className="grid-student-stats">
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <div className="stat-icon">💰</div>
          <div className="stat-label">Balance</div>
          <div className="stat-value" style={{ fontSize: '1.7rem' }}>৳{user?.balance?.toFixed(2) || '0.00'}</div>
          <Link to="/account" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem', marginTop: '0.4rem', display: 'inline-block', fontWeight: 600 }}>Recharge →</Link>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
          <div className="stat-icon">🔄</div>
          <div className="stat-label">Active Orders</div>
          <div className="stat-value">{activeOrders.length}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
          <div className="stat-icon">🍽️</div>
          <div className="stat-label">Menu Items</div>
          <div className="stat-value">{meals.length}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#ec4899,#be185d)' }}>
          <div className="stat-icon">🎓</div>
          <div className="stat-label">Student ID</div>
          <div className="stat-value" style={{ fontSize: '0.95rem', marginTop: '0.4rem', wordBreak: 'break-all' }}>{user?.studentId || 'N/A'}</div>
        </div>
      </div>

      {/* Active Orders banner */}
      {activeOrders.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
            <span>🔄</span> Active Orders
            <span className="pulse" style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', marginLeft: '0.25rem' }} />
          </h2>
          <div className="grid-3col" style={{ marginBottom: '0' }}>
            {activeOrders.map(o => (
              <Link key={o._id} to={`/order/${o._id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'white', borderRadius: 14, padding: '1.1rem 1.25rem',
                  borderLeft: '4px solid var(--primary)', cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(99,102,241,0.1)',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = ''}>
                  <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{STATUS_ICON[o.status] || '📋'}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{o.mealCategory}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.78rem', margin: '0.1rem 0' }}>{o.selectedOption}</div>
                    <span className={`badge ${STATUS_BADGE[o.status] || 'badge-gray'}`}>{o.status}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Meal Grid — 3 cols desktop → 2 cols tablet → 1 col mobile */}
      <h2 style={{ fontWeight: 800, marginBottom: '1rem', fontSize: '1.15rem' }}>🍽️ Today's Menu</h2>
      <div className="grid-3col">
        {meals.map(meal => {
          const theme = MEAL_THEMES[meal.category] || MEAL_THEMES.Lunch;
          const totalStock = meal.options.reduce((s, o) => s + o.stock, 0);
          return (
            <Link key={meal._id} to={`/menu/${meal.category}`} style={{ textDecoration: 'none' }}>
              <div className="meal-card card">
                <div className="meal-card-header" style={{ background: theme.gradient }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.4rem' }}>{theme.icon}</div>
                  <div style={{ color: 'white', fontWeight: 900, fontSize: '1.25rem' }}>{meal.category}</div>
                  <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 800, fontSize: '1.1rem', marginTop: '0.2rem' }}>৳{meal.price}</div>
                </div>
                <div className="meal-card-body">
                  {meal.options.map(opt => (
                    <div key={opt.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.83rem' }}>
                      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{opt.name}</span>
                      <span style={{ color: opt.stock > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700, fontSize: '0.75rem' }}>
                        {opt.stock > 0 ? `${opt.stock} left` : 'Out'}
                      </span>
                    </div>
                  ))}
                  <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>{totalStock} available</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>Order →</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
        {meals.length === 0 && (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', gridColumn: '1/-1' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🍽️</div>
            <div style={{ fontWeight: 700 }}>No menu items available today</div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
