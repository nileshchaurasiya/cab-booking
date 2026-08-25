const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  wallet_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'payment', 'refund'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  reference_id: {
    type: String,
    default: null
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

walletTransactionSchema.set('toJSON', {
  virtuals: true,
  transform
});

walletTransactionSchema.set('toObject', {
  virtuals: true,
  transform
});

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
