const mongoose = require('mongoose');
require('dotenv').config();

async function cleanup() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in .env file (MONGODB_URI or MONGO_URI)');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    const collections = ['invxrewards', 'investments', 'proposals', 'votes'];
    
    console.log('\n🧹 Starting MongoDB cleanup...\n');
    
    for (const collectionName of collections) {
      try {
        await mongoose.connection.db.dropCollection(collectionName);
        console.log(`✅ Dropped collection: ${collectionName}`);
      } catch (err) {
        if (err.codeName === 'NamespaceNotFound') {
          console.log(`⚠️  Collection not found (already deleted): ${collectionName}`);
        } else {
          throw err;
        }
      }
    }
    
    console.log('\n📋 Remaining collections:');
    const remainingCollections = await mongoose.connection.db.listCollections().toArray();
    remainingCollections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    console.log('\n✅ MongoDB cleanup complete!');
    console.log('🎉 Database is now ready for on-chain architecture.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

cleanup();
