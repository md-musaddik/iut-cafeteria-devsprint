require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const run = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/iut_cafeteria';
  // Retry 10 times — MongoDB takes ~15 seconds to start inside Docker
  for (let i = 1; i <= 10; i++) {
    try { await mongoose.connect(uri); console.log('Identity Seed: connected'); break; }
    catch { console.log(`Seed attempt ${i}/10...`); await new Promise(r=>setTimeout(r,3000));
      if (i===10) { console.log('Seed: giving up, server will start anyway'); process.exit(0); } }
  }
  const UserSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true, lowercase: true },
    studentId: { type: String, sparse: true }, password: String,
    role: { type: String, default: 'student' }, balance: { type: Number, default: 0 },
    isDisabled: { type: Boolean, default: false }, isDeleted: { type: Boolean, default: false },
  });
  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  if (!await User.findOne({ email: 'admin@iut.edu' })) {
    await User.create({ name:'Admin', email:'admin@iut.edu',
      password: await bcrypt.hash('Admin@1234', 12), role:'admin' });
    console.log('Identity Seed: ✅ admin@iut.edu created');
  } else { console.log('Identity Seed: admin already exists'); }
  await mongoose.disconnect(); process.exit(0);
};
run().catch(e => { console.error(e.message); process.exit(0); });