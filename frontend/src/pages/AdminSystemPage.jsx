import { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';

// Service definitions — URLs use env vars in production, localhost fallback locally
const SERVICES = [
  {name:'Identity Provider',key:'identity',icon:'🔐',
   url: import.meta.env.VITE_IDENTITY_URL||'http://localhost:3001', container:'iut-identity'},
  {name:'Order Gateway',    key:'gateway', icon:'🚪',
   url: import.meta.env.VITE_API_URL     ||'http://localhost:3002', container:'iut-gateway'},
  {name:'Stock Service',    key:'stock',   icon:'📦',
   url: import.meta.env.VITE_STOCK_URL   ||'http://localhost:3003', container:'iut-stock'},
  {name:'Kitchen Queue',    key:'kitchen', icon:'👨‍🍳',
   url: import.meta.env.VITE_KITCHEN_URL ||'http://localhost:3004', container:'iut-kitchen'},
  {name:'Notification Hub', key:'notif',   icon:'🔔',
   url: import.meta.env.VITE_SOCKET_URL  ||'http://localhost:3005', container:'iut-notif'},
];

export default function AdminSystemPage() {
  const [health,  setHealth]  = useState({});
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [perfAlert, setPerfAlert] = useState(false);

  const fetchAll = async () => {
    const h={}, m={};
    await Promise.all(SERVICES.map(async svc => {
      try {
        const [hr,mr] = await Promise.all([
          fetch(`${svc.url}/health`).then(r=>r.json()),
          fetch(`${svc.url}/metrics`).then(r=>r.json()),
        ]);
        h[svc.key]={status:'up',data:hr}; m[svc.key]=mr;
      } catch { h[svc.key]={status:'down'}; m[svc.key]=null; }
    }));
    setHealth(h); setMetrics(m); setLoading(false);
    // BONUS: alert if gateway avg response exceeds 1000ms
    setPerfAlert(m['gateway']?.avgResponseTimeMs > 1000);
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 5000); // auto-refresh every 5s
    return () => clearInterval(t);
  }, []);

  // Shows the docker command judges should run to kill a service
  const chaosKill = svc => alert(
    `CHAOS TOGGLE — Kill: ${svc.name}\n\n` +
    `Run in terminal:\n  docker stop ${svc.container}\n\n` +
    `To restart:\n  docker start ${svc.container}`
  );

  if (loading) return <AdminLayout><div className='spinner'/></AdminLayout>;

  return (
    <AdminLayout>
      <div className='page-header'>
        <h1>🖥️ System Health</h1>
        <p>All microservices · auto-refreshes every 5 seconds</p>
      </div>

      {perfAlert && (
        <div className='alert alert-error' style={{fontWeight:700}}>
          ⚠️ PERFORMANCE ALERT: Gateway average response time exceeds 1 second!
        </div>
      )}

      {/* Health Grid — green/red card per service */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',
                   gap:'1rem',marginBottom:'2rem'}}>
        {SERVICES.map(svc => {
          const up = health[svc.key]?.status==='up';
          const m  = metrics[svc.key];
          return (
            <div key={svc.key} style={{
              padding:'1.5rem',borderRadius:14,textAlign:'center',
              background:up?'#f0fdf4':'#fef2f2',
              border:`2px solid ${up?'#10b981':'#ef4444'}`,transition:'all 0.3s'}}>
              <div style={{fontSize:'2rem'}}>{svc.icon}</div>
              <div style={{fontSize:'1.6rem',margin:'0.25rem 0'}}>{up?'🟢':'🔴'}</div>
              <div style={{fontWeight:700,fontSize:'0.85rem'}}>{svc.name}</div>
              <div style={{fontSize:'0.78rem',color:up?'#166534':'#991b1b',marginTop:'0.2rem'}}>
                {up?'Healthy':'OFFLINE'}</div>
              {m&&<div style={{fontSize:'0.72rem',color:'#6b7280',marginTop:'0.3rem'}}>
                {Math.floor(m.uptime||0)}s uptime</div>}
              <button onClick={()=>chaosKill(svc)} style={{
                marginTop:'0.7rem',padding:'0.3rem 0.7rem',borderRadius:6,
                background:'#ef4444',color:'white',border:'none',
                cursor:'pointer',fontSize:'0.75rem',fontWeight:700}}>
                💥 Kill
              </button>
            </div>
          );
        })}
      </div>

      {/* Live Metrics Table */}
      <div className='card' style={{padding:'1.5rem'}}>
        <h3 style={{fontWeight:700,marginBottom:'1rem'}}>📊 Live Metrics</h3>
        <div className='table-wrap'><table>
          <thead><tr>
            <th>Service</th><th>Status</th><th>Uptime</th>
            <th>Processed</th><th>Avg Response</th>
          </tr></thead>
          <tbody>
            {SERVICES.map(svc=>{
              const up=health[svc.key]?.status==='up';
              const m=metrics[svc.key];
              return(<tr key={svc.key}>
                <td style={{fontWeight:600}}>{svc.icon} {svc.name}</td>
                <td><span className={`badge ${up?'badge-green':'badge-red'}`}>
                  {up?'Online':'Offline'}</span></td>
                <td>{m?`${Math.floor(m.uptime)}s`:'—'}</td>
                <td>{m?.totalOrders??m?.totalDeductions??m?.processed??'—'}</td>
                <td style={{color:m?.avgResponseTimeMs>1000?'#ef4444':'inherit'}}>
                  {m?.avgResponseTimeMs?`${m.avgResponseTimeMs}ms`:'—'}</td>
              </tr>);
            })}
          </tbody>
        </table></div>
      </div>
    </AdminLayout>
  );
}