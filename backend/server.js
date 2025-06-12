// smartbvb-backend/server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Import cors middleware

// Import all routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts'); // Ensure this import is correct
const deadlineRoutes = require('./routes/deadlines');
const noteRoutes = require('./routes/notes');
const groupRoutes = require('./routes/groups');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/innovatehub_db'; // Changed default DB name

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err)); // Crucial error logging here

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes); // Ensure this line exists and points to postRoutes
app.use('/api/deadlines', deadlineRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/groups', groupRoutes);


// Simple health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ message: 'Backend is healthy!' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global Error Handler caught:', err.stack); // Enhanced logging
    res.status(err.statusCode || 500).json({
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
