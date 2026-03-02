require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const axios   = require('axios');
const app = express();
app.use(cors()); app.use(express.json());

// Service URLs — in Docker these resolve by container name
const AUTH_URL    = process.env.AUTH_URL    || 'http://identity-provider:3001';
const STOCK_URL   = process.env.STOCK_URL   || 'http://stock-service:3003';
const KITCHEN_URL = process.env.KITCHEN_URL || 'http://kitchen-queue:3004';
const NOTIF_URL   = process.env.NOTIFY_URL  || 'http://notification-hub:3005';

// ── In-memory cache ───────────────────────────────────────────────────────
const cache = new Map();
const getCache = k => { const i=cache.get(k); if(!i||Date.now()>i.expiry){cache.delete(k);return null;} return i.value; };
const setCache = (k,v,ttl) => cache.set(k,{value:v,expiry:Date.now()+ttl*1000});

// ── Metrics ───────────────────────────────────────────────────────────────
const metrics = { totalOrders:0, failedOrders:0, responseTimes:[] };

// ── JWT validation middleware ─────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({message:'No token provided'});
    const r = await axios.get(`${AUTH_URL}/verify`,
      {headers:{Authorization:`Bearer ${token}`}});
    if (!r.data.valid) return res.status(401).json({message:'Invalid token'});
    req.user = r.data.user; next();
  } catch { res.status(401).json({message:'Token validation failed'}); }
};

// ── Health proxy routes for Admin System Health page ──────────────────────
// MUST be above the /admin wildcard
app.get('/svc/identity/health',  async (_,res) => {
  try { const r=await axios.get(`${AUTH_URL}/health`);    res.json(r.data); }
  catch { res.status(503).json({service:'identity-provider',status:'down'}); }
});
app.get('/svc/identity/metrics', async (_,res) => {
  try { const r=await axios.get(`${AUTH_URL}/metrics`);   res.json(r.data); }
  catch { res.status(503).json({service:'identity-provider',status:'down'}); }
});
app.get('/svc/stock/health',     async (_,res) => {
  try { const r=await axios.get(`${STOCK_URL}/health`);   res.json(r.data); }
  catch { res.status(503).json({service:'stock-service',status:'down'}); }
});
app.get('/svc/stock/metrics',    async (_,res) => {
  try { const r=await axios.get(`${STOCK_URL}/metrics`);  res.json(r.data); }
  catch { res.status(503).json({service:'stock-service',status:'down'}); }
});
app.get('/svc/kitchen/health',   async (_,res) => {
  try { const r=await axios.get(`${KITCHEN_URL}/health`); res.json(r.data); }
  catch { res.status(503).json({service:'kitchen-queue',status:'down'}); }
});
app.get('/svc/kitchen/metrics',  async (_,res) => {
  try { const r=await axios.get(`${KITCHEN_URL}/metrics`);res.json(r.data); }
  catch { res.status(503).json({service:'kitchen-queue',status:'down'}); }
});
app.get('/svc/notif/health',     async (_,res) => {
  try { const r=await axios.get(`${NOTIF_URL}/health`);   res.json(r.data); }
  catch { res.status(503).json({service:'notification-hub',status:'down'}); }
});
app.get('/svc/notif/metrics',    async (_,res) => {
  try { const r=await axios.get(`${NOTIF_URL}/metrics`);  res.json(r.data); }
  catch { res.status(503).json({service:'notification-hub',status:'down'}); }
});

// ── POST /orders ──────────────────────────────────────────────────────────
app.post('/orders', authenticate, async (req, res) => {
  const start = Date.now();
  try {
    const { mealCategory, selectedOption, idempotencyKey } = req.body;
    const ck = `stock:${mealCategory}:${selectedOption}`;
    const cached = getCache(ck);
    if (cached !== null && cached <= 0)
      return res.status(409).json({message:'Out of stock (cached)'});

    // stockRes contains the real MongoDB _id of the order
    const stockRes = await axios.post(`${STOCK_URL}/deduct`,
      { mealCategory, selectedOption, userId:req.user.id,
        price:req.body.price, idempotencyKey });
    setCache(ck, stockRes.data.remainingStock, 30);

    // Send to kitchen queue (non-blocking for response time)
    // Kitchen uses stockRes.data.orderId which IS the MongoDB _id
    axios.post(`${KITCHEN_URL}/enqueue`,
      { orderId:stockRes.data.orderId, mealCategory, selectedOption, userId:req.user.id })
      .catch(e => console.warn('Kitchen enqueue failed:', e.message));

    metrics.totalOrders++;
    metrics.responseTimes.push(Date.now()-start);
    if (metrics.responseTimes.length>100) metrics.responseTimes.shift();

    // Return the MongoDB _id as _id so frontend navigate(`/order/${res.data._id}`) works
    res.status(201).json({
      _id: stockRes.data.orderId,
      orderId: stockRes.data.orderId,
      status: 'Placed',
      message: 'Order placed! Preparing your meal.'
    });
  } catch(e) {
    metrics.failedOrders++;
    res.status(e.response?.status||500).json({message:e.response?.data?.message||e.message});
  }
});

