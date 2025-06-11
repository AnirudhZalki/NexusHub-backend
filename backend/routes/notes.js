// smartbvb-backend/routes/notes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Note = require('../models/Note');

// @route   POST /api/notes
// @desc    Create a new personal note
// @access  Private
router.post('/', auth, async (req, res, next) => {
    const { title, content, tags } = req.body;

    if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required for a note.' });
    }

    try {
        const newNote = new Note({
            user: req.user.id, // Associate note with the authenticated user
            title,
            content,
            tags: tags || [] // Ensure tags is an array
        });

        const note = await newNote.save();
        res.status(201).json({
            message: 'Note created successfully!',
            note
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/notes
// @desc    Get all personal notes for the authenticated user
// @access  Private
router.get('/', auth, async (req, res, next) => {
    try {
        // Find all notes belonging to the authenticated user
        const notes = await Note.find({ user: req.user.id }).sort({ updatedAt: -1 }); // Sort by most recently updated
        res.status(200).json({ notes });
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/notes/:id
// @desc    Update a personal note
// @access  Private (only owner can update)
router.put('/:id', auth, async (req, res, next) => {
    const { title, content, tags } = req.body;

    try {
        let note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({ message: 'Note not found.' });
        }

        // Check if the authenticated user is the owner of the note
        if (note.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this note.' });
        }

        // Update fields if provided
        note.title = title || note.title;
        note.content = content || note.content;
        note.tags = tags !== undefined ? tags : note.tags; // Allow clearing tags

        await note.save(); // pre('save') hook will update 'updatedAt'

        res.status(200).json({
            message: 'Note updated successfully!',
            note
        });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/notes/:id
// @desc    Delete a personal note
// @access  Private (only owner can delete)
router.delete('/:id', auth, async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({ message: 'Note not found.' });
        }

        // Check if the authenticated user is the owner of the note
        if (note.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this note.' });
        }

        await Note.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Note removed successfully.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
