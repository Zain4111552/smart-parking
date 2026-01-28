// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

class ApiClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const defaultHeaders = {
            'Content-Type': 'application/json',
        };
        
        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Initialize system
    async initializeSlots() {
        return this.request('/initialize', { method: 'POST' });
    }

    // Vehicle operations
    async registerVehicle(vehicleId, preferredZone) {
        return this.request('/vehicles', {
            method: 'POST',
            body: JSON.stringify({ vehicleId, preferredZone })
        });
    }

    async getVehicles() {
        return this.request('/vehicles');
    }

    // Parking request operations
    async createParkingRequest(vehicleId, requestedZone) {
        return this.request('/requests', {
            method: 'POST',
            body: JSON.stringify({ vehicleId, requestedZone })
        });
    }

    async allocateParking(requestId) {
        return this.request(`/requests/${requestId}/allocate`, {
            method: 'POST'
        });
    }

    async occupySlot(requestId) {
        return this.request(`/requests/${requestId}/occupy`, {
            method: 'POST'
        });
    }

    async releaseSlot(requestId) {
        return this.request(`/requests/${requestId}/release`, {
            method: 'POST'
        });
    }

    async cancelRequest(requestId) {
        return this.request(`/requests/${requestId}/cancel`, {
            method: 'POST'
        });
    }

    // Get data
    async getParkingRequests(active = true) {
        return this.request(`/requests?active=${active}`);
    }

    async getSlotsByZone(zoneId) {
        return this.request(`/slots/zone/${zoneId}`);
    }

    // Rollback operations
    async rollbackOperations(k) {
        return this.request(`/rollback/${k}`, { method: 'POST' });
    }

    async getRollbackStack() {
        return this.request('/rollback');
    }

    // Analytics
    async getAnalytics() {
        return this.request('/analytics');
    }

    async getZoneUtilization(zoneId) {
        return this.request(`/analytics/zone/${zoneId}`);
    }
}

// Create global API client instance
window.apiClient = new ApiClient();