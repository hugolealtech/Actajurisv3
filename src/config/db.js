const mongoose  = require('mongoose');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/actajuris';
async function connectDB() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB conectado:', MONGO_URI);
    } catch (err) {
        console.error('❌ Erro MongoDB:', err.message);
        process.exit(1);
    }
}
module.exports = connectDB;
