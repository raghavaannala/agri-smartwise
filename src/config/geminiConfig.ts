import { initGeminiClient } from '@/services/geminiService';

/**
 * Initialize the Gemini AI client with the API key from environment variables
 */
export const setupGeminiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('Gemini API key not found in environment variables. AI features will be disabled.');
    return;
  }
  
  try {
    initGeminiClient(apiKey);
    console.log('Gemini AI client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Gemini AI client:', error);
  }
};

export default setupGeminiClient;
