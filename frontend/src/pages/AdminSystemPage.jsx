
import { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';

const SERVICES = [
  { name:'Identity Provider', key:'identity', icon:'🔐',
    healthUrl:  '/api/svc/identity/health',
    metricsUrl: '/api/svc/identity/metrics',
    container:  'iut-identity' },
  { name:'Order Gateway',     key:'gateway',  icon:'🚪',
    healthUrl:  '/api/health',
    metricsUrl: '/api/metrics',
    container:  'iut-gateway' },
  { name:'Stock Service',     key:'stock',    icon:'📦',
    healthUrl:  '/api/svc/stock/health',
    metricsUrl: '/api/svc/stock/metrics',
    container:  'iut-stock' },
  { name:'Kitchen Queue',     key:'kitchen',  icon:'👨‍🍳',
    healthUrl:  '/api/svc/kitchen/health',
    metricsUrl: '/api/svc/kitchen/metrics',
    container:  'iut-kitchen' },
  { name:'Notification Hub',  key:'notif',    icon:'🔔',
    healthUrl:  '/api/svc/notif/health',
    metricsUrl: '/api/svc/notif/metrics',
    container:  'iut-notif' },
];

// A service is UP only if fetch succeeded AND JSON says status === 'ok'
const isServiceUp = (healthData) => {
  if (!healthData) return false;
  if (healthData.fetchFailed) return false;
  if (!healthData.data) return false;
  const s = healthData.data.status;
  if (s === 'down' || s === 'degraded') return false;
  if (s === 'ok' || s === 'up') return true;
  return false;
};

export default function AdminSystemPage() {
  const [health,    setHealth]    = useState({});
  const [metrics,   setMetrics]   = useState({});
  const [loading,   setLoading]   = useState(true);
  const [perfAlert, setPerfAlert] = useState(false);

  const fetchAll = async () => {
    const h = {}, m = {};
    await Promise.all(SERVICES.map(async svc => {
      // Health — check HTTP status AND JSON content
      try {
        const resp = await fetch(svc.healthUrl);
        const data = await resp.json();
        h[svc.key] = { fetchFailed: false, httpStatus: resp.status, data };
      } catch {
        h[svc.key] = { fetchFailed: true, data: null };
      }
      // Metrics
      try {
        const resp = await fetch(svc.metricsUrl);
        m[svc.key] = resp.ok ? await resp.json() : null;
      } catch {
        m[svc.key] = null;
      }
    }));
    setHealth(h);
    setMetrics(m);
    setLoading(false);
    setPerfAlert(m['gateway']?.avgResponseTimeMs > 1000);
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 5000);
    return () => clearInterval(t);
  }, []);

  const chaosKill = svc => alert(
    `CHAOS TOGGLE — Kill: ${svc.name}\n\n` +
    `Run in PowerShell:\n  docker stop ${svc.container}\n\n` +
    `To restart:\n  docker start ${svc.container}`
  );

  if (loading) return <AdminLayout><div className='spinner'/></AdminLayout>;

  const allUp = SERVICES.every(svc => isServiceUp(health[svc.key]));

  return (
    <AdminLayout>
      <div className='page-header'>
        <h1>🖥️ System Health</h1>
        <p>All microservices · auto-refreshes every 5 seconds</p>
      </div>

      {/* Overall status banner */}
      <div style={{
        padding:'1rem 1.5rem', borderRadius:12, marginBottom:'1.5rem',
        fontWeight:700, fontSize:'1rem',
        background: allUp ? '#f0fdf4' : '#fef2f2',
        border: `2px solid ${allUp ? '#10b981' : '#ef4444'}`,
        color: allUp ? '#166534' : '#991b1b',
      }}>
        {allUp
          ? '✅ All systems operational'
          : '⚠️ One or more services are offline — see below'}
      </div>

      {perfAlert && (
        <div className='alert alert-error' style={{fontWeight:700, marginBottom:'1rem'}}>
          ⚠️ PERFORMANCE ALERT: Gateway average response time exceeds 1 second!
        </div>
      )}

      {/* Health Grid */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',
                   gap:'1rem', marginBottom:'2rem'}}>
        {SERVICES.map(svc => {
          const up = isServiceUp(health[svc.key]);
          const mx = metrics[svc.key];
          return (
            <div key={svc.key} style={{
              padding:'1.5rem', borderRadius:14, textAlign:'center',
              background: up ? '#f0fdf4' : '#fef2f2',
              border: `2px solid ${up ? '#10b981' : '#ef4444'}`,
              transition: 'all 0.4s'
            }}>
              <div style={{fontSize:'2rem'}}>{svc.icon}</div>
              <div style={{fontSize:'1.6rem', margin:'0.25rem 0'}}>{up ? '🟢' : '🔴'}</div>
              <div style={{fontWeight:700, fontSize:'0.85rem'}}>{svc.name}</div>
              <div style={{
                fontSize:'0.78rem', fontWeight:700, marginTop:'0.2rem',
                color: up ? '#166534' : '#991b1b',
              }}>
                {up ? 'Healthy' : '⚠️ OFFLINE'}
              </div>
              {mx && up && (
                <div style={{fontSize:'0.72rem', color:'#6b7280', marginTop:'0.25rem'}}>
                  ⏱ {Math.floor(mx.uptime || 0)}s uptime
                </div>
              )}
              <button onClick={() => chaosKill(svc)} style={{
                marginTop:'0.75rem', padding:'0.3rem 0.75rem', borderRadius:6,
                background: up ? '#ef4444' : '#6b7280',
                color:'white', border:'none', cursor:'pointer',
                fontSize:'0.75rem', fontWeight:700,
              }}>
                {up ? '💥 Kill' : '💀 Down'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Fault Tolerance Table */}
      <div className='card' style={{padding:'1.5rem', marginBottom:'1.5rem'}}>
        <h3 style={{fontWeight:700, marginBottom:'1rem'}}>⚡ Fault Tolerance — What Breaks When a Service Dies</h3>
        <div className='table-wrap'>
          <table>
            <thead>
              <tr>
                <th>Service killed</th>
                <th>What stops working</th>
                <th>What keeps working (fault tolerance)</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  '🔐 Identity Provider',
                  'Login for new sessions, token verification',
                  'Already logged-in users retain their session'
                ],
                [
                  '🚪 Order Gateway',
                  'Everything — it is the single entry point',
                  'Nothing — gateway is the critical path'
                ],
                [
                  '📦 Stock Service',
                  'Placing orders, balance updates, student data',
                  'Nothing — stock is critical for orders'
                ],
                [
                  '👨‍🍳 Kitchen Queue',
                  'New orders cannot be queued',
                  'Existing orders still visible to admin'
                ],
                [
                  '🔔 Notification Hub',
                  'Live status updates in student browser',
                  'Orders still process normally — admin can still change status — students see updates on refresh'
                ],
              ].map(([svc, stops, keeps]) => (
                <tr key={svc}>
                  <td style={{fontWeight:600, whiteSpace:'nowrap'}}>{svc}</td>
                  <td style={{color:'#dc2626', fontSize:'0.88rem'}}>❌ {stops}</td>
                  <td style={{color:'#16a34a', fontSize:'0.88rem'}}>✅ {keeps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Metrics Table */}
      <div className='card' style={{padding:'1.5rem'}}>
        <h3 style={{fontWeight:700, marginBottom:'1rem'}}>📊 Live Metrics</h3>
        <div className='table-wrap'>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th>Uptime</th>
                <th>Processed</th>
                <th>Avg Response</th>
              </tr>
            </thead>
            <tbody>
              {SERVICES.map(svc => {
                const up = isServiceUp(health[svc.key]);
                const mx = metrics[svc.key];
                return (
                  <tr key={svc.key}>
                    <td style={{fontWeight:600}}>{svc.icon} {svc.name}</td>
                    <td>
                      <span style={{
                        padding:'0.2rem 0.65rem', borderRadius:999,
                        fontSize:'0.8rem', fontWeight:700,
                        background: up ? '#dcfce7' : '#fee2e2',
                        color:      up ? '#166534' : '#991b1b',
                      }}>
                        {up ? '🟢 Online' : '🔴 Offline'}
                      </span>
                    </td>
                    <td>{mx && up ? `${Math.floor(mx.uptime)}s` : '—'}</td>
                    <td>{mx ? (mx.totalOrders ?? mx.processed ?? '—') : '—'}</td>
                    <td style={{color: mx?.avgResponseTimeMs > 1000 ? '#ef4444' : 'inherit'}}>
                      {mx?.avgResponseTimeMs ? `${mx.avgResponseTimeMs}ms` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}