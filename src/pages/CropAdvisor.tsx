import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Droplets, Thermometer, Leaf, Clock, ArrowRight, Loader2, Sun, Cloud, Calendar, Building2, AlertCircle, MapPin, CloudSun } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getCurrentWeather, getForecast } from '@/services/weatherService';
import { useLocation } from '@/hooks/useLocation';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getUserFarms, FarmData } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Sample crop icons and colors for recommendations
const cropIcons = {
  rice: { icon: <Droplets className="h-5 w-5" />, color: 'bg-blue-100 text-blue-700' },
  wheat: { icon: <Sun className="h-5 w-5" />, color: 'bg-amber-100 text-amber-700' },
  cotton: { icon: <Sun className="h-5 w-5" />, color: 'bg-amber-100 text-amber-700' },
  sugarcane: { icon: <Leaf className="h-5 w-5" />, color: 'bg-green-100 text-green-700' },
  default: { icon: <Leaf className="h-5 w-5" />, color: 'bg-green-100 text-green-700' }
};

// Sample climate data
const climateData = {
  default: {
    temperature: {
      summer: { value: 90, range: '32-40°C' },
      monsoon: { value: 70, range: '26-32°C' },
      winter: { value: 40, range: '18-26°C' }
    },
    rainfall: {
      'Jun-Sep': { value: 85, range: '700-900mm' },
      'Oct-Dec': { value: 40, range: '200-350mm' },
      'Jan-May': { value: 10, range: '50-150mm' }
    },
    seasons: [
      { month: 'June-July', condition: 'Monsoon Onset', advice: 'Ideal for rice planting' },
      { month: 'August-September', condition: 'Heavy Rainfall', advice: 'Ensure proper drainage' },
      { month: 'October-November', condition: 'Post-Monsoon', advice: 'Start wheat and rabi crops' }
    ]
  }
};

// Helper function to get current season
const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1; // getMonth() returns 0-11
  
  if (month >= 3 && month <= 5) {
    return 'Summer';
  } else if (month >= 6 && month <= 9) {
    return 'Monsoon';
  } else if (month >= 10 && month <= 11) {
    return 'Post-Monsoon';
  } else {
    return 'Winter';
  }
};

// Helper function to get expected yield based on crop type
const getExpectedYield = (cropName: string): string => {
  const yields: { [key: string]: string } = {
    rice: '5.8 tons/ha',
    wheat: '4.2 tons/ha',
    cotton: '2.3 tons/ha',
    sugarcane: '80 tons/ha',
    corn: '6.5 tons/ha',
    maize: '6.5 tons/ha',
    soybean: '2.8 tons/ha',
    tomato: '45 tons/ha',
    potato: '25 tons/ha',
    onion: '20 tons/ha',
    groundnut: '2.5 tons/ha',
    sunflower: '1.8 tons/ha',
    mustard: '1.5 tons/ha',
    barley: '3.5 tons/ha',
    millet: '2.2 tons/ha',
    sorghum: '3.0 tons/ha'
  };
  return yields[cropName.toLowerCase()] || `${(Math.random() * 5 + 2).toFixed(1)} tons/ha`;
};

// Helper function to get growing period based on crop type
const getGrowingPeriod = (cropName: string): string => {
  const periods: { [key: string]: string } = {
    rice: '120-140 days',
    wheat: '110-130 days',
    cotton: '160-180 days',
    sugarcane: '10-12 months',
    corn: '90-110 days',
    maize: '90-110 days',
    soybean: '100-120 days',
    tomato: '70-90 days',
    potato: '90-110 days',
    onion: '120-150 days',
    groundnut: '110-130 days',
    sunflower: '90-110 days',
    mustard: '90-110 days',
    barley: '110-130 days',
    millet: '70-90 days',
    sorghum: '100-120 days'
  };
  return periods[cropName.toLowerCase()] || `${Math.floor(Math.random() * 60) + 90} days`;
};

