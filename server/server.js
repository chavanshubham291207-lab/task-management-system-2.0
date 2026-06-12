const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// CORS configuration
const clientURL = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: [clientURL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: [clientURL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Inject socket.io instance to Express app variables
app.set('io', io);

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log('Client connected to Socket.io:', socket.id);

  // Join a dedicated room for this user to send targeted notifications
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`Socket client ${socket.id} joined user room: ${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from Socket.io:', socket.id);
  });
});

// Register routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/workspaces', require('./routes/workspaceRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
