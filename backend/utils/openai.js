const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

async function summarizeAndExtractTasks(transcript) {
  const prompt = `You are an AI assistant. Given a transcript, generate:\n1. A summary of the meeting in bullet points.\n2. Extract all tasks mentioned with:\n   - Task description\n   - Assigned to (name if mentioned)\n   - Deadline (if any)\n\nTranscript:\n${transcript}`;

  const response = await axios.post(
    OPENAI_API_URL,
    {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.4,
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.choices[0].message.content;
}

module.exports = { summarizeAndExtractTasks }; 