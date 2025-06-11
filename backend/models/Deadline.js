// smartbvb-backend/models/Deadline.js
const mongoose = require('mongoose');

const deadlineSchema = new mongoose.Schema({
    user: { // The user who created this deadline
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    dueDate: {
        type: Date,
        required: true
    },
    type: { // e.g., 'assignment', 'exam', 'event', 'project'
        type: String,
        required: true,
        enum: ['assignment', 'exam', 'project', 'event', 'other'],
        default: 'other'
    },
    college: { // Associate deadline with a college (e.g., for public college deadlines)
        type: String,
        required: true,
        enum: ['bvb', 'kit'] // Matches your User model's college enum
    },
    isPublic: { // Can this deadline be seen by others in the same college?
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Deadline', deadlineSchema);
