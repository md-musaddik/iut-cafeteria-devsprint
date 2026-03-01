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

// ── In-memory cache ───────────────────────────────────────────────────────
// Stores recent stock counts so we can reject out-of-stock instantly
const cache = new Map();
const getCache = k => { const i=cache.get(k); if(!i||Date.now()>i.expiry){cache.delete(k);return null;} return i.value; };
const setCache = (k,v,ttl) => cache.set(k,{value:v,expiry:Date.now()+ttl*1000});

// ── Metrics ───────────────────────────────────────────────────────────────
const metrics = { totalOrders:0, failedOrders:0, responseTimes:[] };

// ── JWT validation middleware ─────────────────────────────────────────────
// Runs BEFORE every protected route handler
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

// ── POST /orders — place an order (protected) ─────────────────────────────
app.post('/orders', authenticate, async (req, res) => {
  const start = Date.now();
  try {
    const { mealCategory, selectedOption, idempotencyKey } = req.body;
    // Cache check: if stock is 0, reject instantly without hitting DB
    const ck = `stock:${mealCategory}:${selectedOption}`;
    const cached = getCache(ck);
    if (cached !== null && cached <= 0)
      return res.status(409).json({message:'Out of stock (cached)'});
    const stockRes = await axios.post(`${STOCK_URL}/deduct`,
      { mealCategory, selectedOption, userId:req.user.id,
        price:req.body.price, idempotencyKey });
    setCache(ck, stockRes.data.remainingStock, 30);
    const kitchenRes = await axios.post(`${KITCHEN_URL}/enqueue`,
      { orderId:stockRes.data.orderId, mealCategory, selectedOption, userId:req.user.id });
    metrics.totalOrders++;
    metrics.responseTimes.push(Date.now()-start);
    if (metrics.responseTimes.length>100) metrics.responseTimes.shift();
    res.status(201).json(kitchenRes.data);
  } catch(e) {
    metrics.failedOrders++;
    res.status(e.response?.status||500).json({message:e.response?.data?.message||e.message});
  }
});

// ── Proxy routes to other services ───────────────────────────────────────
app.get('/meals', async (req,res) => {
  try { const r=await axios.get(`${STOCK_URL}/meals`); res.json(r.data); }
  catch(e) { res.status(500).json({message:e.message}); }
});
app.get('/orders/my', authenticate, async (req,res) => {
  try { const r=await axios.get(`${STOCK_URL}/orders?userId=${req.user.id}`); res.json(r.data); }
  catch(e) { res.status(500).json({message:e.message}); }
});
app.post('/auth/login', async (req,res) => {
  try { const r=await axios.post(`${AUTH_URL}/login`,req.body); res.json(r.data); }
  catch(e) { res.status(e.response?.status||500).json(e.response?.data||{message:e.message}); }
});
app.post('/auth/admin/login', async (req,res) => {
  try { const r=await axios.post(`${AUTH_URL}/admin/login`,req.body); res.json(r.data); }
  catch(e) { res.status(e.response?.status||500).json(e.response?.data||{message:e.message}); }
});
app.get('/auth/me', authenticate, (req,res) => res.json(req.user));

// Proxy all /admin/* requests to stock service (admin CRUD lives there)
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
  res.status(allOk?200:503).json({ service:'order-gateway',
    status:allOk?'ok':'degraded',
    dependencies:{'identity-provider':auth,'stock-service':stock,'kitchen-queue':kitchen} });
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