import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function LoginPage() {
  const [form, setForm]     = useState({ identifier: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card card">
        <div className="auth-logo">
          <span className="emoji">🍛</span>
          <h1>IUT Cafeteria</h1>
          <p>Sign in to order your meal</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email or Student ID</label>
            <input placeholder="email@iut.edu or 190042001" value={form.identifier}
              onChange={e => setForm({ ...form, identifier: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? <><span className="spinner spinner-sm" style={{ borderTopColor: 'white' }} /> Signing in...</> : '🚀 Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
          <p>Account is created by your admin.</p>
          <p style={{ marginTop: '0.75rem' }}>
            <Link to="/admin/login" style={{ color: 'var(--purple)', fontWeight: 600 }}>Admin Portal →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
