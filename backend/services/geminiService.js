const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require('@google/generative-ai');
const fs = require('fs').promises;
// require('dotenv').config(); // Remove, handled in app.js

console.log('DEBUG: geminiService.js file loaded at:', new Date().toISOString());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

console.log('DEBUG: genAI instance created. Has files service:', typeof genAI.files);

const commonSafetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

async function uploadFileToGemini(filePath, mimeType) {
    try {
        const file = { filePath, mimeType };
        console.log('DEBUG: Before genAI.files.upload. genAI.files is:', typeof genAI.files);
        // FIX: Use the top-level files service
        const uploadedFile = await genAI.files.upload(file);
        console.log(`Uploaded file to Gemini File API: ${uploadedFile.uri}`);
        return uploadedFile;
    } catch (error) {
        console.error('Error uploading file to Gemini File API:', error);
        throw new Error(`Failed to upload file for AI processing: ${error.message}`);
    }
}

async function generateTranscript(geminiFile) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    // Pre-saved transcription prompt
    const transcriptionPrompt = "Please provide a detailed and accurate transcript of the audio content from this video. Ensure all spoken words are transcribed. If possible, differentiate between speakers using labels like 'Speaker A:', 'Speaker B:', etc., and include approximate timestamps for major speaker turns.";
    try {
        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [
                    { text: transcriptionPrompt },
                    { fileData: { mimeType: geminiFile.mimeType, uri: geminiFile.uri } }
                ]
            }],
            safetySettings: commonSafetySettings,
        });
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating transcript:", error);
        throw new Error(`Failed to generate transcript from media: ${error.message}`);
    }
}

async function generateSummary(transcript) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Please provide a concise and comprehensive summary of the following meeting transcript.\nFocus on key discussions, decisions made, action items identified, and important outcomes.\nThe summary should be easy to read and structured logically (e.g., bullet points for key takeaways).\n\nMeeting Transcript:\n${transcript}\n\nSummary:`;
    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            safetySettings: commonSafetySettings,
        });
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating meeting summary:", error);
        throw new Error(`Failed to generate meeting summary: ${error.message}`);
    }
}

async function extractTasks(transcript) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `From the following meeting transcript, identify all distinct action items.\nFor each action item, extract the task description, the person responsible (assignee), and the due date if specified.\nReturn the results as a JSON array of objects.\n\nEach object in the array should have the following structure:\n{\n    "task": "string",\n    "assignee": "string",\n    "dueDate": "YYYY-MM-DD"\n}\n\nMeeting Transcript:\n${transcript}\n\nAction Items (JSON Array):`;
    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
            },
            safetySettings: commonSafetySettings,
        });
        const response = await result.response;
        try {
            return JSON.parse(response.text());
        } catch (parseError) {
            console.warn("Gemini returned non-JSON for tasks, attempting to salvage or return empty array.", response.text());
            return [];
        }
    } catch (error) {
        console.error("Error extracting tasks:", error);
        throw new Error(`Failed to extract tasks from transcript: ${error.message}`);
    }
}

async function deleteGeminiFile(fileUri) {
    try {
        const fileId = fileUri.split('/').pop();
        console.log('DEBUG: Before genAI.files.delete. genAI.files is:', typeof genAI.files);
        // FIX: Use the top-level files service
        await genAI.files.delete(fileId);
        console.log(`Deleted Gemini file with URI: ${fileUri}`);
    } catch (error) {
        console.error(`Error deleting Gemini file ${fileUri}:`, error);
    }
}

module.exports = {
    uploadFileToGemini,
    generateTranscript,
    generateSummary,
    extractTasks,
    deleteGeminiFile
}; 