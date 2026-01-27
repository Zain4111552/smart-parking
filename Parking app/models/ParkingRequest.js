const mongoose = require('mongoose');

const parkingRequestSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true
    },
    vehicleId: {
        type: String,
        required: true,
        ref: 'Vehicle'
    },
    requestedZone: {
        type: String,
        required: true,
        enum: ['A', 'B', 'C', 'D']
    },
    allocatedSlotId: {
        type: String,
        default: null
    },
    currentState: {
        type: String,
        required: true,
        enum: ['REQUESTED', 'ALLOCATED', 'OCCUPIED', 'RELEASED', 'CANCELLED'],
        default: 'REQUESTED'
    },
    crossZoneAllocation: {
        type: Boolean,
        default: false
    },
    requestTime: {
        type: Date,
        default: Date.now
    },
    allocatedAt: {
        type: Date,
        default: null
    },
    occupiedAt: {
        type: Date,
        default: null
    },
    releasedAt: {
        type: Date,
        default: null
    },
    cancelledAt: {
        type: Date,
        default: null
    },
    duration: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
parkingRequestSchema.index({ vehicleId: 1, isActive: 1 });
parkingRequestSchema.index({ currentState: 1 });
parkingRequestSchema.index({ requestId: 1 }, { unique: true });
parkingRequestSchema.index({ allocatedSlotId: 1 });

module.exports = mongoose.model('ParkingRequest', parkingRequestSchema);