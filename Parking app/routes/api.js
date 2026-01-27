const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parkingController');
const analyticsController = require('../controllers/analyticsController');

// Initialize
router.post('/initialize', parkingController.initializeSlots);

// Vehicle routes
router.post('/vehicles', parkingController.registerVehicle);
router.get('/vehicles', parkingController.getVehicles);

// Parking request routes
router.post('/requests', parkingController.createParkingRequest);
router.get('/requests', parkingController.getParkingRequests);
router.post('/requests/:requestId/allocate', parkingController.allocateParking);
router.post('/requests/:requestId/occupy', parkingController.occupySlot);
router.post('/requests/:requestId/release', parkingController.releaseSlot);
router.post('/requests/:requestId/cancel', parkingController.cancelRequest);

// Parking slot routes
router.get('/slots/zone/:zoneId', parkingController.getSlotsByZone);

// Rollback routes
router.post('/rollback/:k', parkingController.rollbackOperations);
router.get('/rollback', parkingController.getRollbackStack);

// Analytics routes
router.get('/analytics', analyticsController.getAnalytics);
router.get('/analytics/zone/:zoneId', analyticsController.getZoneUtilization);

module.exports = router;