import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CloudSun, Cloud, CloudRain, CloudLightning, CloudSnow, Thermometer, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile } from '@/lib/firestore';
import { useMediaQuery } from '@/hooks/useMediaQuery';

type WeatherDay = {
  day: string;
  temperature: number;
  weatherType: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';
  precipitation: number;
  humidity: number;
};

const weatherForecast: WeatherDay[] = [
  {
    day: 'Today',
    temperature: 32,
    weatherType: 'sunny',
    precipitation: 0,
    humidity: 45,
  },
  {
    day: 'Tomorrow',
    temperature: 30,
    weatherType: 'cloudy',
    precipitation: 10,
    humidity: 60,
  },
  {
    day: 'Wed',
    temperature: 29,
    weatherType: 'rainy',
    precipitation: 60,
    humidity: 75,
  },
  {
    day: 'Thu',
    temperature: 28,
    weatherType: 'rainy',
    precipitation: 70,
    humidity: 85,
  },
  {
    day: 'Fri',
    temperature: 30,
    weatherType: 'cloudy',
    precipitation: 20,
    humidity: 65,
  },
];

const getWeatherIcon = (type: string) => {
  switch (type) {
    case 'sunny':
      return <CloudSun className="h-6 w-6 text-yellow-500" />;
    case 'cloudy':
      return <Cloud className="h-6 w-6 text-gray-500" />;
    case 'rainy':
      return <CloudRain className="h-6 w-6 text-blue-500" />;
    case 'stormy':
      return <CloudLightning className="h-6 w-6 text-purple-500" />;
    case 'snowy':
      return <CloudSnow className="h-6 w-6 text-blue-300" />;
    default:
      return <CloudSun className="h-6 w-6 text-yellow-500" />;
  }
};

const WeatherForecastCard = () => {
  const [location, setLocation] = useState('Loading location...');
  const { currentUser } = useAuth();
  const isMobile = useMediaQuery('(max-width: 640px)');
  
  useEffect(() => {
    const fetchUserLocation = async () => {
      if (currentUser) {
        try {
          const userProfile = await getUserProfile(currentUser.uid);
          if (userProfile?.location) {
            setLocation(userProfile.location);
          } else {
            setLocation('Tirupati, Andhra Pradesh'); // Default if not set
          }
        } catch (error) {
          console.error('Error fetching user location:', error);
          setLocation('Tirupati, Andhra Pradesh'); // Default on error
        }
      }
    };
    
    fetchUserLocation();
  }, [currentUser]);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-agri-blue">
          <div className="flex items-center">
            <CloudSun className="mr-2 h-5 w-5" />
            {isMobile ? 'Weather' : '5-Day Weather Forecast'}
          </div>
        </CardTitle>
        <span className="text-xs bg-agri-blue/10 text-agri-blue px-2 py-1 rounded-full flex items-center">
          <MapPin className="h-3 w-3 mr-1" />
          {isMobile ? location.split(',')[0] : location}
        </span>
      </CardHeader>
      <CardContent>
        <div className={`grid ${isMobile ? 'grid-cols-3 gap-1' : 'grid-cols-5 gap-2'}`}>
          {weatherForecast.slice(0, isMobile ? 3 : 5).map((day) => (
            <div 
              key={day.day} 
              className="flex flex-col items-center p-2 rounded-lg bg-gray-50"
            >
              <span className="text-xs font-medium mb-1">{day.day}</span>
              <div className="mb-1">{getWeatherIcon(day.weatherType)}</div>
              <div className="flex items-center mb-1">
                <Thermometer className="h-3 w-3 text-red-500 mr-1" />
                <span className="text-sm font-bold">{day.temperature}°C</span>
              </div>
              <div className="text-xs text-gray-500">
                {day.precipitation > 0 ? `${day.precipitation}% rain` : 'No rain'}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 bg-blue-50 rounded-lg p-3">
          <div className="flex items-start">
            <CloudRain className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-500 mr-2 mt-0.5`} />
            <div>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-blue-700`}>Rainfall Alert</p>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-600`}>
                {isMobile ? 'Rain expected Wed-Thu' : 'Moderate to heavy rainfall expected on Wednesday and Thursday. Consider delaying any planned spraying activities.'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherForecastCard;
