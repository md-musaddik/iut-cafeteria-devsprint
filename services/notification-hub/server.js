require('dotenv').config();
const http    = require('http');
const express = require('express');
const cors    = require('cors');
const {Server} = require('socket.io');
const app    = express();
const server = http.createServer(app);
app.use(cors()); app.use(express.json());
const io = new Server(server,{cors:{origin:'*'}});
let totalPushed = 0;

io.on('connection', socket => {
  // Student joins a unique room for their specific order
  socket.on('joinOrder',  id => socket.join(`order-${id}`));
  socket.on('leaveOrder', id => socket.leave(`order-${id}`));
});

// ── POST /notify — called by Kitchen Queue ────────────────────────────────
app.post('/notify', (req,res) => {
  const {orderId,status} = req.body;
  // Push ONLY to the room for this specific order
  io.to(`order-${orderId}`).emit('orderUpdate',{orderId,status,updatedAt:new Date()});
  totalPushed++;
  res.json({ok:true});
});

app.get('/health', (_,res)=>res.json({
  service:'notification-hub',status:'ok',connectedClients:io.engine.clientsCount}));
app.get('/metrics', (_,res)=>res.json({
  service:'notification-hub',totalPushed,connectedClients:io.engine.clientsCount,uptime:process.uptime()}));

const PORT=process.env.PORT||3005;
server.listen(PORT,()=>console.log(`Notification Hub on :${PORT}`));
module.exports={app,io};