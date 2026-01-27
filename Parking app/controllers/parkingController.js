const ParkingSlot = require('../models/ParkingSlot');
const Vehicle = require('../models/Vehicle');
const ParkingRequest = require('../models/ParkingRequest');
const RollbackOperation = require('../models/RollbackOperation');

// Debug logging utility
const debugLog = (message, data = null) => {
    console.log(`[${new Date().toISOString()}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

// Initialize database with parking slots
exports.initializeSlots = async (req, res) => {
    try {
        debugLog('Initializing parking slots');
        
        // Clear existing slots
        await ParkingSlot.deleteMany({});
        
        const zones = ['A', 'B', 'C', 'D'];
        const areasPerZone = 3;
        const slotsPerArea = 5;
        
        const slots = [];
        
        zones.forEach(zone => {
            for (let area = 1; area <= areasPerZone; area++) {
                for (let slot = 1; slot <= slotsPerArea; slot++) {
                    slots.push({
                        slotId: `${zone}-${area}-${slot}`,
                        zoneId: zone,
                        areaId: area,
                        slotNumber: slot,
                        availability: true
                    });
                }
            }
        });
        
        await ParkingSlot.insertMany(slots);
        
        debugLog(`Initialized ${slots.length} parking slots`);
        
        res.status(201).json({
            success: true,
            message: `Initialized ${slots.length} parking slots`,
            data: slots
        });
    } catch (error) {
        debugLog('Error initializing slots', error.message);
        res.status(500).json({
            success: false,
            message: 'Error initializing slots',
            error: error.message
        });
    }
};

// Register a new vehicle
exports.registerVehicle = async (req, res) => {
    try {
        const { vehicleId, preferredZone } = req.body;
        
        debugLog('Registering vehicle', { vehicleId, preferredZone });
        
        if (!vehicleId || !preferredZone) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle ID and preferred zone are required'
            });
        }
        
        // Check if vehicle already exists
        const existingVehicle = await Vehicle.findOne({ vehicleId });
        if (existingVehicle) {
            return res.status(409).json({
                success: false,
                message: `Vehicle ${vehicleId} already registered`
            });
        }
        
        const vehicle = new Vehicle({
            vehicleId: vehicleId.toUpperCase(),
            preferredZone
        });
        
        await vehicle.save();
        
        debugLog(`Vehicle ${vehicleId} registered successfully`);
        
        res.status(201).json({
            success: true,
            message: `Vehicle ${vehicleId} registered successfully`,
            data: vehicle
        });
    } catch (error) {
        debugLog('Error registering vehicle', error.message);
        res.status(500).json({
            success: false,
            message: 'Error registering vehicle',
            error: error.message
        });
    }
};

// Get all vehicles
exports.getVehicles = async (req, res) => {
    try {
        debugLog('Fetching all vehicles');
        
        const vehicles = await Vehicle.find().sort({ registeredAt: -1 });
        
        res.status(200).json({
            success: true,
            count: vehicles.length,
            data: vehicles
        });
    } catch (error) {
        debugLog('Error fetching vehicles', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching vehicles',
            error: error.message
        });
    }
};

// Create parking request
exports.createParkingRequest = async (req, res) => {
    try {
        const { vehicleId, requestedZone } = req.body;
        
        debugLog('Creating parking request', { vehicleId, requestedZone });
        
        if (!vehicleId || !requestedZone) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle ID and requested zone are required'
            });
        }
        
        // Check if vehicle exists
        const vehicle = await Vehicle.findOne({ vehicleId });
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: `Vehicle ${vehicleId} not found`
            });
        }
        
        // Check for active request
        const activeRequest = await ParkingRequest.findOne({
            vehicleId,
            isActive: true,
            currentState: { $nin: ['RELEASED', 'CANCELLED'] }
        });
        
        if (activeRequest) {
            return res.status(400).json({
                success: false,
                message: `Vehicle ${vehicleId} already has an active request`
            });
        }
        
        // Generate request ID
        const count = await ParkingRequest.countDocuments();
        const requestId = `REQ-${(count + 1).toString().padStart(3, '0')}`;
        
        debugLog(`Generated request ID: ${requestId}`);
        
        const request = new ParkingRequest({
            requestId,
            vehicleId,
            requestedZone
        });
        
        await request.save();
        
        // Update vehicle's active request
        vehicle.activeRequest = request._id;
        await vehicle.save();
        
        debugLog(`Parking request created: ${requestId}`);
        
        res.status(201).json({
            success: true,
            message: 'Parking request created successfully',
            data: request
        });
    } catch (error) {
        debugLog('Error creating parking request', error.message);
        res.status(500).json({
            success: false,
            message: 'Error creating parking request',
            error: error.message
        });
    }
};

// Allocate parking slot
exports.allocateParking = async (req, res) => {
    try {
        const { requestId } = req.params;
        
        debugLog(`Starting allocation for request: ${requestId}`);
        
        // Find the request
        const request = await ParkingRequest.findOne({ requestId });
        
        if (!request) {
            debugLog(`Request ${requestId} not found`);
            return res.status(404).json({
                success: false,
                message: `Request ${requestId} not found`
            });
        }
        
        debugLog(`Request state: ${request.currentState}`);
        
        if (request.currentState !== 'REQUESTED') {
            debugLog(`Invalid state: ${request.currentState}, expected: REQUESTED`);
            return res.status(400).json({
                success: false,
                message: `Request is not in REQUESTED state (current: ${request.currentState})`
            });
        }
        
        // Try to find slot in requested zone first
        debugLog(`Looking for slot in zone: ${request.requestedZone}`);
        let allocatedSlot = await ParkingSlot.findOne({
            zoneId: request.requestedZone,
            availability: true
        });
        
        let crossZone = false;
        
        // If no slot in requested zone, try other zones
        if (!allocatedSlot) {
            debugLog(`No slots in ${request.requestedZone}, trying other zones...`);
            const zones = ['A', 'B', 'C', 'D'];
            for (const zone of zones) {
                if (zone === request.requestedZone) continue;
                
                allocatedSlot = await ParkingSlot.findOne({
                    zoneId: zone,
                    availability: true
                });
                
                if (allocatedSlot) {
                    debugLog(`Found slot in zone ${zone}: ${allocatedSlot.slotId}`);
                    crossZone = true;
                    break;
                }
            }
        }
        
        if (!allocatedSlot) {
            debugLog('No available slots in any zone');
            return res.status(400).json({
                success: false,
                message: 'No parking slots available in any zone'
            });
        }
        
        debugLog(`Allocating slot: ${allocatedSlot.slotId}, crossZone: ${crossZone}`);
        
        // Update slot
        allocatedSlot.availability = false;
        allocatedSlot.currentVehicleId = request.vehicleId;
        await allocatedSlot.save();
        debugLog('Slot updated successfully');
        
        // Update request
        request.allocatedSlotId = allocatedSlot.slotId;
        request.currentState = 'ALLOCATED';
        request.crossZoneAllocation = crossZone;
        request.allocatedAt = new Date();
        await request.save();
        debugLog('Request updated successfully');
        
        // Record operation for rollback
        const rollbackOp = new RollbackOperation({
            operationId: `OP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            operationType: 'ALLOCATION',
            details: {
                requestId: request.requestId,
                slotId: allocatedSlot.slotId,
                previousState: 'REQUESTED'
            }
        });
        
        await rollbackOp.save();
        debugLog('Rollback operation recorded');
        
        res.status(200).json({
            success: true,
            message: crossZone ? 
                `Allocated in Zone ${allocatedSlot.zoneId} (cross-zone)` :
                `Allocated in Zone ${allocatedSlot.zoneId}`,
            data: {
                requestId: request.requestId,
                slotId: allocatedSlot.slotId,
                zoneId: allocatedSlot.zoneId,
                crossZone
            }
        });
        
    } catch (error) {
        debugLog('Error allocating parking slot', error.message);
        debugLog('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error allocating parking slot',
            error: error.message
        });
    }
};

