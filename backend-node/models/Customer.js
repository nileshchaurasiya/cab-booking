const mongoose = require('mongoose');

const TripHistorySchema = new mongoose.Schema({
    pickup: String,
    dropoff: String,
    driver: String,
    fare: Number,
    status: String,
    timestamp: { type: Date, default: Date.now }
});

const WalletHistorySchema = new mongoose.Schema({
    id: String,
    type: String, // 'recharge' | 'ride_payment' | 'refund'
    amount: Number,
    date: String,
    timestamp: { type: Date, default: Date.now },
    description: String
});

const CustomerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    role: { type: String, default: 'customer' },
    address: { type: String, default: 'Surat, Gujarat' },
    wallet: { type: Number, default: 2000.00 },
    justSignedUp: { type: Boolean, default: false },
    tripsHistory: [TripHistorySchema],
    walletHistory: [WalletHistorySchema]
});

module.exports = mongoose.model('Customer', CustomerSchema);
