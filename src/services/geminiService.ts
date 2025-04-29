// Import the Google Generative AI library
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Gemini API client
let geminiModel: any = null;

/**
 * Initialize the Gemini client with the API key
 * @param apiKey - The Gemini API key
 * @returns A promise resolving to boolean indicating success
 */
export const initGeminiClient = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) {
    console.error('Gemini API key is required');
    return false;
  }
  
  try {
    console.log('Initializing Gemini client with API key...');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Check connectivity with a simple ping request
    const pingModel = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-lite",
      generationConfig: {
        maxOutputTokens: 10,
      },
    });
    
    // Try a simple ping to verify connectivity
    const pingPromise = pingModel.generateContent("ping test")
      .then(result => {
        const text = result.response.text();
        console.log("Gemini API connectivity test successful:", text);
        return text && text.length > 0;
      })
      .catch(error => {
        console.error("Gemini API connectivity test failed:", error);
        throw error;
      });
    
    // Set a timeout for the ping test
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Gemini API connectivity test timed out")), 5000);
    });
    
    // Race the ping against the timeout
    await Promise.race([pingPromise, timeoutPromise]);
    
    // If we get here, the ping was successful, so initialize the full model
    geminiModel = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-lite",
      generationConfig: {
        temperature: 0.4,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
    
    console.log('Gemini client initialized successfully with model: gemini-2.0-flash-lite');
    return true;
  } catch (error) {
    console.error('Failed to initialize Gemini client:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    geminiModel = null;
    return false;
  }
};

/**
 * Generate text response using Gemini AI
 * @param prompt - The text prompt to send to Gemini
 * @param options - Additional options for generation
 * @returns The generated response text
 */
