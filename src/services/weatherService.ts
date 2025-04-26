const API_KEY = '9dacd1a82a0717a5b52f5fa58790e199';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

export async function getCurrentWeather(lat: number, lon: number) {
  try {
    if (!lat || !lon) {
      throw new Error('Invalid coordinates provided');
    }
    
    console.log(`Fetching current weather for lat: ${lat}, lon: ${lon}`);
    const response = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Weather API error:', response.status, errorText);
      
      if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 404) {
        throw new Error('Location not found');
      } else if (response.status === 429) {
        throw new Error('API rate limit exceeded');
      } else {
        throw new Error(`Failed to fetch weather data: ${response.status} ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    console.log('Successfully fetched current weather data');
    return data;
  } catch (error) {
    console.error('Error in getCurrentWeather:', error);
    throw error;
  }
}

export async function getForecast(lat: number, lon: number) {
  try {
    if (!lat || !lon) {
      throw new Error('Invalid coordinates provided');
    }
    
    console.log(`Fetching forecast for lat: ${lat}, lon: ${lon}`);
    const response = await fetch(
      `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Forecast API error:', response.status, errorText);
      
      if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 404) {
        throw new Error('Location not found');
      } else if (response.status === 429) {
        throw new Error('API rate limit exceeded');
      } else {
        throw new Error(`Failed to fetch forecast data: ${response.status} ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    console.log('Successfully fetched forecast data');
    return data;
  } catch (error) {
    console.error('Error in getForecast:', error);
    throw error;
  }
} 