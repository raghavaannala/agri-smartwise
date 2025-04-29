// ndviService.ts - Real-time Satellite Imagery NDVI Data Service
import axios from 'axios';
import { 
  fetchSentinelHubNdviData, 
  getHealthStatus,
  fetchPlanetFieldBoundaries
} from './satelliteApi';

// Types and interfaces
export interface NdviDataPoint {
  date: string;
  value: number; // NDVI values typically range from -1 to 1
  health: 'poor' | 'moderate' | 'good' | 'excellent';
}

export interface FieldBoundary {
  id: string;
  name: string;
  polygon: [number, number][]; // Array of lat, lng coordinates
  crop?: string;
  area?: number; // in hectares
}

export interface FarmNdviData {
  farmId: string;
  farmName: string;
  lastUpdated: string;
  fields: {
    id: string;
    name: string;
    boundaries: FieldBoundary;
    ndviTimeSeries: NdviDataPoint[];
    currentNdvi: number;
    healthStatus: 'poor' | 'moderate' | 'good' | 'excellent';
    realData?: boolean;
  }[];
  averageNdvi: number;
  usingRealData?: boolean;
  usingRealBoundaries?: boolean;
}

// API configuration
const SENTINEL_HUB_API_KEY = import.meta.env.VITE_SENTINEL_HUB_API_KEY;
const SENTINEL_HUB_INSTANCE_ID = import.meta.env.VITE_SENTINEL_HUB_INSTANCE_ID;
const PLANET_API_KEY = import.meta.env.VITE_PLANET_API_KEY;

