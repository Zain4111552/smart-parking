const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    vehicleId: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    preferredZone: {
        type: String,
        required: true,
        enum: ['A', 'B', 'C', 'D']
    },
    registeredAt: {
        type: Date,
        default: Date.now
    },
    activeRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ParkingRequest',
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Vehicle', vehicleSchema);