const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  pickup_address: {
    type: String,
    required: true
  },
  dropoff_address: {
    type: String,
    required: true
  },
  pickup_latitude: {
    type: Number,
    required: true
  },
  pickup_longitude: {
    type: Number,
    required: true
  },
  dropoff_latitude: {
    type: Number,
    required: true
  },
  dropoff_longitude: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'arrived', 'waiting_for_customer', 'in_progress', 'completed', 'cancelled'],
    default: 'requested'
  },
  pickup_waiting_started_at: {
    type: Date,
    default: null
  },
  driver_accepted_at: {
    type: Date,
    default: null
  },
  estimated_pickup_at: {
    type: Date,
    default: null
  },
  vehicle_type: {
    type: String,
    default: 'Car'
  },
  fare: {
    type: Number,
    required: true
  },
  distance: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  scheduled_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Virtual populates
rideSchema.virtual('customer', {
  ref: 'User',
  localField: 'customer_id',
  foreignField: '_id',
  justOne: true
});

rideSchema.virtual('driver', {
  ref: 'User',
  localField: 'driver_id',
  foreignField: '_id',
  justOne: true
});

rideSchema.virtual('payment', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'ride_id',
  justOne: true
});

rideSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'ride_id',
  justOne: false
});

// Configure JSON serialization to include virtuals and rename _id to id
const transform = (doc, ret) => {
  ret.id = ret._id.toString();
  if (ret.customer_id && ret.customer_id.toString) {
    ret.customer_id = ret.customer_id.toString();
  }
  if (ret.driver_id && ret.driver_id.toString) {
    ret.driver_id = ret.driver_id.toString();
  }
  delete ret._id;
  delete ret.__v;
  return ret;
};

rideSchema.set('toJSON', {
  virtuals: true,
  transform
});

rideSchema.set('toObject', {
  virtuals: true,
  transform
});

module.exports = mongoose.model('Ride', rideSchema);
