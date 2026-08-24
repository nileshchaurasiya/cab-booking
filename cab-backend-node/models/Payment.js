const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  ride_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true
  },
  payment_method: {
    type: String,
    enum: ['cash', 'card', 'wallet'],
    default: 'cash'
  },
  payment_status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  amount: {
    type: Number,
    required: true
  },
  admin_commission: {
    type: Number,
    required: true
  },
  driver_earning: {
    type: Number,
    required: true
  },
  transaction_reference: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Configure JSON serialization to rename _id to id
const transform = (doc, ret) => {
  ret.id = ret._id.toString();
  if (ret.ride_id && ret.ride_id.toString) {
    ret.ride_id = ret.ride_id.toString();
  }
  delete ret._id;
  delete ret.__v;
  return ret;
};

paymentSchema.set('toJSON', {
  virtuals: true,
  transform
});

paymentSchema.set('toObject', {
  virtuals: true,
  transform
});

module.exports = mongoose.model('Payment', paymentSchema);
