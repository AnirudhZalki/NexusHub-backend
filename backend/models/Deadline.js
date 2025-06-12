// smartbvb-backend/models/Deadline.js
const mongoose = require('mongoose');

const DeadlineSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    type: { // e.g., 'assignment', 'exam', 'project', 'event'
        type: String,
        required: true,
        enum: ['assignment', 'exam', 'project', 'event', 'other']
    },
    isPublic: { // Can be shared with other students in the same college
        type: Boolean,
        default: false
    },
    college: { // Automatically filled based on user's college
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Deadline', DeadlineSchema);
