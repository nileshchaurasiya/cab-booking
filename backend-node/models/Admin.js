const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    name: { type: String, default: 'Admin' },
    email: { type: String, required: true, unique: true, lowercase: true },
    role: { type: String, default: 'admin' },
    address: { type: String, default: 'Surat, Gujarat' },
    earnings: { type: Number, default: 0.00 }
});

module.exports = mongoose.model('Admin', AdminSchema);
