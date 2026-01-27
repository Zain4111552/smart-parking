const mongoose = require('mongoose');

const parkingSlotSchema = new mongoose.Schema({
    slotId: {
        type: String,
        required: true,
        unique: true
    },
    zoneId: {
        type: String,
        required: true,
        enum: ['A', 'B', 'C', 'D']
    },
    areaId: {
        type: Number,
        required: true,
        min: 1,
        max: 3
    },
    slotNumber: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    availability: {
        type: Boolean,
        default: true
    },
    currentVehicleId: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for fast zone-based queries
parkingSlotSchema.index({ zoneId: 1, availability: 1 });
parkingSlotSchema.index({ slotId: 1 }, { unique: true });

parkingSlotSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('ParkingSlot', parkingSlotSchema);