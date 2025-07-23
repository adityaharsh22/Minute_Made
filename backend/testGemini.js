const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testGeminiConnection() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro-latest' }); // or 'gemini-1.5-pro-latest'
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Say hello, Gemini!' }] }]
    });
    const response = await result.response;
    console.log('Gemini response:', response.text());
  } catch (error) {
    console.error('Gemini connection failed:', error.message);
    if (error.response && error.response.data) {
      console.error('Gemini API error details:', error.response.data);
    }
  }
}

testGeminiConnection(); 