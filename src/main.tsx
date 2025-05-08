import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/mobile.css'
import { setupGeminiClient } from './config/geminiConfig'

// Create a self-invoking async function to handle initialization
(async () => {
  try {
    // Initialize Gemini AI client
    const geminiInitialized = await setupGeminiClient();
    
    if (geminiInitialized) {
      console.log('Gemini AI client ready for use');
    } else {
      console.warn('Gemini AI client failed to initialize. Some AI features may be unavailable.');
    }
  } catch (error) {
    console.error('Error during application initialization:', error);
  } finally {
    // Render the app regardless of Gemini initialization status
    // The app should gracefully handle AI feature availability
    createRoot(document.getElementById("root")!).render(<App />);
  }
})();
