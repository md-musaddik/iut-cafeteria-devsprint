import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const EMPTY_FORM = { name: '', studentId: '', email: '', password: '', balance: '' };

// ── CRITICAL: FormModal is defined OUTSIDE the parent component ──
// If it were defined inside, React would re-mount it on every keystroke (losing focus).
function FormModal({ modal, form, setForm, onSubmit, saving, onClose }) {
  const title =
    modal === 'add'     ? '➕ Add New Student' :
    modal === 'edit'    ? '✏️ Edit Student' :
    modal === 'balance' ? '💰 Update Balance' : '';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <form onSubmit={onSubmit}>
            {modal !== 'balance' && (
              <>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required placeholder="John Doe"
                    autoFocus
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Student ID</label>
                    <input
                      value={form.studentId}
                      onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
                      placeholder="190042001"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      required placeholder="student@iut.edu"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>
                    Password{' '}
                    {modal === 'edit' && (
                      <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none' }}>
                        (leave blank to keep)
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    required={modal === 'add'}
                    minLength={modal === 'add' ? 6 : 0}
                  />
                </div>
              </>
            )}
            <div className="form-group">
              <label>Balance (৳)</label>
              <input
                type="number" min="0" step="0.01"
                value={form.balance}
                onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
                required placeholder="0.00"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminStudentsPage() {
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [actionId, setActionId] = useState('');

  const fetchStudents = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/students?page=${p}&limit=12&search=${q}`);
      setStudents(res.data.students); setTotal(res.data.total);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStudents(page, search); }, [page, search]);

  const openAdd = () => { setForm(EMPTY_FORM); setSelected(null); setModal('add'); };
  const openEdit = (s) => {
    setForm({ name: s.name, studentId: s.studentId || '', email: s.email, password: '', balance: s.balance });
    setSelected(s); setModal('edit');
  };
  const openBalance = (s) => { setForm({ ...EMPTY_FORM, balance: s.balance }); setSelected(s); setModal('balance'); };

  const handleAdd = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/admin/students', { ...form, balance: parseFloat(form.balance || 0) });
      toast('Student added successfully!', 'success');
      setModal(null); fetchStudents(page, search);
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { name: form.name, studentId: form.studentId, email: form.email, balance: parseFloat(form.balance) };
      if (form.password) payload.password = form.password;
      await api.put(`/admin/students/${selected._id}`, payload);
      toast('Student updated!', 'success');
      setModal(null); fetchStudents(page, search);
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleBalance = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put(`/admin/students/${selected._id}/balance`, { balance: parseFloat(form.balance) });
      toast('Balance updated!', 'success');
      setModal(null); fetchStudents(page, search);
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (s) => {
    setActionId(s._id);
    try {
      await api.put(`/admin/students/${s._id}/toggle-disable`);
      toast(`Account ${s.isDisabled ? 'enabled' : 'disabled'}`, 'success');
      fetchStudents(page, search);
    } catch { toast('Failed', 'error'); }
    finally { setActionId(''); }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Remove ${s.name}? Their order history will be kept.`)) return;
    setActionId(s._id + 'del');
    try {
      await api.delete(`/admin/students/${s._id}`);
      toast('Student removed (order history kept)', 'success');
      fetchStudents(page, search);
    } catch { toast('Failed', 'error'); }
    finally { setActionId(''); }
  };

  const activeSubmit = modal === 'add' ? handleAdd : modal === 'edit' ? handleEdit : handleBalance;

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="page-header" style={{ margin: 0 }}>
          <h1>👥 Students</h1>
          <p>{total} registered students</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>＋ Add Student</button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.25rem', maxWidth: 440 }}>
        <input
          placeholder="🔍 Search by name, email or student ID..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="card">
        {loading ? <div className="spinner" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Student ID</th>
                  <th>Email</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                          {s.name?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 700 }}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--muted)', fontFamily: 'monospace', fontWeight: 600 }}>{s.studentId || '—'}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{s.email}</td>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--success)', background: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.85rem' }}>
                        ৳{s.balance?.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      {s.isDisabled
                        ? <span className="badge badge-red">Disabled</span>
                        : <span className="badge badge-green">Active</span>}
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>✏️</button>
                        <button className="btn btn-info btn-sm" onClick={() => openBalance(s)}>💰</button>
                        <button className={`btn btn-sm ${s.isDisabled ? 'btn-success' : 'btn-warning'}`}
                          onClick={() => handleToggle(s)} disabled={actionId === s._id}>
                          {s.isDisabled ? '✅' : '🚫'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)} disabled={actionId === s._id + 'del'}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem' }}>
                    {search ? 'No students match your search' : 'No students yet. Click "Add Student" to create one.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 12 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ color: 'var(--muted)', fontSize: '0.88rem', fontWeight: 600 }}>Page {page} of {Math.ceil(total / 12)}</span>
          <button className="btn btn-outline btn-sm" disabled={students.length < 12} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {/* Modal — rendered once, stable identity */}
      {modal && (
        <FormModal
          modal={modal}
          form={form}
          setForm={setForm}
          onSubmit={activeSubmit}
          saving={saving}
          onClose={() => setModal(null)}
        />
      )}
    </AdminLayout>
  );
}
