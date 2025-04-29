import axios from 'axios';

// This would come from environment variables in a real implementation
const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Fetch NDVI data for a field based on its boundaries and a date
 */
export const fetchNdviData = async (boundaries, date) => {
  try {
    // For the prototype, we'll simulate the API call with a delay
    // In a real implementation, this would call the FastAPI backend
    
    console.log('Fetching NDVI data with:', { boundaries, date });
    
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock response - in a real implementation this would be:
    // const response = await axios.post(`${API_BASE_URL}/ndvi`, {
    //   boundaries,
    //   date: date.toISOString().split('T')[0]
    // });
    
    // Generate some realistic mock data
    const mockData = generateMockNdviData(date);
    
    // Also fetch historical data
    const historicalData = await fetchHistoricalNdviData(
      boundaries,
      new Date(date.getFullYear() - 1, date.getMonth(), 1),
      date
    );
    
    return {
      current: mockData,
      historical: historicalData.ndvi_values.map(value => ({
        averageNdvi: value
      })),
      historicalDates: historicalData.dates
    };
  } catch (error) {
    console.error('Error fetching NDVI data:', error);
    throw error;
  }
};

/**
 * Fetch historical NDVI data for a field
 */
export const fetchHistoricalNdviData = async (boundaries, startDate, endDate) => {
  try {
    // For the prototype, we'll simulate the API call
    console.log('Fetching historical NDVI data:', { startDate, endDate });
    
    // Extract bounding box from boundaries
    const coords = getBoundingBoxFromBoundaries(boundaries);
    
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock response - in a real implementation this would be:
    // const response = await axios.get(`${API_BASE_URL}/historical-ndvi`, {
    //   params: {
    //     min_lon: coords.min_lon,
    //     min_lat: coords.min_lat,
    //     max_lon: coords.max_lon,
    //     max_lat: coords.max_lat,
    //     start_date: startDate.toISOString().split('T')[0],
    //     end_date: endDate.toISOString().split('T')[0]
    //   }
    // });
    
    // Generate mock historical data
    const dates = [];
    const ndvi_values = [];
    
    // Generate data points at 30-day intervals
    let currentDate = new Date(startDate);
    let lastNdvi = 0.4 + Math.random() * 0.2 - 0.1; // Start between 0.3-0.5
    
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      
      // Add some time correlation and seasonal effects
      const month = currentDate.getMonth();
      const seasonFactor = 0.5 + 0.3 * Math.sin((month - 2) * Math.PI / 6); // Peak in summer
      
      // Move toward the seasonal norm with some randomness
      const trendFactor = 0.7;
      lastNdvi = (trendFactor * seasonFactor + 
                 (1 - trendFactor) * lastNdvi + 
                 (Math.random() * 0.1 - 0.05));
      
      // Keep within reasonable bounds
      lastNdvi = Math.max(0.1, Math.min(0.9, lastNdvi));
      ndvi_values.push(lastNdvi);
      
      // Move forward by 30 days
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 30);
    }
    
    return {
      dates,
      ndvi_values
    };
  } catch (error) {
    console.error('Error fetching historical NDVI data:', error);
    throw error;
  }
};

/**
 * Helper function to generate mock NDVI data
 */
const generateMockNdviData = (date) => {
  // Generate a realistic value based on the month (season)
  const month = date.getMonth();
  const seasonFactor = 0.5 + 0.3 * Math.sin((month - 2) * Math.PI / 6); // Peak in summer
  
  // Add some randomness
  const baseNdvi = seasonFactor + (Math.random() * 0.2 - 0.1);
  const avgNdvi = Math.max(0.1, Math.min(0.9, baseNdvi));
  
  // Generate min/max values around the average
  const minNdvi = Math.max(0.05, avgNdvi - 0.1 - Math.random() * 0.1);
  const maxNdvi = Math.min(0.95, avgNdvi + 0.1 + Math.random() * 0.1);
  
  // Generate zones
  const zoneCount = 5;
  const zoneStep = (maxNdvi - minNdvi) / zoneCount;
  
  const zones = Array.from({ length: zoneCount }, (_, i) => {
    const min = minNdvi + i * zoneStep;
    const max = minNdvi + (i + 1) * zoneStep;
    const average = (min + max) / 2 + (Math.random() * 0.02 - 0.01);
    const count = Math.floor(100 + Math.random() * 200);
    
    return {
      min,
      max,
      average,
      count,
      percentage: count / 1000 * 100
    };
  });
  
  return {
    averageNdvi: avgNdvi,
    minNdvi: minNdvi,
    maxNdvi: maxNdvi,
    zones: zones,
    date: date.toISOString()
  };
};

/**
 * Helper function to extract bounding box from GeoJSON boundaries
 */
const getBoundingBoxFromBoundaries = (boundaries) => {
  // Handle the case when boundaries might not have the expected structure
  if (!boundaries || !boundaries.coordinates || !boundaries.coordinates[0]) {
    // Return a default bounding box covering a small area
    return {
      min_lon: -0.1,
      max_lon: 0.1,
      min_lat: -0.1,
      max_lat: 0.1
    };
  }
  
  const coordinates = boundaries.coordinates[0];
  const lons = coordinates.map(coord => coord[0]);
  const lats = coordinates.map(coord => coord[1]);
  
  return {
    min_lon: Math.min(...lons),
    max_lon: Math.max(...lons),
    min_lat: Math.min(...lats),
    max_lat: Math.max(...lats)
  };
}; 