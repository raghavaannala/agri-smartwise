
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CloudSun, Cloud, CloudRain, CloudLightning, CloudSnow, Thermometer } from 'lucide-react';

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
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-agri-blue">
          <div className="flex items-center">
            <CloudSun className="mr-2 h-5 w-5" />
            5-Day Weather Forecast
          </div>
        </CardTitle>
        <span className="text-xs bg-agri-blue/10 text-agri-blue px-2 py-1 rounded-full">
          Tirupati, Andhra Pradesh
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {weatherForecast.map((day) => (
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
            <CloudRain className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-700">Rainfall Alert</p>
              <p className="text-xs text-blue-600">
                Moderate to heavy rainfall expected on Wednesday and Thursday. 
                Consider delaying any planned spraying activities.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherForecastCard;
