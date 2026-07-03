/**
 * Seed script to create the first admin user
 * Run: npm run seed:admin
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:', existingAdmin.email);
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'Fino Admin',
      email: 'admin@fino.com',
      password: 'Admin@123456',
      role: 'admin',
      kycStatus: 'verified',
      isActive: true,
    });

    console.log('✅ Admin user created successfully!');
    console.log('   Email:', admin.email);
    console.log('   Password: Admin@123456');
    console.log('   Role:', admin.role);
    console.log('\n⚠️  Change this password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
