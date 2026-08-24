const mongoose = require('mongoose');

const driverDetailSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  license_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  vehicle_model: {
    type: String,
    required: true,
    trim: true
  },
  vehicle_plate_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  vehicle_color: {
    type: String,
    required: true,
    trim: true
  },
  vehicle_type: {
    type: String,
    enum: ['sedan', 'suv', 'hatchback', 'bike', 'rickshaw'],
    required: true
  },
  is_available: {
    type: Boolean,
    default: false
  },
  current_latitude: {
    type: Number,
    default: 12.9716
  },
  current_longitude: {
    type: Number,
    default: 77.5946
  },
  rating: {
    type: Number,
    default: 5.0
  }
}, {
  timestamps: true
});

// Virtual for populated User
driverDetailSchema.virtual('user', {
  ref: 'User',
  localField: 'user_id',
  foreignField: '_id',
  justOne: true
});

// Configure JSON serialization to include virtuals and rename _id to id
const transform = (doc, ret) => {
  ret.id = ret._id.toString();
  // Ensure foreign key is represented as id string if it is populated or object
  if (ret.user_id && ret.user_id.toString) {
    ret.user_id = ret.user_id.toString();
  }
  delete ret._id;
  delete ret.__v;
  return ret;
};

driverDetailSchema.set('toJSON', {
  virtuals: true,
  transform
});

driverDetailSchema.set('toObject', {
  virtuals: true,
  transform
});

module.exports = mongoose.model('DriverDetail', driverDetailSchema);