// Occupy slot
exports.occupySlot = async (req, res) => {
    try {
        const { requestId } = req.params;
        
        debugLog(`Occupying slot for request: ${requestId}`);
        
        const request = await ParkingRequest.findOne({ requestId });
        
        if (!request) {
            return res.status(404).json({
                success: false,
                message: `Request ${requestId} not found`
            });
        }
        
        if (request.currentState !== 'ALLOCATED') {
            return res.status(400).json({
                success: false,
                message: `Request is not in ALLOCATED state (current: ${request.currentState})`
            });
        }
        
        // Record operation before state change
        const rollbackOp = new RollbackOperation({
            operationId: `OP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            operationType: 'STATE_CHANGE',
            details: {
                requestId: request.requestId,
                fromState: 'ALLOCATED',
                toState: 'OCCUPIED'
            }
        });
        
        await rollbackOp.save();
        
        // Update request
        request.currentState = 'OCCUPIED';
        request.occupiedAt = new Date();
        await request.save();
        
        debugLog(`Slot occupied: ${request.allocatedSlotId}`);
        
        res.status(200).json({
            success: true,
            message: `Vehicle occupying slot ${request.allocatedSlotId}`,
            data: request
        });
    } catch (error) {
        debugLog('Error occupying slot', error.message);
        res.status(500).json({
            success: false,
            message: 'Error occupying slot',
            error: error.message
        });
    }
};

// Release slot
exports.releaseSlot = async (req, res) => {
    try {
        const { requestId } = req.params;
        
        debugLog(`Releasing slot for request: ${requestId}`);
        
        const request = await ParkingRequest.findOne({ requestId });
        
        if (!request) {
            return res.status(404).json({
                success: false,
                message: `Request ${requestId} not found`
            });
        }
        
        if (request.currentState !== 'OCCUPIED') {
            return res.status(400).json({
                success: false,
                message: `Request is not in OCCUPIED state (current: ${request.currentState})`
            });
        }
        
        // Record operation before state change
        const rollbackOp = new RollbackOperation({
            operationId: `OP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            operationType: 'STATE_CHANGE',
            details: {
                requestId: request.requestId,
                fromState: 'OCCUPIED',
                toState: 'RELEASED'
            }
        });
        
        await rollbackOp.save();
        
        // Release the slot
        if (request.allocatedSlotId) {
            const slot = await ParkingSlot.findOne({ 
                slotId: request.allocatedSlotId 
            });
            
            if (slot) {
                slot.availability = true;
                slot.currentVehicleId = null;
                await slot.save();
                debugLog(`Slot ${request.allocatedSlotId} released`);
            }
        }
        
        // Update request
        request.currentState = 'RELEASED';
        request.releasedAt = new Date();
        
        // Calculate duration
        if (request.occupiedAt) {
            const duration = Math.round((new Date() - request.occupiedAt) / 60000);
            request.duration = duration;
        }
        
        request.isActive = false;
        await request.save();
        
        // Update vehicle's active request
        await Vehicle.updateOne(
            { vehicleId: request.vehicleId },
            { $set: { activeRequest: null } }
        );
        
        debugLog(`Request ${requestId} released, duration: ${request.duration} minutes`);
        
        res.status(200).json({
            success: true,
            message: `Slot ${request.allocatedSlotId} released. Duration: ${request.duration} minutes`,
            data: request
        });
    } catch (error) {
        debugLog('Error releasing slot', error.message);
        res.status(500).json({
            success: false,
            message: 'Error releasing slot',
            error: error.message
        });
    }
};

