const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');

const getWallet = async (req, res, next) => {
  try {
    const userId = req.user._id;

    let wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0 });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const total = await WalletTransaction.countDocuments({ user_id: userId });
    const transactions = await WalletTransaction.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const lastPage = Math.ceil(total / limit) || 1;

    res.status(200).json({
      balance: parseFloat(wallet.balance.toFixed(2)),
      transactions,
      total,
      current_page: page,
      last_page: lastPage,
      per_page: limit
    });
  } catch (err) {
    next(err);
  }
};

const recharge = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const amount = parseFloat(req.body.amount);

    if (isNaN(amount) || amount < 1) {
      return res.status(422).json({
        message: 'The given data was invalid.',
        errors: {
          amount: ['The amount must be at least ₹1.']
        }
      });
    }

    const MAX_BALANCE = 2000.00;

    let wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0 });
    }

    if (wallet.balance + amount > MAX_BALANCE) {
      const maxAllowed = Math.max(0, MAX_BALANCE - wallet.balance);
      return res.status(422).json({
        message: `Wallet limit is ₹${MAX_BALANCE}. You can add up to ₹${maxAllowed.toFixed(2)} more.`
      });
    }

    wallet.balance = parseFloat((wallet.balance + amount).toFixed(2));
    await wallet.save();

    const transaction = await WalletTransaction.create({
      wallet_id: wallet._id,
      user_id: userId,
      type: 'deposit',
      amount,
      description: 'Wallet Recharge Deposit'
    });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const total = await WalletTransaction.countDocuments({ user_id: userId });
    const transactions = await WalletTransaction.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const lastPage = Math.ceil(total / limit) || 1;

    res.status(200).json({
      message: `Successfully recharged ₹${amount.toFixed(2)} to your wallet!`,
      balance: wallet.balance,
      transaction,
      transactions,
      total,
      current_page: page,
      last_page: lastPage,
      per_page: limit
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getWallet,
  recharge
};