// ── Meal routes ───────────────────────────────────────────────────────────
app.get('/meals', async (req,res) => {
  try { const r=await axios.get(`${STOCK_URL}/meals`); res.json(r.data); }
  catch(e) { res.status(500).json({message:e.message}); }
});
app.get('/meals/:category', async (req,res) => {
  try {
    const r = await axios.get(`${STOCK_URL}/meals`);
    const meal = r.data.find(m => m.category === req.params.category);
    if (!meal) return res.status(404).json({message:'Meal not found'});
    res.json(meal);
  } catch(e) { res.status(500).json({message:e.message}); }
});
app.put('/meals/:id/price', authenticate, async (req,res) => {
  try {
    const r = await axios.put(`${STOCK_URL}/meals/${req.params.id}/price`, req.body);
    res.json(r.data);
  } catch(e) { res.status(e.response?.status||500).json(e.response?.data||{message:e.message}); }
});
app.put('/meals/:id/stock', authenticate, async (req,res) => {
  try {
    const r = await axios.put(`${STOCK_URL}/meals/${req.params.id}/stock`, req.body);
    res.json(r.data);
  } catch(e) { res.status(e.response?.status||500).json(e.response?.data||{message:e.message}); }
});

// ── Order routes ──────────────────────────────────────────────────────────
// IMPORTANT: specific routes MUST come before /orders/:id wildcard

app.get('/orders/admin/all', authenticate, async (req,res) => {
  try {
    const q = req.query.status ? `?status=${req.query.status}&limit=25` : '?limit=25';
    const r = await axios.get(`${STOCK_URL}/orders/admin/all${q}`);
    res.json(r.data);
  } catch(e) { res.status(500).json({message:e.message}); }
});
app.get('/orders/admin/completed', authenticate, async (req,res) => {
  try {
    const r = await axios.get(`${STOCK_URL}/orders/admin/completed?limit=25`);
    res.json(r.data);
  } catch(e) { res.status(500).json({message:e.message}); }
});
app.put('/orders/admin/:id/status', authenticate, async (req,res) => {
  try {
    const r = await axios.put(`${STOCK_URL}/orders/admin/${req.params.id}/status`, req.body);
    res.json(r.data);
  } catch(e) { res.status(e.response?.status||500).json(e.response?.data||{message:e.message}); }
});
app.post('/orders/admin/:id/cancel', authenticate, async (req,res) => {
  try {
    const r = await axios.post(`${STOCK_URL}/orders/admin/${req.params.id}/cancel`, req.body);
    res.json(r.data);
  } catch(e) { res.status(e.response?.status||500).json(e.response?.data||{message:e.message}); }
});
app.get('/orders/my', authenticate, async (req,res) => {
  try { const r=await axios.get(`${STOCK_URL}/orders?userId=${req.user.id}`); res.json(r.data); }
  catch(e) { res.status(500).json({message:e.message}); }
});

// Single order by ID — MUST be last among /orders/* routes
app.get('/orders/:id', authenticate, async (req,res) => {
  try {
    const r = await axios.get(`${STOCK_URL}/orders?userId=${req.user.id}`);
    const order = r.data.find(o => String(o._id) === req.params.id);
    if (!order) return res.status(404).json({message:'Order not found'});
    res.json(order);
  } catch(e) { res.status(500).json({message:e.message}); }
});

// ── Auth routes ───────────────────────────────────────────────────────────
app.post('/auth/login', async (req,res) => {
  try { const r=await axios.post(`${AUTH_URL}/login`,req.body); res.json(r.data); }
  catch(e) { res.status(e.response?.status||500).json(e.response?.data||{message:e.message}); }
});
app.post('/auth/admin/login', async (req,res) => {
  try { const r=await axios.post(`${AUTH_URL}/admin/login`,req.body); res.json(r.data); }
  catch(e) { res.status(e.response?.status||500).json(e.response?.data||{message:e.message}); }
});

// /auth/me fetches fresh user data including balance from stock-service
app.get('/auth/me', authenticate, async (req,res) => {
  try {
    const r = await axios.get(`${STOCK_URL}/users/${req.user.id}`);
    res.json(r.data);
  } catch {
    res.json(req.user);
  }
});

// ── Admin routes ──────────────────────────────────────────────────────────
// /admin/recharge MUST be above the /admin wildcard
app.post('/admin/recharge', authenticate, async (req,res) => {
  try {
    const r = await axios.post(`${STOCK_URL}/admin/recharge`,
      { userId: req.user.id, amount: req.body.amount });
    res.json(r.data);
  } catch(e) { res.status(e.response?.status||500).json(e.response?.data||{message:e.message}); }
});

// Proxy all other /admin/* requests to stock service
app.use('/admin', authenticate, async (req,res) => {
  try {
    const r = await axios({ method:req.method,
      url:`${STOCK_URL}${req.originalUrl}`, data:req.body,
      headers:{'Content-Type':'application/json'} });
    res.status(r.status).json(r.data);
  } catch(e) { res.status(e.response?.status||500).json(e.response?.data||{message:e.message}); }
});

// ── Health & Metrics ──────────────────────────────────────────────────────



app.get('/health', async (req,res) => {
  const checks = await Promise.allSettled([
    axios.get(`${AUTH_URL}/health`),
    axios.get(`${STOCK_URL}/health`),
    axios.get(`${KITCHEN_URL}/health`),
  ]);
  const [auth,stock,kitchen] = checks.map(c=>c.status==='fulfilled'?'up':'down');
  const allOk = [auth,stock,kitchen].every(s=>s==='up');
  // Always return 200 and status:'ok' — gateway is UP even if dependencies are degraded
  // The frontend health page checks each dependency separately via /svc/* routes
  res.status(200).json({
    service:'order-gateway',
    status:'ok',
    dependencies:{
      'identity-provider': auth,
      'stock-service':      stock,
      'kitchen-queue':      kitchen,
    }
  });
});


app.get('/metrics', (_,res) => {
  const t=metrics.responseTimes;
  const avg=t.length?Math.round(t.reduce((a,b)=>a+b,0)/t.length):0;
  res.json({...metrics, avgResponseTimeMs:avg,
    alertTriggered:avg>1000, uptime:process.uptime()});
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, ()=>console.log(`Order Gateway on :${PORT}`));
module.exports = app;