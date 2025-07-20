const Meeting = require('../models/Meeting');
const path = require('path');
const { summarizeAndExtractTasks } = require('../utils/openai');

exports.uploadMeeting = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    const meeting = new Meeting({
      userId: req.user.userId,
      originalFileName: req.file.originalname,
      transcript: '', // Placeholder, to be filled after transcription
    });
    await meeting.save();
    res.status(201).json({ message: 'Meeting uploaded.', meetingId: meeting._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.summarizeMeeting = async (req, res) => {
  try {
    const meetingId = req.params.meetingId;
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found.' });
    }
    if (!meeting.transcript) {
      return res.status(400).json({ message: 'Transcript not available.' });
    }
    // Call OpenAI to get summary and tasks
    const aiResponse = await summarizeAndExtractTasks(meeting.transcript);
    // Simple parsing: split summary and tasks (improve as needed)
    const [summaryPart, tasksPart] = aiResponse.split('2. Extract all tasks mentioned');
    meeting.summary = summaryPart ? summaryPart.trim() : '';
    meeting.tasks = tasksPart ? tasksPart.trim() : '';
    await meeting.save();
    res.json({ summary: meeting.summary, tasks: meeting.tasks });
  } catch (err) {
    res.status(500).json({ message: 'AI summarization failed.' });
  }
};

exports.getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch meetings.' });
  }
};

exports.getMeetingById = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found.' });
    }
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch meeting.' });
  }
}; 