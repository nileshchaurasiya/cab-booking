const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// Recharge wallet
router.post('/recharge', async (req, res) => {
    const { email, amount } = req.body;
    const rechargeAmount = parseFloat(amount);

    try {
        const customer = await Customer.findOne({ email: email.toLowerCase() });
        if (!customer) {
            return res.status(404).json({ message: "Customer not found!" });
        }

        const WALLET_MAX = 2000;
        const newBalance = customer.wallet + rechargeAmount;
        if (newBalance > WALLET_MAX) {
            const maxAllowed = WALLET_MAX - customer.wallet;
            const formattedMax = maxAllowed % 1 === 0 ? maxAllowed : maxAllowed.toFixed(2);
            return res.status(400).json({ message: `You can only add ${formattedMax} rupees.` });
        }

        customer.wallet = newBalance;
        customer.walletHistory.unshift({
            id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            type: 'recharge',
            amount: rechargeAmount,
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            timestamp: Date.now(),
            description: 'Recharged Wallet'
        });

        await customer.save();
        return res.status(200).json({ wallet: customer.wallet, walletHistory: customer.walletHistory });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

module.exports = router;
