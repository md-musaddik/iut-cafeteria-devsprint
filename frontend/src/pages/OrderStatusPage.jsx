import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StudentLayout from '../layouts/StudentLayout';
import api from '../services/api';
import { joinOrderRoom, leaveOrderRoom, connectSocket } from '../sockets/socket';

const STEPS = ['Placed', 'Stock Verified', 'In Kitchen', 'Ready'];

const STEP_INFO = {
  'Placed':         { icon: '📝', label: 'Order Placed',    color: 'var(--info)' },
  'Stock Verified': { icon: '✅', label: 'Stock Verified',  color: 'var(--purple)' },
  'In Kitchen':     { icon: '👨‍🍳', label: 'In Kitchen',     color: 'var(--warning)' },
  'Ready':          { icon: '🍱', label: 'Ready!',          color: 'var(--success)' },
  'Picked Up':      { icon: '🎉', label: 'Picked Up',       color: 'var(--teal)' },
  'Cancelled':      { icon: '❌', label: 'Cancelled',       color: 'var(--danger)' },
};

export default function OrderStatusPage() {
  const { orderId } = useParams();
  const [order, setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/${orderId}`).then(r => setOrder(r.data)).finally(() => setLoading(false));

    const socket = connectSocket();
    joinOrderRoom(orderId);
    socket.on('orderUpdate', data => {
      if (String(data.orderId) === orderId) {
        setOrder(prev => prev ? { ...prev, status: data.status } : prev);
      }
    });
    return () => { leaveOrderRoom(orderId); socket.off('orderUpdate'); };
  }, [orderId]);

  if (loading) return <StudentLayout><div className="spinner" /></StudentLayout>;
  if (!order)  return <StudentLayout><div className="alert alert-error">Order not found</div></StudentLayout>;

  const isPickedUp  = order.status === 'Picked Up';
  const isCancelled = order.status === 'Cancelled';
  const currentIdx  = STEPS.indexOf(order.status);
  const info        = STEP_INFO[order.status] || STEP_INFO['Placed'];

  return (
    <StudentLayout>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Link to="/orders" style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '1.25rem', display: 'inline-block' }}>← All Orders</Link>

        {/* Enjoy your meal banner */}
        {isPickedUp && (
          <div style={{ background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: 16, padding: '2rem', textAlign: 'center', color: 'white', marginBottom: '1.5rem', boxShadow: '0 8px 32px rgba(16,185,129,0.3)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '0.75rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Enjoy your meal!</h2>
            <p style={{ opacity: 0.9, marginTop: '0.5rem' }}>Your order has been picked up. Bon appétit! 😋</p>
          </div>
        )}

        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: isCancelled ? 'linear-gradient(135deg,#ef4444,#dc2626)' : isPickedUp ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '1.75rem 2rem', color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem' }}>{info.icon}</div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.5rem' }}>
              Order #{order._id.slice(-6).toUpperCase()}
            </h1>
            <div style={{ background: 'rgba(255,255,255,0.2)', display: 'inline-block', padding: '0.3rem 1rem', borderRadius: 999, marginTop: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>
              {order.status}
            </div>
          </div>

          <div style={{ padding: '2rem' }}>
            {/* Status Tracker (only for non-terminal) */}
            {!isCancelled && !isPickedUp && (
              <div style={{ marginBottom: '2rem' }}>
                <div className="status-track">
                  {STEPS.map((step, idx) => {
                    const isDone   = idx < currentIdx;
                    const isActive = idx === currentIdx;
                    return (
                      <div key={step} className={`status-track-step ${isDone ? 'done' : ''}`} style={{ position: 'relative' }}>
                        <div className={`status-dot ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <span className={`status-label ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                          {STEP_INFO[step]?.label || step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isCancelled && (
              <div className="alert alert-error">
                This order was cancelled. {order.paymentStatus === 'Refunded' && '✅ Your balance has been refunded.'}
              </div>
            )}

            {/* Order Details */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.88rem' }}>
              {[
                ['Category',    order.mealCategory],
                ['Option',      order.selectedOption],
                ['Amount',      `৳${order.price}`],
                ['Payment',     order.paymentStatus],
                ['Transaction', order.transactionId],
                ['Ordered At',  new Date(order.createdAt).toLocaleString()],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ color: 'var(--muted)', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{k}</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem', fontSize: '0.9rem' }}>{v}</div>
                </div>
              ))}
            </div>

            {!isCancelled && !isPickedUp && order.status !== 'Ready' && (
              <div className="alert alert-info" style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="pulse">⏳</span>
                Live updates — this page updates automatically. No need to refresh!
              </div>
            )}

            {order.status === 'Ready' && (
              <div className="alert alert-success" style={{ marginTop: '1.25rem', fontSize: '1rem', textAlign: 'center', fontWeight: 600 }}>
                🍱 Your order is ready! Please pick it up from the counter.
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
