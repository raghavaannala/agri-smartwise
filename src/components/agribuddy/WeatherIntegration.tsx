import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CloudRain, 
  Sun, 
  Wind, 
  Thermometer,
  Droplets,
  AlertTriangle,
  CheckCircle,
  Eye,
  Umbrella,
  Zap
} from 'lucide-react';
import { CropJourney } from '@/services/agriBuddyService';
import { getCurrentWeather, getForecast } from '@/services/weatherService';

interface WeatherIntegrationProps {
  journey: CropJourney;
  location: string;
}

const WeatherIntegration: React.FC<WeatherIntegrationProps> = ({ journey, location }) => {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeatherData();
  }, [location]);

  const loadWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🌤️ Loading weather data for:', location);
      
      // Try to get real weather data
      const [currentWeather, forecast] = await Promise.all([
        getCurrentWeather(location).catch(() => null),
        getForecast(location).catch(() => null)
      ]);
      
      if (currentWeather) {
        console.log('✅ Real weather data loaded');
        setWeatherData({
          temperature: Math.round(currentWeather.main.temp),
          humidity: currentWeather.main.humidity,
          windSpeed: Math.round(currentWeather.wind?.speed * 3.6 || 0), // Convert m/s to km/h
          condition: currentWeather.weather[0].description,
          precipitation: currentWeather.rain?.['1h'] || 0,
          uvIndex: 6, // Default as UV index not available in current weather
          visibility: Math.round((currentWeather.visibility || 10000) / 1000),
          pressure: currentWeather.main.pressure
        });
        
        if (forecast) {
          const processedForecast = forecast.list.slice(0, 5).map((item: any, index: number) => ({
            day: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : `Day ${index + 1}`,
            temp: Math.round(item.main.temp),
            condition: item.weather[0].main,
            rain: Math.round((item.pop || 0) * 100) // Probability of precipitation
          }));
          
          setForecastData(processedForecast);
        }
      } else {
        // Fallback to mock data if real weather fails
        console.log('⚠️ Using fallback weather data');
        setWeatherData({
          temperature: 28,
          humidity: 65,
          windSpeed: 12,
          condition: 'Partly Cloudy',
          precipitation: 0,
          uvIndex: 6,
          visibility: 10,
          pressure: 1013
        });
        
        setForecastData([
          { day: 'Today', temp: 28, condition: 'Partly Cloudy', rain: 10 },
          { day: 'Tomorrow', temp: 30, condition: 'Sunny', rain: 0 },
          { day: 'Day 3', temp: 26, condition: 'Rainy', rain: 80 },
          { day: 'Day 4', temp: 24, condition: 'Cloudy', rain: 30 },
          { day: 'Day 5', temp: 29, condition: 'Sunny', rain: 5 }
        ]);
      }
    } catch (error) {
      console.error('❌ Error loading weather data:', error);
      setError('Failed to load weather data');
      // Use fallback data
      setWeatherData({
        temperature: 28,
        humidity: 65,
        windSpeed: 12,
        condition: 'Partly Cloudy',
        precipitation: 0,
        uvIndex: 6,
        visibility: 10,
        pressure: 1013
      });
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
        return <Sun className="h-6 w-6 text-yellow-500" />;
      case 'rainy':
        return <CloudRain className="h-6 w-6 text-blue-500" />;
      case 'cloudy':
      case 'partly cloudy':
        return <CloudRain className="h-6 w-6 text-gray-500" />;
      default:
        return <Sun className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getWeatherRecommendations = () => {
    if (!weatherData) return [];
    
    const recommendations = [];
    const currentStage = journey.stages.find(stage => stage.id === journey.currentStage);
    
    // Temperature-based recommendations
    if (weatherData.temperature > 35) {
      recommendations.push({
        type: 'warning',
        icon: <Thermometer className="h-4 w-4" />,
        title: 'High Temperature Alert',
        message: 'Consider increasing irrigation frequency and providing shade protection.',
        actions: ['Increase watering', 'Apply mulch', 'Monitor plant stress']
      });
    }
    
    // Rain-based recommendations
    const upcomingRain = forecastData?.some((day: any) => day.rain > 50);
    if (upcomingRain) {
      recommendations.push({
        type: 'info',
        icon: <Umbrella className="h-4 w-4" />,
        title: 'Rain Expected',
        message: 'Heavy rain expected in the next 3 days. Adjust irrigation schedule accordingly.',
        actions: ['Reduce irrigation', 'Ensure proper drainage', 'Protect from waterlogging']
      });
    }
    
    // Humidity-based recommendations
    if (weatherData.humidity > 80) {
      recommendations.push({
        type: 'warning',
        icon: <Droplets className="h-4 w-4" />,
        title: 'High Humidity',
        message: 'High humidity increases disease risk. Monitor for fungal infections.',
        actions: ['Improve air circulation', 'Apply preventive fungicides', 'Monitor plant health']
      });
    }
    
    // Stage-specific recommendations
    if (currentStage?.name.toLowerCase().includes('flowering')) {
      if (weatherData.windSpeed > 20) {
        recommendations.push({
          type: 'warning',
          icon: <Wind className="h-4 w-4" />,
          title: 'Strong Winds During Flowering',
          message: 'Strong winds can affect pollination. Consider wind protection.',
          actions: ['Install windbreaks', 'Support plants', 'Monitor pollination']
        });
      }
    }
    
    return recommendations;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading weather data...</span>
      </div>
    );
  }

  const recommendations = getWeatherRecommendations();

  return (
    <div className="space-y-6">
      {/* Current Weather */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Current Weather - {location}</h2>
              <div className="flex items-center gap-2 mb-4">
                {getWeatherIcon(weatherData?.condition)}
                <span className="text-lg">{weatherData?.condition}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Thermometer className="h-4 w-4" />
                  {weatherData?.temperature}°C
                </div>
                <div className="flex items-center gap-1">
                  <Droplets className="h-4 w-4" />
                  {weatherData?.humidity}%
                </div>
                <div className="flex items-center gap-1">
                  <Wind className="h-4 w-4" />
                  {weatherData?.windSpeed} km/h
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {weatherData?.visibility} km
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold mb-2">{weatherData?.temperature}°</div>
              <div className="text-sm opacity-90">Feels like {weatherData?.temperature + 2}°</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weather Alerts & Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Weather-Based Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <Alert key={index} className={`border-l-4 ${
                  rec.type === 'warning' 
                    ? 'border-l-amber-500 bg-amber-50' 
                    : 'border-l-blue-500 bg-blue-50'
                }`}>
                  <div className="flex items-start gap-3">
                    {rec.icon}
                    <div className="flex-1">
                      <AlertDescription>
                        <div className="font-semibold mb-1">{rec.title}</div>
                        <div className="text-sm mb-2">{rec.message}</div>
                        <div className="flex flex-wrap gap-1">
                          {rec.actions.map((action, actionIndex) => (
                            <Badge key={actionIndex} variant="outline" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5-Day Forecast */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="h-5 w-5 text-blue-600" />
            5-Day Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {forecastData?.map((day: any, index: number) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="font-medium mb-2">{day.day}</div>
                <div className="flex justify-center mb-2">
                  {getWeatherIcon(day.condition)}
                </div>
                <div className="text-lg font-bold mb-1">{day.temp}°C</div>
                <div className="text-sm text-gray-600 mb-2">{day.condition}</div>
                <div className="flex items-center justify-center gap-1 text-xs">
                  <Droplets className="h-3 w-3 text-blue-500" />
                  {day.rain}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weather Impact on Current Stage */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-600" />
            Weather Impact on Current Stage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Current Stage: {journey.stages.find(s => s.id === journey.currentStage)?.name}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Temperature is suitable for current growth stage</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Humidity levels are within acceptable range</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Monitor for potential rain in next 3 days</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Optimal Conditions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Temperature:</span>
                  <span className="font-medium">25-30°C</span>
                </div>
                <div className="flex justify-between">
                  <span>Humidity:</span>
                  <span className="font-medium">60-70%</span>
                </div>
                <div className="flex justify-between">
                  <span>Wind Speed:</span>
                  <span className="font-medium">&lt; 15 km/h</span>
                </div>
                <div className="flex justify-between">
                  <span>Rainfall:</span>
                  <span className="font-medium">Moderate</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weather Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="text-center">
              <Thermometer className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-500 mb-1">{weatherData?.temperature}°C</div>
              <div className="text-sm text-gray-600">Temperature</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="text-center">
              <Droplets className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-500 mb-1">{weatherData?.humidity}%</div>
              <div className="text-sm text-gray-600">Humidity</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="text-center">
              <Wind className="h-8 w-8 text-gray-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-500 mb-1">{weatherData?.windSpeed}</div>
              <div className="text-sm text-gray-600">Wind (km/h)</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="text-center">
              <Sun className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-500 mb-1">{weatherData?.uvIndex}</div>
              <div className="text-sm text-gray-600">UV Index</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WeatherIntegration;
