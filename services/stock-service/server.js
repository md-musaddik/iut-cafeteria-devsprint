const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const app = express(); app.use(express.json());

// ── Schemas ───────────────────────────────────────────────────────────────
const OptionSchema = new mongoose.Schema({
  name:String, stock:{type:Number,default:50,min:0}, version:{type:Number,default:0}
});
const MealSchema = new mongoose.Schema({
  category:{type:String,unique:true}, price:Number,
  options:[OptionSchema], isAvailable:{type:Boolean,default:true}
},{timestamps:true});
const Meal = mongoose.model('Meal',MealSchema);
const OrderSchema = new mongoose.Schema({
  userId:String, mealCategory:String, selectedOption:String, price:Number,
  status:{type:String,default:'Placed'}, paymentStatus:String, transactionId:String,
  idempotencyKey:{type:String,unique:true}, pickedUpAt:Date, cancelledAt:Date,
},{timestamps:true});
const Order = mongoose.model('Order',OrderSchema);
const UserSchema = new mongoose.Schema({
 name:String, email:{type:String,unique:true}, studentId:{type:String,sparse:true},
  password:String, role:{type:String,default:'student'}, balance:{type:Number,default:0},
  isDisabled:{type:Boolean,default:false}, isDeleted:{type:Boolean,default:false},
});
const User = mongoose.model('User',UserSchema);

// ── POST /deduct — atomically deduct stock AND balance ────────────────────
/*app.post('/deduct', async (req,res) => {
  try {
    const {mealCategory,selectedOption,userId,price,idempotencyKey} = req.body;
    // Idempotency: same key = already processed = return same result
    const existing = await Order.findOne({idempotencyKey});
    if (existing) return res.json({orderId:existing._id,remainingStock:0,idempotent:true});
    const meal = await Meal.findOne({category:mealCategory,isAvailable:true});
    if (!meal) return res.status(404).json({message:'Meal not found'});
    const optIdx = meal.options.findIndex(o=>o.name===selectedOption);
    if (optIdx===-1) return res.status(400).json({message:'Option not found'});
    const opt = meal.options[optIdx];
    if (opt.stock<=0) return res.status(409).json({message:'Out of stock'});

    // Check balance BEFORE deducting stock
    const finalPrice = price || meal.price;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({message:'User not found'});
    if (user.balance < finalPrice) return res.status(402).json({message:'Insufficient balance'});

    // OPTIMISTIC LOCKING: update only succeeds if version still matches
    const updated = await Meal.findOneAndUpdate(
      {_id:meal._id,'options._id':opt._id,'options.stock':{$gt:0},'options.version':opt.version},
      {$inc:{'options.$.stock':-1},$set:{'options.$.version':opt.version+1}},
      {new:true}
    );
    if (!updated) return res.status(409).json({message:'Stock conflict — please retry'});

    // Deduct balance from user after stock is secured
    await User.findByIdAndUpdate(userId, {$inc:{balance:-finalPrice}});

    const txId = `TXN-${uuidv4().substring(0,8).toUpperCase()}`;
    const order = await Order.create({
      userId, mealCategory, selectedOption,
      price: finalPrice, paymentStatus:'Success',
      transactionId:txId, idempotencyKey
    });
    res.status(201).json({orderId:order._id, remainingStock:updated.options[optIdx].stock});
  } catch(e) { res.status(500).json({message:e.message}); }
});*/
app.post('/deduct', async (req,res) => {
  try {
    const {mealCategory,selectedOption,userId,price,idempotencyKey} = req.body;
    const existing = await Order.findOne({idempotencyKey});
    if (existing) return res.json({orderId:existing._id,remainingStock:0,idempotent:true});
    const meal = await Meal.findOne({category:mealCategory,isAvailable:true});
    if (!meal) return res.status(404).json({message:'Meal not found'});
    const optIdx = meal.options.findIndex(o=>o.name===selectedOption);
    if (optIdx===-1) return res.status(400).json({message:'Option not found'});
    const opt = meal.options[optIdx];
    if (opt.stock<=0) return res.status(409).json({message:'Out of stock'});
    const updated = await Meal.findOneAndUpdate(
      {_id:meal._id,'options._id':opt._id,'options.stock':{$gt:0},'options.version':opt.version},
      {$inc:{'options.$.stock':-1},$set:{'options.$.version':opt.version+1}},
      {new:true}
    );
    if (!updated) return res.status(409).json({message:'Stock conflict — please retry'});
    // Deduct balance — userId exists in this DB because students are created here by admin
    const finalPrice = price || meal.price;
    await User.findByIdAndUpdate(userId, {$inc:{balance:-finalPrice}});
    const txId = `TXN-${uuidv4().substring(0,8).toUpperCase()}`;
    const order = await Order.create({
      userId, mealCategory, selectedOption,
      price: finalPrice, paymentStatus:'Success',
      transactionId:txId, idempotencyKey
    });
    res.status(201).json({orderId:order._id, remainingStock:updated.options[optIdx].stack});
  } catch(e) { res.status(500).json({message:e.message}); }
});

