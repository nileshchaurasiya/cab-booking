const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    pickup: { type: String, required: true },
    dropoff: { type: String, required: true },
    distance: { type: Number, required: true },
    fare: { type: Number, required: true },
    cabClass: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'started', 'completed', 'cancelled'], default: 'pending' },
    driverName: { type: String, default: '' },
    driverVehicle: { type: String, default: '' },
    driverPlate: { type: String, default: '' },
    assignedDriverEmail: { type: String, default: null },
    declinedBy: [{ type: String }],
    declinedAt: { type: Number, default: 0 },
    timestamp: { type: Number, default: () => Date.now() }
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);
