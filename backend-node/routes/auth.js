const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Driver = require('../models/Driver');
const Admin = require('../models/Admin');

// Register endpoint
router.post('/register', async (req, res) => {
    const { name, email, role, password, address, vehicle, cabClass: requestCabClass } = req.body;
    const emailLower = email.trim().toLowerCase();

    try {
        if (role === 'driver' || emailLower.includes('driver')) {
            const existingDriver = await Driver.findOne({ email: emailLower });
            if (existingDriver) {
                return res.status(400).json({ message: "Driver account with this email already exists!" });
            }

            let vehicleModel = '';
            let vehiclePlate = '';
            let cabClass = requestCabClass || 'Car';
            if (vehicle) {
                const parts = vehicle.split('-');
                vehicleModel = parts[0].trim();
                vehiclePlate = parts.length > 1 ? parts[1].trim() : vehicle;
            }

            const driver = new Driver({
                name,
                email: emailLower,
                address: address || 'Surat, Gujarat',
                vehicle,
                vehicleModel,
                vehiclePlate,
                cabClass,
                justSignedUp: true
            });
            await driver.save();
            return res.status(201).json(driver);

        } else if (role === 'admin' || emailLower.includes('admin')) {
            const existingAdmin = await Admin.findOne({ email: emailLower });
            if (existingAdmin) {
                return res.status(400).json({ message: "Admin account with this email already exists!" });
            }

            const admin = new Admin({
                name,
                email: emailLower,
                address: address || 'Surat, Gujarat'
            });
            await admin.save();
            return res.status(201).json(admin);

        } else {
            // Default: Customer
            const existingCustomer = await Customer.findOne({ email: emailLower });
            if (existingCustomer) {
                return res.status(400).json({ message: "Customer account with this email already exists!" });
            }

            const customer = new Customer({
                name,
                email: emailLower,
                address: address || 'Surat, Gujarat',
                wallet: 2000.00,
                justSignedUp: true,
                walletHistory: [
                    {
                        id: 'tx_seed_1',
                        type: 'recharge',
                        amount: 2000.00,
                        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                        timestamp: Date.now(),
                        description: 'Initial Wallet Balance Seeding'
                    }
                ]
            });
            await customer.save();
            return res.status(201).json(customer);
        }
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    const { email, password, preferredRole } = req.body;
    const emailLower = email.trim().toLowerCase();

    try {
        // Admin override check
        if (emailLower === 'admin@cabs.com' || emailLower === 'admin') {
            if (password !== 'admin1234') {
                return res.status(401).json({ message: "Invalid admin credentials!" });
            }
            let admin = await Admin.findOne({ email: 'admin@cabs.com' });
            if (!admin) {
                admin = new Admin({
                    name: 'Admin',
                    email: 'admin@cabs.com',
                    address: 'Surat, Gujarat'
                });
                await admin.save();
            }
            return res.status(200).json(admin);
        }

        let resolvedRole = preferredRole || 'customer';
        if (emailLower.includes('driver')) {
            resolvedRole = 'driver';
        } else if (emailLower.includes('admin')) {
            resolvedRole = 'admin';
        }

        if (resolvedRole === 'driver') {
            let driver = await Driver.findOne({ email: emailLower });
            if (!driver) {
                // Auto-register for driver convenience
                const name = emailLower.split('@')[0].charAt(0).toUpperCase() + emailLower.split('@')[0].slice(1);
                driver = new Driver({
                    name,
                    email: emailLower,
                    address: 'Surat, Gujarat',
                    justSignedUp: true
                });
                await driver.save();
            }
            return res.status(200).json(driver);

        } else if (resolvedRole === 'admin') {
            let admin = await Admin.findOne({ email: emailLower });
            if (!admin) {
                const name = emailLower.split('@')[0].charAt(0).toUpperCase() + emailLower.split('@')[0].slice(1);
                admin = new Admin({
                    name,
                    email: emailLower,
                    address: 'Surat, Gujarat'
                });
                await admin.save();
            }
            return res.status(200).json(admin);

        } else {
            let customer = await Customer.findOne({ email: emailLower });
            if (!customer) {
                // Auto-register for customer convenience
                const name = emailLower.split('@')[0].charAt(0).toUpperCase() + emailLower.split('@')[0].slice(1);
                customer = new Customer({
                    name,
                    email: emailLower,
                    address: 'Surat, Gujarat',
                    wallet: 2000.00,
                    justSignedUp: true,
                    walletHistory: [
                        {
                            id: 'tx_seed_1',
                            type: 'recharge',
                            amount: 2000.00,
                            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                            timestamp: Date.now(),
                            description: 'Initial Wallet Balance Seeding'
                        }
                    ]
                });
                await customer.save();
            }
            return res.status(200).json(customer);
        }
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

module.exports = router;
