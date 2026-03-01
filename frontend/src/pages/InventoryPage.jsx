import { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const MEAL_THEMES = {
  Breakfast: { icon: '🌅', gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  Lunch:     { icon: '☀️', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
  Dinner:    { icon: '🌙', gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
  Iftar:     { icon: '✨', gradient: 'linear-gradient(135deg,#f97316,#ec4899)' },
};

export default function InventoryPage() {
  const toast = useToast();
  const [meals, setMeals]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits]   = useState({});
  const [saving, setSaving] = useState({});

  useEffect(() => {
    api.get('/meals').then(r => setMeals(r.data)).finally(() => setLoading(false));
  }, []);

  const getVal = (id, field, def) => {
    const k = `${id}__${field}`;
    return k in edits ? edits[k] : def;
  };
  const setVal = (id, field, v) => setEdits(e => ({ ...e, [`${id}__${field}`]: v }));

  const savePrice = async (meal) => {
    const key = `${meal._id}__price`;
    setSaving(s => ({ ...s, [key]: true }));
    try {
      const price = parseFloat(getVal(meal._id, 'price', meal.price));
      const res = await api.put(`/meals/${meal._id}/price`, { price });
      setMeals(m => m.map(x => x._id === meal._id ? res.data : x));
      toast(`${meal.category} price updated to ৳${price}`, 'success');
    } catch { toast('Failed to update price', 'error'); }
    finally { setSaving(s => ({ ...s, [key]: false })); }
  };

  const saveStock = async (meal, optIdx) => {
    const key = `${meal._id}__stock_${optIdx}`;
    setSaving(s => ({ ...s, [key]: true }));
    try {
      const stock = parseInt(getVal(meal._id, `stock_${optIdx}`, meal.options[optIdx].stock));
      const res = await api.put(`/meals/${meal._id}/stock`, { optionIndex: optIdx, stock });
      setMeals(m => m.map(x => x._id === meal._id ? res.data : x));
      toast(`Stock updated for "${meal.options[optIdx].name}"`, 'success');
    } catch { toast('Failed to update stock', 'error'); }
    finally { setSaving(s => ({ ...s, [key]: false })); }
  };

  if (loading) return <AdminLayout><div className="spinner" /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1>🗃️ Inventory</h1>
        <p>Manage meal prices and stock levels</p>
      </div>

      {/* 3 cols desktop → 2 cols tablet → 1 col mobile */}
      <div className="grid-3col">
        {meals.map(meal => {
          const theme = MEAL_THEMES[meal.category] || MEAL_THEMES.Lunch;
          const totalStock = meal.options.reduce((s, o) => s + o.stock, 0);
          const isLowTotal = totalStock > 0 && totalStock <= 20;
          return (
            <div key={meal._id} className="card" style={{ overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ background: theme.gradient, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0 }}>
                  {theme.icon}
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 900, fontSize: '1.2rem' }}>{meal.category}</div>
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: 600 }}>
                    Price: ৳{meal.price} · Total stock: {totalStock}
                    {totalStock === 0 && <span style={{ marginLeft: '0.4rem', background: 'rgba(239,68,68,0.25)', borderRadius: 999, padding: '0.1rem 0.5rem', fontSize: '0.72rem' }}>OUT</span>}
                    {isLowTotal && <span style={{ marginLeft: '0.4rem', background: 'rgba(245,158,11,0.3)', borderRadius: 999, padding: '0.1rem 0.5rem', fontSize: '0.72rem' }}>LOW</span>}
                  </div>
                </div>
              </div>

              <div style={{ padding: '1.25rem' }}>
                {/* Price Update */}
                <div style={{ background: '#f8faff', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem', border: '1px solid rgba(99,102,241,0.08)' }}>
                  <div style={{ fontWeight: 800, marginBottom: '0.65rem', fontSize: '0.85rem', color: 'var(--text)' }}>💰 Update Price</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="number" min="0" style={{ flex: 1 }}
                      value={getVal(meal._id, 'price', meal.price)}
                      onChange={e => setVal(meal._id, 'price', e.target.value)} />
                    <button className="btn btn-primary btn-sm" onClick={() => savePrice(meal)}
                      disabled={saving[`${meal._id}__price`]}>
                      {saving[`${meal._id}__price`] ? '...' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Options */}
                <div style={{ fontWeight: 800, marginBottom: '0.65rem', fontSize: '0.85rem' }}>📦 Stock by Option</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {meal.options.map((opt, idx) => {
                    const stockVal = getVal(meal._id, `stock_${idx}`, opt.stock);
                    const isOut = opt.stock === 0;
                    const isLow = opt.stock > 0 && opt.stock <= 10;
                    return (
                      <div key={opt._id || idx} style={{
                        border: `2px solid ${isOut ? '#fecaca' : isLow ? '#fde68a' : '#e0e7ff'}`,
                        borderRadius: 10, padding: '0.85rem 1rem',
                        background: isOut ? '#fff5f5' : isLow ? '#fffbeb' : '#f8faff',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{opt.name}</div>
                            <div style={{ fontSize: '0.75rem', marginTop: '0.1rem' }}>
                              {isOut
                                ? <span style={{ color: 'var(--danger)', fontWeight: 700 }}>❌ Out of stock</span>
                                : isLow
                                  ? <span style={{ color: 'var(--warning)', fontWeight: 700 }}>⚠️ Low: {opt.stock} left</span>
                                  : <span style={{ color: 'var(--success)', fontWeight: 700 }}>✅ {opt.stock} in stock</span>}
                            </div>
                          </div>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.88rem', flexShrink: 0, background: isOut ? '#fee2e2' : isLow ? '#fef3c7' : '#dcfce7', color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)' }}>
                            {opt.stock}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input type="number" min="0" style={{ flex: 1 }}
                            value={stockVal}
                            onChange={e => setVal(meal._id, `stock_${idx}`, e.target.value)} />
                          <button className="btn btn-success btn-sm" onClick={() => saveStock(meal, idx)}
                            disabled={saving[`${meal._id}__stock_${idx}`]}>
                            {saving[`${meal._id}__stock_${idx}`] ? '...' : 'Update'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
