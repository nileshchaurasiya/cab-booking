require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authController = require('./controllers/authController');
const customerRideController = require('./controllers/customerRideController');
const driverController = require('./controllers/driverController');
const adminController = require('./controllers/adminController');

const { authenticate, restrictTo } = require('./middleware/auth');

const app = express();

// Standard Middlewares
app.use(cors({
  origin: '*', // Allow all origins for simplicity
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());

// Set up MongoDB Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cab_booking';
mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

// Global Mongoose setting to transform output (converts _id to id)
mongoose.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// --- API Routing ---

// Public Routes
app.post('/api/register', authController.register);
app.post('/api/login', authController.login);

// Authenticated Routes Group
app.use('/api', authenticate);

// Standard auth routes
app.post('/api/logout', authController.logout);
app.get('/api/me', authController.me);

// Customer-only Routes
app.get('/api/customer/drivers/nearby', restrictTo('customer'), customerRideController.nearbyDrivers);
app.post('/api/customer/rides', restrictTo('customer'), customerRideController.store);
app.get('/api/customer/rides', restrictTo('customer'), customerRideController.index);
app.get('/api/customer/rides/:id', restrictTo('customer'), customerRideController.show);
app.post('/api/customer/rides/:id/cancel', restrictTo('customer'), customerRideController.cancel);
app.post('/api/customer/rides/:id/rate', restrictTo('customer'), customerRideController.rate);

// Driver-only Routes
app.post('/api/driver/location', restrictTo('driver'), driverController.updateLocation);
app.get('/api/driver/rides/requests', restrictTo('driver'), driverController.rideRequests);
app.post('/api/driver/rides/:id/accept', restrictTo('driver'), driverController.acceptRide);
app.post('/api/driver/rides/:id/status', restrictTo('driver'), driverController.updateStatus);
app.get('/api/driver/rides', restrictTo('driver'), driverController.rideHistory);
app.post('/api/driver/vehicle', restrictTo('driver'), driverController.registerVehicle);
app.put('/api/driver/vehicle', restrictTo('driver'), driverController.updateVehicle);
app.delete('/api/driver/vehicle', restrictTo('driver'), driverController.deleteVehicle);

// Admin-only Routes
app.get('/api/admin/dashboard', restrictTo('admin'), adminController.dashboard);
app.get('/api/admin/users', restrictTo('admin'), adminController.users);
app.patch('/api/admin/users/:id/status', restrictTo('admin'), adminController.updateUserStatus);
app.get('/api/admin/rides', restrictTo('admin'), adminController.rides);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong on the server.'
  });
});

// Start Server
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Node.js backend server running on port ${port}`);
});
