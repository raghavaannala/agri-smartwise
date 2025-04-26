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
  Timestamp
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