// Cancel request
exports.cancelRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        
        debugLog(`Cancelling request: ${requestId}`);
        
        const request = await ParkingRequest.findOne({ requestId });
        
        if (!request) {
            return res.status(404).json({
                success: false,
                message: `Request ${requestId} not found`
            });
        }
        
        const allowedStates = ['REQUESTED', 'ALLOCATED'];
        if (!allowedStates.includes(request.currentState)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel request in ${request.currentState} state`
            });
        }
        
        // Record operation before cancellation
        const rollbackOp = new RollbackOperation({
            operationId: `OP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            operationType: 'CANCELLATION',
            details: {
                requestId: request.requestId,
                slotId: request.allocatedSlotId,
                previousState: request.currentState
            }
        });
        
        await rollbackOp.save();
        
        // Release slot if allocated
        if (request.allocatedSlotId) {
            const slot = await ParkingSlot.findOne({ 
                slotId: request.allocatedSlotId 
            });
            
            if (slot) {
                slot.availability = true;
                slot.currentVehicleId = null;
                await slot.save();
                debugLog(`Slot ${request.allocatedSlotId} released due to cancellation`);
            }
        }
        
        // Update request
        request.currentState = 'CANCELLED';
        request.cancelledAt = new Date();
        request.isActive = false;
        await request.save();
        
        // Update vehicle's active request
        await Vehicle.updateOne(
            { vehicleId: request.vehicleId },
            { $set: { activeRequest: null } }
        );
        
        debugLog(`Request ${requestId} cancelled`);
        
        res.status(200).json({
            success: true,
            message: `Request ${requestId} cancelled`,
            data: request
        });
    } catch (error) {
        debugLog('Error cancelling request', error.message);
        res.status(500).json({
            success: false,
            message: 'Error cancelling request',
            error: error.message
        });
    }
};

