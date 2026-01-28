// Main Application (Updated for MongoDB)
class ParkingApp {
    constructor() {
        this.currentVehicle = null;
        this.currentRequest = null;
        this.selectedZone = 'A';
        this.api = window.apiClient;
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadInitialData();
        this.updateUI();
    }

    cacheElements() {
        // Form elements
        this.vehicleIdInput = document.getElementById('vehicleId');
        this.preferredZoneSelect = document.getElementById('preferredZone');
        this.registerVehicleBtn = document.getElementById('registerVehicle');
        
        this.vehicleSelect = document.getElementById('vehicleSelect');
        this.requestZoneSelect = document.getElementById('requestZone');
        
        // Action buttons
        this.allocateBtn = document.getElementById('allocateBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.occupyBtn = document.getElementById('occupyBtn');
        this.releaseBtn = document.getElementById('releaseBtn');
        this.rollbackBtn = document.getElementById('rollbackBtn');
        this.rollbackCountInput = document.getElementById('rollbackCount');
        
        // Display areas
        this.slotTableBody = document.getElementById('slotTableBody');
        this.historyTableBody = document.getElementById('historyTableBody');
        this.rollbackStack = document.getElementById('rollbackStack');
        this.zoneUtilization = document.getElementById('zoneUtilization');
        this.requestsSummary = document.getElementById('requestsSummary');
        this.averageDuration = document.getElementById('averageDuration');
        this.crossZoneCount = document.getElementById('crossZoneCount');
        this.notification = document.getElementById('notification');
        
        // Tab buttons
        this.tabButtons = document.querySelectorAll('.tab-btn');
    }

    bindEvents() {
        this.registerVehicleBtn.addEventListener('click', () => this.registerVehicle());
        
        this.allocateBtn.addEventListener('click', () => this.allocateParking());
        this.cancelBtn.addEventListener('click', () => this.cancelRequest());
        this.occupyBtn.addEventListener('click', () => this.occupySlot());
        this.releaseBtn.addEventListener('click', () => this.releaseSlot());
        this.rollbackBtn.addEventListener('click', () => this.executeRollback());
        
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchZoneTab(e));
        });
        
        this.vehicleSelect.addEventListener('change', (e) => this.selectVehicle(e.target.value));
        this.requestZoneSelect.addEventListener('change', (e) => {
            this.selectedZone = e.target.value;
        });
    }

    async loadInitialData() {
        try {
            await this.updateVehicleSelect();
            await this.updateSlotTable('A');
            await this.updateAnalytics();
            await this.updateRollbackStack();
        } catch (error) {
            this.showNotification('Error loading initial data', 'error');
        }
    }

    async registerVehicle() {
        const vehicleId = this.vehicleIdInput.value.trim();
        const preferredZone = this.preferredZoneSelect.value;
        
        if (!vehicleId) {
            this.showNotification('Please enter a vehicle ID', 'error');
            return;
        }
        
        try {
            const response = await this.api.registerVehicle(vehicleId, preferredZone);
            this.showNotification(response.message, 'success');
            
            await this.updateVehicleSelect();
            this.vehicleIdInput.value = '';
            
            // Select the new vehicle
            this.selectVehicle(vehicleId);
            
        } catch (error) {
            this.showNotification(error.message || 'Error registering vehicle', 'error');
        }
    }

    async selectVehicle(vehicleId) {
        try {
            const response = await this.api.getVehicles();
            const vehicle = response.data.find(v => v.vehicleId === vehicleId);
            
            if (vehicle) {
                this.currentVehicle = vehicle;
                
                // Get active request for this vehicle
                const requestsResponse = await this.api.getParkingRequests(true);
                const activeRequest = requestsResponse.data.find(
                    req => req.vehicleId === vehicleId && req.isActive
                );
                
                this.currentRequest = activeRequest || null;
                this.updateActionButtons();
            }
        } catch (error) {
            console.error('Error selecting vehicle:', error);
        }
    }

    async allocateParking() {
        if (!this.currentVehicle) {
            this.showNotification('Please select a vehicle first', 'error');
            return;
        }
        
        const requestedZone = this.requestZoneSelect.value;
        
        try {
            // Create request first
            const createResponse = await this.api.createParkingRequest(
                this.currentVehicle.vehicleId,
                requestedZone
            );
            
            // Then allocate
            const allocateResponse = await this.api.allocateParking(
                createResponse.data.requestId
            );
            
            this.showNotification(allocateResponse.message, 'success');
            
            // Refresh data
            await this.selectVehicle(this.currentVehicle.vehicleId);
            await this.updateUI();
            
        } catch (error) {
            this.showNotification(error.message || 'Error allocating parking', 'error');
        }
    }

    async cancelRequest() {
        if (!this.currentRequest) {
            this.showNotification('No active request to cancel', 'error');
            return;
        }
        
        try {
            const response = await this.api.cancelRequest(this.currentRequest.requestId);
            this.showNotification(response.message, 'success');
            
            this.currentRequest = null;
            await this.updateUI();
            
        } catch (error) {
            this.showNotification(error.message || 'Error cancelling request', 'error');
        }
    }

    async occupySlot() {
        if (!this.currentRequest) {
            this.showNotification('No allocated request to occupy', 'error');
            return;
        }
        
        try {
            const response = await this.api.occupySlot(this.currentRequest.requestId);
            this.showNotification(response.message, 'success');
            
            await this.selectVehicle(this.currentVehicle.vehicleId);
            await this.updateUI();
            
        } catch (error) {
            this.showNotification(error.message || 'Error occupying slot', 'error');
        }
    }

    async releaseSlot() {
        if (!this.currentRequest) {
            this.showNotification('No occupied request to release', 'error');
            return;
        }
        
        try {
            const response = await this.api.releaseSlot(this.currentRequest.requestId);
            this.showNotification(response.message, 'success');
            
            this.currentRequest = null;
            await this.updateUI();
            
        } catch (error) {
            this.showNotification(error.message || 'Error releasing slot', 'error');
        }
    }

    async executeRollback() {
        const k = parseInt(this.rollbackCountInput.value) || 1;
        
        try {
            const response = await this.api.rollbackOperations(k);
            this.showNotification(
                `Rolled back ${response.data.totalRolledBack} operation(s) successfully`,
                'success'
            );
            
            // Refresh all data
            await this.updateUI();
            
        } catch (error) {
            this.showNotification(error.message || 'Error executing rollback', 'error');
        }
    }

    switchZoneTab(event) {
        const zone = event.target.dataset.zone;
        
        // Update active tab
        this.tabButtons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        // Update table
        this.updateSlotTable(zone);
    }

    async updateVehicleSelect() {
        try {
            const response = await this.api.getVehicles();
            
            this.vehicleSelect.innerHTML = '';
            
            response.data.forEach(vehicle => {
                const option = document.createElement('option');
                option.value = vehicle.vehicleId;
                option.textContent = `${vehicle.vehicleId} (Pref: Zone ${vehicle.preferredZone})`;
                this.vehicleSelect.appendChild(option);
            });
            
            if (response.data.length > 0) {
                await this.selectVehicle(response.data[0].vehicleId);
            }
        } catch (error) {
            console.error('Error updating vehicle select:', error);
        }
    }

    async updateSlotTable(zoneId) {
        try {
            const response = await this.api.getSlotsByZone(zoneId);
            const slots = response.data;
            
            // Get active requests for this zone
            const requestsResponse = await this.api.getParkingRequests(true);
            const zoneRequests = requestsResponse.data.filter(req => 
                req.allocatedSlotId && req.allocatedSlotId.startsWith(zoneId)
            );
            
            this.slotTableBody.innerHTML = '';
            
            slots.forEach(slot => {
                const request = zoneRequests.find(req => req.allocatedSlotId === slot.slotId);
                
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${slot.slotId}</td>
                    <td>Area ${slot.areaId}</td>
                    <td>
                        <span class="availability ${slot.availability ? 'available' : 'occupied'}">
                            ${slot.availability ? 'Available' : 'Occupied'}
                        </span>
                    </td>
                    <td>${slot.currentVehicleId || '-'}</td>
                    <td>
                        ${request ? 
                            `<span class="status-badge status-${request.currentState.toLowerCase()}">
                                ${request.currentState}
                            </span>` : 
                            '-'
                        }
                    </td>
                `;
                
                this.slotTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error updating slot table:', error);
        }
    }

    async updateHistoryTable() {
        try {
            const response = await this.api.getParkingRequests(false); // Get inactive (historical) requests
            const requests = response.data.slice(0, 10);
            
            this.historyTableBody.innerHTML = '';
            
            requests.forEach(request => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${request.requestId}</td>
                    <td>${request.vehicleId}</td>
                    <td>Zone ${request.requestedZone}</td>
                    <td>${request.allocatedSlotId || '-'}</td>
                    <td>
                        <span class="status-badge status-${request.currentState.toLowerCase()}">
                            ${request.currentState}
                        </span>
                    </td>
                    <td>${request.crossZoneAllocation ? 
                        '<span class="cross-zone">Yes</span>' : 'No'}</td>
                    <td>${request.duration > 0 ? `${request.duration} min` : '-'}</td>
                `;
                
                this.historyTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error updating history table:', error);
        }
    }

    async updateAnalytics() {
        try {
            const response = await this.api.getAnalytics();
            const analytics = response.data;
            
            // Zone utilization
            this.zoneUtilization.innerHTML = '';
            Object.entries(analytics.zones).forEach(([zone, data]) => {
                const utilClass = data.utilization > 75 ? 'util-high' : 
                                data.utilization > 50 ? 'util-medium' : 'util-low';
                
                const zoneDiv = document.createElement('div');
                zoneDiv.className = 'zone-util';
                zoneDiv.innerHTML = `
                    <div>Zone ${zone}: ${data.occupied}/${data.total} slots</div>
                    <div class="util-bar">
                        <div class="util-fill" style="width: ${Math.min(data.utilization, 100)}%"></div>
                    </div>
                    <div class="${utilClass}">${Math.round(data.utilization)}% utilized</div>
                `;
                this.zoneUtilization.appendChild(zoneDiv);
            });
            
            // Requests summary
            const summary = analytics.summary;
            this.requestsSummary.innerHTML = `
                <div>Total: ${summary.totalRequests}</div>
                <div>Completed: ${summary.completionRate}%</div>
                <div>Cancelled: ${summary.cancellationRate}%</div>
                <div>Cross-Zone: ${summary.crossZoneRate}%</div>
                <div>Vehicles: ${summary.registeredVehicles}</div>
            `;
            
            // Average duration
            this.averageDuration.textContent = `${analytics.durations.average} min`;
            
            // Cross-zone count
            this.crossZoneCount.textContent = summary.crossZoneRate + '%';
            
            // Update history table
            await this.updateHistoryTable();
            
        } catch (error) {
            console.error('Error updating analytics:', error);
        }
    }

    async updateRollbackStack() {
        try {
            const response = await this.api.getRollbackStack();
            const operations = response.data;
            
            this.rollbackStack.innerHTML = '';
            
            if (operations.length === 0) {
                this.rollbackStack.innerHTML = '<div class="stack-item">No operations recorded</div>';
                return;
            }
            
            operations.forEach(op => {
                const opDiv = document.createElement('div');
                opDiv.className = 'stack-item';
                
                let details = '';
                switch (op.operationType) {
                    case 'ALLOCATION':
                        details = `Allocated slot ${op.details.slotId}`;
                        break;
                    case 'STATE_CHANGE':
                        details = `${op.details.fromState} → ${op.details.toState}`;
                        break;
                    case 'CANCELLATION':
                        details = 'Cancelled request';
                        break;
                }
                
                opDiv.innerHTML = `
                    <div><strong>${op.operationType}</strong></div>
                    <div>${details}</div>
                    <div class="small">${new Date(op.timestamp).toLocaleTimeString()}</div>
                `;
                
                this.rollbackStack.appendChild(opDiv);
            });
        } catch (error) {
            console.error('Error updating rollback stack:', error);
        }
    }

    updateActionButtons() {
        // Reset all buttons first
        this.allocateBtn.disabled = false;
        this.cancelBtn.disabled = true;
        this.occupyBtn.disabled = true;
        this.releaseBtn.disabled = true;
        
        if (!this.currentRequest) {
            return;
        }
        
        // Enable buttons based on current state
        this.allocateBtn.disabled = true; // Can't allocate if already have request
        
        switch (this.currentRequest.currentState) {
            case 'REQUESTED':
                this.cancelBtn.disabled = false;
                break;
            case 'ALLOCATED':
                this.cancelBtn.disabled = false;
                this.occupyBtn.disabled = false;
                break;
            case 'OCCUPIED':
                this.releaseBtn.disabled = false;
                break;
        }
    }

    async updateUI() {
        try {
            await Promise.all([
                this.updateVehicleSelect(),
                this.updateSlotTable(this.selectedZone),
                this.updateAnalytics(),
                this.updateRollbackStack()
            ]);
            this.updateActionButtons();
        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }

    showNotification(message, type) {
        this.notification.textContent = message;
        this.notification.className = `notification-${type}`;
        this.notification.style.display = 'block';
        
        setTimeout(() => {
            this.notification.style.display = 'none';
        }, 3000);
    }
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.parkingApp = new ParkingApp();
    console.log('Smart Parking System with MongoDB loaded successfully!');
});