require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const app = express(); app.use(express.json());

const NOTIFY_URL = process.env.NOTIFY_URL || 'http://notification-hub:3005';
const STOCK_URL  = process.env.STOCK_URL  || 'http://stock-service:3003';

let processed = 0;

// Notify student browser AND update MongoDB status
const notify = async (orderId, status) => {
  // Update status in MongoDB
  axios.put(`${STOCK_URL}/orders/admin/${orderId}/status`, {status})
    .catch(e => console.warn(`DB status update failed for ${orderId}:`, e.message));
  // Push live update to student browser via notification-hub
  try { await axios.post(`${NOTIFY_URL}/notify`, {orderId, status}); }
  catch { console.warn(`Notification Hub unreachable for order ${orderId}. Continuing.`); }
};

// ── POST /enqueue — called by Order Gateway ───────────────────────────────
// Just records the order as Placed and notifies — no automatic progression
app.post('/enqueue', async (req,res) => {
  const {orderId, mealCategory, selectedOption, userId} = req.body;
  processed++;
  // Notify "Placed" so the student's tracking page shows the initial status
  notify(orderId, 'Placed').catch(() => {});
  // Respond immediately
  res.status(201).json({
    orderId,
    status: 'Placed',
    message: 'Order placed! Waiting for kitchen staff.'
  });
});

app.get('/status/:orderId', (req,res) =>
  res.json({orderId: req.params.orderId, status: 'Check MongoDB for current status'}));

app.get('/health', (_,res) => res.json({
  service: 'kitchen-queue', status: 'ok', processed
}));
app.get('/metrics', (_,res) => res.json({
  service: 'kitchen-queue', processed, queueLength: 0, uptime: process.uptime()
}));

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Kitchen Queue on :${PORT}`));
module.exports = app;