const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const driverRoutes = require('./routes/driver');
const walletRoutes = require('./routes/wallet');
const bookingRoutes = require('./routes/bookings');

app.use('/api/auth', authRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/bookings', bookingRoutes);

// Admin Earnings Route
const Admin = require('./models/Admin');
app.get('/api/admin/earnings', async (req, res) => {
    try {
        const admin = await Admin.findOne({ email: 'admin@cabs.com' });
        const earnings = admin ? admin.earnings : 0.00;
        return res.status(200).json({ earnings });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

// Database Reset Route
app.post('/api/admin/reset', async (req, res) => {
    try {
        const collections = Object.keys(mongoose.connection.collections);
        for (const collectionName of collections) {
            const collection = mongoose.connection.collections[collectionName];
            await collection.deleteMany({});
        }
        return res.status(200).json({ message: "Database reset successfully." });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

// Connection to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Connected to MongoDB successfully!");
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err);
    });
