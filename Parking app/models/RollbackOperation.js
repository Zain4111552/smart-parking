const mongoose = require('mongoose');

const rollbackOperationSchema = new mongoose.Schema({
    operationId: {
        type: String,
        required: true,
        unique: true
    },
    operationType: {
        type: String,
        required: true,
        enum: ['ALLOCATION', 'STATE_CHANGE', 'CANCELLATION']
    },
    details: {
        requestId: String,
        slotId: String,
        previousState: String,
        fromState: String,
        toState: String
    },
    snapshot: {
        parkingSlots: Array,
        parkingRequests: Array
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for time-based queries
rollbackOperationSchema.index({ timestamp: -1 });

module.exports = mongoose.model('RollbackOperation', rollbackOperationSchema);