// Get parking slots by zone
exports.getSlotsByZone = async (req, res) => {
    try {
        const { zoneId } = req.params;
        
        debugLog(`Fetching slots for zone: ${zoneId}`);
        
        const slots = await ParkingSlot.find({ zoneId }).sort({ areaId: 1, slotNumber: 1 });
        
        res.status(200).json({
            success: true,
            count: slots.length,
            data: slots
        });
    } catch (error) {
        debugLog('Error fetching parking slots', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching parking slots',
            error: error.message
        });
    }
};

// Get all parking requests
exports.getParkingRequests = async (req, res) => {
    try {
        const { active } = req.query;
        
        debugLog(`Fetching parking requests, active: ${active}`);
        
        let query = {};
        if (active === 'true') {
            query.isActive = true;
        }
        
        const requests = await ParkingRequest.find(query)
            .sort({ requestTime: -1 })
            .limit(50);
        
        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        debugLog('Error fetching parking requests', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching parking requests',
            error: error.message
        });
    }
};

// Rollback operations
exports.rollbackOperations = async (req, res) => {
    try {
        const { k } = req.params;
        const count = parseInt(k);
        
        debugLog(`Rolling back ${count} operations`);
        
        if (count <= 0 || count > 10) {
            return res.status(400).json({
                success: false,
                message: 'K must be between 1 and 10'
            });
        }
        
        // Get last K operations
        const operations = await RollbackOperation.find()
            .sort({ timestamp: -1 })
            .limit(count);
        
        if (operations.length < count) {
            return res.status(400).json({
                success: false,
                message: `Only ${operations.length} operations available for rollback`
            });
        }
        
        const results = [];
        
        // Rollback in reverse order (latest first)
        for (let i = operations.length - 1; i >= 0; i--) {
            const op = operations[i];
            
            try {
                switch (op.operationType) {
                    case 'ALLOCATION':
                        await rollbackAllocation(op);
                        break;
                    case 'STATE_CHANGE':
                        await rollbackStateChange(op);
                        break;
                    case 'CANCELLATION':
                        await rollbackCancellation(op);
                        break;
                }
                
                results.push({
                    operationId: op.operationId,
                    type: op.operationType,
                    success: true
                });
                
                debugLog(`Rolled back operation: ${op.operationId} (${op.operationType})`);
                
            } catch (error) {
                results.push({
                    operationId: op.operationId,
                    type: op.operationType,
                    success: false,
                    error: error.message
                });
                
                debugLog(`Failed to rollback operation ${op.operationId}`, error.message);
                throw new Error(`Rollback failed for operation ${op.operationId}: ${error.message}`);
            }
        }
        
        // Delete rolled back operations
        const operationIds = operations.map(op => op._id);
        await RollbackOperation.deleteMany({ _id: { $in: operationIds } });
        
        debugLog(`Successfully rolled back ${count} operations`);
        
        res.status(200).json({
            success: true,
            message: `Rolled back ${count} operation(s) successfully`,
            data: {
                totalRolledBack: count,
                results,
                remainingOperations: await RollbackOperation.countDocuments()
            }
        });
    } catch (error) {
        debugLog('Error rolling back operations', error.message);
        res.status(500).json({
            success: false,
            message: 'Error rolling back operations',
            error: error.message
        });
    }
};

