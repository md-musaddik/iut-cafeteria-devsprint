import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import AdminLayout from '../layouts/AdminLayout';
import api from '../services/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];

export default function MetricsPage() {
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/admin/metrics'), api.get('/orders/admin/all?limit=200')])
      .then(([m, o]) => { setMetrics(m.data); setOrders(o.data.orders || []); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><div className="spinner" /></AdminLayout>;

  const categories = ['Iftar', 'Breakfast', 'Lunch', 'Dinner'];
  const catData = categories.map(cat => ({
    name: cat,
    Orders:  orders.filter(o => o.mealCategory === cat).length,
    Revenue: orders.filter(o => o.mealCategory === cat && o.paymentStatus === 'Success').reduce((s, o) => s + o.price, 0),
  }));

  const statusData = ['Placed', 'In Kitchen', 'Ready', 'Picked Up', 'Cancelled'].map(s => ({
    name: s, value: orders.filter(o => o.status === s).length,
  })).filter(d => d.value > 0);

  const statCards = [
    { label: 'Total Students', value: metrics?.totalStudents || 0,                   icon: '👥', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
    { label: 'Total Orders',   value: metrics?.totalOrders || 0,                      icon: '📋', gradient: 'linear-gradient(135deg,#3b82f6,#06b6d4)' },
    { label: 'Total Revenue',  value: `৳${(metrics?.totalRevenue || 0).toFixed(2)}`,  icon: '💰', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
    { label: 'Active Orders',  value: metrics?.activeOrders || 0,                     icon: '🔄', gradient: 'linear-gradient(135deg,#f59e0b,#f97316)' },
    { label: 'Avg Response',   value: `${metrics?.avgResponseTime || 0}ms`,           icon: '⚡', gradient: 'linear-gradient(135deg,#ec4899,#be185d)' },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <h1>📈 Metrics</h1>
        <p>Performance analytics and insights</p>
      </div>

      {/* KPIs — 5 cols desktop → 3 tablet → 2 mobile */}
      <div className="grid-stats-5">
        {statCards.map(s => (
          <div key={s.label} className="stat-card" style={{ background: s.gradient }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: '1.7rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts — 2 cols desktop → 1 col tablet */}
      <div className="grid-2col">
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 800, marginBottom: '1.25rem', fontSize: '1rem' }}>📊 Orders by Category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={catData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2ff" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e0e7ff', fontWeight: 600 }} />
              <Bar dataKey="Orders" radius={[8, 8, 0, 0]}>
                {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 800, marginBottom: '1.25rem', fontSize: '1rem' }}>💰 Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={catData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2ff" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={v => `৳${v}`} contentStyle={{ borderRadius: 10, border: '1px solid #e0e7ff', fontWeight: 600 }} />
              <Bar dataKey="Revenue" radius={[8, 8, 0, 0]}>
                {catData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {statusData.length > 0 && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '1.25rem', fontSize: '1rem' }}>🥧 Order Status Breakdown</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={85} dataKey="value" labelLine={false}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: '0.82rem', fontWeight: 600 }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e0e7ff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 800, marginBottom: '1.25rem', fontSize: '1rem' }}>📋 Category Summary</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Category</th><th>Orders</th><th>Revenue</th><th>Avg/Order</th></tr>
              </thead>
              <tbody>
                {catData.map(row => (
                  <tr key={row.name}>
                    <td style={{ fontWeight: 700 }}>{row.name}</td>
                    <td style={{ fontWeight: 700 }}>{row.Orders}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 800 }}>৳{row.Revenue.toFixed(2)}</td>
                    <td style={{ color: 'var(--muted)', fontWeight: 600 }}>{row.Orders > 0 ? `৳${(row.Revenue / row.Orders).toFixed(2)}` : '—'}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--border)', background: '#f8faff' }}>
                  <td style={{ fontWeight: 900, color: 'var(--primary)' }}>Total</td>
                  <td style={{ fontWeight: 900 }}>{catData.reduce((s, r) => s + r.Orders, 0)}</td>
                  <td style={{ fontWeight: 900, color: 'var(--success)' }}>৳{catData.reduce((s, r) => s + r.Revenue, 0).toFixed(2)}</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
