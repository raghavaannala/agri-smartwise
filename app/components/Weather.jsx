import { useState, useEffect } from 'react';
import { useLocation } from '../hooks/useLocation';
import { getCurrentWeather } from '../services/weatherService';

export default function Weather() {
  const { location, loading: locationLoading, error: locationError } = useLocation();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (location) {
      fetchWeather(location.latitude, location.longitude);
    }
  }, [location]);

  async function fetchWeather(lat, lon) {
    try {
      setLoading(true);
      const data = await getCurrentWeather(lat, lon);
      setWeather(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch weather data');
      setLoading(false);
    }
  }

  if (locationLoading || loading) return <div>Loading weather data...</div>;
  if (locationError) return <div>Error: {locationError}</div>;
  if (error) return <div>Error: {error}</div>;
  if (!weather) return null;

  return (
    <div className="weather-card">
      <h3>Current Weather in {weather.name}</h3>
      <div className="weather-details">
        <img 
          src={`http://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`} 
          alt={weather.weather[0].description} 
        />
        <p className="temperature">{Math.round(weather.main.temp)}°C</p>
        <p className="description">{weather.weather[0].description}</p>
      </div>
      <div className="weather-info">
        <p>Humidity: {weather.main.humidity}%</p>
        <p>Wind: {weather.wind.speed} m/s</p>
      </div>
    </div>
  );
} 