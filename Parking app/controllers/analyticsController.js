const ParkingSlot = require('../models/ParkingSlot');
const ParkingRequest = require('../models/ParkingRequest');
const Vehicle = require('../models/Vehicle');

// Get system analytics
exports.getAnalytics = async (req, res) => {
    try {
        // Get all requests
        const allRequests = await ParkingRequest.find();
        
        // Calculate stats
        const completed = allRequests.filter(req => req.currentState === 'RELEASED');
        const cancelled = allRequests.filter(req => req.currentState === 'CANCELLED');
        const crossZone = allRequests.filter(req => req.crossZoneAllocation);
        
        const totalDuration = completed.reduce((sum, req) => sum + req.duration, 0);
        const avgDuration = completed.length > 0 ? totalDuration / completed.length : 0;
        
        // Get zone utilization
        const zones = ['A', 'B', 'C', 'D'];
        const zoneMetrics = {};
        
        for (const zone of zones) {
            const zoneSlots = await ParkingSlot.find({ zoneId: zone });
            const occupied = zoneSlots.filter(slot => !slot.availability).length;
            
            zoneMetrics[zone] = {
                total: zoneSlots.length,
                occupied,
                available: zoneSlots.length - occupied,
                utilization: (occupied / zoneSlots.length) * 100
            };
        }
        
        // Get vehicle count
        const vehicleCount = await Vehicle.countDocuments();
        
        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalRequests: allRequests.length,
                    completed: completed.length,
                    cancelled: cancelled.length,
                    crossZone: crossZone.length,
                    completionRate: allRequests.length > 0 ? 
                        Math.round((completed.length / allRequests.length) * 100) : 0,
                    cancellationRate: allRequests.length > 0 ? 
                        Math.round((cancelled.length / allRequests.length) * 100) : 0,
                    crossZoneRate: allRequests.length > 0 ? 
                        Math.round((crossZone.length / allRequests.length) * 100) : 0,
                    registeredVehicles: vehicleCount
                },
                durations: {
                    average: Math.round(avgDuration),
                    total: totalDuration
                },
                zones: zoneMetrics,
                recentActivity: await getRecentActivity()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching analytics',
            error: error.message
        });
    }
};

// Get zone utilization
exports.getZoneUtilization = async (req, res) => {
    try {
        const { zoneId } = req.params;
        
        const zoneSlots = await ParkingSlot.find({ zoneId });
        const occupied = zoneSlots.filter(slot => !slot.availability).length;
        
        res.status(200).json({
            success: true,
            data: {
                zoneId,
                total: zoneSlots.length,
                occupied,
                available: zoneSlots.length - occupied,
                utilization: (occupied / zoneSlots.length) * 100,
                slots: zoneSlots
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching zone utilization',
            error: error.message
        });
    }
};

// Helper function for recent activity
async function getRecentActivity() {
    const recentRequests = await ParkingRequest.find()
        .sort({ updatedAt: -1 })
        .limit(10);
    
    const recentVehicles = await Vehicle.find()
        .sort({ registeredAt: -1 })
        .limit(5);
    
    return {
        recentRequests,
        recentVehicles
    };
}