import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CloudSun, Sun, Cloud, CloudRain, Wind, Loader, RefreshCw, MapPin, AlertTriangle, Settings } from 'lucide-react';
import { useLocation } from '../hooks/useLocation';
import { getCurrentWeather, getForecast } from '../services/weatherService';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';

const Weather = () => {
  // Location states
  const { location, loading: locationLoading, error: locationError, usingFallback, requestLocationPermission, permissionState } = useLocation();
  
  // Weather states
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  useEffect(() => {
    if (location) {
      fetchWeatherData(location.latitude, location.longitude);
    }
  }, [location]);

  const fetchWeatherData = async (lat, lon) => {
    try {
      setLoading(true);
      console.log(`Fetching weather data for coordinates: ${lat}, ${lon}`);
      
      // Add a small delay to ensure UI state changes are visible
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const [weatherData, forecastData] = await Promise.all([
        getCurrentWeather(lat, lon),
        getForecast(lat, lon)
      ]);
      
      if (!weatherData || !forecastData) {
        throw new Error('Received empty data from weather API');
      }
      
      console.log('Weather data received:', weatherData);
      console.log('Forecast data received:', forecastData);
      
      setCurrentWeather(weatherData);
      setForecast(forecastData);
      setLoading(false);
      setIsRefreshing(false);
    } catch (err) {
      console.error('Error fetching weather data:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to fetch weather data. Please try again later.';
      setError(errorMessage);
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (location && !isRefreshing) {
      setIsRefreshing(true);
      setError(null); // Clear any previous errors
      fetchWeatherData(location.latitude, location.longitude);
    }
  };

  const handleRequestLocation = () => {
    // If permission is already denied, show the dialog with instructions
    if (permissionState === 'denied') {
      setShowPermissionDialog(true);
      return;
    }
    
    requestLocationPermission();
    toast({
      title: "Requesting Location",
      description: "Please allow location access when prompted by your browser.",
      duration: 5000,
    });
  };

  // Loading state
  if (locationLoading || loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[70vh]">
          <Loader className="h-10 w-10 text-agri-darkGreen animate-spin mb-4" />
          <p className="text-agri-darkGreen">Loading weather data...</p>
        </div>
      </MainLayout>
    );
  }

  // If data is successfully loaded
  if (currentWeather && forecast) {
    // Helper function to get day name
    const getDayName = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    };

    // Process forecast data to get daily forecasts (OpenWeather returns 3-hour forecasts)
    const dailyForecasts = [];
    const processedDays = new Set();
    
    // Skip today
    const today = new Date().toISOString().split('T')[0];
    processedDays.add(today);
    
    // Get next 4 days
    forecast.list.forEach(item => {
      const day = item.dt_txt.split(' ')[0];
      if (!processedDays.has(day) && dailyForecasts.length < 4) {
        processedDays.add(day);
        dailyForecasts.push(item);
      }
    });

    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-agri-darkGreen">Weather Forecast</h1>
            <div className="flex items-center gap-2">
              {usingFallback && (
                <Button
                  onClick={handleRequestLocation}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 text-amber-600 border-amber-200 bg-amber-50"
                >
                  <MapPin className="h-4 w-4" />
                  Use My Location
                </Button>
              )}
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {usingFallback && (
            <Card className="mb-6 bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-800 mb-1">Using Default Location</h3>
                    <p className="text-sm text-amber-700">
                      We're showing weather for Hyderabad because we couldn't access your location.
                    </p>
                    <Button onClick={handleRequestLocation} variant="link" className="text-amber-600 p-0 h-auto mt-1 font-medium">
                      {permissionState === 'denied' 
                        ? 'Click here for instructions to enable location access' 
                        : 'Click here to use your actual location'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card className="mb-6">
            <CardHeader className="bg-agri-lightBlue/10">
              <CardTitle className="text-agri-darkGreen flex items-center">
                <CloudSun className="mr-2 h-5 w-5" />
                Weather Forecast
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-between bg-gradient-to-r from-agri-lightBlue/10 to-agri-blue/5 p-4 rounded-xl">
                  <div className="text-center md:text-left mb-4 md:mb-0">
                    <h3 className="text-xl font-medium text-gray-700">{currentWeather.name}, {currentWeather.sys.country}</h3>
                    <p className="text-sm text-gray-500">Today, {new Date().toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center">
                    <img 
                      src={`https://openweathermap.org/img/wn/${currentWeather.weather[0].icon}@2x.png`}
                      alt={currentWeather.weather[0].description}
                      className="h-16 w-16 mr-2" 
                    />
                    <div className="text-center">
                      <span className="text-3xl font-bold text-gray-800">{Math.round(currentWeather.main.temp)}°C</span>
                      <p className="text-sm text-gray-500">{currentWeather.weather[0].description}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {dailyForecasts.map((day, i) => (
                    <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 text-center">
                      <p className="font-medium text-gray-700">{getDayName(day.dt_txt)}</p>
                      <img 
                        src={`https://openweathermap.org/img/wn/${day.weather[0].icon}.png`}
                        alt={day.weather[0].description}
                        className="h-12 w-12 mx-auto my-1" 
                      />
                      <p className="font-medium text-gray-800">{Math.round(day.main.temp_max)}°/{Math.round(day.main.temp_min)}°</p>
                      <p className="text-xs text-gray-500">{day.weather[0].description}</p>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Humidity</p>
                    <p className="text-xl font-medium text-gray-800">{currentWeather.main.humidity}%</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Wind</p>
                    <p className="text-xl font-medium text-gray-800">{Math.round(currentWeather.wind.speed * 3.6)} km/h</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Pressure</p>
                    <p className="text-xl font-medium text-gray-800">{currentWeather.main.pressure} hPa</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Permission help dialog */}
          <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" /> Enable Location Access
                </DialogTitle>
                <DialogDescription>
                  Your browser is blocking location access. Follow these steps based on your browser:
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-2">
                <div className="rounded-lg border p-3">
                  <h4 className="font-medium mb-1">Chrome</h4>
                  <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                    <li>Click the lock/info icon in the address bar</li>
                    <li>Select "Site settings"</li>
                    <li>Under "Permissions", change Location to "Allow"</li>
                    <li>Refresh the page</li>
                  </ol>
                </div>
                
                <div className="rounded-lg border p-3">
                  <h4 className="font-medium mb-1">Firefox</h4>
                  <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                    <li>Click the lock icon in the address bar</li>
                    <li>Click "Clear Permission"</li>
                    <li>Refresh the page and try again</li>
                  </ol>
                </div>
                
                <div className="rounded-lg border p-3">
                  <h4 className="font-medium mb-1">Safari</h4>
                  <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                    <li>Go to Safari Preferences</li>
                    <li>Click "Websites" tab, then "Location"</li>
                    <li>Find this website and set to "Allow"</li>
                    <li>Refresh the page</li>
                  </ol>
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={() => setShowPermissionDialog(false)}>
                  I'll Try This
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </MainLayout>
    );
  }

  // Fallback for any other error case
  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error || "Unable to load weather data"}</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4">
                <Button onClick={handleRequestLocation} variant="outline">
                  <MapPin className="h-4 w-4 mr-2" />
                  Try Using My Location
                </Button>
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Weather Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Weather;
