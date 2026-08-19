const mongoose = require('mongoose');

const DriverTripHistorySchema = new mongoose.Schema({
    pickup: String,
    dropoff: String,
    customer: String,
    fare: Number,
    status: { type: String, default: 'Completed' },
    timestamp: { type: Date, default: Date.now }
});

const DriverSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    role: { type: String, default: 'driver' },
    address: { type: String, default: 'Surat, Gujarat' },
    vehicle: { type: String, default: '' },
    vehicleModel: { type: String, default: '' },
    vehiclePlate: { type: String, default: '' },
    cabClass: { type: String, default: 'Car' },
    online: { type: Boolean, default: false },
    earnings: { type: Number, default: 0.00 },
    tripsCount: { type: Number, default: 0 },
    tripsHistory: [DriverTripHistorySchema],
    justSignedUp: { type: Boolean, default: false }
});

module.exports = mongoose.model('Driver', DriverSchema);
