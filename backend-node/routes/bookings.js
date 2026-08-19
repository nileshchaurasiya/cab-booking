const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Driver = require('../models/Driver');
const Admin = require('../models/Admin');

// Helper: assigns the booking to the next eligible online driver (not in declinedBy)
async function assignNextDriver(booking) {
    const declinedList = booking.declinedBy || [];
    
    // Find all online drivers of correct cab class
    const drivers = await Driver.find({ online: true, cabClass: booking.cabClass });
    
    // Find all currently active bookings that are accepted or started
    const activeBookings = await Booking.find({
        _id: { $ne: booking._id },
        status: { $in: ['accepted', 'started'] }
    });

    const busyDriverEmails = new Set();
    const busyDriverPlates = new Set();
    
    activeBookings.forEach(b => {
        if (b.assignedDriverEmail) busyDriverEmails.add(b.assignedDriverEmail.toLowerCase());
        if (b.driverPlate) busyDriverPlates.add(b.driverPlate.toLowerCase());
    });

    let eligibleDriver = drivers.find(d => {
        const emailLower = d.email.toLowerCase();
        const plateLower = (d.vehiclePlate || '').toLowerCase();
        return !declinedList.includes(d.email) && 
               !busyDriverEmails.has(emailLower) && 
               (!plateLower || !busyDriverPlates.has(plateLower));
    });

    if (!eligibleDriver && declinedList.length > 0) {
        const timeSinceDecline = Date.now() - (booking.declinedAt || 0);
        if (timeSinceDecline >= 10000) {
            booking.declinedBy = [];
            eligibleDriver = drivers.find(d => {
                const emailLower = d.email.toLowerCase();
                const plateLower = (d.vehiclePlate || '').toLowerCase();
                return !busyDriverEmails.has(emailLower) && 
                       (!plateLower || !busyDriverPlates.has(plateLower));
            });
        }
    }

    if (eligibleDriver) {
        booking.assignedDriverEmail = eligibleDriver.email;
    } else {
        booking.assignedDriverEmail = null;
    }
    
    await booking.save();
    return booking;
}

