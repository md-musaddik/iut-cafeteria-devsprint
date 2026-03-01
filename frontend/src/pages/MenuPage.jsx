import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import StudentLayout from '../layouts/StudentLayout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const MEAL_THEMES = {
  Breakfast: { icon: '🌅', gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  Lunch:     { icon: '☀️', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
  Dinner:    { icon: '🌙', gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
  Iftar:     { icon: '✨', gradient: 'linear-gradient(135deg,#f97316,#ec4899)' },
};

export function MenuPage() {
  const [meals, setMeals]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/meals').then(r => setMeals(r.data)).finally(() => setLoading(false)); }, []);

  if (loading) return <StudentLayout><div className="spinner" /></StudentLayout>;

  return (
    <StudentLayout>
      <div className="page-header">
        <h1>🍽️ Menu</h1>
        <p>Choose a meal category to place your order</p>
      </div>
      {/* Menu cards — 3 cols desktop → 2 cols tablet → 1 col mobile */}
      <div className="grid-3col">
        {meals.map(meal => {
          const theme = MEAL_THEMES[meal.category] || MEAL_THEMES.Lunch;
          return (
            <Link key={meal._id} to={`/menu/${meal.category}`} style={{ textDecoration: 'none' }}>
              <div className="meal-card card">
                <div className="meal-card-header" style={{ background: theme.gradient, padding: '2.5rem 1.5rem' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>{theme.icon}</div>
                  <div style={{ color: 'white', fontWeight: 800, fontSize: '1.5rem' }}>{meal.category}</div>
                  <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: '1.2rem', marginTop: '0.3rem' }}>৳{meal.price}</div>
                </div>
                <div className="meal-card-body">
                  {meal.options.map(opt => (
                    <div key={opt.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
                      <span>{opt.name}</span>
                      <span style={{ fontWeight: 600, color: opt.stock > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {opt.stock > 0 ? `✓ ${opt.stock}` : '✗ Out'}
                      </span>
                    </div>
                  ))}
                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <span className="btn btn-primary btn-sm" style={{ display: 'inline-flex' }}>Order Now →</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </StudentLayout>
  );
}

export function MealOrderPage() {
  const { category } = useParams();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast    = useToast();
  const [meal, setMeal]       = useState(null);
  const [selected, setSelected] = useState('');
  const [loading, setLoading]   = useState(true);
  const [placing, setPlacing]   = useState(false);

  useEffect(() => {
    api.get(`/meals/${category}`)
      .then(r => { setMeal(r.data); setSelected(r.data.options.find(o => o.stock > 0)?.name || ''); })
      .catch(() => toast('Meal not found', 'error'))
      .finally(() => setLoading(false));
  }, [category]);

  const handleOrder = async () => {
    if (!selected) return toast('Please select an option', 'error');
    setPlacing(true);
    try {
      const res = await api.post('/orders', { mealCategory: category, selectedOption: selected, idempotencyKey: uuidv4() });
      await refreshUser();
      toast('Order placed! Tracking now...', 'success');
      navigate(`/order/${res.data._id}`);
    } catch (err) {
      toast(err.response?.data?.message || 'Order failed', 'error');
      setPlacing(false);
    }
  };

  if (loading) return <StudentLayout><div className="spinner" /></StudentLayout>;
  if (!meal)   return <StudentLayout><div className="alert alert-error">Meal not found</div></StudentLayout>;

  const theme = MEAL_THEMES[meal.category] || MEAL_THEMES.Lunch;
  const afterBalance = (user?.balance || 0) - meal.price;

  return (
    <StudentLayout>
      <div style={{ maxWidth: 540, margin: '0 auto' }}>
        <Link to="/menu" style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>← Back to Menu</Link>

        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Hero */}
          <div style={{ background: theme.gradient, padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem' }}>{theme.icon}</div>
            <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem' }}>{meal.category}</h1>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.5rem', fontWeight: 700 }}>৳{meal.price}</div>
          </div>

          <div style={{ padding: '2rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--text)' }}>Choose your option:</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
              {meal.options.map(opt => {
                const isSelected = selected === opt.name;
                const isOut = opt.stock === 0;
                return (
                  <label key={opt.name} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem',
                    borderRadius: 10, cursor: isOut ? 'not-allowed' : 'pointer',
                    border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    background: isSelected ? 'var(--primary-light)' : 'white',
                    opacity: isOut ? 0.5 : 1, transition: 'all 0.2s',
                  }}>
                    <input type="radio" name="opt" value={opt.name} checked={isSelected}
                      onChange={() => !isOut && setSelected(opt.name)} disabled={isOut} style={{ width: 'auto', accentColor: 'var(--primary)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{opt.name}</div>
                      <div style={{ fontSize: '0.8rem', color: isOut ? 'var(--danger)' : 'var(--success)', marginTop: '0.15rem' }}>
                        {isOut ? '❌ Out of stock' : `✅ ${opt.stock} available`}
                      </div>
                    </div>
                    {isSelected && <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>}
                  </label>
                );
              })}
            </div>

            {/* Price Summary */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--muted)' }}>Meal Price</span><strong>৳{meal.price}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--muted)' }}>Your Balance</span><span>৳{(user?.balance || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', fontWeight: 700 }}>
                <span>Balance After</span>
                <span style={{ color: afterBalance < 0 ? 'var(--danger)' : 'var(--success)' }}>৳{afterBalance.toFixed(2)}</span>
              </div>
            </div>

            <button className="btn btn-primary btn-lg" style={{ width: '100%' }}
              onClick={handleOrder} disabled={placing || afterBalance < 0 || !selected}>
              {placing ? <><span className="spinner spinner-sm" style={{ borderTopColor: 'white' }} /> Processing payment...</> : `🛒 Place Order • ৳${meal.price}`}
            </button>

            {afterBalance < 0 && (
              <p style={{ textAlign: 'center', color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                ⚠️ Insufficient balance. <Link to="/account">Recharge here</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
