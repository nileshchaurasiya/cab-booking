require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const DriverDetail = require('./models/DriverDetail');
const Ride = require('./models/Ride');
const Payment = require('./models/Payment');
const Review = require('./models/Review');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cab_booking';

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('Connected. Dropping collections to clean up...');

    // Drop collections if they exist
    await User.deleteMany({});
    await DriverDetail.deleteMany({});
    await Ride.deleteMany({});
    await Payment.deleteMany({});
    await Review.deleteMany({});

    console.log('Collections dropped. Seeding data...');

    // 1. Seed Customer
    const customer = new User({
      name: 'John Customer',
      email: 'customer@cab.com',
      phone: '1234567890',
      password: 'password123', // Will be hashed via pre-save hook
      role: 'customer',
      status: 'active'
    });
    await customer.save();
    console.log('Customer seeded.');

    // 2. Seed Driver
    const driver = new User({
      name: 'Dave Driver',
      email: 'driver@cab.com',
      phone: '0987654321',
      password: 'password123', // Will be hashed via pre-save hook
      role: 'driver',
      status: 'active'
    });
    await driver.save();

    const driverDetail = new DriverDetail({
      user_id: driver._id,
      license_number: 'DL-99999',
      vehicle_model: 'Toyota Camry',
      vehicle_plate_number: 'MH12AB1234',
      vehicle_color: 'White',
      vehicle_type: 'sedan',
      is_available: true,
      current_latitude: 12.9716,
      current_longitude: 77.5946,
      rating: 4.90
    });
    await driverDetail.save();
    console.log('Driver & Driver details seeded.');

    // 3. Seed Admin
    const admin = new User({
      name: 'Super Admin',
      email: 'admin@cab.com',
      phone: '1111111111',
      password: 'password123', // Will be hashed via pre-save hook
      role: 'admin',
      status: 'active'
    });
    await admin.save();
    console.log('Admin seeded.');

    console.log('Database seeded successfully!');
    process.exit(0);

  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
};

seedDatabase();