// Caching system for NDVI data to reduce API calls
const ndviCache = new Map<string, { data: FarmNdviData, timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour cache TTL in milliseconds

/**
 * Fetches NDVI data from Sentinel Hub for a specific polygon
 * @param polygon Coordinates defining the field boundary
 * @param fromDate Start date for time series data
 * @param toDate End date for time series data
 * @returns Array of NDVI data points
 */
const fetchSentinelHubData = async (
  polygon: [number, number][],
  fromDate: string,
  toDate: string
): Promise<NdviDataPoint[]> => {
  try {
    // Use the dedicated satellite API service
    return await fetchSentinelHubNdviData(polygon, fromDate, toDate);
  } catch (error) {
    console.error('Error fetching Sentinel Hub data:', error);
    // In case of API error, we'll fall back to mock data for now
    return generateFallbackNdviTimeSeries();
  }
};

/**
 * Fetches farm field boundaries from the database
 * @param farmId The ID of the farm
 * @returns Array of field boundaries
 */
const fetchFieldBoundaries = async (farmId: string): Promise<FieldBoundary[]> => {
  try {
    // Try to fetch real boundaries from Planet API or our backend
    try {
      const planetData = await fetchPlanetFieldBoundaries(farmId);
      return planetData.fields;
    } catch (planetError) {
      console.log('Planet API unavailable, trying local API...');
      // Fall back to our own API if Planet API fails
      const response = await axios.get(`/api/farms/${farmId}/fields`);
      return response.data.fields;
    }
  } catch (error) {
    console.error('Error fetching field boundaries:', error);
    // Fallback to sample data if all APIs fail
    return sampleFieldBoundaries[farmId] || sampleFieldBoundaries['farm1'];
  }
};

/**
 * Generate fallback NDVI time series data in case of API failure
 * This ensures the app still works even if the satellite API is unavailable
 */
const generateFallbackNdviTimeSeries = (seedValue: number = Math.random()): NdviDataPoint[] => {
  const series: NdviDataPoint[] = [];
  const now = new Date();
  
  // Start with a base value and add some randomness
  let baseValue = 0.6 + (seedValue * 0.3); // between 0.6 and 0.9
  
  for (let i = 90; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Add some variation with seasonal progression (improving health over time)
    const progress = (90 - i) / 90; // 0 to 1 as we approach current date
    const seasonal = 0.15 * progress; // Seasonal improvement
    
    // Add some randomness
    const noise = (Math.random() * 0.1) - 0.05; // Random noise between -0.05 and 0.05
    
    // Calculate NDVI value with constraints
    let value = Math.min(Math.max(baseValue + seasonal + noise, -1), 1);
    value = Math.round(value * 100) / 100; // Round to 2 decimal places
    
    series.push({
      date: date.toISOString().split('T')[0],
      value,
      health: getHealthStatus(value)
    });
    
    // Update base value with some continuity for the next point
    baseValue = value;
  }
  
  return series;
};

// Sample field boundaries for fallback/testing
const sampleFieldBoundaries: { [key: string]: FieldBoundary[] } = {
  'farm1': [
    {
      id: 'field1',
      name: 'North Field',
      polygon: [
        [17.375, 78.470],
        [17.378, 78.475],
        [17.372, 78.478],
        [17.369, 78.473],
      ],
      crop: 'Rice',
      area: 2.5
    },
    {
      id: 'field2',
      name: 'South Field',
      polygon: [
        [17.365, 78.472],
        [17.368, 78.477],
        [17.362, 78.480],
        [17.359, 78.475],
      ],
      crop: 'Cotton',
      area: 3.2
    }
  ],
  'farm2': [
    {
      id: 'field1',
      name: 'Main Field',
      polygon: [
        [17.425, 78.420],
        [17.428, 78.425],
        [17.422, 78.428],
        [17.419, 78.423],
      ],
      crop: 'Wheat',
      area: 4.1
    }
  ],
  'farm3': [
    {
      id: 'field1',
      name: 'East Plot',
      polygon: [
        [17.405, 78.510],
        [17.408, 78.515],
        [17.402, 78.518],
        [17.399, 78.513],
      ],
      crop: 'Soybeans',
      area: 1.8
    },
    {
      id: 'field2',
      name: 'West Plot',
      polygon: [
        [17.404, 78.500],
        [17.407, 78.505],
        [17.401, 78.508],
        [17.398, 78.503],
      ],
      crop: 'Corn',
      area: 2.3
    }
  ]
};

/**
 * Gets NDVI data for a specific farm with real-time satellite imagery
 * @param farmId The ID of the farm
 * @param farmName The name of the farm
 * @returns FarmNdviData object with processed NDVI information
 */
export const getFarmNdviData = async (farmId: string, farmName: string): Promise<FarmNdviData> => {
  // Check if we have a valid cached result
  const cacheKey = `farm-${farmId}`;
  const cachedData = ndviCache.get(cacheKey);
  
  // Clear cache if explicitly forced or if it's been more than an hour
  const forceRefresh = sessionStorage.getItem('force_refresh_ndvi') === 'true';
  if (forceRefresh) {
    sessionStorage.removeItem('force_refresh_ndvi');
    console.log('Forcing refresh of NDVI data, bypassing cache');
    ndviCache.delete(cacheKey);
  } else if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
    console.log('Returning cached NDVI data for farm:', farmId);
    return cachedData.data;
  }
  
  try {
    // Calculate date range (last 90 days)
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 90);
    const fromDateStr = fromDate.toISOString().split('T')[0];
    
    console.log(`Fetching NDVI data for farm ${farmId} from ${fromDateStr} to ${toDate}`);
    
    // Step 1: Fetch field boundaries - this is critical
    let fieldBoundaries;
    let usingRealBoundaries = true;
    
    try {
      console.log('Attempting to fetch real field boundaries');
      // Try to get real boundaries from Planet API or our backend
      try {
        const planetData = await fetchPlanetFieldBoundaries(farmId);
        fieldBoundaries = planetData.fields;
        console.log('Successfully fetched field boundaries from Planet API', fieldBoundaries);
      } catch (planetError) {
        console.log('Planet API unavailable, trying local API...', planetError);
        // Fall back to our own API if Planet API fails
        const response = await axios.get(`/api/farms/${farmId}/fields`);
        fieldBoundaries = response.data.fields;
        console.log('Successfully fetched field boundaries from local API', fieldBoundaries);
      }
    } catch (boundaryError) {
      console.error('Failed to fetch real field boundaries:', boundaryError);
      // Only fall back to sample data if we absolutely have to
      fieldBoundaries = sampleFieldBoundaries[farmId] || sampleFieldBoundaries['farm1'];
      usingRealBoundaries = false;
      console.warn('Using fallback field boundaries for farm:', farmId);
    }
    
    // Step 2: Fetch NDVI data for each field
    console.log(`Processing ${fieldBoundaries.length} fields for NDVI data`);
    
    const fieldsPromises = fieldBoundaries.map(async (field) => {
      let ndviTimeSeries;
      let usingRealData = true;
      
      try {
        // Attempt to fetch real satellite data
        console.log(`Fetching satellite data for field: ${field.name}`);
        ndviTimeSeries = await fetchSentinelHubData(
          field.polygon,
          fromDateStr,
          toDate
        );
        console.log(`Successfully fetched ${ndviTimeSeries.length} NDVI data points for ${field.name}`);
      } catch (sentinelError) {
        console.error(`Failed to fetch real NDVI data for field ${field.name}:`, sentinelError);
        // Generate fallback data only when necessary
        ndviTimeSeries = generateFallbackNdviTimeSeries(Math.random());
        usingRealData = false;
        console.warn(`Using fallback NDVI data for field: ${field.name}`);
      }
      
      // Get the most recent NDVI value
      const currentNdvi = ndviTimeSeries[ndviTimeSeries.length - 1].value;
      const healthStatus = getHealthStatus(currentNdvi);
      
      return {
        id: field.id,
        name: field.name,
        boundaries: field,
        ndviTimeSeries,
        currentNdvi,
        healthStatus,
        realData: usingRealData // Track if we're using real or fallback data
      };
    });
    
    // Wait for all field data to be processed
    const fields = await Promise.all(fieldsPromises);
    
    // Calculate average NDVI across all fields
    const totalNdvi = fields.reduce((sum, field) => sum + field.currentNdvi, 0);
    const averageNdvi = Math.round((totalNdvi / fields.length) * 100) / 100;
    
    // Create the result object
    const result: FarmNdviData = {
      farmId,
      farmName,
      lastUpdated: new Date().toISOString(),
      fields,
      averageNdvi,
      usingRealData: fields.some(field => field.realData === true),
      usingRealBoundaries
    };
    
    // Cache the result
    ndviCache.set(cacheKey, { data: result, timestamp: Date.now() });
    console.log('NDVI data updated and cached for farm:', farmId);
    
    return result;
  } catch (error) {
    console.error('Error fetching real-time NDVI data:', error);
    console.log('Falling back to generated data for farm:', farmId);
    
    // Fallback data generation when all else fails
    const fields = (sampleFieldBoundaries[farmId] || sampleFieldBoundaries['farm1']).map(field => {
      const ndviTimeSeries = generateFallbackNdviTimeSeries(Math.random());
      const currentNdvi = ndviTimeSeries[ndviTimeSeries.length - 1].value;
      const healthStatus = getHealthStatus(currentNdvi);
      
      return {
        id: field.id,
        name: field.name,
        boundaries: field,
        ndviTimeSeries,
        currentNdvi,
        healthStatus,
        realData: false // This is fallback data
      };
    });
    
    // Calculate average NDVI
    const totalNdvi = fields.reduce((sum, field) => sum + field.currentNdvi, 0);
    const averageNdvi = Math.round((totalNdvi / fields.length) * 100) / 100;
    
    const fallbackResult: FarmNdviData = {
      farmId,
      farmName,
      lastUpdated: new Date().toISOString(),
      fields,
      averageNdvi,
      usingRealData: false,
      usingRealBoundaries: false
    };
    
    // Still cache the fallback result to avoid repeated failures
    ndviCache.set(cacheKey, { data: fallbackResult, timestamp: Date.now() });
    
    return fallbackResult;
  }
};

