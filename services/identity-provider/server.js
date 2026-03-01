require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const cors     = require('cors');

const app = express();
app.use(cors()); app.use(express.json());

let totalLogins = 0, failedLogins = 0;

// ── Rate Limiter: max 3 login attempts per IP per minute ─────────────────
// This is a BONUS requirement from the problem statement
const attempts = new Map();
const rateLimiter = (req, res, next) => {
  const key = req.ip; const now = Date.now();
  const rec = attempts.get(key) || { count:0, reset: now+60000 };
  if (now > rec.reset) { rec.count=0; rec.reset=now+60000; }
  rec.count++; attempts.set(key, rec);
if (rec.count > 3) return res.status(429).json({ message:'Too many attempts. Wait 1 minute.' });
  next();
};

// ── User Schema ───────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  name: String, email: { type:String, unique:true, lowercase:true },
  studentId: { type:String, sparse:true }, password: String,
  role: { type:String, default:'student' }, balance: { type:Number, default:0 },
  isDisabled: { type:Boolean, default:false }, isDeleted: { type:Boolean, default:false },
});
const User = mongoose.model('User', UserSchema);

// ── POST /login ───────────────────────────────────────────────────────────
app.post('/login', rateLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier||!password) return res.status(400).json({message:'Fields required'});
    const user = await User.findOne({
      $or:[{email:identifier.toLowerCase()},{studentId:identifier}],
      role:'student', isDeleted:false });
    if (!user||!await bcrypt.compare(password,user.password))
      { failedLogins++; return res.status(401).json({message:'Invalid credentials'}); }
    if (user.isDisabled) return res.status(403).json({message:'Account disabled'});
    totalLogins++;
    const token = jwt.sign({id:user._id,role:user.role},process.env.JWT_SECRET,{expiresIn:'7d'});
    res.json({ token, user:{_id:user._id,name:user.name,email:user.email,
      studentId:user.studentId,balance:user.balance,role:user.role} });
  } catch(e) { res.status(500).json({message:e.message}); }
});

// ── POST /admin/login ─────────────────────────────────────────────────────
app.post('/admin/login', rateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({email:email?.toLowerCase(),role:'admin'});
    if (!user||!await bcrypt.compare(password,user.password))
      return res.status(401).json({message:'Invalid admin credentials'});
    const token = jwt.sign({id:user._id,role:'admin'},process.env.JWT_SECRET,{expiresIn:'7d'});
    res.json({ token, user });
  } catch(e) { res.status(500).json({message:e.message}); }
});

// ── GET /verify — called by Order Gateway on every protected request ──────
app.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({valid:false});
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
res.json({ valid:true, user:decoded });
  } catch { res.status(401).json({valid:false}); }
});

// ── GET /health — REQUIRED by problem statement ───────────────────────────
app.get('/health', async (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.status(dbOk?200:503).json({
    service:'identity-provider', status:dbOk?'ok':'degraded',
    dependencies:{ mongodb: dbOk?'up':'down' }, timestamp:new Date().toISOString()
  });
});

// ── GET /metrics — REQUIRED by problem statement ──────────────────────────
app.get('/metrics', (_,res) => res.json({
  service:'identity-provider', totalLogins, failedLogins, uptime:process.uptime()
}));

mongoose.connect(process.env.MONGO_URI)
  .then(()=>console.log('Identity Provider: MongoDB connected'))
  .catch(e =>console.error('MongoDB error:',e.message));

const PORT = process.env.PORT || 3001;
app.listen(PORT, ()=>console.log(`Identity Provider on :${PORT}`));
module.exports = app;