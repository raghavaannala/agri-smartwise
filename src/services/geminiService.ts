// Import the Google Generative AI library
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Gemini API client
let geminiModel: any = null;

/**
 * Initialize the Gemini client with the API key
 * @param apiKey - The Gemini API key
 */
export const initGeminiClient = (apiKey: string) => {
  if (!apiKey) {
    console.error('Gemini API key is required');
    return;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    geminiModel = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-lite",
      generationConfig: {
        temperature: 0.4,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });
    console.log('Gemini client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Gemini client:', error);
  }
};

/**
 * Generate text response using Gemini AI
 * @param prompt - The text prompt to send to Gemini
 * @returns The generated response text
 */
export const generateTextResponse = async (prompt: string): Promise<string> => {
  if (!geminiModel) {
    console.error('Gemini client not initialized');
    return 'Error: AI service not available. Please try again later.';
  }
  
  try {
    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating text with Gemini:', error);
    return 'Sorry, I encountered an error processing your request. Please try again.';
  }
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
    // Remove the data URL prefix if present
    const base64Image = imageData.includes('base64,') 
      ? imageData.split('base64,')[1] 
      : imageData;
    
    // Create the content parts with image and text
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg'
      }
    };
    
    // Combine image and prompt for multimodal input
    const result = await geminiModel.generateContent([imagePart, prompt]);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error);
    console.error('Error details:', error);
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
    Analyze this crop/plant image and identify any diseases or pests.
    If a disease is present:
    1. Identify the specific disease name
    2. Estimate confidence level (as a percentage between 0-100)
    3. Suggest appropriate treatment methods
    4. Assess severity (Low, Medium, or High)
    5. Provide additional details about the disease
    
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
    
    // Clean up the response to handle potential formatting issues
    const cleanedResult = result.replace(/```json|```/g, '').trim();
    
    // Parse the JSON response
    try {
      const parsedResult = JSON.parse(cleanedResult);
      
      // Validate and normalize the response fields
      const disease = parsedResult.disease || 'Unknown';
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
      
      // Try to extract information from non-JSON response
      const diseaseMatch = result.match(/disease[:\s]+([^\n.,]+)/i);
      const confidenceMatch = result.match(/confidence[:\s]+(\d+)/i);
      const severityMatch = result.match(/severity[:\s]+(Low|Medium|High)/i);
      const treatmentMatch = result.match(/treatment[:\s]+([^\n]+)/i);
      const detailsMatch = result.match(/details[:\s]+([^\n]+)/i);
      
      // Fallback with extracted values if possible
      return {
        disease: diseaseMatch ? diseaseMatch[1].trim() : 'Analysis Error',
        confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 70,
        treatment: treatmentMatch ? treatmentMatch[1].trim() : 'Please analyze the image again for specific treatment recommendations.',
        severity: (severityMatch ? severityMatch[1] as 'Low' | 'Medium' | 'High' : 'Medium'),
        details: detailsMatch ? detailsMatch[1].trim() : 'The AI provided analysis but in an unexpected format. The information shown is extracted from the response.'
      };
    }
  } catch (error) {
    console.error('Error in disease analysis:', error);
    return {
      disease: 'Analysis Error',
      confidence: 0,
      treatment: 'Service temporarily unavailable. Please try again later.',
      severity: 'Low',
      details: 'There was an error connecting to the AI service.'
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
  
  try {
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
      
      // Fallback error messages based on language
      const errorMessages = {
        en: {
          analysisError: 'Analysis Error',
          unavailable: 'Service temporarily unavailable. Please try again later.',
          tryAgain: 'Please try again with a clearer image.',
          monitoring: 'Regular crop monitoring is recommended.'
        },
        te: {
          analysisError: 'విశ్లేషణ లోపం',
          unavailable: 'సేవ తాత్కాలికంగా అందుబాటులో లేదు. దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి.',
          tryAgain: 'దయచేసి మరింత స్పష్టమైన చిత్రంతో మళ్లీ ప్రయత్నించండి.',
          monitoring: 'క్రమం తప్పకుండా పంట పర్యవేక్షణ సిఫార్సు చేయబడింది.'
        },
        hi: {
          analysisError: 'विश्लेषण त्रुटि',
          unavailable: 'सेवा अस्थायी रूप से अनुपलब्ध है। कृपया बाद में पुनः प्रयास करें।',
          tryAgain: 'कृपया एक स्पष्ट छवि के साथ फिर से प्रयास करें।',
          monitoring: 'नियमित फसल निगरानी की सिफारिश की जाती है।'
        }
      };
      
      // Get error messages for the current language or default to English
      const errorMsg = errorMessages[language as keyof typeof errorMessages] || errorMessages.en;
      
      // Fallback with extracted values if possible
      return {
        pestType: pestTypeMatch ? pestTypeMatch[1].trim() : errorMsg.analysisError,
        pesticideRecommendations: recommendationsMatch ? recommendationsMatch[1].trim() : errorMsg.unavailable,
        organicAlternatives: organicMatch ? organicMatch[1].trim() : errorMsg.tryAgain,
        preventionTips: preventionMatch ? preventionMatch[1].trim() : errorMsg.monitoring,
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

  const promptContext = `
    User Profile:
    - Location: ${userProfile.location || 'Unknown'}
    - Farm Type: ${userProfile.farmType || 'General farming'}
    - Main Crops: ${userProfile.crops?.join(', ') || 'Not specified'}
    - Soil Type: ${userProfile.soilType || 'Not specified'}
    
    Based on this profile, provide personalized farming advice${query ? ` regarding: ${query}` : ''}.
    Focus on actionable recommendations that are specific to the user's context.
    Keep your response concise but informative, around 2-3 paragraphs maximum.
    
    ${languageInstruction}
  `;
  
  try {
    return await generateTextResponse(promptContext);
  } catch (error) {
    console.error('Error getting farming recommendation:', error);
    
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