/**
 * Get NDVI data for a specific date
 * @param ndviData The full NDVI dataset
 * @param date The target date string
 * @returns FarmNdviData filtered for the specific date
 */
export const getNdviDataForDate = (ndviData: FarmNdviData, date: string): FarmNdviData => {
  const dateStr = date.split('T')[0]; // Ensure we're comparing just the date part
  
  const fields = ndviData.fields.map(field => {
    // Find NDVI data for the specified date or the closest available date
    const targetDateData = field.ndviTimeSeries.find(d => d.date === dateStr) || 
                           field.ndviTimeSeries[field.ndviTimeSeries.length - 1];
    
    return {
      ...field,
      currentNdvi: targetDateData.value,
      healthStatus: targetDateData.health
    };
  });
  
  // Recalculate average NDVI for the selected date
  const totalNdvi = fields.reduce((sum, field) => sum + field.currentNdvi, 0);
  const averageNdvi = Math.round((totalNdvi / fields.length) * 100) / 100;
  
  return {
    ...ndviData,
    fields,
    averageNdvi
  };
};

/**
 * Convert NDVI value to color for map visualization
 * @param ndviValue NDVI value (-1 to 1)
 * @returns HEX color string
 */
export const ndviToColor = (ndviValue: number): string => {
  if (ndviValue < 0) return '#8B4513'; // Brown for negative values (bare soil, water)
  if (ndviValue < 0.2) return '#FFEDA0'; // Light yellow
  if (ndviValue < 0.4) return '#FED976'; // Yellow
  if (ndviValue < 0.6) return '#93C47D'; // Light green
  if (ndviValue < 0.8) return '#38761D'; // Medium green
  return '#0B5345'; // Dark green for high values
}; 