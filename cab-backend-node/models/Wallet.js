const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0.00
  }
}, {
  timestamps: true
});

const transform = (doc, ret) => {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
};

walletSchema.set('toJSON', {
  virtuals: true,
  transform
});

walletSchema.set('toObject', {
  virtuals: true,
  transform
});

module.exports = mongoose.model('Wallet', walletSchema);
