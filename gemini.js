const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;
let model;

function initGemini() {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not set — will use fallback messages');
    return;
  }
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  console.log('✅ Gemini API initialized');
}

async function generateBirthdayMessage(name, relationship, senderName) {
  // Fallback if Gemini is not configured
  if (!model) {
    return getFallbackMessage(name, senderName);
  }

  const prompt = `Generate a warm, heartfelt, and personalized birthday wish message for someone named "${name}". 
My relationship with them: "${relationship || 'friend'}".
My name is "${senderName}".

Rules:
- Keep it between 3-5 sentences
- Make it feel personal and genuine, not generic
- Reference the relationship naturally if possible
- Include 1-2 relevant emojis but don't overdo it
- End with my name as the sign-off
- Don't include "Subject:" or "Dear" — start directly with the wish
- Make it suitable to send via email or message
- Don't use the word "journey" or "chapter"

Just return the message text, nothing else.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return text;
  } catch (error) {
    console.error('❌ Gemini API error:', error.message);
    return getFallbackMessage(name, senderName);
  }
}

function getFallbackMessage(name, senderName) {
  const messages = [
    `Hey ${name}! 🎂\n\nWishing you the happiest of birthdays! May this year bring you incredible adventures, good health, and all the things that make you smile. Here's to celebrating YOU! 🥳\n\nCheers,\n${senderName}`,
    `Happy Birthday, ${name}! 🎉\n\nHope your special day is filled with laughter, love, and everything wonderful. You deserve all the best things life has to offer. Have an amazing one! 🎂\n\nWarm wishes,\n${senderName}`,
    `Hey ${name}! 🥳\n\nIt's your day! Wishing you a birthday as amazing as you are. May the year ahead be your best one yet, full of joy and memorable moments. Enjoy every single moment! 🎈\n\nBest,\n${senderName}`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

module.exports = { initGemini, generateBirthdayMessage };
