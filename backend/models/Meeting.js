const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    task: {
        type: String,
        required: true,
    },
    assignee: {
        type: String,
        default: 'Unassigned',
    },
    dueDate: {
        type: String, // Storing as string "YYYY-MM-DD" as per Gemini prompt
    },
});

const meetingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    originalFileName: {
        type: String,
        required: true,
    },
    summary: {
        type: String,
    },
    tasks: [taskSchema], // Changed to an array of taskSchema
    transcript: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    geminiFileUri: {
        type: String,
    },
});

module.exports = mongoose.model('Meeting', meetingSchema); 