// Helper functions for rollback
async function rollbackAllocation(operation) {
    const { requestId, slotId, previousState } = operation.details;
    
    debugLog(`Rolling back allocation for ${requestId}`);
    
    // Find request
    let request = await ParkingRequest.findOne({ requestId });
    
    if (!request) {
        // Check in historical data (isActive: false)
        request = await ParkingRequest.findOne({ 
            requestId, 
            isActive: false 
        });
        
        if (request) {
            request.isActive = true;
        } else {
            throw new Error(`Request ${requestId} not found`);
        }
    }
    
    // Release slot
    if (slotId) {
        const slot = await ParkingSlot.findOne({ slotId });
        if (slot) {
            slot.availability = true;
            slot.currentVehicleId = null;
            await slot.save();
        }
    }
    
    // Revert request state
    request.currentState = previousState;
    request.allocatedSlotId = null;
    request.crossZoneAllocation = false;
    request.allocatedAt = null;
    await request.save();
    
    // Update vehicle's active request
    if (previousState === 'REQUESTED') {
        await Vehicle.updateOne(
            { vehicleId: request.vehicleId },
            { $set: { activeRequest: request._id } }
        );
    }
}

async function rollbackStateChange(operation) {
    const { requestId, fromState, toState } = operation.details;
    
    debugLog(`Rolling back state change for ${requestId}: ${toState} -> ${fromState}`);
    
    const request = await ParkingRequest.findOne({ requestId });
    
    if (!request) {
        throw new Error(`Request ${requestId} not found`);
    }
    
    request.currentState = fromState;
    
    switch (toState) {
        case 'OCCUPIED':
            request.occupiedAt = null;
            break;
        case 'RELEASED':
            request.releasedAt = null;
            request.duration = 0;
            request.isActive = true;
            
            // Re-allocate slot
            if (request.allocatedSlotId) {
                const slot = await ParkingSlot.findOne({ 
                    slotId: request.allocatedSlotId 
                });
                
                if (slot) {
                    slot.availability = false;
                    slot.currentVehicleId = request.vehicleId;
                    await slot.save();
                }
            }
            
            // Update vehicle's active request
            await Vehicle.updateOne(
                { vehicleId: request.vehicleId },
                { $set: { activeRequest: request._id } }
            );
            break;
    }
    
    await request.save();
}

async function rollbackCancellation(operation) {
    const { requestId, slotId, previousState } = operation.details;
    
    debugLog(`Rolling back cancellation for ${requestId}`);
    
    let request = await ParkingRequest.findOne({ 
        requestId, 
        isActive: false 
    });
    
    if (!request) {
        throw new Error(`Request ${requestId} not found`);
    }
    
    request.isActive = true;
    request.currentState = previousState;
    request.cancelledAt = null;
    
    // Re-allocate slot if needed
    if (slotId && previousState !== 'REQUESTED') {
        request.allocatedSlotId = slotId;
        
        const slot = await ParkingSlot.findOne({ slotId });
        if (slot) {
            slot.availability = false;
            slot.currentVehicleId = request.vehicleId;
            await slot.save();
        }
    }
    
    await request.save();
    
    // Update vehicle's active request
    await Vehicle.updateOne(
        { vehicleId: request.vehicleId },
        { $set: { activeRequest: request._id } }
    );
}

// Get rollback stack
exports.getRollbackStack = async (req, res) => {
    try {
        debugLog('Fetching rollback stack');
        
        const operations = await RollbackOperation.find()
            .sort({ timestamp: -1 })
            .limit(10);
        
        res.status(200).json({
            success: true,
            count: operations.length,
            data: operations
        });
    } catch (error) {
        debugLog('Error fetching rollback operations', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching rollback operations',
            error: error.message
        });
    }
};

// Health check endpoint
exports.healthCheck = async (req, res) => {
    try {
        const slotCount = await ParkingSlot.countDocuments();
        const vehicleCount = await Vehicle.countDocuments();
        const requestCount = await ParkingRequest.countDocuments();
        const rollbackCount = await RollbackOperation.countDocuments();
        
        const availableSlots = await ParkingSlot.countDocuments({ availability: true });
        
        res.status(200).json({
            success: true,
            data: {
                slots: {
                    total: slotCount,
                    available: availableSlots,
                    occupied: slotCount - availableSlots
                },
                vehicles: vehicleCount,
                requests: requestCount,
                rollbackOperations: rollbackCount,
                timestamp: new Date()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error.message
        });
    }
};