const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const Booking = require('../models/Booking');

// Update driver vehicle
router.post('/vehicle', async (req, res) => {
    const { email, model, plate, cabClass } = req.body;

    try {
        const driver = await Driver.findOne({ email: email.toLowerCase() });
        if (!driver) {
            return res.status(404).json({ message: "Driver not found!" });
        }

        driver.vehicleModel = model;
        driver.vehiclePlate = plate;
        driver.cabClass = cabClass;
        driver.vehicle = `${model} - ${plate}`;
        driver.justSignedUp = false;

        await driver.save();
        return res.status(200).json(driver);
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

// Update driver online shift status
router.post('/status', async (req, res) => {
    const { email, online } = req.body;

    try {
        const driver = await Driver.findOne({ email: email.toLowerCase() });
        if (!driver) {
            return res.status(404).json({ message: "Driver not found!" });
        }

        driver.online = online === true || online === 'true';
        await driver.save();
        return res.status(200).json(driver);
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

// Get all drivers (for admin roster table)
router.get('/', async (req, res) => {
    try {
        const drivers = await Driver.find({});
        return res.status(200).json(drivers);
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

// Delete driver (admin only)
router.delete('/:email', async (req, res) => {
    const { email } = req.params;

    try {
        const driver = await Driver.findOne({ email: email.toLowerCase() });
        if (!driver) {
            return res.status(404).json({ message: "Driver not found!" });
        }

        await Driver.deleteOne({ email: email.toLowerCase() });

        // Reset/reassign bookings currently assigned to/accepted by this driver
        const activeBookings = await Booking.find({
            status: { $in: ['pending', 'accepted', 'started'] },
            $or: [
                { assignedDriverEmail: email.toLowerCase() },
                { driverPlate: driver.vehiclePlate }
            ]
        });

        for (const booking of activeBookings) {
            booking.assignedDriverEmail = null;
            if (booking.status === 'accepted' || booking.status === 'started') {
                booking.status = 'pending';
                booking.driverName = '';
                booking.driverVehicle = '';
                booking.driverPlate = '';
            }
            // Import and run assignNextDriver if needed
            // For now, let the route controller do it or trigger next driver polling
        }

        return res.status(200).json({ message: `Driver ${email} deleted successfully.` });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

module.exports = router;