// Helper function to get water requirements based on crop type
const getWaterRequirements = (cropName: string): string => {
  const requirements: { [key: string]: string } = {
    rice: 'High (1200-1500mm)',
    wheat: 'Medium (450-650mm)',
    cotton: 'Medium (700-900mm)',
    sugarcane: 'High (1500-2500mm)',
    corn: 'Medium (500-800mm)',
    maize: 'Medium (500-800mm)',
    soybean: 'Medium (450-700mm)',
    tomato: 'Medium (400-600mm)',
    potato: 'Medium (500-700mm)',
    onion: 'Medium (350-550mm)',
    groundnut: 'Low (500-750mm)',
    sunflower: 'Medium (400-600mm)',
    mustard: 'Low (300-400mm)',
    barley: 'Medium (450-650mm)',
    millet: 'Low (300-500mm)',
    sorghum: 'Low (450-650mm)'
  };
  return requirements[cropName.toLowerCase()] || 'Medium (500-800mm)';
};

// Helper function to get location-based recommendations
const getLocationBasedRecommendations = (location: string, soilType: string) => {
  // Default recommendations based on common crops for the region
  const defaultCrops = ['Rice', 'Cotton', 'Sugarcane'];
  
  return defaultCrops.map((cropName, index) => {
    const cropNameLower = cropName.toLowerCase();
    let iconConfig = cropIcons.default;
    
    for (const key in cropIcons) {
      if (key !== 'default' && (cropNameLower.includes(key) || key.includes(cropNameLower))) {
        iconConfig = cropIcons[key as keyof typeof cropIcons];
        break;
      }
    }
    
    return {
      cropName,
      confidence: 85 + index * 3,
      expectedYield: getExpectedYield(cropName),
      growingPeriod: getGrowingPeriod(cropName),
      waterRequirements: getWaterRequirements(cropName),
      weatherSuitability: `${cropName} is suitable for the current weather conditions in ${location}.`,
      seasonalAdvice: `Best planting time for ${cropName} in your region is during the appropriate season.`,
      icon: iconConfig.icon,
      color: iconConfig.color
    };
  });
};

// Helper function to extract specific crop information from AI response
const extractCropInfo = (response: string, cropName: string) => {
  const cropInfo: any = {};
  
  // Extract yield information
  const yieldPattern = new RegExp(`${cropName}.*?yield.*?(\\d+(?:\\.\\d+)?)\\s*(?:tons?/ha|kg/ha)`, 'gi');
  const yieldMatch = response.match(yieldPattern);
  if (yieldMatch && yieldMatch[0]) {
    const yieldNumbers = yieldMatch[0].match(/(\d+(?:\.\d+)?)/);
    if (yieldNumbers && yieldNumbers[1]) {
      cropInfo.yield = yieldNumbers[1] + ' tons/ha';
    }
  }
  
  // Extract growing period information
  const periodPattern = new RegExp(`${cropName}.*?(?:growing|period).*?(\\d+(?:-\\d+)?)\\s*(?:days|months)`, 'gi');
  const periodMatch = response.match(periodPattern);
  if (periodMatch && periodMatch[0]) {
    const periodNumbers = periodMatch[0].match(/(\d+(?:-\d+)?)\s*(?:days|months)/);
    if (periodNumbers && periodNumbers[1]) {
      cropInfo.period = periodNumbers[1] + ' days';
    }
  }
  
  // Extract water requirements information
  const waterPattern = new RegExp(`${cropName}.*?water.*?(high|medium|low|moderate)`, 'gi');
  const waterMatch = response.match(waterPattern);
  if (waterMatch && waterMatch[0]) {
    const waterLevel = waterMatch[0].match(/(high|medium|low|moderate)/i);
    if (waterLevel && waterLevel[1]) {
      const level = waterLevel[1].charAt(0).toUpperCase() + waterLevel[1].slice(1);
      cropInfo.water = level + ' (500-800mm)';
    }
  }
  
  // Extract weather suitability information
  const weatherPattern = new RegExp(`${cropName}.*?(?:weather|suitable).*?(suitable|excellent|good|poor|tolerates)`, 'gi');
  const weatherMatch = response.match(weatherPattern);
  if (weatherMatch && weatherMatch[0]) {
    cropInfo.weatherSuitability = `${cropName} shows good weather suitability for current conditions.`;
  }
  
  // Extract seasonal advice information
  const seasonalPattern = new RegExp(`${cropName}.*?(?:season|plant|advice).*?(monsoon|winter|summer|plant|harvest)`, 'gi');
  const seasonalMatch = response.match(seasonalPattern);
  if (seasonalMatch && seasonalMatch[0]) {
    cropInfo.seasonalAdvice = `Optimal planting time for ${cropName} based on current seasonal conditions.`;
  }
  
  return cropInfo;
};

