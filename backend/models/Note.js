// smartbvb-backend/models/Note.js
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    user: { // The user who owns this note (private)
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
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000 // Allow longer notes
    },
    tags: [{ // Optional tags for organization
        type: String,
        trim: true,
        lowercase: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update 'updatedAt' field on every save
noteSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Note', noteSchema);
