import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupGeminiClient } from './config/geminiConfig'

// Initialize Gemini AI client
setupGeminiClient();

createRoot(document.getElementById("root")!).render(<App />);
