// smartbvb-backend/server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Import cors middleware

// Import all routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
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
    .catch(err => console.error('MongoDB connection error:', err));

// --- NEW: Handle GET request to the root URL (/) ---
app.get('/', (req, res) => {
    res.status(200).send('InnovateHub Backend is running! Access API at /api');
});
// --- END NEW ---

// Routes (prefixed with /api)
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/deadlines', deadlineRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/groups', groupRoutes);


// Simple health check route (can also be accessed via /api/health)
app.get('/api/health', (req, res) => {
    res.status(200).json({ message: 'Backend is healthy!' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global Error Handler caught:', err.stack);
    res.status(err.statusCode || 500).json({
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
