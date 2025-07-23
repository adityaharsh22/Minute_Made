const Meeting = require('../models/Meeting');
const geminiService = require('../services/geminiService');
const fs = require('fs').promises;

exports.uploadMeeting = async (req, res) => {
    if (!req.file) {
        console.log('Error: No file uploaded.');
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const userId = req.user.userId;
    const filePath = req.file.path;
    const originalFileName = req.file.originalname;
    const mimeType = req.file.mimetype;

    console.log('Received file:', { originalFileName, mimeType, filePath, userId });
    console.log('req.file:', req.file);

    let newMeeting;
    let uploadedGeminiFileUri = null;

    try {
        // 1. Create a new meeting record in DB with initial details
        newMeeting = new Meeting({
            userId,
            originalFileName,
        });
        await newMeeting.save();
        console.log('Meeting created in DB:', newMeeting._id);

        // 2. Upload file to Gemini's File API for transcription
        const uploadedFileResponse = await geminiService.uploadFileToGemini(filePath, mimeType);
        uploadedGeminiFileUri = uploadedFileResponse.uri;
        newMeeting.geminiFileUri = uploadedGeminiFileUri; // Save the Gemini File API URI
        await newMeeting.save();
        console.log('File uploaded to Gemini:', uploadedGeminiFileUri);

        // 3. Generate transcript using Gemini (uses the pre-saved prompt internally)
        const transcript = await geminiService.generateTranscript(uploadedFileResponse);
        newMeeting.transcript = transcript; // Store the transcript in the database
        await newMeeting.save();
        console.log('Transcript generated and saved to DB.');

        // 4. Generate summary and extract tasks (in parallel, operating on the saved transcript)
        const [summary, tasks] = await Promise.all([
            geminiService.generateSummary(transcript),
            geminiService.extractTasks(transcript)
        ]);
        newMeeting.summary = summary;
        newMeeting.tasks = tasks;
        await newMeeting.save();
        console.log('Summary and tasks generated and saved to DB.');

        // 5. Clean up: Delete the temporary local file and the file from Gemini's API
        if (filePath) {
            await fs.unlink(filePath);
            console.log('Local file deleted:', filePath);
        }
        if (uploadedGeminiFileUri) {
            await geminiService.deleteGeminiFile(uploadedGeminiFileUri);
            console.log('Gemini file deleted:', uploadedGeminiFileUri);
        }

        res.status(200).json({
            message: 'Meeting uploaded and processed successfully!',
            meetingId: newMeeting._id,
            transcript: newMeeting.transcript,
            summary: newMeeting.summary,
            tasks: newMeeting.tasks
        });
    } catch (error) {
        console.error('--- ERROR PROCESSING MEETING ---');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Raw error object:', error);
        console.error('------------------------------');
        try {
            if (filePath && await fs.stat(filePath).catch(() => null)) {
                await fs.unlink(filePath);
                console.log('Cleaned up local file after error:', filePath);
            }
        } catch (cleanupError) {
            console.error('Error during local file cleanup:', cleanupError);
        }
        try {
            if (uploadedGeminiFileUri) {
                await geminiService.deleteGeminiFile(uploadedGeminiFileUri);
                console.log('Cleaned up Gemini file after error:', uploadedGeminiFileUri);
            }
        } catch (cleanupError) {
            console.error('Error during Gemini file cleanup:', cleanupError);
        }
        res.status(500).json({ message: 'Failed to process meeting', error: error.message });
    }
};

exports.summarizeMeeting = async (req, res) => {
    const { meetingId } = req.params;
    const userId = req.user.userId;
    try {
        const meeting = await Meeting.findOne({ _id: meetingId, userId });
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found or you do not have access.' });
        }
        if (!meeting.transcript) {
            return res.status(400).json({ message: 'No transcript available for summarization.' });
        }
        const summary = await geminiService.generateSummary(meeting.transcript);
        const tasks = await geminiService.extractTasks(meeting.transcript);
        meeting.summary = summary;
        meeting.tasks = tasks;
        await meeting.save();
        res.status(200).json({
            message: 'Meeting re-summarized and tasks re-extracted successfully!',
            summary: meeting.summary,
            tasks: meeting.tasks
        });
    } catch (error) {
        console.error('Error re-summarizing meeting:', error);
        res.status(500).json({ message: 'Failed to re-summarize meeting', error: error.message });
    }
};

exports.getMeetings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const meetings = await Meeting.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(meetings);
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ message: 'Failed to fetch meetings', error: error.message });
    }
};

exports.getMeetingById = async (req, res) => {
    try {
        const userId = req.user.userId;
        const meeting = await Meeting.findOne({ _id: req.params.id, userId });
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found or you do not have access.' });
        }
        res.status(200).json(meeting);
    } catch (error) {
        console.error('Error fetching meeting by ID:', error);
        res.status(500).json({ message: 'Failed to fetch meeting', error: error.message });
    }
}; 