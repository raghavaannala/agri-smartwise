/**
 * satelliteApi.ts
 * Service for interacting with satellite imagery APIs (Sentinel Hub, Planet, etc.)
 */
import axios from 'axios';
import { NdviDataPoint } from './ndviService';

// API configuration
const SENTINEL_HUB_API_KEY = import.meta.env.VITE_SENTINEL_HUB_API_KEY;
const SENTINEL_HUB_INSTANCE_ID = import.meta.env.VITE_SENTINEL_HUB_INSTANCE_ID;
const PLANET_API_KEY = import.meta.env.VITE_PLANET_API_KEY;

// Token management for OAuth APIs
interface AuthToken {
  token: string;
  expires: number; // Timestamp when token expires
}

let sentinelHubToken: AuthToken | null = null;

/**
 * Get a valid Sentinel Hub OAuth token
 * @returns Promise with the token string
 */
export const getSentinelHubToken = async (): Promise<string> => {
  const now = Date.now();
  
  // Check if we have a valid token
  if (sentinelHubToken && sentinelHubToken.expires > now) {
    return sentinelHubToken.token;
  }
  
  // Request a new token
  try {
    const response = await axios.post(
      'https://services.sentinel-hub.com/oauth/token',
      {
        grant_type: 'client_credentials',
        client_id: SENTINEL_HUB_API_KEY,
        client_secret: SENTINEL_HUB_INSTANCE_ID
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    // Store the token with expiration (subtract 5 minutes for safety margin)
    sentinelHubToken = {
      token: response.data.access_token,
      expires: now + (response.data.expires_in * 1000) - 300000
    };
    
    return sentinelHubToken.token;
  } catch (error) {
    console.error('Failed to get Sentinel Hub token:', error);
    throw new Error('Authentication with satellite provider failed');
  }
};

/**
 * Determine health status based on NDVI value
 * @param ndvi NDVI value
 * @returns Health status string
 */
export const getHealthStatus = (ndvi: number): 'poor' | 'moderate' | 'good' | 'excellent' => {
  if (ndvi < 0.3) return 'poor';
  if (ndvi < 0.5) return 'moderate';
  if (ndvi < 0.7) return 'good';
  return 'excellent';
};

/**
 * Fetch NDVI data from Sentinel Hub for a specific field polygon
 * @param polygon Field boundary coordinates
 * @param fromDate Start date for data range
 * @param toDate End date for data range
 * @returns Promise with array of NDVI data points
 */
export const fetchSentinelHubNdviData = async (
  polygon: [number, number][],
  fromDate: string, 
  toDate: string
): Promise<NdviDataPoint[]> => {
  try {
    console.log('Fetching real-time satellite data for polygon:', polygon);
    
    // Get valid access token
    const token = await getSentinelHubToken();
    
    // Prepare geometry in GeoJSON format
    const geometry = {
      type: 'Polygon',
      coordinates: [polygon.map(point => [point[1], point[0]])] // Swap lat/lng for GeoJSON
    };
    
    // Create evalscript for NDVI calculation
    const evalscript = `
      //VERSION=3
      function setup() {
        return {
          input: ["B04", "B08", "dataMask"],
          output: [
            { id: "default", bands: 3 },
            { id: "ndvi", bands: 1 }
          ]
        }
      }
      
      function evaluatePixel(sample) {
        const ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
        
        // RGB visualization
        let viz = [0.1, 0.1, 0.1];
        if (ndvi < 0) viz = [0.05, 0.05, 0.4]; // water - dark blue
        else if (ndvi < 0.2) viz = [0.2, 0.2, 0]; // soil - dark 
        else if (ndvi < 0.4) viz = [0.4, 0.4, 0]; // sparse vegetation - yellow
        else if (ndvi < 0.6) viz = [0.2, 0.5, 0.1]; // moderate vegetation - light green
        else if (ndvi < 0.8) viz = [0.1, 0.7, 0.1]; // dense vegetation - green
        else viz = [0, 0.9, 0]; // very dense vegetation - bright green
        
        return {
          default: viz,
          ndvi: [ndvi]
        };
      }
    `;
    
    // Prepare the API request
    const requestBody = {
      input: {
        bounds: {
          geometry
        },
        data: [
          {
            dataFilter: {
              timeRange: {
                from: fromDate + 'T00:00:00Z',
                to: toDate + 'T23:59:59Z'
              },
              maxCloudCoverage: 20 // Filter out images with >20% cloud coverage
            },
            type: 'sentinel-2-l2a' // Using Sentinel-2 L2A data
          }
        ]
      },
      output: {
        width: 512,
        height: 512,
        responses: [
          {
            identifier: 'default',
            format: { type: 'image/tiff' }
          },
          {
            identifier: 'ndvi',
            format: { type: 'application/json' }
          }
        ]
      },
      evalscript
    };
    
    // Log request details for debugging
    console.log('Sending request to Sentinel Hub API');
    
    // Make the API request
    const response = await axios.post(
      'https://services.sentinel-hub.com/api/v1/process',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    console.log('Received response from Sentinel Hub API', response.status);
    
    // Process the response data
    if (!response.data || !response.data.ndvi) {
      console.error('Invalid response format from Sentinel Hub API:', response.data);
      throw new Error('Invalid response format from satellite provider');
    }
    
    const data = response.data.ndvi;
    const results: NdviDataPoint[] = [];
    
    // Parse dates and NDVI values from the response
    if (data.dates && Object.keys(data.dates).length > 0) {
      for (const date in data.dates) {
        if (data.dates[date] && data.dates[date].statistics && data.dates[date].statistics.mean !== undefined) {
          const ndviValue = data.dates[date].statistics.mean;
          
          results.push({
            date: date.split('T')[0], // Format as YYYY-MM-DD
            value: parseFloat(ndviValue.toFixed(2)),
            health: getHealthStatus(ndviValue)
          });
        }
      }
    } else {
      console.error('No valid dates found in Sentinel Hub response:', data);
      throw new Error('No valid satellite data available for the selected date range');
    }
    
    // Sort by date
    results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Log successful data retrieval
    console.log(`Successfully fetched ${results.length} NDVI data points from Sentinel Hub`);
    
    return results;
  } catch (error) {
    console.error('Error fetching Sentinel Hub NDVI data:', error);
    
    // Include more detailed error information
    if (axios.isAxiosError(error)) {
      console.error('API response error:', error.response?.data);
      
      if (error.response?.status === 401) {
        throw new Error('Authentication failed with satellite provider. Please check your API key.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded with satellite provider. Please try again later.');
      } else if (error.response) {
        throw new Error(`Satellite API error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('No response received from satellite provider. Please check your network connection.');
      }
    }
    
    throw error;
  }
};

/**
 * Fetch field boundary data from Planet API
 * For demonstration purposes - implementation will depend on your API
 */
export const fetchPlanetFieldBoundaries = async (farmId: string) => {
  try {
    const response = await axios.get(
      `https://api.planet.com/farms/${farmId}/fields`,
      {
        headers: {
          'Authorization': `Basic ${btoa(PLANET_API_KEY + ':')}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching field boundaries from Planet:', error);
    throw error;
  }
};

/**
 * Get real-time weather data for a location
 * Can be used to enhance NDVI analysis with current conditions
 */
export const getWeatherForLocation = async (lat: number, lng: number) => {
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}&units=metric`
    );
    
    return {
      temperature: response.data.main.temp,
      humidity: response.data.main.humidity,
      conditions: response.data.weather[0].main,
      windSpeed: response.data.wind.speed,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}; 