const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');

const getWallet = async (req, res, next) => {
  try {
    const userId = req.user._id;

    let wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0 });
    }

    const transactions = await WalletTransaction.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      balance: parseFloat(wallet.balance.toFixed(2)),
      transactions
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

    const transactions = await WalletTransaction.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      message: `Successfully recharged ₹${amount.toFixed(2)} to your wallet!`,
      balance: wallet.balance,
      transaction,
      transactions
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getWallet,
  recharge
};
