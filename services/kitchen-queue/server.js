require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const app = express(); app.use(express.json());
const NOTIFY_URL = process.env.NOTIFY_URL || 'http://notification-hub:3005';
const queue = []; // FIFO queue of pending orders
const orderStatus = new Map(); // orderId → current status string
let processed = 0;

// If Notification Hub is down: log a warning and CONTINUE
// This is fault tolerance — kitchen works even if notifications fail
const notify = async (orderId, status) => {
  orderStatus.set(String(orderId), status);
  try { await axios.post(`${NOTIFY_URL}/notify`,{orderId,status}); }
  catch { console.warn(`Notification Hub unreachable for order ${orderId}. Continuing.`); }
};

const processOrder = async (orderId) => {
  for (const stage of [
    {status:'Stock Verified', delay:1500},
    {status:'In Kitchen',     delay:3000+Math.random()*2000},
    {status:'Ready',          delay:3000+Math.random()*2000},
  ]) {
    await new Promise(r=>setTimeout(r,stage.delay));
    await notify(orderId, stage.status);
  }
  processed++;
};

// Background worker polls queue every 300ms
setInterval(()=>{
  while(queue.length>0) {
    const job=queue.shift();
    processOrder(job.orderId).catch(e=>console.error('Kitchen error:',e.message));
  }
},300);

// ── POST /enqueue — called by Order Gateway ───────────────────────────────
app.post('/enqueue', async (req,res) => {
  const {orderId,mealCategory,selectedOption,userId} = req.body;
  orderStatus.set(String(orderId),'Placed');
  queue.push({orderId,mealCategory,selectedOption,userId});
  notify(orderId,'Placed').catch(()=>{}); // non-blocking
  // Respond IMMEDIATELY — this keeps response time under 2 seconds
  res.status(201).json({orderId,status:'Placed',message:'Order placed! Preparing your meal.'});
});

app.get('/status/:orderId', (req,res) =>
  res.json({orderId:req.params.orderId, status:orderStatus.get(req.params.orderId)||'Unknown'}));

app.get('/health', (_,res)=>res.json({service:'kitchen-queue',status:'ok',queueLength:queue.length,processed}));
app.get('/metrics', (_,res)=>res.json({service:'kitchen-queue',processed,queueLength:queue.length,uptime:process.uptime()}));

const PORT=process.env.PORT||3004;
app.listen(PORT,()=>console.log(`Kitchen Queue on :${PORT}`));
module.exports=app;