// ── Meal routes ───────────────────────────────────────────────────────────
app.get('/meals', async (_,res) => {
  try { res.json(await Meal.find({isAvailable:true})); }
  catch(e) { res.status(500).json({message:e.message}); }
});
app.get('/meals/:category', async (req,res) => {
  try {
    const meal = await Meal.findOne({category:req.params.category, isAvailable:true});
    if (!meal) return res.status(404).json({message:'Meal not found'});
    res.json(meal);
  } catch(e) { res.status(500).json({message:e.message}); }
});
app.put('/meals/:id/stock', async (req,res) => {
  try {
    const m = await Meal.findById(req.params.id);
    const {optionIndex,stock} = req.body;
    m.options[optionIndex].stock = parseInt(stock);
    m.options[optionIndex].version += 1;
    await m.save(); res.json(m);
  } catch(e) { res.status(500).json({message:e.message}); }
});
app.put('/meals/:id/price', async (req,res) => {
  try { res.json(await Meal.findByIdAndUpdate(req.params.id,{price:req.body.price},{new:true})); }
  catch(e) { res.status(500).json({message:e.message}); }
});

// ── Order routes ──────────────────────────────────────────────────────────
app.get('/orders', async (req,res) => {
  try {
    const q = req.query.userId?{userId:req.query.userId}:{};
    res.json(await Order.find(q).sort({createdAt:-1}).limit(50));
  } catch(e) { res.status(500).json({message:e.message}); }
});
app.get('/orders/admin/all', async (req,res) => {
  try {
    const orders = await Order.find({status:{$nin:['Picked Up','Cancelled']}}).sort({createdAt:-1}).limit(25);
    res.json({orders, total:orders.length});
  } catch(e) { res.status(500).json({message:e.message}); }
});
app.get('/orders/admin/completed', async (req,res) => {
  try {
    const orders = await Order.find({status:'Picked Up'}).sort({pickedUpAt:-1}).limit(25);
    res.json({orders, total:orders.length});
  } catch(e) { res.status(500).json({message:e.message}); }
});
app.put('/orders/admin/:id/status', async (req,res) => {
  try {
    const o = await Order.findById(req.params.id);
    o.status = req.body.status;
    if (req.body.status==='Picked Up') o.pickedUpAt = new Date();
    await o.save();
    // Notify the student's browser in real time via notification-hub
    const NOTIFY_URL = process.env.NOTIFY_URL || 'http://notification-hub:3005';
    axios.post(`${NOTIFY_URL}/notify`, {orderId: o._id, status: o.status})
      .catch(e => console.warn('Notify failed:', e.message));
    res.json(o);
  } catch(e) { res.status(500).json({message:e.message}); }
});
app.post('/orders/admin/:id/cancel', async (req,res) => {
  try {
    const o = await Order.findById(req.params.id);
    o.status='Cancelled'; o.cancelledAt=new Date();
    if (o.paymentStatus==='Success') {
      await User.findByIdAndUpdate(o.userId,{$inc:{balance:o.price}});
      await Meal.findOneAndUpdate({category:o.mealCategory,'options.name':o.selectedOption},
        {$inc:{'options.$.stock':1}});
      o.paymentStatus='Refunded';
    }
    await o.save(); res.json(o);
  } catch(e) { res.status(500).json({message:e.message}); }
});

