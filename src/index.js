const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// Middleware
app.use(cors({
  origin: [
    'https://e-waste-management-client.vercel.app',
    process.env.CLIENT_URL || 'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e-waste-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Create HTTP server
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: [
      'https://e-waste-management-client.vercel.app',
      process.env.CLIENT_URL || 'http://localhost:3000'
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'E-Waste Management API is running' });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pickups', require('./routes/pickups'));
app.use('/api/recyclers', require('./routes/recyclers'));

// 404 handler
app.use((req, res) => {
  console.log('404 Not Found:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}`);
}); 