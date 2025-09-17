import { initGeminiClient } from '@/services/geminiService';

// Track initialization status
let isInitialized = false;
let isInitializing = false;
let initializationError: Error | null = null;
let lastInitAttempt = 0;

/**
 * Initialize the Gemini AI client with the API key from environment variables
 * @returns Promise resolving to initialization status
 */
export const setupGeminiClient = async (forceReInit = false): Promise<boolean> => {
  // Return cached result if already initialized and not forcing re-init
  if (isInitialized && !forceReInit) {
    return true;
  }
  
  // Prevent too frequent re-initialization attempts (minimum 30 seconds between attempts)
  const now = Date.now();
  if (!forceReInit && (now - lastInitAttempt) < 30000 && initializationError) {
    console.log('Skipping Gemini re-initialization - too soon since last attempt');
    return false;
  }
  
  // Prevent concurrent initialization
  if (isInitializing && !forceReInit) {
    console.log('Gemini client initialization already in progress');
    // Wait for initialization to complete
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!isInitializing) {
          clearInterval(checkInterval);
          resolve(isInitialized);
        }
      }, 100);
    });
  }
  
  isInitializing = true;
  isInitialized = false;
  initializationError = null;
  lastInitAttempt = now;
  
  try {
    // Get API key from environment variable
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      const error = new Error('Gemini API key not found in environment variables. AI features will be disabled.');
      console.error('Error initializing Gemini client:', error.message);
      isInitializing = false;
      initializationError = error;
      return false;
    }
    
    console.log('Initializing Gemini AI client...');
    
    // Create a promise that times out after 15 seconds
    const timeout = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Gemini client initialization timed out')), 15000);
    });
    
    // Initialize the client
    const initialize = new Promise<boolean>(async (resolve) => {
      try {
        const success = await initGeminiClient(apiKey);
        if (success) {
          console.log('Gemini AI client initialized successfully');
          isInitialized = true;
          resolve(true);
        } else {
          console.warn('Gemini AI client initialization failed');
          resolve(false);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Error initializing Gemini client:', error.message);
        initializationError = error;
        resolve(false);
      }
    });
    
    // Race initialization against timeout
    const result = await Promise.race([initialize, timeout]);
    return result;
  } catch (error: any) {
    console.error('Error initializing Gemini client:', error.message);
    initializationError = error;
    return false;
  } finally {
    isInitializing = false;
  }
};

/**
 * Checks if the Gemini client is initialized
 * @returns True if initialized
 */
export const isGeminiInitialized = (): boolean => {
  return isInitialized;
};

/**
 * Gets the initialization error if any
 * @returns Error object or null
 */
export const getGeminiInitError = (): Error | null => {
  return initializationError;
};

/**
 * Attempts to reinitialize Gemini if it's not working
 * @returns Promise resolving to success status
 */
export const reinitializeGemini = async (): Promise<boolean> => {
  console.log('Attempting to reinitialize Gemini client...');
  return await setupGeminiClient(true);
};

/**
 * Gets the status of the Gemini service
 * @returns Object with initialization status and error info
 */
export const getGeminiStatus = () => {
  return {
    isInitialized,
    isInitializing,
    error: initializationError,
    lastAttempt: lastInitAttempt
  };
};

export default setupGeminiClient;
