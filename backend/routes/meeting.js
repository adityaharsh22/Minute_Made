const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const meetingController = require('../controllers/meetingController');

router.post('/upload', auth, upload.single('file'), meetingController.uploadMeeting);
router.post('/summarize/:meetingId', auth, meetingController.summarizeMeeting);
router.get('/', auth, meetingController.getMeetings);
router.get('/:id', auth, meetingController.getMeetingById);

module.exports = router; 