// ── Admin student/user routes ─────────────────────────────────────────────
app.get('/admin/students', async (req,res) => {
  try {
    const {search='',page=1,limit=12} = req.query;
    const q = {role:'student',isDeleted:false,
      ...(search&&{$or:[{name:{$regex:search,$options:'i'}},
        {email:{$regex:search,$options:'i'}},{studentId:{$regex:search,$options:'i'}}]})};
    const students = await User.find(q).sort({createdAt:-1}).skip((page-1)*limit).limit(parseInt(limit));
    const total = await User.countDocuments(q);
    res.json({students, total, pages:Math.ceil(total/limit)});
  } catch(e) { res.status(500).json({message:e.message}); }
});
app.post('/admin/students', async (req,res) => {
  try {
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(req.body.password,12);
    res.status(201).json(await User.create({...req.body,password:hashed}));
  } catch(e) { res.status(409).json({message:e.message}); }
});
app.put('/admin/students/:id', async (req,res) => {
  try {
    const u = await User.findById(req.params.id);
    Object.assign(u,req.body);
    if (req.body.password) { const b=require('bcryptjs'); u.password=await b.hash(req.body.password,12); }
    await u.save(); res.json(u);
  } catch(e) { res.status(500).json({message:e.message}); }
});
app.put('/admin/students/:id/balance', async (req,res) => {
  try { res.json(await User.findByIdAndUpdate(req.params.id,{balance:req.body.balance},{new:true})); }
  catch(e) { res.status(500).json({message:e.message}); }
});
app.put('/admin/students/:id/toggle-disable', async (req,res) => {
  try { const u=await User.findById(req.params.id); u.isDisabled=!u.isDisabled; await u.save(); res.json(u); }
  catch(e) { res.status(500).json({message:e.message}); }
});
app.delete('/admin/students/:id', async (req,res) => {
  try {
    const u = await User.findById(req.params.id);
    u.isDeleted=true; u.email=`deleted_${Date.now()}_${u.email}`;
    await u.save(); res.json({message:'Student removed. Order history preserved.'});
  } catch(e) { res.status(500).json({message:e.message}); }
});
app.get('/admin/metrics', async (_,res) => {
  try {
    const [totalStudents,activeOrders,rev] = await Promise.all([
      User.countDocuments({role:'student',isDeleted:false}),
      Order.countDocuments({status:{$in:['Placed','Stock Verified','In Kitchen','Ready']}}),
      Order.aggregate([{$match:{paymentStatus:'Success'}},
        {$group:{_id:null,total:{$sum:'$price'},count:{$sum:1}}}]),
    ]);
    res.json({totalStudents,activeOrders,totalRevenue:rev[0]?.total||0,totalOrders:rev[0]?.count||0});
  } catch(e) { res.status(500).json({message:e.message}); }
});
app.post('/admin/recharge', async (req,res) => {
  try {
    const {userId,amount} = req.body;
    const u = await User.findByIdAndUpdate(userId,{$inc:{balance:parseFloat(amount)}},{new:true});
    res.json({balance:u.balance});
  } catch(e) { res.status(500).json({message:e.message}); }
});

// ── GET /users/:id — called by order-gateway for /auth/me ─────────────────
app.get('/users/:id', async (req,res) => {
  try {
    const u = await User.findById(req.params.id).select('-password');
    if (!u) return res.status(404).json({message:'User not found'});
    res.json(u);
  } catch(e) { res.status(500).json({message:e.message}); }
});

// ── Health & Metrics ──────────────────────────────────────────────────────
app.get('/health', async (_,res) => {
  const dbOk = mongoose.connection.readyState===1;
  res.status(dbOk?200:503).json({
    service:'stock-service', status:dbOk?'ok':'degraded',
    dependencies:{mongodb:dbOk?'up':'down'} });
});
app.get('/metrics', (_,res) => res.json({
  service:'stock-service', uptime:process.uptime() }));

mongoose.connect(process.env.MONGO_URI)
  .then(()=>console.log('Stock Service: MongoDB connected'))
  .catch(e =>console.error('MongoDB error:',e.message));
const PORT = process.env.PORT||3003;
app.listen(PORT,()=>console.log(`Stock Service on :${PORT}`));
module.exports = {app,Order,Meal};