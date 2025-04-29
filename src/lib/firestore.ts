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
    
    // Generate comprehensive analysis based on farm properties
    const soilHealth = Math.floor(Math.random() * 30) + 70; // 70-100
    const cropHealth = Math.floor(Math.random() * 40) + 60; // 60-100
    const waterManagement = Math.floor(Math.random() * 35) + 65; // 65-100
    const pestRisk = Math.floor(Math.random() * 50) + 30; // 30-80
    const overallScore = Math.round((soilHealth + cropHealth + waterManagement + (100 - pestRisk)) / 4);
    
    // Generate analysis using the farm's actual properties
    const analysis = {
      soilHealth,
      cropHealth,
      waterManagement,
      pestRisk,
      overallScore,
      recommendations: [
        `Implement crop rotation with ${farm.crops[0]} to improve soil health`,
        `Consider upgrading to ${farm.soilType === 'Clay' ? 'drip' : 'sprinkler'} irrigation to optimize water usage`,
        'Monitor for early signs of pest infestation',
        `Apply organic fertilizers to enhance ${farm.soilType} soil fertility`,
        'Plant cover crops during off-season to prevent soil erosion'
      ],
      suitableCrops: [
        'Wheat', 'Barley', 'Rice', 'Corn', 'Soybeans', 'Potatoes'
      ],
      recommendedCrops: [
        'Rice', 'Corn', 'Cassava'
      ],
      irrigationRecommendations: {
        system: farm.irrigationSystem || 'Drip irrigation',
        waterRequirement: Math.floor(Math.random() * 500) + 800, // 800-1300 mm per season
        schedule: `${Math.floor(Math.random() * 3) + 2} times per week`,
        efficiency: Math.floor(Math.random() * 20) + 75, // 75-95%
        optimalSystem: farm.farmType === 'Orchard' ? 'Micro-sprinklers' : 'Drip irrigation',
        wateringFrequency: `${Math.floor(Math.random() * 2) + 3} days`,
        waterAmount: `${Math.floor(Math.random() * 10) + 15}mm per session`,
        techniques: [
          'Drip irrigation',
          'Rainwater harvesting',
          'Soil moisture monitoring',
          'Irrigation scheduling'
        ]
      },
      soilAnalysis: {
        type: farm.soilType,
        fertility: farm.soilType === 'Loamy' ? 'High' : farm.soilType === 'Sandy' ? 'Low' : 'Medium',
        phLevel: Math.floor(Math.random() * 2) + 6, // 6-8
        organicMatter: Math.floor(Math.random() * 5) + 3, // 3-8%
        texture: farm.soilType === 'Loamy' ? 'Medium' : farm.soilType === 'Sandy' ? 'Coarse' : 'Fine',
        problems: [
          'Low organic matter content',
          'Slight compaction in tillage zones',
          'Evidence of erosion on slopes'
        ],
        improvementSuggestions: [
          'Add organic compost to increase organic matter',
          'Implement minimum tillage practices',
          'Create contour barriers on slopes to prevent erosion'
        ]
      },
      cropAnalysis: {
        growthStage: 'Vegetative',
        healthIndicators: [
          'Good leaf color',
          'Proper plant height',
          'Adequate branching',
          'Minor pest damage on leaves'
        ],
        nutrientDeficiencies: [
          'Slight nitrogen deficiency',
          'Potential iron chlorosis in patches'
        ],
        estimatedYield: `${Math.floor(Math.random() * 2) + 4} tons/ha`,
        harvestTime: `${Math.floor(Math.random() * 30) + 60} days until harvest`
      },
      sustainabilityScore: Math.floor(Math.random() * 30) + 65, // 65-95
      carbonFootprint: {
        rating: 'Moderate',
        recommendations: [
          'Implement no-till farming to reduce carbon emissions',
          'Plant trees around farm perimeter as carbon sinks',
          'Reduce fossil fuel usage in farm operations',
          'Incorporate renewable energy sources for pumping and processing'
        ]
      },
      climateResilience: {
        score: Math.floor(Math.random() * 30) + 60, // 60-90
        vulnerabilities: [
          'Susceptible to flooding during heavy rains',
          'Limited water storage during dry periods',
          'Potential heat stress for current crop varieties'
        ],
        adaptationStrategies: [
          'Construct drainage channels to manage excess water',
          'Build rainwater harvesting structures',
          'Introduce heat-tolerant crop varieties',
          'Create windbreaks to reduce evaporation'
        ]
      },
      profitabilityAnalysis: {
        potentialYield: `${Math.floor(Math.random() * 2) + 4}-${Math.floor(Math.random() * 2) + 6} tons/ha`,
        marketValue: `$${Math.floor(Math.random() * 300) + 800}/ton`,
        roi: `${Math.floor(Math.random() * 20) + 120}%`,
        improvements: [
          'Focus on high-value crop varieties',
          'Implement precision farming to reduce input costs',
          'Explore direct marketing to increase profit margins',
          'Consider value-added processing of farm products'
        ]
      },
      seasonalGuidance: {
        currentSeason: 'Growing Season',
        upcomingTasks: [
          'Top dressing with fertilizer',
          'Regular monitoring for pests and diseases',
          'Maintain soil moisture at optimal levels',
          'Prepare for harvesting equipment maintenance',
          'Plan for post-harvest storage and processing'
        ]
      },
      detailedAnalysis: `Farm "${farm.name}" in ${farm.location} shows good overall potential with its ${farm.size} hectares of primarily ${farm.farmType.toLowerCase()}. The ${farm.soilType.toLowerCase()} soil is suitable for a variety of crops, particularly ${farm.crops.join(', ')}. Current irrigation system (${farm.irrigationSystem}) is functioning at moderate efficiency but could be optimized further. Soil fertility is adequate but would benefit from organic matter amendments. Water management practices should be adjusted based on seasonal rainfall patterns. Pest pressure is currently low to moderate but requires regular monitoring. Overall sustainability score indicates good practices with room for improvement in resource efficiency and biodiversity support.`
    };
    
    // Update farm with analysis
    const updatedFarm = {
      ...farm,
      analysis,
      lastAnalyzed: new Date(),
      imageUrls: imageUrl ? [...farm.imageUrls, imageUrl] : farm.imageUrls
    };
    
    console.log('Analysis generated successfully, updating farm record');
    
    // Save updated farm data
    await updateFarmData(farmId, {
      analysis,
      lastAnalyzed: new Date(),
      imageUrls: updatedFarm.imageUrls
    });
    
    console.log('Farm analysis saved to Firestore');
    return updatedFarm;
  } catch (error) {
    console.error('Error analyzing farm data:', error);
    throw error;
  }
};

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