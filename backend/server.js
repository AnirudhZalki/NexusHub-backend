// smartbvb-backend/server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Import cors middleware

// Import existing routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');

// Import NEW routes
const deadlineRoutes = require('./routes/deadlines');
const noteRoutes = require('./routes/notes');
const groupRoutes = require('./routes/groups');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/innovatehub_db'; // Changed default DB name

// Middleware
// Increased body size limit for JSON and URL-encoded data to support Base64 files
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors()); // Enable CORS for all routes (important for frontend to connect)

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes); // Authentication routes
app.use('/api/posts', postRoutes); // Post management routes
app.use('/api/deadlines', deadlineRoutes); // NEW: Deadline routes
app.use('/api/notes', noteRoutes);     // NEW: Note routes
app.use('/api/groups', groupRoutes);   // NEW: Study Group routes


// Simple health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ message: 'Backend is healthy!' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        message: err.message || 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err : {} // Don't expose full error in production
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
