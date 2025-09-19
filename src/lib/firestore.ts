import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  FirestoreError
} from 'firebase/firestore';
import { db } from './firebase';

// Generic type for Firestore documents
export interface FirestoreDocument {
  id: string;
  [key: string]: any;
}

// User profile interface
export interface UserProfile extends FirestoreDocument {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
  location?: string;
  farmSize?: number;
  farmType?: string;
  crops?: string[];
}

// Function to create or update a user profile
export const saveUserProfile = async (userProfile: UserProfile, retries = 2): Promise<void> => {
  try {
    // Validate required fields
    if (!userProfile.uid) {
      throw new Error('User ID is required');
    }

    const userRef = doc(db, 'users', userProfile.uid);
    
    // Create a clean copy of the profile to avoid mutation
    const profileCopy = { ...userProfile };
    
    // Ensure farmSize is a valid number or null if it's NaN
    if (profileCopy.farmSize !== undefined && isNaN(Number(profileCopy.farmSize))) {
      profileCopy.farmSize = null;
    }
    
    // Properly handle date fields
    const createdAt = profileCopy.createdAt;
    let createdAtTimestamp;
    
    if (createdAt instanceof Date) {
      createdAtTimestamp = Timestamp.fromDate(createdAt);
    } else if (createdAt && typeof createdAt === 'object' && 'seconds' in createdAt) {
      // Already a Firestore timestamp
      createdAtTimestamp = createdAt;
    } else if (createdAt) {
      // Try to convert from string or number
      try {
        createdAtTimestamp = Timestamp.fromDate(new Date(createdAt));
      } catch (e) {
        console.warn('Invalid createdAt date format, using current date', e);
        createdAtTimestamp = Timestamp.fromDate(new Date());
      }
    } else {
      // Default to now if no date provided
      createdAtTimestamp = Timestamp.fromDate(new Date());
    }
    
    // Prepare the Firestore-compatible object
    const firestoreCompatibleProfile = {
      ...profileCopy,
      // Always use server timestamp for updatedAt
      updatedAt: serverTimestamp(),
      // Use our properly formatted timestamp
      createdAt: createdAtTimestamp,
    };
    
    // Remove any undefined or invalid values
    Object.keys(firestoreCompatibleProfile).forEach(key => {
      if (firestoreCompatibleProfile[key] === undefined) {
        delete firestoreCompatibleProfile[key];
      }
    });
    
    // Log the data being saved for debugging
    console.log('Saving profile data:', firestoreCompatibleProfile);
    
    await setDoc(userRef, firestoreCompatibleProfile, { merge: true });
    console.log('Profile saved successfully');
  } catch (error: any) {
    // Provide more detailed error logging
    console.error('Error saving user profile:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Retry logic for network issues
    if (retries > 0) {
      console.log(`Retrying saveUserProfile... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return saveUserProfile(userProfile, retries - 1);
    }
    throw error;
  }
};

// Function to get a user profile
export const getUserProfile = async (userId: string, retries = 2): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      // Ensure dates are handled properly
      const createdAt = data.createdAt instanceof Date 
        ? data.createdAt 
        : new Date(data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now());
      
      const updatedAt = data.updatedAt instanceof Date 
        ? data.updatedAt 
        : new Date(data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : Date.now());
      
      return { 
        id: userSnap.id, 
        ...data, 
        createdAt,
        updatedAt
      } as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    // Retry logic for network issues
    if (retries > 0) {
      console.log(`Retrying getUserProfile... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return getUserProfile(userId, retries - 1);
    }
    throw error;
  }
};

// Soil data interface
export interface SoilData extends FirestoreDocument {
  userId: string;
  location: string;
  ph: number;
  moisture: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  temperature: number;
  createdAt: Date;
}

// Function to save soil data
export const saveSoilData = async (soilData: Omit<SoilData, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const soilRef = doc(collection(db, 'soil-data'));
    await setDoc(soilRef, {
      ...soilData,
      createdAt: new Date(),
    });
    return soilRef.id;
  } catch (error) {
    console.error('Error saving soil data:', error);
    throw error;
  }
};

// Function to get soil data for a user
export const getUserSoilData = async (userId: string): Promise<SoilData[]> => {
  try {
    const soilQuery = query(
      collection(db, 'soil-data'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    
    const soilSnap = await getDocs(soilQuery);
    const soilData: SoilData[] = [];
    
    soilSnap.forEach((doc) => {
      soilData.push({ id: doc.id, ...doc.data() } as SoilData);
    });
    
    return soilData;
  } catch (error) {
    console.error('Error getting soil data:', error);
    throw error;
  }
};

// Crop recommendation interface
export interface CropRecommendation extends FirestoreDocument {
  userId: string;
  soilId: string;
  crops: {
    name: string;
    confidence: number;
    expectedYield: number;
  }[];
  createdAt: Date;
}

// Function to save crop recommendations
export const saveCropRecommendation = async (
  recommendation: Omit<CropRecommendation, 'id' | 'createdAt'>
): Promise<string> => {
  try {
    const recRef = doc(collection(db, 'crop-recommendations'));
    await setDoc(recRef, {
      ...recommendation,
      createdAt: new Date(),
    });
    return recRef.id;
  } catch (error) {
    console.error('Error saving crop recommendation:', error);
    throw error;
  }
};

// Function to get crop recommendations for a user
export const getUserCropRecommendations = async (userId: string): Promise<CropRecommendation[]> => {
  try {
    const recQuery = query(
      collection(db, 'crop-recommendations'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    
    const recSnap = await getDocs(recQuery);
    const recommendations: CropRecommendation[] = [];
    
    recSnap.forEach((doc) => {
      recommendations.push({ id: doc.id, ...doc.data() } as CropRecommendation);
    });
    
    return recommendations;
  } catch (error) {
    console.error('Error getting crop recommendations:', error);
    throw error;
  }
};

// Irrigation plan interface
export interface IrrigationPlan extends FirestoreDocument {
  userId: string;
  farmId?: string;
  planText: string;
  title: string;
  system: string;
  waterRequirement: number;
  schedule: string;
  efficiency: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Function to save irrigation plan
export const saveIrrigationPlan = async (
  irrigationPlan: Omit<IrrigationPlan, 'id' | 'createdAt' | 'updatedAt'>,
  retries = 2
): Promise<string> => {
  try {
    // Validate required fields
    if (!irrigationPlan.userId) {
      throw new Error('User ID is required for irrigation plan');
    }
    
    if (!irrigationPlan.planText || irrigationPlan.planText.trim() === '') {
      throw new Error('Plan text is required for irrigation plan');
    }
    
    // Ensure numeric fields are actually numbers
    const cleanedPlan = {
      ...irrigationPlan,
      waterRequirement: isNaN(Number(irrigationPlan.waterRequirement)) 
        ? 0 
        : Number(irrigationPlan.waterRequirement),
      efficiency: isNaN(Number(irrigationPlan.efficiency)) 
        ? 0 
        : Number(irrigationPlan.efficiency)
    };
    
    // Create a document reference
    const planRef = doc(collection(db, 'irrigation-plans'));
    
    // Create Firestore timestamps
    const now = serverTimestamp();
    
    // Create the plan object with proper timestamps
    const firestorePlan = {
      ...cleanedPlan,
      createdAt: now,
      updatedAt: now,
    };
    
    // Log the data being saved (for debugging)
    console.log('Saving irrigation plan:', firestorePlan);
    
    // Save the document
    await setDoc(planRef, firestorePlan);
    
    console.log('Irrigation plan saved successfully with ID:', planRef.id);
    return planRef.id;
  } catch (error: any) {
    console.error('Error saving irrigation plan:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Retry logic for network issues
    if (retries > 0) {
      console.log(`Retrying saveIrrigationPlan... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return saveIrrigationPlan(irrigationPlan, retries - 1);
    }
    
    throw error;
  }
};

// Function to get irrigation plans for a user
export const getUserIrrigationPlans = async (userId: string): Promise<IrrigationPlan[]> => {
  try {
    const planQuery = query(
      collection(db, 'irrigation-plans'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const planSnap = await getDocs(planQuery);
    const plans: IrrigationPlan[] = [];
    
    planSnap.forEach((doc) => {
      plans.push({ id: doc.id, ...doc.data() } as IrrigationPlan);
    });
    
    return plans;
  } catch (error) {
    console.error('Error getting irrigation plans:', error);
    throw error;
  }
};

// Function to get active irrigation plan for a user
export const getActiveIrrigationPlan = async (userId: string): Promise<IrrigationPlan | null> => {
  try {
    const planQuery = query(
      collection(db, 'irrigation-plans'),
      where('userId', '==', userId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    
    const planSnap = await getDocs(planQuery);
    
    if (planSnap.empty) {
      return null;
    }
    
    return { id: planSnap.docs[0].id, ...planSnap.docs[0].data() } as IrrigationPlan;
  } catch (error) {
    console.error('Error getting active irrigation plan:', error);
    throw error;
  }
}; 

// Farm data interface
export interface FarmData extends FirestoreDocument {
  userId: string;
  name: string;
  location: string;
  size: number;
  farmType: string;
  soilType: string;
  crops: string[];
  irrigationSystem: string;
  lastAnalyzed?: Date;
  imageUrls: string[];
  analysis?: {
    soilHealth: number;
    cropHealth: number;
    waterManagement: number;
    pestRisk: number;
    overallScore: number;
    recommendations: string[];
    suitableCrops?: string[];
    recommendedCrops?: string[];
    irrigationRecommendations?: {
      system: string;
      waterRequirement: number;
      schedule: string;
      efficiency: number;
      optimalSystem?: string;
      wateringFrequency?: string;
      waterAmount?: string;
      techniques?: string[];
    };
    soilAnalysis?: {
      type: string;
      fertility: string;
      phLevel: number;
      organicMatter: number;
      texture: string;
      problems?: string[];
      improvementSuggestions?: string[];
    };
    cropAnalysis?: {
      growthStage: string;
      healthIndicators: string[];
      nutrientDeficiencies?: string[];
      estimatedYield?: string;
      harvestTime?: string;
    };
    sustainabilityScore?: number;
    carbonFootprint?: {
      rating: string;
      recommendations: string[];
    };
    climateResilience?: {
      score: number;
      vulnerabilities: string[];
      adaptationStrategies: string[];
    };
    profitabilityAnalysis?: {
      potentialYield: string;
      marketValue: string;
      roi: string;
      improvements: string[];
    };
    seasonalGuidance?: {
      currentSeason: string;
      upcomingTasks: string[];
    };
    detailedAnalysis?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Function to save farm data
export const saveFarmData = async (
  farmData: Omit<FarmData, 'id' | 'createdAt' | 'updatedAt'>,
  retries = 3
): Promise<string> => {
  try {
    // Validate required fields
    if (!farmData.userId) {
      throw new Error('User ID is required');
    }

    const farmsCollection = collection(db, 'farms');
    const farmDoc = doc(farmsCollection);
    
    // Prepare the Firestore-compatible object
    const firestoreCompatibleData = {
      ...farmData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // Add additional diagnostics
    console.log(`Attempting to save farm document with ID: ${farmDoc.id}`);
    console.log(`Farm data being saved:`, JSON.stringify({
      ...firestoreCompatibleData,
      userId: farmData.userId.substring(0, 5) + '...' // Truncate for privacy
    }));
    
    // Using a timeout to prevent hanging operations
    const savePromise = setDoc(farmDoc, firestoreCompatibleData);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Firestore operation timed out')), 15000)
    );
    
    await Promise.race([savePromise, timeoutPromise]);
    console.log('Farm data saved successfully with ID:', farmDoc.id);
    return farmDoc.id;
  } catch (error: any) {
    console.error('Error saving farm data:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    // More specific error handling
    if (error.code === 'permission-denied') {
      throw new Error('You do not have permission to create farms. Please check your account.');
    }
    
    if (error.code === 'unavailable' || error.message.includes('timeout') || error.code === 'deadline-exceeded') {
      console.log('Network issue detected, waiting before retry...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (retries > 0) {
      console.log(`Retrying save farm data (${retries} attempts left)...`);
      return saveFarmData(farmData, retries - 1);
    }
    
    throw error;
  }
};

// Function to update farm data
export const updateFarmData = async (
  farmId: string,
  farmData: Partial<Omit<FarmData, 'id' | 'createdAt' | 'updatedAt'>>,
  retries = 3
): Promise<void> => {
  try {
    if (!farmId) {
      throw new Error('Farm ID is required');
    }
    
    const farmRef = doc(db, 'farms', farmId);
    
    // Check if the farm exists first
    const farmDoc = await getDoc(farmRef);
    if (!farmDoc.exists()) {
      throw new Error(`Farm with ID ${farmId} does not exist`);
    }
    
    // Prepare the Firestore-compatible object
    const firestoreCompatibleData = {
      ...farmData,
      updatedAt: serverTimestamp(),
    };
    
    console.log(`Updating farm with ID: ${farmId}`);
    console.log(`Update data:`, Object.keys(farmData).join(', '));
    
    // Using a timeout to prevent hanging operations
    const updatePromise = updateDoc(farmRef, firestoreCompatibleData);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Firestore update operation timed out')), 15000)
    );
    
    await Promise.race([updatePromise, timeoutPromise]);
    console.log('Farm data updated successfully');
  } catch (error: any) {
    console.error('Error updating farm data:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    // More specific error handling
    if (error.code === 'permission-denied') {
      throw new Error('You do not have permission to update this farm.');
    }
    
    if (error.code === 'unavailable' || error.message.includes('timeout') || error.code === 'deadline-exceeded') {
      console.log('Network issue detected, waiting before retry...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (retries > 0) {
      console.log(`Retrying update farm data (${retries} attempts left)...`);
      return updateFarmData(farmId, farmData, retries - 1);
    }
    
    throw error;
  }
};

// Function to get farm data for a user
export const getUserFarms = async (userId: string, retries = 2): Promise<FarmData[]> => {
  try {
    console.log('getUserFarms called with userId:', userId);
    
    if (!userId) {
      console.error('getUserFarms: No userId provided');
      throw new Error('User ID is required');
    }

    console.log('Creating Firestore query for farms collection...');
    const farmsQuery = query(
      collection(db, 'farms'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    console.log('Executing Firestore query...');
    const farmsSnap = await getDocs(farmsQuery);
    console.log('Query executed. Number of farms found:', farmsSnap.size);
    
    const farms: FarmData[] = [];
    
    farmsSnap.forEach((doc) => {
      console.log('Processing farm document:', doc.id);
      // Convert Firestore timestamps to JavaScript Dates
      const data = doc.data();
      console.log('Raw farm data:', data);
      
      try {
        const createdAt = data.createdAt instanceof Date 
          ? data.createdAt 
          : new Date(data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now());
        
        const updatedAt = data.updatedAt instanceof Date 
          ? data.updatedAt 
          : new Date(data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : Date.now());
        
        const lastAnalyzed = data.lastAnalyzed instanceof Date
          ? data.lastAnalyzed
          : data.lastAnalyzed
          ? new Date(data.lastAnalyzed?.seconds ? data.lastAnalyzed.seconds * 1000 : Date.now())
          : null;

        const farmData = { 
          id: doc.id, 
          ...data,
          createdAt,
          updatedAt,
          lastAnalyzed
        } as FarmData;
        
        console.log('Processed farm data:', farmData);
        farms.push(farmData);
      } catch (parseError) {
        console.error('Error processing farm document:', doc.id, parseError);
      }
    });
    
    console.log('Successfully processed all farms. Returning', farms.length, 'farms');
    return farms;
  } catch (error: any) {
    console.error('Error getting farm data:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Retry logic for network issues
    if (retries > 0) {
      console.log(`Retrying getUserFarms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return getUserFarms(userId, retries - 1);
    }
    throw error;
  }
};

// Function to get a specific farm
export const getFarmById = async (farmId: string): Promise<FarmData | null> => {
  try {
    const farmRef = doc(db, 'farms', farmId);
    const farmSnap = await getDoc(farmRef);
    
    if (!farmSnap.exists()) {
      return null;
    }
    
    return { id: farmSnap.id, ...farmSnap.data() } as FarmData;
  } catch (error) {
    console.error('Error getting farm by ID:', error);
    throw error;
  }
};

// Function to analyze farm data and update analysis
export const analyzeFarmData = async (
  farmId: string,
  imageUrl?: string
): Promise<FarmData | null> => {
  try {
    // Get current farm data
    const farm = await getFarmById(farmId);
    if (!farm) {
      throw new Error('Farm not found');
    }
    
    console.log('Generating AI analysis for farm:', farmId);
    
    let aiAnalysisText = '';
    
    // If we have an image, use Gemini AI for image analysis
    if (imageUrl) {
      try {
        // Import Gemini service dynamically to avoid circular dependencies
        const { analyzeImage } = await import('../services/geminiService');
        
        const analysisPrompt = `
          Analyze this farm image and provide a realistic agricultural assessment. Consider:
          
          Farm Details:
          - Name: ${farm.name}
          - Location: ${farm.location}
          - Size: ${farm.size} hectares
          - Farm Type: ${farm.farmType}
          - Soil Type: ${farm.soilType}
          - Current Crops: ${farm.crops.join(', ')}
          - Irrigation System: ${farm.irrigationSystem}
          
          Please provide a realistic analysis covering:
          1. Soil condition assessment (visible signs)
          2. Crop health evaluation (if crops are visible)
          3. Water management observations
          4. Pest/disease risk assessment
          5. Overall farm condition
          6. Practical recommendations
          
          Be realistic and base your analysis only on what you can actually observe in the image.
          Avoid exaggerated claims or unrealistic projections.
        `;
        
        aiAnalysisText = await analyzeImage(imageUrl, analysisPrompt);
        console.log('AI image analysis completed');
      } catch (aiError) {
        console.error('AI image analysis failed:', aiError);
        aiAnalysisText = 'AI image analysis unavailable. Using basic farm data analysis.';
      }
    }
    
    // Generate realistic analysis based on farm properties and AI input
    const analysis = generateRealisticAnalysis(farm, aiAnalysisText);
    
    // Aggressive truncation to prevent document size issues (Firestore has 1MB limit)
    const maxAnalysisLength = 1000; // Much shorter limit
    const truncatedAnalysisText = aiAnalysisText.length > maxAnalysisLength 
      ? aiAnalysisText.substring(0, maxAnalysisLength) + '... (truncated for storage efficiency)'
      : aiAnalysisText;
    
    // Update the detailed analysis with truncated text
    if (analysis.detailedAnalysis === aiAnalysisText) {
      analysis.detailedAnalysis = truncatedAnalysisText;
    }
    
    // Don't store base64 image data - only keep image metadata
    let imageMetadata: string[] = [];
    if (imageUrl && !imageUrl.startsWith('data:')) {
      // Only store actual URLs, not base64 data
      imageMetadata = [...(farm.imageUrls?.filter(url => !url.startsWith('data:')) || []), imageUrl];
    } else if (imageUrl && imageUrl.startsWith('data:')) {
      // For base64 images, preserve the original data URL so images can display
      // Keep only the most recent 3 images to manage storage size
      const existingDataUrls = farm.imageUrls?.filter(url => url.startsWith('data:')) || [];
      const recentDataUrls = existingDataUrls.slice(-2); // Keep last 2
      imageMetadata = [...recentDataUrls, imageUrl]; // Add new one
    } else {
      imageMetadata = farm.imageUrls?.filter(url => !url.startsWith('data:')) || [];
    }
    
    // Limit metadata entries
    const maxMetadata = 2;
    if (imageMetadata.length > maxMetadata) {
      imageMetadata = imageMetadata.slice(-maxMetadata);
    }
    
    // Update farm with analysis
    const updatedFarm = {
      ...farm,
      analysis,
      lastAnalyzed: new Date(),
      imageUrls: imageMetadata
    };
    
    console.log('Analysis generated successfully, updating farm record');
    console.log('Analysis size:', JSON.stringify(analysis).length, 'bytes');
    console.log('Image metadata entries:', imageMetadata.length);
    console.log('Detailed analysis length:', truncatedAnalysisText.length, 'characters');
    
    // Save updated farm data with aggressive size optimization
    await updateFarmData(farmId, {
      analysis,
      lastAnalyzed: new Date(),
      imageUrls: imageMetadata
    });
    
    console.log('Farm analysis saved to Firestore');
    return updatedFarm;
  } catch (error) {
    console.error('Error analyzing farm data:', error);
    throw error;
  }
};

// Helper function to generate realistic analysis
function generateRealisticAnalysis(farm: FarmData, aiAnalysisText: string) {
  // Base scores on farm characteristics rather than random numbers
  const soilHealthBase = getSoilHealthScore(farm.soilType);
  const cropHealthBase = getCropHealthScore(farm.farmType, farm.crops);
  const waterManagementBase = getWaterManagementScore(farm.irrigationSystem);
  const pestRiskBase = getPestRiskScore(farm.farmType, farm.crops);
  
  // Adjust scores slightly based on AI analysis if available
  const soilHealth = adjustScoreBasedOnAI(soilHealthBase, aiAnalysisText, ['soil', 'fertility', 'erosion']);
  const cropHealth = adjustScoreBasedOnAI(cropHealthBase, aiAnalysisText, ['crop', 'plant', 'growth', 'leaf']);
  const waterManagement = adjustScoreBasedOnAI(waterManagementBase, aiAnalysisText, ['water', 'irrigation', 'moisture']);
  const pestRisk = adjustScoreBasedOnAI(pestRiskBase, aiAnalysisText, ['pest', 'disease', 'damage', 'insect']);
  
  const overallScore = Math.round((soilHealth + cropHealth + waterManagement + (100 - pestRisk)) / 4);
  
  return {
    soilHealth,
    cropHealth,
    waterManagement,
    pestRisk,
    overallScore,
    recommendations: generateRealisticRecommendations(farm, soilHealth, cropHealth, waterManagement, pestRisk),
    suitableCrops: getSuitableCropsForRegion(farm.location, farm.soilType),
    recommendedCrops: getRecommendedCrops(farm.farmType, farm.soilType),
    irrigationRecommendations: {
      system: farm.irrigationSystem || 'Drip irrigation',
      waterRequirement: getRealisticWaterRequirement(farm.farmType, farm.size),
      schedule: getIrrigationSchedule(farm.farmType, farm.soilType),
      efficiency: getIrrigationEfficiency(farm.irrigationSystem),
      optimalSystem: getOptimalIrrigationSystem(farm.farmType, farm.soilType),
      wateringFrequency: getWateringFrequency(farm.soilType),
      waterAmount: getWaterAmount(farm.farmType),
      techniques: getIrrigationTechniques(farm.farmType)
    },
    soilAnalysis: {
      type: farm.soilType,
      fertility: getSoilFertility(farm.soilType),
      phLevel: getSoilPH(farm.soilType),
      organicMatter: getOrganicMatter(farm.soilType),
      texture: getSoilTexture(farm.soilType),
      problems: getSoilProblems(farm.soilType),
      improvementSuggestions: getSoilImprovements(farm.soilType)
    },
    cropAnalysis: {
      growthStage: getCurrentGrowthStage(),
      healthIndicators: getCropHealthIndicators(cropHealth),
      nutrientDeficiencies: getNutrientDeficiencies(farm.soilType),
      estimatedYield: getRealisticYield(farm.farmType, farm.crops[0]),
      harvestTime: getHarvestTime(farm.farmType, farm.crops[0])
    },
    sustainabilityScore: getSustainabilityScore(farm.farmType, farm.irrigationSystem),
    carbonFootprint: {
      rating: getCarbonFootprintRating(farm.farmType, farm.size),
      recommendations: getCarbonRecommendations(farm.farmType)
    },
    climateResilience: {
      score: getClimateResilienceScore(farm.location, farm.farmType),
      vulnerabilities: getClimateVulnerabilities(farm.location),
      adaptationStrategies: getAdaptationStrategies(farm.location, farm.farmType)
    },
    profitabilityAnalysis: {
      potentialYield: getRealisticYieldRange(farm.farmType, farm.crops[0]),
      marketValue: getMarketValue(farm.crops[0]),
      roi: getRealisticROI(farm.farmType),
      improvements: getProfitabilityImprovements(farm.farmType)
    },
    seasonalGuidance: {
      currentSeason: getCurrentSeason(),
      upcomingTasks: getSeasonalTasks(farm.farmType, getCurrentSeason())
    },
    detailedAnalysis: aiAnalysisText || generateDetailedAnalysis(farm, overallScore)
  };
}

// Helper functions for realistic scoring
function getSoilHealthScore(soilType: string): number {
  const scores = {
    'Loamy': 85,
    'Clay': 70,
    'Sandy': 60,
    'Silt': 75,
    'Peaty': 80
  };
  return scores[soilType as keyof typeof scores] || 70;
}

function getCropHealthScore(farmType: string, crops: string[]): number {
  const baseScores = {
    'Mixed farming': 75,
    'Organic farming': 80,
    'Orchard': 85,
    'Vegetable farming': 70,
    'Grain farming': 75
  };
  return baseScores[farmType as keyof typeof baseScores] || 75;
}

function getWaterManagementScore(irrigationSystem: string): number {
  const scores = {
    'Drip irrigation': 90,
    'Sprinkler irrigation': 80,
    'Flood irrigation': 60,
    'Rain-fed': 50
  };
  return scores[irrigationSystem as keyof typeof scores] || 70;
}

function getPestRiskScore(farmType: string, crops: string[]): number {
  const riskScores = {
    'Organic farming': 30,
    'Mixed farming': 40,
    'Vegetable farming': 50,
    'Orchard': 35,
    'Grain farming': 45
  };
  return riskScores[farmType as keyof typeof riskScores] || 40;
}

function adjustScoreBasedOnAI(baseScore: number, aiText: string, keywords: string[]): number {
  if (!aiText) return baseScore;
  
  const lowerText = aiText.toLowerCase();
  let adjustment = 0;
  
  // Look for positive indicators
  if (keywords.some(keyword => lowerText.includes(`good ${keyword}`) || lowerText.includes(`healthy ${keyword}`))) {
    adjustment += 5;
  }
  
  // Look for negative indicators
  if (keywords.some(keyword => lowerText.includes(`poor ${keyword}`) || lowerText.includes(`damaged ${keyword}`))) {
    adjustment -= 10;
  }
  
  return Math.max(30, Math.min(100, baseScore + adjustment));
}

function generateRealisticRecommendations(farm: FarmData, soilHealth: number, cropHealth: number, waterManagement: number, pestRisk: number): string[] {
  const recommendations = [];
  
  if (soilHealth < 70) {
    recommendations.push(`Improve ${farm.soilType.toLowerCase()} soil health through organic matter addition`);
  }
  
  if (cropHealth < 75) {
    recommendations.push(`Monitor ${farm.crops[0]} for nutrient deficiencies and adjust fertilization`);
  }
  
  if (waterManagement < 80) {
    recommendations.push(`Consider upgrading irrigation system for better water efficiency`);
  }
  
  if (pestRisk > 50) {
    recommendations.push(`Implement integrated pest management for ${farm.farmType.toLowerCase()}`);
  }
  
  recommendations.push(`Regular soil testing for ${farm.soilType.toLowerCase()} soil optimization`);
  
  return recommendations;
}

function getSuitableCropsForRegion(location: string, soilType: string): string[] {
  // Basic crop suitability based on common agricultural knowledge
  const cropsByRegion: { [key: string]: string[] } = {
    'default': ['Wheat', 'Rice', 'Corn', 'Soybeans', 'Potatoes', 'Tomatoes']
  };
  
  return cropsByRegion['default'];
}

function getRecommendedCrops(farmType: string, soilType: string): string[] {
  const recommendations: { [key: string]: string[] } = {
    'Mixed farming': ['Rice', 'Wheat', 'Corn'],
    'Vegetable farming': ['Tomatoes', 'Potatoes', 'Onions'],
    'Orchard': ['Apples', 'Oranges', 'Mangoes'],
    'Grain farming': ['Wheat', 'Barley', 'Corn'],
    'Organic farming': ['Quinoa', 'Organic vegetables', 'Legumes']
  };
  
  return recommendations[farmType] || ['Rice', 'Wheat', 'Corn'];
}

// Additional helper functions for realistic data
function getRealisticWaterRequirement(farmType: string, size: number): number {
  const baseRequirement = {
    'Mixed farming': 600,
    'Vegetable farming': 800,
    'Orchard': 700,
    'Grain farming': 500,
    'Organic farming': 650
  };
  
  return (baseRequirement[farmType as keyof typeof baseRequirement] || 600) * Math.sqrt(size);
}

function getIrrigationSchedule(farmType: string, soilType: string): string {
  if (soilType === 'Sandy') return '3-4 times per week';
  if (soilType === 'Clay') return '1-2 times per week';
  return '2-3 times per week';
}

function getIrrigationEfficiency(system: string): number {
  const efficiency = {
    'Drip irrigation': 90,
    'Sprinkler irrigation': 75,
    'Flood irrigation': 50,
    'Rain-fed': 40
  };
  return efficiency[system as keyof typeof efficiency] || 70;
}

function getOptimalIrrigationSystem(farmType: string, soilType: string): string {
  if (farmType === 'Orchard') return 'Micro-sprinklers';
  if (farmType === 'Vegetable farming') return 'Drip irrigation';
  if (soilType === 'Sandy') return 'Drip irrigation';
  return 'Sprinkler irrigation';
}

function getWateringFrequency(soilType: string): string {
  const frequency = {
    'Sandy': '2-3 days',
    'Clay': '5-7 days',
    'Loamy': '3-4 days',
    'Silt': '4-5 days'
  };
  return frequency[soilType as keyof typeof frequency] || '3-4 days';
}

function getWaterAmount(farmType: string): string {
  const amounts = {
    'Vegetable farming': '20-25mm per session',
    'Orchard': '25-30mm per session',
    'Grain farming': '15-20mm per session',
    'Mixed farming': '18-22mm per session'
  };
  return amounts[farmType as keyof typeof amounts] || '20mm per session';
}

function getIrrigationTechniques(farmType: string): string[] {
  return [
    'Drip irrigation',
    'Soil moisture monitoring',
    'Irrigation scheduling',
    'Rainwater harvesting'
  ];
}

function getSoilFertility(soilType: string): string {
  const fertility = {
    'Loamy': 'High',
    'Clay': 'Medium',
    'Sandy': 'Low',
    'Silt': 'Medium',
    'Peaty': 'High'
  };
  return fertility[soilType as keyof typeof fertility] || 'Medium';
}

function getSoilPH(soilType: string): number {
  const ph = {
    'Loamy': 6.8,
    'Clay': 7.2,
    'Sandy': 6.2,
    'Silt': 6.5,
    'Peaty': 5.8
  };
  return ph[soilType as keyof typeof ph] || 6.5;
}

function getOrganicMatter(soilType: string): number {
  const om = {
    'Loamy': 4.5,
    'Clay': 3.2,
    'Sandy': 1.8,
    'Silt': 3.8,
    'Peaty': 8.5
  };
  return om[soilType as keyof typeof om] || 3.5;
}

function getSoilTexture(soilType: string): string {
  const texture = {
    'Loamy': 'Medium',
    'Clay': 'Fine',
    'Sandy': 'Coarse',
    'Silt': 'Fine',
    'Peaty': 'Organic'
  };
  return texture[soilType as keyof typeof texture] || 'Medium';
}

function getSoilProblems(soilType: string): string[] {
  const problems: { [key: string]: string[] } = {
    'Sandy': ['Poor water retention', 'Nutrient leaching'],
    'Clay': ['Poor drainage', 'Compaction issues'],
    'Loamy': ['Minor nutrient depletion'],
    'Silt': ['Erosion susceptibility'],
    'Peaty': ['Drainage management needed']
  };
  return problems[soilType] || ['Regular monitoring needed'];
}

function getSoilImprovements(soilType: string): string[] {
  const improvements: { [key: string]: string[] } = {
    'Sandy': ['Add organic matter', 'Use cover crops'],
    'Clay': ['Improve drainage', 'Add organic amendments'],
    'Loamy': ['Maintain organic matter levels'],
    'Silt': ['Prevent erosion', 'Add organic matter'],
    'Peaty': ['Manage water levels', 'Prevent subsidence']
  };
  return improvements[soilType] || ['Regular soil testing', 'Organic matter addition'];
}

function getCurrentGrowthStage(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 5) return 'Vegetative';
  if (month >= 6 && month <= 8) return 'Flowering';
  if (month >= 9 && month <= 11) return 'Maturation';
  return 'Dormant/Preparation';
}

function getCropHealthIndicators(healthScore: number): string[] {
  if (healthScore >= 80) {
    return ['Good leaf color', 'Proper plant height', 'Adequate branching', 'No visible stress'];
  } else if (healthScore >= 60) {
    return ['Moderate leaf color', 'Average plant height', 'Some stress indicators'];
  } else {
    return ['Poor leaf color', 'Stunted growth', 'Visible stress signs'];
  }
}

function getNutrientDeficiencies(soilType: string): string[] {
  const deficiencies: { [key: string]: string[] } = {
    'Sandy': ['Nitrogen deficiency', 'Potassium leaching'],
    'Clay': ['Iron chlorosis', 'Phosphorus fixation'],
    'Loamy': ['Minor nutrient imbalances'],
    'Silt': ['Potential nitrogen loss'],
    'Peaty': ['Micronutrient deficiencies']
  };
  return deficiencies[soilType] || ['Regular nutrient monitoring needed'];
}

function getRealisticYield(farmType: string, crop: string): string {
  const yields: { [key: string]: string } = {
    'Rice': '4-6 tons/ha',
    'Wheat': '3-5 tons/ha',
    'Corn': '5-8 tons/ha',
    'Tomatoes': '25-40 tons/ha',
    'Potatoes': '20-35 tons/ha'
  };
  return yields[crop] || '3-5 tons/ha';
}

function getHarvestTime(farmType: string, crop: string): string {
  const times: { [key: string]: string } = {
    'Rice': '90-120 days until harvest',
    'Wheat': '100-130 days until harvest',
    'Corn': '80-100 days until harvest',
    'Tomatoes': '60-80 days until harvest',
    'Potatoes': '70-90 days until harvest'
  };
  return times[crop] || '90 days until harvest';
}

function getSustainabilityScore(farmType: string, irrigationSystem: string): number {
  let score = 70;
  if (farmType === 'Organic farming') score += 15;
  if (irrigationSystem === 'Drip irrigation') score += 10;
  return Math.min(95, score);
}

function getCarbonFootprintRating(farmType: string, size: number): string {
  if (farmType === 'Organic farming') return 'Low';
  if (size < 5) return 'Low';
  if (size < 20) return 'Moderate';
  return 'High';
}

function getCarbonRecommendations(farmType: string): string[] {
  return [
    'Implement no-till farming practices',
    'Use organic fertilizers',
    'Plant cover crops',
    'Optimize machinery usage'
  ];
}

function getClimateResilienceScore(location: string, farmType: string): number {
  let score = 70;
  if (farmType === 'Mixed farming') score += 10;
  if (farmType === 'Organic farming') score += 5;
  return score;
}

function getClimateVulnerabilities(location: string): string[] {
  return [
    'Seasonal rainfall variability',
    'Temperature fluctuations',
    'Potential drought periods'
  ];
}

function getAdaptationStrategies(location: string, farmType: string): string[] {
  return [
    'Diversify crop varieties',
    'Improve water storage capacity',
    'Implement climate-smart practices',
    'Use weather monitoring systems'
  ];
}

function getRealisticYieldRange(farmType: string, crop: string): string {
  const ranges: { [key: string]: string } = {
    'Rice': '4-6 tons/ha',
    'Wheat': '3-5 tons/ha',
    'Corn': '5-8 tons/ha',
    'Tomatoes': '25-40 tons/ha'
  };
  return ranges[crop] || '3-6 tons/ha';
}

function getMarketValue(crop: string): string {
  const values: { [key: string]: string } = {
    'Rice': '$400-600/ton',
    'Wheat': '$300-450/ton',
    'Corn': '$250-400/ton',
    'Tomatoes': '$800-1200/ton'
  };
  return values[crop] || '$400-600/ton';
}

function getRealisticROI(farmType: string): string {
  const roi = {
    'Vegetable farming': '110-130%',
    'Orchard': '120-150%',
    'Grain farming': '105-120%',
    'Mixed farming': '110-125%',
    'Organic farming': '115-135%'
  };
  return roi[farmType as keyof typeof roi] || '110-125%';
}

function getProfitabilityImprovements(farmType: string): string[] {
  return [
    'Optimize input costs',
    'Improve crop quality',
    'Explore direct marketing',
    'Implement precision farming'
  ];
}

function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 5) return 'Spring/Summer';
  if (month >= 6 && month <= 8) return 'Monsoon';
  if (month >= 9 && month <= 11) return 'Post-Monsoon';
  return 'Winter';
}

function getSeasonalTasks(farmType: string, season: string): string[] {
  const tasks: { [key: string]: string[] } = {
    'Spring/Summer': ['Prepare fields', 'Plant crops', 'Monitor growth'],
    'Monsoon': ['Manage water drainage', 'Monitor for diseases', 'Weed control'],
    'Post-Monsoon': ['Harvest preparation', 'Pest monitoring', 'Fertilizer application'],
    'Winter': ['Harvest activities', 'Field preparation', 'Equipment maintenance']
  };
  return tasks[season] || ['Regular monitoring', 'Maintenance activities'];
}

function generateDetailedAnalysis(farm: FarmData, overallScore: number): string {
  return `Farm "${farm.name}" in ${farm.location} shows ${overallScore >= 80 ? 'excellent' : overallScore >= 60 ? 'good' : 'moderate'} potential with its ${farm.size} hectares of ${farm.farmType.toLowerCase()}. The ${farm.soilType.toLowerCase()} soil provides a ${getSoilFertility(farm.soilType).toLowerCase()} fertility base for growing ${farm.crops.join(', ')}. Current irrigation system (${farm.irrigationSystem}) operates at ${getIrrigationEfficiency(farm.irrigationSystem)}% efficiency. Regular monitoring and sustainable practices will help maintain and improve farm productivity.`;
}

// Function to delete a farm
export const deleteFarm = async (farmId: string): Promise<void> => {
  try {
    console.log('Deleting farm with ID:', farmId);
    const farmRef = doc(db, 'farms', farmId);
    
    // Check if the farm exists first
    const farmDoc = await getDoc(farmRef);
    if (!farmDoc.exists()) {
      throw new Error(`Farm with ID ${farmId} does not exist`);
    }
    
    // Delete the farm document
    await deleteDoc(farmRef);
    console.log('Farm deleted successfully');
  } catch (error) {
    console.error('Error deleting farm:', error);
    throw error;
  }
};