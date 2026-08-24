const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  ride_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true
  },
  reviewer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
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
  if (ret.reviewer_id && ret.reviewer_id.toString) {
    ret.reviewer_id = ret.reviewer_id.toString();
  }
  if (ret.reviewee_id && ret.reviewee_id.toString) {
    ret.reviewee_id = ret.reviewee_id.toString();
  }
  delete ret._id;
  delete ret.__v;
  return ret;
};

reviewSchema.set('toJSON', {
  virtuals: true,
  transform
});

reviewSchema.set('toObject', {
  virtuals: true,
  transform
});

module.exports = mongoose.model('Review', reviewSchema);