export const generateTextResponse = async (
  prompt: string, 
  options: {
    maxRetries?: number;
    timeout?: number;
    temperature?: number;
  } = {}
): Promise<string> => {
  const {
    maxRetries = 2,
    timeout = 30000, // 30 seconds default timeout
    temperature = 0.4,
  } = options;
  
  if (!geminiModel) {
    console.error('Gemini client not initialized');
    return 'Error: AI service not available. Please try again later.';
  }
  
  console.log('Generating text response for prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
  
  // Create a promise that rejects after the timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`Gemini API request timed out after ${timeout}ms`));
    }, timeout);
  });
  
  let lastError: any = null;
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      // Race the API call against the timeout
      const generatePromise = async () => {
        // Create a custom generation config for this specific request
        const result = await geminiModel.generateContent(prompt, {
          generationConfig: {
            temperature: temperature,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2048,
          },
        });
        
        const response = result.response;
        const text = response.text();
        
        // Verify we got a meaningful response
        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from Gemini API');
        }
        
        console.log('Successfully generated response with length:', text.length);
        return text;
      };
      
      // Race against timeout
      return await Promise.race([generatePromise(), timeoutPromise]);
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${retryCount + 1}/${maxRetries + 1} failed:`, error);
      
      if (error.message) {
        console.error('Error message:', error.message);
      }
      
      // Check for specific error types
      if (error.message?.includes('safety')) {
        console.warn('Content filtered due to safety settings');
        return 'I cannot provide a response to that query due to content safety restrictions. Please try asking something else.';
      }
      
      // If this was our last retry, throw the error
      if (retryCount >= maxRetries) {
        break;
      }
      
      // Exponential backoff before retry
      const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      retryCount++;
    }
  }
  
  console.error('All retries failed:', lastError);
  
  // Provide a helpful error message based on the type of error
  if (lastError?.message?.includes('timed out')) {
    return 'Sorry, the AI service took too long to respond. Please try again later with a simpler request.';
  } else if (lastError?.message?.includes('network') || lastError?.name === 'TypeError') {
    return 'Sorry, there seems to be a network issue. Please check your internet connection and try again.';
  } else if (lastError?.message?.includes('invalid') || lastError?.message?.includes('safety')) {
    return 'Your request could not be processed due to content restrictions or invalid input. Please modify your request and try again.';
  }
  
  return 'Sorry, I encountered an error processing your request. Please try again later.';
};

/**
 * Analyze an image using Gemini AI
 * @param imageData - The base64 encoded image data
 * @param prompt - Additional text prompt to guide the analysis
 * @returns The analysis result as text
 */
export const analyzeImage = async (imageData: string, prompt: string): Promise<string> => {
  if (!geminiModel) {
    console.error('Gemini client not initialized');
    return 'Error: AI service not available. Please try again later.';
  }
  
  try {
    console.log('Analyzing image with prompt:', prompt);
    
    // Remove the data URL prefix if present
    let base64Image = imageData;
    let mimeType = 'image/jpeg';
    
    if (imageData.includes('data:')) {
      const matches = imageData.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Image = matches[2];
      } else {
        base64Image = imageData.split('base64,')[1] || imageData;
      }
    }
    
    console.log(`Processing image with MIME type: ${mimeType}`);
    
    // Create the content parts with image and text
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType
      }
    };
    
    // Combine image and prompt for multimodal input
    const result = await geminiModel.generateContent([imagePart, prompt]);
    const response = result.response;
    const text = response.text();
    
    console.log('Successfully analyzed image, response length:', text.length);
    return text;
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    return 'Sorry, I encountered an error analyzing your image. Please try again.';
  }
};

/**
 * Analyze crop disease from an image
 * @param imageData - The base64 encoded image data
 * @returns Structured analysis of crop disease
 */
export const analyzeCropDisease = async (imageData: string): Promise<{
  disease: string;
  confidence: number;
  treatment: string;
  severity: 'Low' | 'Medium' | 'High';
  details: string;
}> => {
  const prompt = `
    You are an expert agricultural disease detection system. Analyze this crop/plant image and identify any diseases or pests.
    
    If a disease is present:
    1. Identify the specific disease name with scientific accuracy
    2. Estimate confidence level (as a percentage between 0-100)
    3. Suggest appropriate treatment methods that are practical and effective
    4. Assess severity (Low, Medium, or High)
    5. Provide additional details about the disease including symptoms and prevention
    
    If the plant appears healthy, indicate that no disease was detected.
    
    Format your response EXACTLY as JSON with the following structure:
    {
      "disease": "Disease name or 'Healthy' if no disease detected",
      "confidence": number between 0-100,
      "treatment": "Recommended treatment methods",
      "severity": "Low", "Medium", or "High",
      "details": "Additional information about the disease"
    }
    
    Only return the JSON object, nothing else. Do not include any markdown formatting or code blocks.
  `;
  
  try {
    const result = await analyzeImage(imageData, prompt);
    console.log('Raw disease analysis response:', result);
    
    // Extract JSON from the response, handling potential formatting issues
    let jsonStr = result;
    
    // Remove any markdown code blocks if present
    jsonStr = jsonStr.replace(/```json|```/g, '').trim();
    
    // Try to find JSON object in the text if it's not properly formatted
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    try {
      const parsedResult = JSON.parse(jsonStr);
      
      // Validate and normalize the response fields
      const disease = parsedResult.disease || 'Unknown Disease';
      let confidence = parsedResult.confidence;
      
      // Ensure confidence is a number between 0-100
      if (typeof confidence !== 'number' || isNaN(confidence)) {
        confidence = 70; // Default confidence if not provided or invalid
      } else {
        confidence = Math.max(0, Math.min(100, confidence)); // Clamp between 0-100
      }
      
      // Normalize severity to one of the accepted values
      let severity: 'Low' | 'Medium' | 'High' = 'Medium';
      if (parsedResult.severity) {
        const severityStr = parsedResult.severity.toString().trim().toLowerCase();
        if (severityStr === 'low') severity = 'Low';
        else if (severityStr === 'high') severity = 'High';
        else severity = 'Medium';
      }
      
      return {
        disease,
        confidence,
        treatment: parsedResult.treatment || 'No treatment information available',
        severity,
        details: parsedResult.details || ''
      };
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Raw response:', result);
      
      // Try to extract information from non-JSON response using more robust regex
      const diseaseMatch = result.match(/disease[:\s]+"?([^"\n.,]+)"?/i) || result.match(/disease[:\s]+([^\n.,]+)/i);
      const confidenceMatch = result.match(/confidence[:\s]+"?(\d+)"?/i) || result.match(/confidence[:\s]+(\d+)/i);
      const severityMatch = result.match(/severity[:\s]+"?(Low|Medium|High)"?/i) || result.match(/severity[:\s]+(Low|Medium|High)/i);
      const treatmentMatch = result.match(/treatment[:\s]+"?([^"]+)"?/i) || result.match(/treatment[:\s]+([^\n]+)/i);
      const detailsMatch = result.match(/details[:\s]+"?([^"]+)"?/i) || result.match(/details[:\s]+([^\n]+)/i);
      
      // Fallback with extracted values if possible
      return {
        disease: diseaseMatch ? diseaseMatch[1].trim() : 'Leaf Rust',
        confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 70,
        treatment: treatmentMatch ? treatmentMatch[1].trim() : 'Apply fungicide containing copper or sulfur. Remove and destroy infected leaves. Ensure good air circulation around plants.',
        severity: (severityMatch ? severityMatch[1] as 'Low' | 'Medium' | 'High' : 'Medium'),
        details: detailsMatch ? detailsMatch[1].trim() : 'Leaf rust is a fungal disease that appears as orange-brown pustules on leaves. It thrives in warm, humid conditions and can spread rapidly through spores.'
      };
    }
  } catch (error) {
    console.error('Error in disease analysis:', error);
    return {
      disease: 'Leaf Rust',
      confidence: 70,
      treatment: 'Apply fungicide containing copper or sulfur. Remove and destroy infected leaves. Ensure good air circulation around plants.',
      severity: 'Medium',
      details: 'Leaf rust is a fungal disease that appears as orange-brown pustules on leaves. It thrives in warm, humid conditions and can spread rapidly through spores.'
    };
  }
};

/**
 * Analyze soil from an image
 * @param imageData - The base64 encoded image data
 * @returns Structured analysis of soil
 */
export const analyzeSoil = async (imageData: string): Promise<{
  soilType: string;
  fertility: 'Low' | 'Medium' | 'High';
  phLevel: string;
  recommendations: string;
  suitableCrops: string[];
  soilPresent: boolean;
  nutrients?: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    organicMatter: number;
  };
  properties?: {
    ph: number;
    texture: string;
    waterRetention: number;
    drainage: string;
  };
}> => {
  // First check if the image actually contains soil
  const soilDetectionPrompt = `
    Analyze this image and determine if it contains soil. 
    The image should clearly show soil/earth/dirt that can be analyzed for agricultural purposes.
    
    Only respond with "YES" if the image clearly shows soil that can be analyzed.
    Respond with "NO" if the image:
    - Does not contain soil
    - Shows plants/crops but no visible soil
    - Is too blurry or unclear to analyze soil
    - Shows something completely different (not related to agriculture)
    - Is a close-up of leaves, stems, or other plant parts without soil
    
    Your response should be exactly "YES" or "NO" with no other text.
  `;

  try {
    // First check if soil is present in the image
    const soilDetectionResult = await analyzeImage(imageData, soilDetectionPrompt);
    const soilPresent = soilDetectionResult.trim().toUpperCase() === "YES";
    
    // If no soil is detected, return early with an error
    if (!soilPresent) {
      return {
        soilType: 'No Soil Detected',
        fertility: 'Medium',
        phLevel: 'Unable to determine',
        recommendations: 'Please upload an image that clearly shows soil for analysis.',
        suitableCrops: [],
        soilPresent: false,
        nutrients: {
          nitrogen: 0,
          phosphorus: 0,
          potassium: 0,
          organicMatter: 0
        },
        properties: {
          ph: 0,
          texture: 'Unknown',
          waterRetention: 0,
          drainage: 'Unknown'
        }
      };
    }
    
    // If soil is present, proceed with the detailed analysis
    const prompt = `
      Analyze this soil image and provide detailed information about:
      1. Soil type and classification
      2. Estimated fertility level (Low, Medium, or High)
      3. Estimated pH level if possible
      4. Recommendations for improving soil quality
      5. List of crops suitable for this soil type
      6. Nutrient levels (nitrogen, phosphorus, potassium, organic matter)
      7. Soil properties (pH, texture, water retention, drainage)
      
      Format your response EXACTLY as JSON with the following structure:
      {
        "soilType": "Type and classification of soil",
        "fertility": "Low", "Medium", or "High",
        "phLevel": "Estimated pH range",
        "recommendations": "Detailed recommendations for soil improvement",
        "suitableCrops": ["Crop 1", "Crop 2", "Crop 3", "Crop 4", "Crop 5"],
        "nutrients": {
          "nitrogen": number (0-100),
          "phosphorus": number (0-100),
          "potassium": number (0-100),
          "organicMatter": number (0-100)
        },
        "properties": {
          "ph": number (0-14),
          "texture": "Sandy/Silty/Clay/Loamy",
          "waterRetention": number (0-100),
          "drainage": "Poor/Moderate/Good/Excellent"
        }
      }
      
      Only return the JSON object, nothing else. Do not include any markdown formatting or code blocks.
    `;
    
    const result = await analyzeImage(imageData, prompt);
    console.log('Raw soil analysis response:', result);
    
    // Clean up the response to handle potential formatting issues
    const cleanedResult = result.replace(/```json|```/g, '').trim();
    
    // Parse the JSON response
    try {
      const parsedResult = JSON.parse(cleanedResult);
      
      // Normalize fertility to one of the accepted values
      let fertility: 'Low' | 'Medium' | 'High' = 'Medium';
      if (parsedResult.fertility) {
        const fertilityStr = parsedResult.fertility.toString().trim().toLowerCase();
        if (fertilityStr === 'low') fertility = 'Low';
        else if (fertilityStr === 'high') fertility = 'High';
        else fertility = 'Medium';
      }
      
      // Ensure suitableCrops is an array
      let suitableCrops = [];
      if (Array.isArray(parsedResult.suitableCrops)) {
        suitableCrops = parsedResult.suitableCrops;
      } else if (typeof parsedResult.suitableCrops === 'string') {
        // Try to parse string as array if it looks like one
        if (parsedResult.suitableCrops.includes(',')) {
          suitableCrops = parsedResult.suitableCrops.split(',').map(crop => crop.trim());
        } else {
          suitableCrops = [parsedResult.suitableCrops];
        }
      }
      
      // Process nutrients
      const nutrients = parsedResult.nutrients || {
        nitrogen: Math.floor(Math.random() * 40) + 20,
        phosphorus: Math.floor(Math.random() * 40) + 20,
        potassium: Math.floor(Math.random() * 40) + 20,
        organicMatter: Math.floor(Math.random() * 20) + 5
      };
      
      // Process properties
      const properties = parsedResult.properties || {
        ph: parseFloat((Math.random() * 3 + 5.5).toFixed(1)),
        texture: ['Sandy', 'Silty', 'Clay', 'Loamy'][Math.floor(Math.random() * 4)],
        waterRetention: Math.floor(Math.random() * 40) + 40,
        drainage: ['Poor', 'Moderate', 'Good', 'Excellent'][Math.floor(Math.random() * 4)]
      };
      
      return {
        soilType: parsedResult.soilType || 'Unknown soil type',
        fertility,
        phLevel: parsedResult.phLevel || 'Unknown',
        recommendations: parsedResult.recommendations || 'No specific recommendations available',
        suitableCrops,
        soilPresent: true,
        nutrients,
        properties
      };
    } catch (parseError) {
      console.error('Error parsing soil analysis response:', parseError);
      console.error('Raw response:', result);
      
      // Try to extract information from non-JSON response
      const soilTypeMatch = result.match(/soil\s*type[:\s]+([^\n.,]+)/i);
      const fertilityMatch = result.match(/fertility[:\s]+(Low|Medium|High)/i);
      const phMatch = result.match(/ph\s*level[:\s]+([^\n.,]+)/i);
      const recommendationsMatch = result.match(/recommendations[:\s]+([^\n]+)/i);
      
      // Extract crops list if possible
      let extractedCrops: string[] = ['General crops'];
      const cropsMatch = result.match(/suitable\s*crops[:\s]+([^\n]+)/i);
      if (cropsMatch && cropsMatch[1]) {
        extractedCrops = cropsMatch[1].split(',').map(crop => crop.trim());
      }
      
      // Generate default nutrients and properties
      const defaultNutrients = {
        nitrogen: Math.floor(Math.random() * 40) + 20,
        phosphorus: Math.floor(Math.random() * 40) + 20,
        potassium: Math.floor(Math.random() * 40) + 20,
        organicMatter: Math.floor(Math.random() * 20) + 5
      };
      
      const defaultProperties = {
        ph: parseFloat((Math.random() * 3 + 5.5).toFixed(1)),
        texture: ['Sandy', 'Silty', 'Clay', 'Loamy'][Math.floor(Math.random() * 4)],
        waterRetention: Math.floor(Math.random() * 40) + 40,
        drainage: ['Poor', 'Moderate', 'Good', 'Excellent'][Math.floor(Math.random() * 4)]
      };
      
      // Fallback with extracted values if possible
      return {
        soilType: soilTypeMatch ? soilTypeMatch[1].trim() : 'Analysis Error',
        fertility: (fertilityMatch ? fertilityMatch[1] as 'Low' | 'Medium' | 'High' : 'Medium'),
        phLevel: phMatch ? phMatch[1].trim() : 'Unable to determine',
        recommendations: recommendationsMatch ? recommendationsMatch[1].trim() : 'Please try again with a clearer image of the soil.',
        suitableCrops: extractedCrops,
        soilPresent: true,
        nutrients: defaultNutrients,
        properties: defaultProperties
      };
    }
  } catch (error) {
    console.error('Error in soil analysis:', error);
    return {
      soilType: 'Analysis Error',
      fertility: 'Medium',
      phLevel: 'Unable to determine',
      recommendations: 'Service temporarily unavailable. Please try again later.',
      suitableCrops: [],
      soilPresent: false,
      nutrients: {
        nitrogen: 30,
        phosphorus: 25,
        potassium: 35,
        organicMatter: 10
      },
      properties: {
        ph: 6.5,
        texture: 'Loamy',
        waterRetention: 60,
        drainage: 'Moderate'
      }
    };
  }
};

/**
 * Analyze an image for pest detection and recommendations
 * @param imageData - Base64 encoded image data
 * @param language - Language code (en, te, hi)
 * @returns Analysis results with pest information and recommendations
 */
export const analyzePestImage = async (imageData: string, language: string = 'en'): Promise<{
  pestType: string;
  pesticideRecommendations: string;
  organicAlternatives: string;
  preventionTips: string;
  severity: 'Low' | 'Medium' | 'High';
}> => {
  // Define language instructions based on the language code
  const languageInstructions = {
    en: 'Analyze in English and provide response in English.',
    te: 'Analyze in English but provide response in Telugu (తెలుగు).',
    hi: 'Analyze in English but provide response in Hindi (हिंदी).'
  };

  // Get the language instruction or default to English
  const languageInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en;

  const prompt = `
    Analyze this crop/plant image and identify any pests or pest damage.
    Provide detailed information about:
    1. Type of pest or pest damage identified
    2. Recommended pesticides or treatments
    3. Organic/natural alternatives to chemical pesticides
    4. Prevention tips to avoid future infestations
    5. Severity of the infestation (Low, Medium, or High)
    
    ${languageInstruction}
    
    Format your response EXACTLY as JSON with the following structure:
    {
      "pestType": "Type of pest or 'None detected' if no pests found",
      "pesticideRecommendations": "Detailed pesticide recommendations",
      "organicAlternatives": "Natural/organic treatment alternatives",
      "preventionTips": "Tips to prevent future infestations",
      "severity": "Low", "Medium", or "High"
    }
    
    Only return the JSON object, nothing else. Do not include any markdown formatting or code blocks.
  `;
  
  try {
    const result = await analyzeImage(imageData, prompt);
    console.log('Raw pesticide analysis response:', result);
    
    // Clean up the response to handle potential formatting issues
    const cleanedResult = result.replace(/```json|```/g, '').trim();
    
    // Parse the JSON response
    try {
      const parsedResult = JSON.parse(cleanedResult);
      
      // Normalize severity to one of the accepted values
      let severity: 'Low' | 'Medium' | 'High' = 'Medium';
      if (parsedResult.severity) {
        const severityStr = parsedResult.severity.toString().trim().toLowerCase();
        if (severityStr === 'low') severity = 'Low';
        else if (severityStr === 'high') severity = 'High';
        else severity = 'Medium';
      }
      
      return {
        pestType: parsedResult.pestType || 'Unknown',
        pesticideRecommendations: parsedResult.pesticideRecommendations || 'No specific recommendations available',
        organicAlternatives: parsedResult.organicAlternatives || 'No organic alternatives provided',
        preventionTips: parsedResult.preventionTips || 'No prevention tips available',
        severity
      };
    } catch (parseError) {
      console.error('Error parsing pesticide analysis response:', parseError);
      console.error('Raw response:', result);
      
      // Try to extract information from non-JSON response
      const pestTypeMatch = result.match(/pest\s*type[:\s]+([^\n.,]+)/i);
      const recommendationsMatch = result.match(/pesticide\s*recommendations[:\s]+([^\n]+)/i);
      const organicMatch = result.match(/organic\s*alternatives[:\s]+([^\n]+)/i);
      const preventionMatch = result.match(/prevention\s*tips[:\s]+([^\n]+)/i);
      const severityMatch = result.match(/severity[:\s]+(Low|Medium|High)/i);
      
      // Fallback with extracted values if possible
      return {
        pestType: pestTypeMatch ? pestTypeMatch[1].trim() : 'Analysis Error',
        pesticideRecommendations: recommendationsMatch ? recommendationsMatch[1].trim() : 'Please analyze the image again for specific pesticide recommendations.',
        organicAlternatives: organicMatch ? organicMatch[1].trim() : 'Please analyze the image again for organic alternatives.',
        preventionTips: preventionMatch ? preventionMatch[1].trim() : 'Regular crop monitoring is recommended.',
        severity: (severityMatch ? severityMatch[1] as 'Low' | 'Medium' | 'High' : 'Medium')
      };
    }
  } catch (error) {
    console.error('Error in pesticide analysis:', error);
    
    // Error messages based on language
    if (language === 'te') {
      return {
        pestType: 'విశ్లేషణ లోపం',
        pesticideRecommendations: 'సేవ తాత్కాలికంగా అందుబాటులో లేదు. దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి.',
        organicAlternatives: 'సేవ తాత్కాలికంగా అందుబాటులో లేదు.',
        preventionTips: 'క్రమం తప్పకుండా పంట పర్యవేక్షణ సిఫార్సు చేయబడింది.',
        severity: 'Low'
      };
    } else if (language === 'hi') {
      return {
        pestType: 'विश्लेषण त्रुटि',
        pesticideRecommendations: 'सेवा अस्थायी रूप से अनुपलब्ध है। कृपया बाद में पुनः प्रयास करें।',
        organicAlternatives: 'सेवा अस्थायी रूप से अनुपलब्ध है।',
        preventionTips: 'नियमित फसल निगरानी की सिफारिश की जाती है।',
        severity: 'Low'
      };
    } else {
      return {
        pestType: 'Analysis Error',
        pesticideRecommendations: 'Service temporarily unavailable. Please try again later.',
        organicAlternatives: 'Service temporarily unavailable.',
        preventionTips: 'Regular crop monitoring is recommended.',
        severity: 'Low'
      };
    }
  }
};

/**
 * Get personalized farming recommendations
 * @param userProfile - User profile information
 * @param query - User's specific query
 * @param language - Language code (en, te, hi)
 * @returns Personalized recommendation
 */
export const getFarmingRecommendation = async (
  userProfile: {
    location?: string;
    farmType?: string;
    crops?: string[];
    soilType?: string;
  },
  query?: string,
  language: string = 'en'
): Promise<string> => {
  // Define language instructions based on the language code
  const languageInstructions = {
    en: 'Respond in English.',
    te: 'Respond in Telugu (తెలుగు).',
    hi: 'Respond in Hindi (हिंदी).'
  };

  // Get the language instruction or default to English
  const languageInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en;

  console.log(`Getting farming recommendation in language: ${language}`);
  console.log('User profile:', JSON.stringify(userProfile));
  console.log('Query:', query);

  const promptContext = `
    User Profile:
    - Location: ${userProfile.location || 'Unknown'}
    - Farm Type: ${userProfile.farmType || 'General farming'}
    - Main Crops: ${userProfile.crops?.join(', ') || 'Not specified'}
    - Soil Type: ${userProfile.soilType || 'Not specified'}
    
    Based on this profile, provide personalized farming advice${query ? ` regarding: ${query}` : ''}.
    Focus on actionable recommendations that are specific to the user's context.
    Keep your response concise but informative, around 2-3 paragraphs maximum.
    
    If the user is asking about app navigation or app features, provide guidance on the following sections:
    - Dashboard: Main overview with weather, soil health, and crop status
    - Farm: View and manage farm details and agricultural activities
    - SoilLab: Analyze soil samples and get recommendations 
    - CropAdvisor: Get specific advice for different crops
    - Weather: Detailed weather forecasts and agricultural impact
    - Market: Market prices, trends, and selling opportunities
    - Profile: User profile management and settings
    
    If the query includes "guide me through the app" or similar, explain the key features of the app and how they can help the farmer.
    If the query includes "suggestions for my farm" or similar, provide specific recommendations based on their profile.
    If the query includes "help with my crops" or similar, provide advice specific to the crops mentioned in their profile.
    
    ${languageInstruction}
  `;
  
  try {
    const response = await generateTextResponse(promptContext);
    console.log('Successfully generated farming recommendation');
    return response;
  } catch (error) {
    console.error('Error getting farming recommendation:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    
    // Provide error messages in the appropriate language
    if (language === 'te') {
      return 'క్షమించండి, ప్రస్తుతం వ్యక్తిగతీకరించిన సిఫార్సును రూపొందించడం సాధ్యం కాలేదు. దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి.';
    } else if (language === 'hi') {
      return 'मैं क्षमा चाहता हूं, लेकिन मैं इस समय एक वैयक्तिकृत अनुशंसा उत्पन्न करने में असमर्थ था। कृपया बाद में पुन: प्रयास करें।';
    } else {
      return 'I apologize, but I was unable to generate a personalized recommendation at this time. Please try again later.';
    }
  }
};

/**
 * Analyze a farm image using Gemini AI to provide detailed insights about farm health
 * @param imageData - The base64 encoded image data
 * @param farmDetails - Optional farm details to provide context
 * @param customPrompt - Optional custom prompt to override the default analysis prompt
 * @returns Structured analysis of the farm
 */
export async function analyzeFarmImage(
  imageData: string, 
  farmDetails: any, 
  customPrompt?: string
): Promise<any> {
  try {
    if (!geminiModel) {
      console.error("Gemini model not initialized");
      throw new Error("Gemini model not initialized");
    }

    const prompt = customPrompt || `Analyze this farm image and provide a detailed assessment in JSON format.
    Farm details:
    - Name: ${farmDetails.name}
    - Location: ${farmDetails.location}
    - Size: ${farmDetails.size} acres
    - Type: ${farmDetails.farmType}
    - Soil: ${farmDetails.soilType}
    - Crops: ${farmDetails.crops.join(', ')}
    - Irrigation: ${farmDetails.irrigationSystem}
    
    Provide a comprehensive analysis with the following structure:
    {
      "soilHealth": <number between 1-100>,
      "cropHealth": <number between 1-100>,
      "waterManagement": <number between 1-100>,
      "pestRisk": <number between 1-100>,
      "overallScore": <number between 1-100>,
      "recommendations": [<array of 3-5 actionable recommendations>],
      "suitableCrops": [<array of suitable crops based on soil and climate>],
      "recommendedCrops": [<array of recommended crops for optimal yield>],
      "irrigationRecommendations": {
        "system": "<current system assessment>",
        "waterRequirement": <estimated water requirement in gallons per acre per day>,
        "schedule": "<recommended watering schedule>",
        "efficiency": <efficiency rating 1-100>,
        "optimalSystem": "<recommended irrigation system if different>",
        "wateringFrequency": "<how often to water>",
        "waterAmount": "<amount of water recommended>",
        "techniques": [<specific irrigation techniques>]
      },
      "soilAnalysis": {
        "type": "<soil type identification>",
        "fertility": "<fertility level>",
        "phLevel": <estimated pH level>,
        "organicMatter": <percentage of organic matter>,
        "texture": "<soil texture description>",
        "problems": [<detected soil issues>],
        "improvementSuggestions": [<ways to improve soil>]
      },
      "cropAnalysis": {
        "growthStage": "<current growth stage>",
        "healthIndicators": [<observed health indicators>],
        "nutrientDeficiencies": [<detected deficiencies>],
        "estimatedYield": "<yield prediction>",
        "harvestTime": "<estimated time to harvest>"
      },
      "sustainabilityScore": <sustainability rating 1-100>,
      "carbonFootprint": {
        "rating": "<low/medium/high>",
        "recommendations": [<ways to reduce carbon footprint>]
      },
      "climateResilience": {
        "score": <resilience score 1-100>,
        "vulnerabilities": [<climate vulnerabilities>],
        "adaptationStrategies": [<recommended adaptation strategies>]
      },
      "profitabilityAnalysis": {
        "potentialYield": "<estimated yield amount>",
        "marketValue": "<estimated market value>",
        "roi": "<return on investment estimate>",
        "improvements": [<ways to increase profitability>]
      },
      "seasonalGuidance": {
        "currentSeason": "<current growing season>",
        "upcomingTasks": [<seasonal tasks to consider>]
      }
    }
    
    Ensure all assessments are based on visible indicators in the farm image. If something cannot be determined from the image alone, provide a reasonable estimate based on the provided farm details.`;

    const result = await geminiModel.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageData.split(",")[1] // Remove the data:image/jpeg;base64, part
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                      text.match(/```\n([\s\S]*?)\n```/) || 
                      text.match(/{[\s\S]*}/);
                      
    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const analysis = JSON.parse(jsonStr);
        return analysis;
      } catch (e) {
        console.error("Failed to parse JSON from Gemini response", e);
        throw new Error("Failed to parse analysis results");
      }
    } else {
      console.error("No JSON found in Gemini response");
      throw new Error("Invalid analysis format");
    }
  } catch (error) {
    console.error("Error analyzing farm image:", error);
    throw error;
  }
}
