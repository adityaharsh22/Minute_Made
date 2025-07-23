const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const meetingController = require('../controllers/meetingController');

// This route will now handle transcription, summarization, and task extraction
router.post('/upload', auth, upload.single('file'), meetingController.uploadMeeting);
router.post('/summarize/:meetingId', auth, meetingController.summarizeMeeting); // Keep this for re-summarization or manual trigger
router.get('/', auth, meetingController.getMeetings);
router.get('/:id', auth, meetingController.getMeetingById);

module.exports = router; 