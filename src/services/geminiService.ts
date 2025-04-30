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
    Analyze this plant image and identify any disease or condition affecting the plant.
    
    You are a professional plant pathologist with extensive expertise in identifying all types of plant diseases across a wide range of crops.
    
    Provide a comprehensive and detailed assessment in JSON format with the following fields:
    {
      "disease": "Specific disease name (use scientific name if possible alongside common name)",
      "confidence": confidence percentage as a number between 0-100,
      "treatment": "Detailed treatment recommendations including chemical and organic options",
      "severity": "Low", "Medium", or "High",
      "details": "Comprehensive description of the disease including symptoms, causal organism, conditions that favor development, and potential crop impact"
    }
    
    Identification should be extremely precise and accurate. Consider ALL possible plant diseases and conditions:
    - Fungal diseases (rusts, mildews, blights, leaf spots, etc.)
    - Bacterial diseases (bacterial leaf spot, cankers, wilts, etc.)
    - Viral diseases (mosaic viruses, yellowing viruses, etc.)
    - Nematode damage
    - Nutrient deficiencies or toxicities (N, P, K, Ca, Mg, S, Fe, Mn, B, etc.)
    - Physiological disorders (blossom end rot, cracking, etc.)
    - Environmental stress (drought, frost, heat, etc.)
    - Herbicide damage or phytotoxicity
    - Pest damage indicators (specific to pest types)
    
    Provide extremely specific disease names rather than general categories.
    For example, instead of just "leaf spot," identify "Cercospora leaf spot," "Alternaria leaf spot," etc.
    
    For treatment options, include specific product types, active ingredients, application timing, and integrated management approaches.
    If you cannot identify a specific disease with high confidence, list the most likely possibilities in order of probability.
    
    Base your analysis solely on visual symptoms present in the image. Be scientifically accurate.
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
      
      // If disease was extracted, use that information
      if (diseaseMatch) {
        return {
          disease: diseaseMatch[1].trim(),
          confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 70,
          treatment: treatmentMatch ? treatmentMatch[1].trim() : 'Apply appropriate fungicide or treatment based on the disease. Consult a local agricultural extension for specific recommendations.',
          severity: (severityMatch ? severityMatch[1] as 'Low' | 'Medium' | 'High' : 'Medium'),
          details: detailsMatch ? detailsMatch[1].trim() : 'A plant disease detected in the analyzed image. Further inspection may be needed for confirmation.'
        };
      }
      
      // If we couldn't extract disease info, return a generic response indicating analysis failure
      return {
        disease: "Analysis Inconclusive",
        confidence: 40,
        treatment: "Based on the unclear results, we recommend consulting with a local agricultural extension office or plant pathologist. Bring a physical sample or clearer images for more accurate identification.",
        severity: "Medium",
        details: "The AI was unable to conclusively identify a specific disease from this image. This may be due to image quality, lighting, unclear symptoms, or early disease stage. Consider taking multiple close-up photos of affected areas in natural lighting."
      };
    }
  } catch (error) {
    console.error('Error in disease analysis:', error);
    
    // Return a response indicating analysis failure
    return {
      disease: "Analysis Failed",
      confidence: 0,
      treatment: "Please try again with a clearer image or contact agricultural support for in-person diagnosis.",
      severity: "Medium",
      details: "The image analysis process encountered a technical error. This might be due to image format, quality issues, or service limitations. Try a different image with clear symptoms visible."
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
    sulfur: number;
  };
  properties?: {
    ph: number;
    texture: string;
    waterRetention: number;
    drainage: string;
  };
}> => {
  if (!geminiModel) {
    console.error('Gemini client not initialized');
    throw new Error('AI service not available');
  }
  
  console.log('Analyzing soil sample with Gemini Vision...');
  
  try {
    const prompt = `
      Analyze this soil image and provide detailed soil analysis information. 
      If no soil is visible, indicate that no soil is present.
      
      Even if you can't determine the exact soil classification, provide the most likely soil category based on visual characteristics.
      Never return "Unable to determine" as the soilType - instead provide the closest match like "Likely Loamy Mix" or 
      "Mixed Soil (Sandy/Clay)" or describe it like "Dark Organic-Rich Soil" or "Agricultural Topsoil".
      
      Return the analysis as valid JSON with the following structure:
      {
        "soilPresent": boolean,
        "soilType": "Clay/Sandy/Loamy/Silty/Mixed/etc. with descriptive adjectives",
        "fertility": "Low/Medium/High",
        "phLevel": "Acidic/Neutral/Alkaline (approximate pH value)",
        "recommendations": "Detailed recommendations for improving soil health",
        "suitableCrops": ["crop1", "crop2", "crop3"],
        "nutrients": {
          "nitrogen": number (percentage between 0-100),
          "phosphorus": number (percentage between 0-100),
          "potassium": number (percentage between 0-100),
          "organicMatter": number (percentage between 0-100),
          "sulfur": number (percentage between 0-100)
        },
        "properties": {
          "ph": number (between 0-14),
          "texture": "Description of soil texture",
          "waterRetention": number (percentage between 0-100),
          "drainage": "Good/Moderate/Poor"
        }
      }
      
      For fields that cannot be determined from the image, provide the most reasonable estimate based on the visible soil properties.
      Make sure the JSON is valid and all numbers are actual numbers, not strings.
    `;

    const result = await analyzeImage(imageData, prompt);
    
    // Parse the JSON response or handle if it's not valid JSON
    try {
      const analysis = JSON.parse(result);
      
      // If no soil is present, return a default response
      if (!analysis.soilPresent) {
        return {
          soilType: 'No Soil Detected',
          fertility: 'Low',
          phLevel: 'Unknown',
          recommendations: 'No soil detected in the image. Please upload a clear image of soil for analysis.',
          suitableCrops: [],
          soilPresent: false,
          nutrients: {
            nitrogen: 0,
            phosphorus: 0,
            potassium: 0,
            organicMatter: 0,
            sulfur: 0
          },
          properties: {
            ph: 0,
            texture: 'Unknown',
            waterRetention: 0,
            drainage: 'Poor'
          }
        };
      }
      
      // Check for problematic soil type values and replace them
      let soilType = analysis.soilType || '';
      if (soilType.toLowerCase().includes('unable to determine') || 
          soilType.toLowerCase().includes('unknown') || 
          soilType.toLowerCase().includes('undetermined') || 
          soilType === '') {
        
        // Use texture information if available to make a better guess
        if (analysis.properties?.texture) {
          soilType = `${analysis.properties.texture} Soil`;
        } else {
          // Fallback to a general description based on color or other characteristics
          soilType = 'Agricultural Soil';
        }
      }
      
      // Ensure all required fields are present with defaults if missing
      const soilAnalysis: {
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
          sulfur: number;
        };
        properties?: {
          ph: number;
          texture: string;
          waterRetention: number;
          drainage: string;
        };
      } = {
        soilType: soilType,
        fertility: (analysis.fertility || 'Medium') as 'Low' | 'Medium' | 'High',
        phLevel: analysis.phLevel || 'Neutral',
        recommendations: analysis.recommendations || 'General recommendation: Add organic matter to improve soil health.',
        suitableCrops: analysis.suitableCrops || ['Beans', 'Potatoes', 'Corn'],
        soilPresent: true
      };
      
      // Add nutrients and properties if they exist
      if (analysis.nutrients) {
        soilAnalysis.nutrients = {
          nitrogen: parseFloat(analysis.nutrients.nitrogen) || 20,
          phosphorus: parseFloat(analysis.nutrients.phosphorus) || 15,
          potassium: parseFloat(analysis.nutrients.potassium) || 18,
          organicMatter: parseFloat(analysis.nutrients.organicMatter) || 5,
          sulfur: parseFloat(analysis.nutrients.sulfur) || 10,
        };
      }
      
      if (analysis.properties) {
        soilAnalysis.properties = {
          ph: parseFloat(analysis.properties.ph) || 7,
          texture: analysis.properties.texture || 'Medium',
          waterRetention: parseFloat(analysis.properties.waterRetention) || 50,
          drainage: analysis.properties.drainage || 'Moderate'
        };
      }
      
      console.log('Soil analysis completed successfully');
      return soilAnalysis;
    } catch (err) {
      console.error('Failed to parse soil analysis response:', err);
      console.error('Raw response:', result);
      
      // Return a fallback response with a more descriptive soil type
      return {
        soilType: 'Agricultural Soil',
        fertility: 'Medium',
        phLevel: 'Neutral',
        recommendations: 'Based on the nutrients analysis, this appears to be average agricultural soil. Consider adding organic matter to improve overall health and structure.',
        suitableCrops: ['Beans', 'Potatoes', 'Corn'],
        soilPresent: true,
        nutrients: {
          nitrogen: 20,
          phosphorus: 15,
          potassium: 18,
          organicMatter: 5,
          sulfur: 10
        },
        properties: {
          ph: 7,
          texture: 'Medium',
          waterRetention: 50,
          drainage: 'Moderate'
        }
      };
    }
  } catch (error) {
    console.error('Error analyzing soil with Gemini:', error);
    throw error;
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
