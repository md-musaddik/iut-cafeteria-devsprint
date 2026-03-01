require('dotenv').config();
const mongoose = require('mongoose');
const run = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/iut_cafeteria';
  for (let i=1;i<=10;i++) {
    try { await mongoose.connect(uri); console.log('Stock Seed: connected'); break; }
    catch { console.log(`Stock Seed: attempt ${i}/10...`);
      await new Promise(r=>setTimeout(r,3000));
      if (i===10) process.exit(0); }
  }
  const MealSchema = new mongoose.Schema({
    category: {type:String,unique:true}, price: Number,
options: [{name:String, stock:{type:Number,default:50}, version:{type:Number,default:0}}],
    isAvailable: {type:Boolean,default:true}
  });
  const Meal = mongoose.models.Meal || mongoose.model('Meal', MealSchema);
  if (await Meal.countDocuments()===0) {
    await Meal.insertMany([
      {category:'Iftar',price:80,options:[
        {name:'Chicken Pakora Combo',stock:50},{name:'Beef Samosa Combo',stock:50}]},
      {category:'Breakfast',price:60,options:[
        {name:'Paratha + Egg',stock:100},{name:'Bread + Omelette',stock:100}]},
      {category:'Lunch',price:100,options:[
        {name:'Rice + Chicken Curry',stock:150},{name:'Rice + Fish Curry',stock:150}]},
      {category:'Dinner',price:90,options:[
        {name:'Khichuri + Beef',stock:80},{name:'Rice + Vegetable Curry',stock:80}]},
    ]);
    console.log('Stock Seed: ✅ 4 meals created');
  } else console.log('Stock Seed: meals already exist');
  await mongoose.disconnect(); process.exit(0);
};
run().catch(e=>{ console.error(e.message); process.exit(0); });