const CropAdvisor = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('recommendations');
  const [activeSubTab, setActiveSubTab] = useState('form');
  const [userFarms, setUserFarms] = useState<FarmData[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [error, setError] = useState('');
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  
  const { location, locationLoading, requestLocation } = useLocation();
  
  const [formData, setFormData] = useState({
    location: 'Andhra Pradesh, India',
    soilType: 'clay',
    cropType: 'grain',
    waterAvailability: 70,
    landSize: '5',
    previousCrop: ''
  });

  // Get crop recommendations
  const handleGetRecommendations = async () => {
    setIsLoading(true);
    setError('');
    
    if (!formData.location) {
      setError('Please provide a location for accurate recommendations');
      setIsLoading(false);
      return;
    }
    
    try {
      // Prepare weather context for better recommendations
      let weatherContext = '';
      if (currentWeather && forecast) {
        const currentTemp = Math.round(currentWeather.main.temp);
        const humidity = currentWeather.main.humidity;
        const weatherCondition = currentWeather.weather[0].main;
        const windSpeed = Math.round(currentWeather.wind.speed * 3.6);
        
        // Get upcoming weather trends from forecast
        const upcomingDays = forecast.list.slice(0, 8); // Next 24 hours (3-hour intervals)
        const avgTemp = upcomingDays.reduce((sum: number, item: any) => sum + item.main.temp, 0) / upcomingDays.length;
        const rainProbability = upcomingDays.some((item: any) => item.weather[0].main.includes('Rain'));
        
        weatherContext = `
        Current Weather Conditions:
        - Temperature: ${currentTemp}°C (Average upcoming: ${Math.round(avgTemp)}°C)
        - Humidity: ${humidity}%
        - Weather: ${weatherCondition}
        - Wind Speed: ${windSpeed} km/h
        - Rain Expected: ${rainProbability ? 'Yes' : 'No'}
        - Season: ${getCurrentSeason()}
        `;
      }
      
      // Call the AI service with the fixed getFarmingRecommendation function
      let response;
      try {
        // Use getFarmingRecommendation for proper retry handling and timeouts
        const { getFarmingRecommendation } = await import('@/services/geminiService');
        
        // Prepare user profile for the recommendation function
        const userProfile = {
          location: formData.location,
          farmType: formData.cropType,
          crops: formData.previousCrop ? [formData.previousCrop] : [],
          soilType: formData.soilType
        };
        
        // Create a comprehensive query that includes all farm data and weather context
        const comprehensiveQuery = `
          Farm Analysis Request:
          Location: ${formData.location}
          Soil Type: ${formData.soilType}
          Water Availability: ${formData.waterAvailability}%
          Farm Size: ${formData.landSize} hectares
          Previous Crop: ${formData.previousCrop || 'None'}
          Preferred Type: ${formData.cropType}
          
          ${weatherContext}
          
          Please recommend 3 suitable crops for this farm with specific details including suitability scores, expected yields, growing periods, water requirements, weather suitability, and seasonal advice.
        `;
        
        response = await getFarmingRecommendation(userProfile, comprehensiveQuery, 'en');
      } catch (aiError) {
        console.error('AI service error:', aiError);
        throw new Error('AI recommendation service failed');
      }
      
      console.log("AI service response received:", response);
      
      // Process the AI response to extract crop recommendations
      let formattedRecommendations = [];
      
      // Enhanced crop extraction with more comprehensive keyword matching
      const cropKeywords = [
        'rice', 'wheat', 'cotton', 'sugarcane', 'corn', 'maize', 'soybean', 'soya', 
        'tomato', 'potato', 'onion', 'groundnut', 'peanut', 'sunflower', 'mustard', 
        'barley', 'millet', 'sorghum', 'jowar', 'bajra', 'ragi', 'chickpea', 'chana',
        'lentil', 'dal', 'cabbage', 'cauliflower', 'brinjal', 'eggplant', 'okra',
        'bhindi', 'spinach', 'carrot', 'radish', 'beetroot', 'cucumber', 'pumpkin',
        'watermelon', 'mango', 'banana', 'papaya', 'guava', 'coconut', 'cashew'
      ];
      
      // Try multiple extraction methods
      let foundCrops = [];
      
      // Method 1: Direct keyword matching
      foundCrops = cropKeywords.filter(crop => 
        response.toLowerCase().includes(crop.toLowerCase())
      ).slice(0, 3);
      
      // Method 2: If no crops found, try pattern matching for recommendations
      if (foundCrops.length === 0) {
        const recommendationPatterns = [
          /recommend(?:ed|s|ing)?\s+(?:crops?|plants?)?\s*:?\s*([^.!?]+)/gi,
          /suitable\s+crops?\s*:?\s*([^.!?]+)/gi,
          /best\s+crops?\s*:?\s*([^.!?]+)/gi,
          /grow\s+([^.!?]+)/gi,
          /plant\s+([^.!?]+)/gi
        ];
        
        for (const pattern of recommendationPatterns) {
          const matches = response.matchAll(pattern);
          for (const match of matches) {
            const extractedText = match[1];
            const cropsInText = cropKeywords.filter(crop => 
              extractedText.toLowerCase().includes(crop.toLowerCase())
            );
            foundCrops.push(...cropsInText);
          }
          if (foundCrops.length >= 3) break;
        }
        foundCrops = [...new Set(foundCrops)].slice(0, 3); // Remove duplicates
      }
      
      // Method 3: If still no crops found, analyze the response for vegetable/grain context
      if (foundCrops.length === 0) {
        const responseText = response.toLowerCase();
        
        // For vegetable farming
        if (formData.cropType === 'vegetable' || responseText.includes('vegetable')) {
          if (responseText.includes('monsoon') || responseText.includes('rain')) {
            foundCrops = ['tomato', 'onion', 'okra'];
          } else {
            foundCrops = ['potato', 'cabbage', 'carrot'];
          }
        }
        // For grain farming
        else if (formData.cropType === 'grain' || responseText.includes('grain') || responseText.includes('cereal')) {
          if (responseText.includes('monsoon') || responseText.includes('rain')) {
            foundCrops = ['rice', 'corn', 'sorghum'];
          } else {
            foundCrops = ['wheat', 'barley', 'millet'];
          }
        }
        // For cash crops
        else if (formData.cropType === 'cash' || responseText.includes('cash')) {
          foundCrops = ['cotton', 'sugarcane', 'sunflower'];
        }
        // Default based on location and season
        else {
          const season = getCurrentSeason();
          if (season === 'Monsoon') {
            foundCrops = ['rice', 'cotton', 'sugarcane'];
          } else {
            foundCrops = ['wheat', 'tomato', 'onion'];
          }
        }
      }
      
      // Create structured recommendations from found crops
      if (foundCrops.length > 0) {
        formattedRecommendations = foundCrops.map((cropName, index) => {
          const cropNameCapitalized = cropName.charAt(0).toUpperCase() + cropName.slice(1);
          
          // Find matching icon
          let iconConfig = cropIcons.default;
          for (const key in cropIcons) {
            if (key !== 'default' && (cropName.toLowerCase().includes(key) || key.includes(cropName.toLowerCase()))) {
              iconConfig = cropIcons[key as keyof typeof cropIcons];
              break;
            }
          }
          
          // Extract specific information from AI response for this crop
          const cropSpecificInfo = extractCropInfo(response, cropName);
          
          return {
            cropName: cropNameCapitalized,
            confidence: Math.floor(Math.random() * 15) + 80 + (3 - index) * 5,
            expectedYield: cropSpecificInfo.yield || getExpectedYield(cropName),
            growingPeriod: cropSpecificInfo.period || getGrowingPeriod(cropName),
            waterRequirements: cropSpecificInfo.water || getWaterRequirements(cropName),
            weatherSuitability: cropSpecificInfo.weatherSuitability || `${cropNameCapitalized} is suitable for the current weather conditions in ${formData.location}.`,
            seasonalAdvice: cropSpecificInfo.seasonalAdvice || `Best planting time for ${cropNameCapitalized} in your region is during the appropriate season.`,
            icon: iconConfig.icon,
            color: iconConfig.color
          };
        });
      } else {
        // Final fallback to location-based recommendations
        formattedRecommendations = getLocationBasedRecommendations(formData.location, formData.soilType);
      }
      
      console.log("Successfully processed AI recommendations:", formattedRecommendations);
      
      // Update recommendations state with either the parsed data or defaults
      setRecommendations(formattedRecommendations);
      
      // Switch to recommendations tab
      setActiveSubTab('recommendations');
      
      toast({
        title: "Recommendations Ready",
        description: "Check out the suitable crops for your farm",
      });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      
      // Set default recommendations even when there's an error
      setRecommendations([
        {
          cropName: 'Rice',
          confidence: 92,
          expectedYield: '5.8 tons/ha',
          growingPeriod: '120-140 days',
          waterRequirements: 'High (1200-1500mm)',
          weatherSuitability: 'Rice is suitable for the current weather conditions.',
          seasonalAdvice: 'Best planting time for Rice is during monsoon season.',
          icon: cropIcons.rice.icon,
          color: cropIcons.rice.color
        },
        {
          cropName: 'Cotton',
          confidence: 87,
          expectedYield: '2.3 tons/ha',
          growingPeriod: '160-180 days',
          waterRequirements: 'Medium (700-900mm)',
          weatherSuitability: 'Cotton is suitable for the current weather conditions.',
          seasonalAdvice: 'Best planting time for Cotton is during summer season.',
          icon: cropIcons.cotton.icon,
          color: cropIcons.cotton.color
        },
        {
          cropName: 'Sugarcane',
          confidence: 78,
          expectedYield: '80 tons/ha',
          growingPeriod: '10-12 months',
          waterRequirements: 'High (1500-2500mm)',
          weatherSuitability: 'Sugarcane is suitable for the current weather conditions.',
          seasonalAdvice: 'Best planting time for Sugarcane is during winter season.',
          icon: cropIcons.sugarcane.icon,
          color: cropIcons.sugarcane.color
        }
      ]);
      
      // Still switch to recommendations tab
      setActiveSubTab('recommendations');
      
      // Show error in the UI
      setError('AI recommendation service unavailable. Showing default recommendations instead.');
      
      toast({
        title: "Using Default Recommendations",
        description: "AI service is currently unavailable. Showing general recommendations based on common crops.",
        variant: "default"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load user farms
  useEffect(() => {
    const loadUserFarms = async () => {
      if (currentUser) {
        setIsLoading(true);
        try {
          const farms = await getUserFarms(currentUser.uid);
          setUserFarms(farms);
          
          if (farms.length > 0) {
            setSelectedFarmId(farms[0].id);
            populateFormFromFarm(farms[0]);
          }
        } catch (error) {
          console.error("Error loading farms:", error);
          toast({
            title: "Error",
            description: "Failed to load your farms",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadUserFarms();
  }, [currentUser, toast]);
  
  // Fetch weather data when location changes
  useEffect(() => {
    const fetchWeatherData = async () => {
      if (location && !locationLoading) {
        setWeatherLoading(true);
        setWeatherError('');
        
        try {
          console.log(`Fetching weather data for coordinates: ${location.latitude}, ${location.longitude}`);
          
          const [weatherData, forecastData] = await Promise.all([
            getCurrentWeather(location.latitude, location.longitude),
            getForecast(location.latitude, location.longitude)
          ]);
          
          setCurrentWeather(weatherData);
          setForecast(forecastData);
          
          // Update form location with actual city name from weather data
          if (weatherData && weatherData.name) {
            setFormData(prev => ({
              ...prev,
              location: `${weatherData.name}, ${weatherData.sys.country}`
            }));
          }
          
          console.log('Weather data loaded successfully');
        } catch (error) {
          console.error('Error fetching weather data:', error);
          setWeatherError('Failed to fetch weather data');
        } finally {
          setWeatherLoading(false);
        }
      }
    };
    
    fetchWeatherData();
  }, [location, locationLoading]);
  
  // Populate form from farm
  const populateFormFromFarm = (farm: FarmData) => {
    const mainCrop = farm.crops && farm.crops.length > 0 ? farm.crops[0] : '';
    
    setFormData({
      location: farm.location || 'Andhra Pradesh, India',
      soilType: farm.soilType || 'clay',
      cropType: farm.farmType || 'grain',
      waterAvailability: 70,
      landSize: farm.size?.toString() || '5',
      previousCrop: mainCrop
    });
  };
  
  // Handle form input changes
  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle farm selection
  const handleFarmChange = (farmId: string) => {
    setSelectedFarmId(farmId);
    const selectedFarm = userFarms.find(farm => farm.id === farmId);
    if (selectedFarm) {
      populateFormFromFarm(selectedFarm);
    }
  };
  
  return (
    <MainLayout>
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center text-green-700 mb-6">
          <Leaf className="h-5 w-5 mr-2" />
          <h1 className="text-2xl font-semibold">Crop Recommendations</h1>
        </div>
        
        {/* Main Tabs */}
        <Tabs defaultValue="recommendations" value={activeMainTab} onValueChange={setActiveMainTab} className="mb-8">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="cropCalendar">Crop Calendar</TabsTrigger>
            <TabsTrigger value="climateAnalysis">Climate Analysis</TabsTrigger>
            <TabsTrigger value="seasonalForecast">Seasonal Forecast</TabsTrigger>
          </TabsList>
          
          {/* Recommendations Tab Content */}
          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Farm Parameters</CardTitle>
                  <div className="space-x-2">
                    <Button 
                      variant={activeSubTab === 'form' ? 'default' : 'outline'} 
                      onClick={() => setActiveSubTab('form')}
                    >
                      Farm Parameters
                    </Button>
                    <Button 
                      variant={activeSubTab === 'recommendations' ? 'default' : 'outline'} 
                      onClick={() => setActiveSubTab('recommendations')}
                    >
                      Recommendations
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Form Tab Content */}
                {activeSubTab === 'form' && (
                  <div className="space-y-6">
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Farm Selection Card */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                      <div className="flex items-center mb-2">
                        <Building2 className="h-5 w-5 text-green-600 mr-2" />
                        <h3 className="text-md font-medium text-green-700">Select Farm for Analysis</h3>
                      </div>
                      
                      {userFarms.length === 0 ? (
                        <div className="mb-2">
                          <p className="text-sm text-gray-600 mb-3">No farms found. Create a farm first to get personalized recommendations.</p>
                          <Button 
                            size="sm" 
                            onClick={() => navigate('/farm')}
                            variant="outline"
                            className="text-green-700 border-green-300"
                          >
                            Go to Farm Management
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="farmSelect">Choose a farm to analyze</Label>
                          <Select 
                            value={selectedFarmId} 
                            onValueChange={handleFarmChange}
                            disabled={isLoading}
                          >
                            <SelectTrigger id="farmSelect" className="bg-white">
                              <SelectValue placeholder="Select a farm" />
                            </SelectTrigger>
                            <SelectContent>
                              {userFarms.map(farm => (
                                <SelectItem key={farm.id} value={farm.id}>
                                  {farm.name} ({farm.size} ha, {farm.location})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">Farm data will be used to provide accurate crop recommendations</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Weather Information Card */}
                    {currentWeather && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <CloudSun className="h-5 w-5 text-blue-600 mr-2" />
                            <h3 className="text-md font-medium text-blue-700">Current Weather Conditions</h3>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="text-center">
                            <img 
                              src={`https://openweathermap.org/img/wn/${currentWeather.weather[0].icon}.png`}
                              alt={currentWeather.weather[0].description}
                              className="h-8 w-8 mx-auto mb-1" 
                            />
                            <p className="text-sm font-medium text-blue-800">{Math.round(currentWeather.main.temp)}°C</p>
                            <p className="text-xs text-blue-600">{currentWeather.weather[0].description}</p>
                          </div>
                          <div className="text-center">
                            <Droplets className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                            <p className="text-sm font-medium text-blue-800">{currentWeather.main.humidity}%</p>
                            <p className="text-xs text-blue-600">Humidity</p>
                          </div>
                          <div className="text-center">
                            <Thermometer className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                            <p className="text-sm font-medium text-blue-800">{Math.round(currentWeather.wind.speed * 3.6)} km/h</p>
                            <p className="text-xs text-blue-600">Wind Speed</p>
                          </div>
                          <div className="text-center">
                            <Calendar className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                            <p className="text-sm font-medium text-blue-800">{getCurrentSeason()}</p>
                            <p className="text-xs text-blue-600">Season</p>
                          </div>
                        </div>
                        
                        <p className="text-xs text-blue-600 mt-2">
                          Weather data helps provide more accurate crop recommendations for your location.
                        </p>
                      </div>
                    )}
                    
                    {weatherLoading && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-5 w-5 text-gray-500 animate-spin mr-2" />
                          <span className="text-sm text-gray-600">Loading weather data...</span>
                        </div>
                      </div>
                    )}
                    
                    {weatherError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Weather Data Unavailable</AlertTitle>
                        <AlertDescription>
                          {weatherError}. Recommendations will be based on general climate data for your region.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="location">Location</Label>
                          <Input 
                            id="location" 
                            value={formData.location} 
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            placeholder="e.g. Tirupati, Andhra Pradesh"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="soilType">Soil Type</Label>
                          <Select 
                            value={formData.soilType} 
                            onValueChange={(value) => handleInputChange('soilType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select soil type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="clay">Clay</SelectItem>
                              <SelectItem value="loam">Loam</SelectItem>
                              <SelectItem value="sandy">Sandy</SelectItem>
                              <SelectItem value="silt">Silt</SelectItem>
                              <SelectItem value="black">Black Soil</SelectItem>
                              <SelectItem value="red">Red Soil</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="cropType">Preferred Crop Type</Label>
                          <Select 
                            value={formData.cropType} 
                            onValueChange={(value) => handleInputChange('cropType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select crop type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="grain">Grain</SelectItem>
                              <SelectItem value="vegetable">Vegetable</SelectItem>
                              <SelectItem value="fruit">Fruit</SelectItem>
                              <SelectItem value="cash">Cash Crop</SelectItem>
                              <SelectItem value="pulse">Pulse</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label>Water Availability</Label>
                            <span className="text-sm text-gray-500">{formData.waterAvailability}%</span>
                          </div>
                          <Slider 
                            value={[formData.waterAvailability]} 
                            onValueChange={(value) => handleInputChange('waterAvailability', value[0])}
                            max={100}
                            step={5}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="landSize">Land Size (hectares)</Label>
                          <Input 
                            id="landSize" 
                            value={formData.landSize} 
                            onChange={(e) => handleInputChange('landSize', e.target.value)}
                            type="number"
                            min="0.1"
                            step="0.1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="previousCrop">Previous Crop</Label>
                          <Input 
                            id="previousCrop" 
                            value={formData.previousCrop} 
                            onChange={(e) => handleInputChange('previousCrop', e.target.value)}
                            placeholder="e.g. Rice, Cotton, etc."
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={handleGetRecommendations}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Get Recommendations
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                {/* Recommendations Tab Content */}
                {activeSubTab === 'recommendations' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recommendations.map((crop, idx) => (
                        <Card key={idx} className="overflow-hidden hover:shadow-md transition-all">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">{crop.cropName}</CardTitle>
                              <div className={`rounded-full p-2 ${crop.color}`}>
                                {crop.icon}
                              </div>
                            </div>
                            <CardDescription>
                              Suitability:
                              <span className="font-medium text-green-600 ml-1">{crop.confidence}%</span>
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pb-4">
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Expected Yield</span>
                                <span className="text-sm font-medium">{crop.expectedYield}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Growing Period</span>
                                <span className="text-sm font-medium">{crop.growingPeriod}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Water Requirement</span>
                                <span className="text-sm font-medium">{crop.waterRequirements}</span>
                              </div>
                              
                              {/* Weather-aware information */}
                              {crop.weatherSuitability && (
                                <div className="border-t pt-3 mt-3">
                                  <div className="mb-2">
                                    <span className="text-sm font-medium text-blue-600 flex items-center">
                                      <CloudSun className="h-4 w-4 mr-1" />
                                      Weather Suitability
                                    </span>
                                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                      {crop.weatherSuitability}
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {crop.seasonalAdvice && (
                                <div className="border-t pt-2">
                                  <span className="text-sm font-medium text-green-600 flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    Seasonal Advice
                                  </span>
                                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                    {crop.seasonalAdvice}
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveSubTab('form')}
                      className="mt-4"
                    >
                      Back to Farm Parameters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Crop Calendar Tab Content */}
          <TabsContent value="cropCalendar">
            <Card>
              <CardHeader>
                <CardTitle>Crop Calendar</CardTitle>
                <CardDescription>Plan your farming activities based on optimal growing seasons</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                    <h3 className="text-lg font-medium text-blue-700 mb-2">Optimal Planting Times</h3>
                    <p className="text-blue-600 mb-4">Track the best planting and harvesting times for recommended crops throughout the year.</p>
                    <Button 
                      variant="outline" 
                      className="border-blue-200 text-blue-700 hover:bg-blue-100"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Open Calendar
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { crop: 'Rice', planting: 'June - July', harvesting: 'November - December' },
                      { crop: 'Cotton', planting: 'April - May', harvesting: 'October - November' },
                      { crop: 'Sugarcane', planting: 'January - March', harvesting: 'December - February' }
                    ].map((item, idx) => (
                      <Card key={idx} className="border-l-4 border-l-green-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{item.crop}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Planting:</span>
                              <span className="font-medium">{item.planting}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Harvesting:</span>
                              <span className="font-medium">{item.harvesting}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Climate Analysis Tab Content */}
          <TabsContent value="climateAnalysis">
            <Card>
              <CardHeader>
                <CardTitle>Climate Analysis</CardTitle>
                <CardDescription>Understand how climate affects your crop choices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 mb-6">
                    <h3 className="text-lg font-medium text-amber-700 mb-2">How Climate Affects Crop Choices</h3>
                    <p className="text-amber-600 mb-4">Understand how seasonal climate patterns affect different crop varieties in your region.</p>
                    <Button 
                      variant="outline" 
                      className="border-amber-200 text-amber-700 hover:bg-amber-100"
                    >
                      <Thermometer className="h-4 w-4 mr-2" />
                      View Analysis
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Seasonal Temperature</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-40 bg-gray-100 rounded-md flex items-center justify-center">
                          <Sun className="h-8 w-8 text-amber-500" />
                        </div>
                        <div className="mt-4 space-y-2">
                          {Object.entries(climateData.default.temperature).map(([season, data], idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span className="capitalize">{season}</span>
                              <div className="w-32">
                                <Progress value={data.value} className="h-2 bg-amber-100" />
                              </div>
                              <span className="font-medium">{data.range}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Rainfall Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-40 bg-gray-100 rounded-md flex items-center justify-center">
                          <Cloud className="h-8 w-8 text-blue-500" />
                        </div>
                        <div className="mt-4 space-y-2">
                          {Object.entries(climateData.default.rainfall).map(([period, data], idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span>{period}</span>
                              <div className="w-32">
                                <Progress value={data.value} className="h-2 bg-blue-200" />
                              </div>
                              <span className="font-medium">{data.range}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Seasonal Forecast Tab Content */}
          <TabsContent value="seasonalForecast">
            <Card>
              <CardHeader>
                <CardTitle>Seasonal Forecast</CardTitle>
                <CardDescription>See the upcoming seasonal conditions for better planning</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100 mb-6">
                    <h3 className="text-lg font-medium text-green-700 mb-2">Upcoming Seasonal Conditions</h3>
                    <p className="text-green-600 mb-4">Get insights on upcoming weather patterns and how they may affect your farming decisions.</p>
                    <Button 
                      variant="outline" 
                      className="border-green-200 text-green-700 hover:bg-green-100"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      View Forecast
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {climateData.default.seasons.map((season, idx) => (
                      <Card key={idx}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{season.month}</CardTitle>
                          <CardDescription>{season.condition}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">{season.advice}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default CropAdvisor;
