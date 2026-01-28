# 🚗 Smart Parking Allocation System

A full-stack web application for managing parking spaces with real-time allocation, analytics, and rollback capabilities. Built with MongoDB, Express.js, and vanilla JavaScript.

## 🌟 Live Demo

- **Frontend:** [https://smart-parking-system-demo.netlify.app](https://smart-parking-system-demo.netlify.app) *(Coming soon)*
- **Backend API:** [https://smart-parking-backend.onrender.com/api](https://smart-parking-backend.onrender.com/api)
- **API Documentation:** [https://smart-parking-backend.onrender.com](https://smart-parking-backend.onrender.com)

## 📋 Features

### 🎯 Core Features
- **Vehicle Registration** - Register vehicles with preferred parking zones
- **Smart Allocation** - Automatic parking slot allocation with cross-zone fallback
- **Real-time Dashboard** - Live parking slot status and analytics
- **Rollback System** - Undo last K operations for error recovery
- **Zone Management** - Manage 4 parking zones (A, B, C, D) with 15 slots each

### 📊 Analytics & Monitoring
- **Zone Utilization** - Real-time occupancy percentages
- **Request Statistics** - Completion, cancellation, and cross-zone rates
- **Duration Tracking** - Average parking duration calculation
- **Historical Data** - Complete request history with timestamps

### 🔧 Technical Features
- **State Machine** - Validated parking request state transitions
- **Transaction Safety** - MongoDB-based rollback system
- **Responsive Design** - Works on desktop and mobile devices
- **RESTful API** - Clean API architecture with proper status codes

## 🏗️ Architecture

### Backend Structure
```
backend/
├── models/              # MongoDB schemas
│   ├── ParkingSlot.js
│   ├── Vehicle.js
│   ├── ParkingRequest.js
│   └── RollbackOperation.js
├── controllers/         # Business logic
│   ├── parkingController.js
│   └── analyticsController.js
├── routes/              # API endpoints
│   └── api.js
├── middleware/          # Express middleware
│   └── errorHandler.js
└── server.js           # Main application file
```

### Frontend Structure
```
frontend/
├── css/
│   └── style.css      # Responsive styling
├── js/
│   ├── api-client.js  # API communication layer
│   └── app.js         # Main application logic
└── index.html         # Single-page application
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Git

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/smart-parking-system.git
cd smart-parking-system
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm start
```

3. **Frontend Setup**
```bash
cd frontend
# Open index.html in browser or use live server
```

4. **Initialize Database**
```bash
curl -X POST http://localhost:5000/api/initialize
```

### Deployment

#### Backend (Render)
1. Push backend to GitHub
2. Create new Web Service on Render
3. Set environment variables:
   - `MONGODB_URI` - MongoDB Atlas connection string
   - `NODE_ENV=production`
4. Deploy

#### Frontend (Netlify)
1. Push frontend to GitHub
2. Import repository in Netlify
3. Set build command: (empty)
4. Set publish directory: `.`
5. Deploy

## 📡 API Endpoints

### Vehicle Management
- `POST /api/vehicles` - Register new vehicle
- `GET /api/vehicles` - Get all registered vehicles

### Parking Requests
- `POST /api/requests` - Create parking request
- `GET /api/requests` - Get all requests
- `POST /api/requests/:id/allocate` - Allocate parking slot
- `POST /api/requests/:id/occupy` - Mark slot as occupied
- `POST /api/requests/:id/release` - Release parking slot
- `POST /api/requests/:id/cancel` - Cancel request

### Parking Slots
- `GET /api/slots/zone/:zoneId` - Get slots by zone

### Analytics
- `GET /api/analytics` - Get system analytics
- `GET /api/analytics/zone/:zoneId` - Get zone utilization

### Rollback System
- `POST /api/rollback/:k` - Rollback last K operations
- `GET /api/rollback` - Get rollback stack

### System
- `POST /api/initialize` - Initialize parking slots
- `GET /api/health-check` - System health check

## 🛠️ Technologies Used

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **CORS** - Cross-origin resource sharing

### Frontend
- **Vanilla JavaScript** - No frameworks
- **CSS3** - Modern styling with Flexbox/Grid
- **Font Awesome** - Icon library
- **Fetch API** - HTTP requests

### Deployment
- **Render** - Backend hosting
- **Netlify** - Frontend hosting
- **MongoDB Atlas** - Cloud database

## 🎨 UI Features

### Dashboard
- Real-time parking slot visualization
- Color-coded status indicators (Available/Occupied)
- Zone-wise tab navigation
- Live utilization graphs

### Analytics Panel
- Zone utilization percentages
- Request completion rates
- Cross-zone allocation tracking
- Average duration statistics

### Control Panel
- Vehicle registration form
- Parking request management
- One-click state transitions (Allocate → Occupy → Release)
- Rollback operation control

## 🔒 State Management

The system implements a finite state machine for parking requests:

```
REQUESTED → ALLOCATED → OCCUPIED → RELEASED
    ↓           ↓
CANCELLED   CANCELLED
```

### Valid State Transitions:
- `REQUESTED` → `ALLOCATED` or `CANCELLED`
- `ALLOCATED` → `OCCUPIED` or `CANCELLED`
- `OCCUPIED` → `RELEASED`
- Terminal states: `RELEASED`, `CANCELLED`

## 📈 Allocation Algorithm

1. **Primary Allocation**: Try requested zone first
2. **Fallback Strategy**: Check other zones in preference order
3. **Cross-zone Allocation**: Allocate in different zone if requested zone is full
4. **No Available Slots**: Return error if all zones are occupied

## 🔄 Rollback System

The rollback system maintains an operation stack with:

### Operation Types:
1. **ALLOCATION** - Parking slot allocation
2. **STATE_CHANGE** - Request state transitions
3. **CANCELLATION** - Request cancellation

### Features:
- Stores last 10 operations
- Can rollback any number K (1-10) of operations
- Maintains operation snapshots for recovery
- Transaction-safe rollback execution

## 📱 Responsive Design

The application is fully responsive with:
- Mobile-first approach
- Flexible grid layouts
- Adaptive typography
- Touch-friendly controls
- Cross-browser compatibility

## 🧪 Testing

### Manual Test Cases
1. Vehicle registration and validation
2. Parking allocation with zone preferences
3. State transition validation
4. Rollback functionality
5. Analytics accuracy

### API Testing with curl
```bash
# Health check
curl https://smart-parking-backend.onrender.com/health

# Initialize slots
curl -X POST https://smart-parking-backend.onrender.com/api/initialize

# Register vehicle
curl -X POST https://smart-parking-backend.onrender.com/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"TEST-001","preferredZone":"A"}'
```

## 🚨 Error Handling

### Client-side Errors
- Form validation with user feedback
- Network error recovery
- State transition validation

### Server-side Errors
- Comprehensive error logging
- Graceful MongoDB disconnection handling
- Rate limiting (100 requests/15 minutes)
- CORS policy enforcement

## 📊 Performance Optimizations

### Backend
- Database indexing on frequently queried fields
- Connection pooling for MongoDB
- Rate limiting to prevent abuse
- Efficient query optimization

### Frontend
- Minimal DOM updates
- Efficient event delegation
- Cached API responses
- Lazy loading for analytics data

## 🔮 Future Enhancements

### Planned Features
1. **User Authentication** - Admin and user roles
2. **Payment Integration** - Parking fee calculation
3. **QR Code Generation** - Digital parking tickets
4. **Mobile App** - React Native application
5. **Real-time Updates** - WebSocket integration
6. **Predictive Analytics** - ML-based allocation
7. **Reservation System** - Advance booking
8. **IoT Integration** - Sensor-based availability

### Technical Improvements
1. **Unit Testing** - Jest test suite
2. **CI/CD Pipeline** - Automated deployment
3. **Dockerization** - Containerized deployment
4. **API Versioning** - Versioned endpoints
5. **Swagger Documentation** - API documentation
6. **Load Testing** - Performance benchmarking

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Add comments for complex logic
- Update documentation for new features
- Write meaningful commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Icons by [Font Awesome](https://fontawesome.com)
- Color palette from [Tailwind CSS](https://tailwindcss.com)
- Deployment platforms: [Render](https://render.com) and [Netlify](https://netlify.com)
- Database hosting: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

## 📞 Support

For support, please:
1. Check the [Issues](https://github.com/yourusername/smart-parking-system/issues) page
2. Create a new issue with detailed description
3. Include steps to reproduce if it's a bug

---

## 🏆 Project Highlights

### Academic Relevance
- **Data Structures**: Linked lists for zone preferences
- **Algorithms**: Smart allocation with fallback strategy
- **Database Design**: Normalized MongoDB schemas
- **State Management**: Finite state machine implementation
- **Error Recovery**: Rollback system design

### Real-world Application
- **Scalable Architecture**: Can handle multiple parking lots
- **Production Ready**: Deployed with proper error handling
- **Maintainable Code**: Modular structure with clear separation
- **User Friendly**: Intuitive UI with real-time feedback

### Learning Outcomes
- Full-stack development with modern technologies
- Database design and optimization
- API design and documentation
- Deployment and DevOps practices
- Problem-solving with algorithmic thinking

---

**Made with ❤️ by [Your Name]**  
*Computer Science Student | Full-Stack Developer*

---
*Last Updated: January 2025*  
*Version: 1.0.0*
