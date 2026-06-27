const mongoose = require('mongoose');

const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    console.log('⚠️  Server running without database. Retrying in 5 seconds...');
    setTimeout(connectDatabase, 5000);
  }
};

module.exports = connectDatabase;
