import { db } from './firebase';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

/**
 * Save field boundaries to a farm document
 * @param farmId The ID of the farm
 * @param boundaries GeoJSON boundaries object
 */
export const saveFarmBoundary = async (farmId, boundaries) => {
  if (!farmId) throw new Error('Farm ID is required');
  
  try {
    const farmRef = doc(db, 'farms', farmId);
    
    await updateDoc(farmRef, {
      boundaries,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error saving farm boundaries:', error);
    throw error;
  }
};

/**
 * Save NDVI data to a farm document
 * @param farmId The ID of the farm
 * @param ndviData NDVI data object
 */
export const saveNdviData = async (farmId, ndviData) => {
  if (!farmId) throw new Error('Farm ID is required');
  
  try {
    const farmRef = doc(db, 'farms', farmId);
    
    // Store only essential NDVI data to avoid large documents
    const ndviToStore = {
      current: {
        averageNdvi: ndviData.current.averageNdvi,
        minNdvi: ndviData.current.minNdvi,
        maxNdvi: ndviData.current.maxNdvi,
        date: new Date(),
        imageUrl: ndviData.current.imageUrl || ''
      },
      // Store historical averages with dates
      historical: ndviData.historicalDates?.map((date, index) => ({
        date,
        averageNdvi: ndviData.historical[index].averageNdvi
      })) || []
    };
    
    await updateDoc(farmRef, {
      ndviData: ndviToStore,
      lastNdviUpdate: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error saving NDVI data:', error);
    throw error;
  }
};

/**
 * Get NDVI data for a farm
 * @param farmId The ID of the farm
 */
export const getNdviData = async (farmId) => {
  if (!farmId) throw new Error('Farm ID is required');
  
  try {
    const farmRef = doc(db, 'farms', farmId);
    const farmDoc = await getDoc(farmRef);
    
    if (!farmDoc.exists()) {
      throw new Error('Farm not found');
    }
    
    const farmData = farmDoc.data();
    
    return farmData.ndviData || null;
  } catch (error) {
    console.error('Error retrieving NDVI data:', error);
    throw error;
  }
};

/**
 * Create a new satellite image record
 * @param farmId The ID of the farm
 * @param imageData Image metadata
 */
export const saveSatelliteImage = async (farmId, imageData) => {
  if (!farmId) throw new Error('Farm ID is required');
  
  try {
    // Create a unique ID for the image record
    const date = new Date();
    const imageId = `${farmId}_${date.getTime()}`;
    
    const imageRef = doc(db, 'satelliteImages', imageId);
    
    await setDoc(imageRef, {
      farmId,
      imageUrl: imageData.imageUrl,
      imageType: imageData.imageType || 'ndvi',
      date: imageData.date || date,
      boundaries: imageData.boundaries || null,
      metadata: imageData.metadata || {},
      createdAt: serverTimestamp()
    });
    
    return imageId;
  } catch (error) {
    console.error('Error saving satellite image:', error);
    throw error;
  }
};

/**
 * Get satellite images for a farm
 * @param farmId The ID of the farm
 * @param limit Maximum number of images to return
 */
export const getSatelliteImages = async (farmId, limit = 10) => {
  if (!farmId) throw new Error('Farm ID is required');
  
  try {
    const imagesRef = collection(db, 'satelliteImages');
    const q = query(imagesRef, where('farmId', '==', farmId));
    
    const querySnapshot = await getDocs(q);
    const images = [];
    
    querySnapshot.forEach((doc) => {
      images.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort by date, newest first
    images.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateB - dateA;
    });
    
    return images.slice(0, limit);
  } catch (error) {
    console.error('Error retrieving satellite images:', error);
    throw error;
  }
}; 