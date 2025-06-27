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
const usersRoutes = require('./routes/users'); // NEW: Import users route

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/innovatehub_db'; // Changed default DB name

// --- NEW CORS Configuration ---
// Define allowed origins. In production, list your specific frontend URLs.
// For now, including your GitHub Pages URL.
const allowedOrigins = [
    'https://anirudhzalki.github.io', // Your frontend GitHub Pages URL
    'http://localhost:8080',          // If you develop locally with a different port
    'http://localhost:3000'           // If your frontend also runs on localhost:3000
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        // Or if the origin is in our allowedOrigins list
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allowed HTTP methods
    credentials: true, // Allow cookies to be sent with requests
    optionsSuccessStatus: 204 // For preflight requests
}));
// --- END NEW CORS Configuration ---


// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


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
app.use('/api/users', usersRoutes); // NEW: Use the users route


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