// Create a booking
router.post('/', async (req, res) => {
    const { customerName, customerEmail, pickup, dropoff, distance, fare, cabClass } = req.body;

    try {
        // Check if there is at least one online driver for the selected cabClass
        const hasOnlineDriver = await Driver.exists({ online: true, cabClass });
        if (!hasOnlineDriver) {
            return res.status(400).json({ message: "Driver is not available. Please change vehicle." });
        }

        const customer = await Customer.findOne({ email: customerEmail.toLowerCase() });
        if (!customer) {
            return res.status(404).json({ message: "Customer not found!" });
        }
        if (customer.wallet < fare) {
            return res.status(400).json({ message: "Insufficient wallet balance!" });
        }

        // Deduct fare
        customer.wallet -= parseFloat(fare);
        customer.walletHistory.unshift({
            id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            type: 'ride_payment',
            amount: -parseFloat(fare),
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            timestamp: Date.now(),
            description: `Paid for Ride to ${dropoff}`
        });
        await customer.save();

        const booking = new Booking({
            customerName,
            customerEmail: customerEmail.toLowerCase(),
            pickup,
            dropoff,
            distance: parseFloat(distance),
            fare: parseFloat(fare),
            cabClass,
            status: 'pending'
        });

        await assignNextDriver(booking);
        return res.status(201).json(booking);
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

// Get active booking
router.get('/active', async (req, res) => {
    const { email, role } = req.query;
    const userEmail = (email || '').toLowerCase();

    try {
        if (role === 'customer') {
            const twentySecondsAgo = new Date(Date.now() - 20000);
            booking = await Booking.findOne({
                customerEmail: userEmail,
                $or: [
                    { status: { $in: ['pending', 'accepted', 'started'] } },
                    { status: { $in: ['completed', 'cancelled'] }, updatedAt: { $gte: twentySecondsAgo } }
                ]
            }).sort({ updatedAt: -1 });
        } else if (role === 'driver') {
            booking = await Booking.findOne({ assignedDriverEmail: userEmail, status: { $in: ['pending', 'accepted', 'started'] } });
        } else {
            // Admin or general fallback
            booking = await Booking.findOne({ status: { $in: ['pending', 'accepted', 'started'] } });
        }

        if (booking && booking.status === 'pending') {
            await assignNextDriver(booking);
        }

        return res.status(200).json(booking);
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

// Accept booking
router.post('/:id/accept', async (req, res) => {
    const { id } = req.params;
    const { driverEmail } = req.body;

    try {
        const booking = await Booking.findById(id);
        if (!booking || booking.status !== 'pending') {
            return res.status(400).json({ message: "Ride request is no longer active!" });
        }

        const driver = await Driver.findOne({ email: driverEmail.toLowerCase() });
        if (!driver) {
            return res.status(404).json({ message: "Driver profile not found!" });
        }

        booking.status = 'accepted';
        booking.driverName = driver.name;
        booking.driverVehicle = driver.vehicleModel;
        booking.driverPlate = driver.vehiclePlate;
        booking.assignedDriverEmail = driver.email;

        await booking.save();
        return res.status(200).json(booking);
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

// Start booking
router.post('/:id/start', async (req, res) => {
    const { id } = req.params;

    try {
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: "Active booking not found!" });
        }

        booking.status = 'started';
        await booking.save();
        return res.status(200).json(booking);
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

// Complete booking
router.post('/:id/complete', async (req, res) => {
    const { id } = req.params;

    try {
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: "Active booking not found!" });
        }

        booking.status = 'completed';
        await booking.save();

        const totalFare = booking.fare;
        const driverShare = totalFare * 0.90;
        const adminShare = totalFare * 0.10;

        // Credit driver
        const driver = await Driver.findOne({ email: booking.assignedDriverEmail.toLowerCase() });
        if (driver) {
            driver.earnings += driverShare;
            driver.tripsCount += 1;
            driver.tripsHistory.unshift({
                pickup: booking.pickup,
                dropoff: booking.dropoff,
                customer: booking.customerName,
                fare: driverShare,
                timestamp: Date.now()
            });
            await driver.save();
        }

        // Credit customer trip history
        const customer = await Customer.findOne({ email: booking.customerEmail.toLowerCase() });
        if (customer) {
            customer.tripsHistory.unshift({
                pickup: booking.pickup,
                dropoff: booking.dropoff,
                driver: booking.driverName || "N/A",
                fare: booking.fare,
                status: "Completed",
                timestamp: Date.now()
            });
            await customer.save();
        }

        // Credit admin
        let admin = await Admin.findOne({ email: 'admin@cabs.com' });
        if (!admin) {
            admin = new Admin({ name: 'Admin', email: 'admin@cabs.com' });
        }
        admin.earnings += adminShare;
        await admin.save();

        return res.status(200).json(booking);
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

// Cancel active booking
router.post('/:id/cancel', async (req, res) => {
    const { id } = req.params;
    const { triggeredByRole, driverEmail } = req.body;

    try {
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found!" });
        }

        if (triggeredByRole === 'driver') {
            const driver = await Driver.findOne({ email: driverEmail.toLowerCase() });
            const currentStatus = booking.status;

            if (!booking.declinedBy) booking.declinedBy = [];
            if (driver) booking.declinedBy.push(driver.email);
            booking.declinedAt = Date.now();

            if (currentStatus === 'accepted') {
                booking.status = 'pending';
                booking.driverName = '';
                booking.driverVehicle = '';
                booking.driverPlate = '';
                booking.assignedDriverEmail = null;
            }

            await assignNextDriver(booking);
            return res.status(200).json(booking);
        }

        // Triggered by Customer or Admin (full cancellation)
        booking.status = 'cancelled';
        await booking.save();

        // Refund customer
        const customer = await Customer.findOne({ email: booking.customerEmail.toLowerCase() });
        if (customer) {
            customer.wallet += booking.fare;
            customer.tripsHistory.unshift({
                pickup: booking.pickup,
                dropoff: booking.dropoff,
                driver: booking.driverName || "N/A",
                fare: booking.fare,
                status: "Cancelled",
                timestamp: Date.now()
            });
            customer.walletHistory.unshift({
                id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                type: 'refund',
                amount: booking.fare,
                date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                timestamp: Date.now(),
                description: `Refund for Cancelled Ride`
            });
            await customer.save();
        }

        // Update driver history if accepted
        if (booking.driverName) {
            const driver = await Driver.findOne({ email: booking.assignedDriverEmail.toLowerCase() });
            if (driver) {
                driver.tripsHistory.unshift({
                    pickup: booking.pickup,
                    dropoff: booking.dropoff,
                    customer: booking.customerName,
                    fare: 0.00,
                    status: "Cancelled",
                    timestamp: Date.now()
                });
                await driver.save();
            }
        }

        return res.status(200).json(booking);
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

// Get all bookings (both active and past)
router.get('/', async (req, res) => {
    try {
        const bookings = await Booking.find({}).sort({ timestamp: -1 });
        return res.status(200).json(bookings);
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

module.exports = router;
