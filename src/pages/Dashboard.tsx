import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { 
  LayoutDashboard, 
  Droplets, 
  Leaf, 
  Sun, 
  Cloud, 
  BarChart4, 
  Thermometer, 
  ArrowUp, 
  ArrowDown, 
  Clock, 
  AlertTriangle,
  Upload,
  Scan,
  LineChart,
  CalendarDays,
  Tractor,
  PlusCircle,
  Wind,
  Bell,
  RefreshCw,
  Settings,
  ChevronRight,
  Minimize2,
  Maximize2,
  ArrowRight,
  MapPin,
  Loader,
  ChevronDown,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLocation } from '../hooks/useLocation';
import { getCurrentWeather } from '../services/weatherService';
import IrrigationPlanGuide from '@/components/dashboard/IrrigationPlanGuide';
import { getUserFarms, getFarmById, FarmData } from '@/lib/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Component for compact dashboard layout
const CompactDashboardLayout = (props: any) => {
  return (
    <div>
      {/* Compact layout implementation */}
      <p>Compact layout</p>
    </div>
  );
};

// Component for detailed dashboard layout
const DetailedDashboardLayout = (props: any) => {
  return (
    <div>
      {/* Detailed layout implementation */}
      <p>Detailed layout</p>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t, i18n } = useTranslation();
  const { location, loading: locationLoading, usingFallback } = useLocation();
  
  // Add a state variable to force re-renders when language changes
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const [dashboardLayout, setDashboardLayout] = useState(() => {
    // Try to get saved layout from localStorage
    const savedLayout = localStorage.getItem('dashboardLayout');
    return savedLayout ? JSON.parse(savedLayout) : 'default';
  });
  
  // Farm data states
  const [userFarms, setUserFarms] = useState<FarmData[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<FarmData | null>(null);
  const [loadingFarms, setLoadingFarms] = useState(false);
  
  // New states for enhanced functionality
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [userPreferences, setUserPreferences] = useState(() => {
    const savedPrefs = localStorage.getItem('userDashboardPrefs');
    return savedPrefs ? JSON.parse(savedPrefs) : {
      hiddenCards: [],
      cardOrder: ['weather', 'soil', 'market', 'crops', 'tasks'],
      favoriteMetrics: ['moisture', 'nitrogen']
    };
  });
  
  // Location-based states
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [locationFetching, setLocationFetching] = useState(false);
  
  // Update when language changes
  useEffect(() => {
    const handleLanguageChanged = () => {
      console.log('Language changed in Dashboard to:', i18n.language);
      setCurrentLang(i18n.language);
    };
    
    // Listen for language changes
    i18n.on('languageChanged', handleLanguageChanged);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  // Fetch location-based data when location changes
  useEffect(() => {
    const fetchLocationData = async () => {
      if (location) {
        try {
          console.log(`Dashboard fetching weather data for: ${location.latitude}, ${location.longitude}`);
          setLocationFetching(true);
          
          // Clear any previous location to show loading state
          setUserLocation(null);
          
          const weatherData = await getCurrentWeather(location.latitude, location.longitude);
          console.log('Weather data received:', weatherData);
          
          if (weatherData && weatherData.name) {
            // Calculate a display name that includes city and country
            const locationDisplay = `${weatherData.name}${weatherData.sys.country ? ', ' + weatherData.sys.country : ''}`;
            console.log('Setting user location to:', locationDisplay);
            
            setUserLocation(locationDisplay);
            
            // Update weather data with real data
            setWeatherData(prevData => ({
              ...prevData,
              temperature: Math.round(weatherData.main.temp),
              condition: weatherData.weather[0].main,
              humidity: weatherData.main.humidity,
              wind: Math.round(weatherData.wind.speed * 3.6), // convert m/s to km/h
              feelsLike: Math.round(weatherData.main.feels_like)
            }));
          } else {
            console.error('Weather data missing name property:', weatherData);
            setUserLocation(usingFallback ? 'Hyderabad, IN' : 'Unknown Location');
          }
        } catch (error) {
          console.error('Failed to fetch location data:', error);
          setUserLocation(usingFallback ? 'Hyderabad, IN' : 'Unknown Location');
        } finally {
          setLocationFetching(false);
        }
      }
    };

    // Execute immediately
    fetchLocationData();
    
    // Also refresh data when location changes
    const refreshInterval = setInterval(() => {
      if (!locationFetching) {
        console.log('Refreshing weather data automatically');
        fetchLocationData();
      }
    }, 30 * 60 * 1000); // Refresh every 30 minutes
    
    return () => clearInterval(refreshInterval);
  }, [location, usingFallback]);

  // Load user's farms
  useEffect(() => {
    const loadUserFarms = async () => {
      if (currentUser?.uid) {
        try {
          setLoadingFarms(true);
          const farms = await getUserFarms(currentUser.uid);
          
          setUserFarms(farms);
          
          // If there are farms and no farm is selected, select the first one
          if (farms.length > 0 && !selectedFarmId) {
            setSelectedFarmId(farms[0].id);
          }
        } catch (error) {
          console.error('Error loading user farms:', error);
        } finally {
          setLoadingFarms(false);
        }
      }
    };
    
    loadUserFarms();
  }, [currentUser]);
  
  // Load selected farm data
  useEffect(() => {
    const loadFarmData = async () => {
      if (selectedFarmId) {
        try {
          const farm = await getFarmById(selectedFarmId);
          setSelectedFarm(farm);
        } catch (error) {
          console.error('Error loading farm data:', error);
        }
      } else {
        setSelectedFarm(null);
      }
    };
    
    loadFarmData();
  }, [selectedFarmId]);

  // Save layout preference to localStorage
  useEffect(() => {
    localStorage.setItem('dashboardLayout', JSON.stringify(dashboardLayout));
  }, [dashboardLayout]);
  
  // Save user preferences to localStorage
  useEffect(() => {
    localStorage.setItem('userDashboardPrefs', JSON.stringify(userPreferences));
  }, [userPreferences]);
  
  // Simulate data refresh
  const refreshData = () => {
    setIsRefreshing(true);
    // Simulate API call delay
    setTimeout(() => {
      // Here you would normally fetch fresh data
      setIsRefreshing(false);
    }, 1500);
  };
  
  // Toggle card expansion
  const toggleCardExpansion = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };
  
  const [weatherData, setWeatherData] = useState({
    temperature: 32,
    condition: 'Sunny',
    humidity: 65,
    wind: 12,
    feelsLike: 34,
    forecast: [
      { day: 'Today', temp: 32, icon: <Sun className="h-4 w-4" />, condition: 'Sunny' },
      { day: 'Tue', temp: 30, icon: <Cloud className="h-4 w-4" />, condition: 'Partly Cloudy' },
      { day: 'Wed', temp: 28, icon: <Droplets className="h-4 w-4" />, condition: 'Light Rain' },
      { day: 'Thu', temp: 31, icon: <Sun className="h-4 w-4" />, condition: 'Sunny' },
      { day: 'Fri', temp: 33, icon: <Sun className="h-4 w-4" />, condition: 'Sunny' },
    ]
  });
  
  // Replace with these computed values based on farm data
  const [farmTasks, setFarmTasks] = useState<{id: number, title: string, due: string, priority: string, completed: boolean}[]>([]);

  // Create derived values from the selected farm data
  const farmSoilHealth = useMemo(() => {
    if (selectedFarm?.analysis?.soilAnalysis) {
      return {
        moisture: selectedFarm.analysis.soilHealth || 0,
        phLevel: selectedFarm.analysis.soilAnalysis.phLevel || 7.0,
        organicMatter: selectedFarm.analysis.soilAnalysis.organicMatter || 0,
        fertility: selectedFarm.analysis.soilAnalysis.fertility || 'Average',
        problems: selectedFarm.analysis.soilAnalysis.problems || [],
        lastUpdated: selectedFarm.lastAnalyzed ? 
          new Date(selectedFarm.lastAnalyzed).toLocaleDateString() : 'Never'
      };
    }
    return {
      moisture: 0,
      phLevel: 7.0,
      organicMatter: 0,
      fertility: 'Unknown',
      problems: [],
      lastUpdated: 'Never'
    };
  }, [selectedFarm]);

  const farmCrops = useMemo(() => {
    if (selectedFarm?.crops && selectedFarm.analysis) {
      return selectedFarm.crops.map(crop => {
        // Create a health rating between 60-95 based on overall score
        const baseHealth = 60 + Math.floor((selectedFarm.analysis?.cropHealth || 0) / 3);
        // Small random variation for each crop
        const health = Math.min(95, baseHealth + Math.floor(Math.random() * 10));
        
        let stage = "Growth";
        let daysToHarvest = 30 + Math.floor(Math.random() * 60);
        
        if (selectedFarm.analysis?.cropAnalysis?.growthStage) {
          stage = selectedFarm.analysis.cropAnalysis.growthStage;
        }
        
        // Check if there are any issues to alert about
        let alert = null;
        if (selectedFarm.analysis?.cropAnalysis?.nutrientDeficiencies?.length) {
          alert = `${selectedFarm.analysis.cropAnalysis.nutrientDeficiencies[0]} deficiency detected`;
        }
        
        return {
          name: crop,
          health,
          stage,
          daysToHarvest,
          alert
        };
      });
    }
    return [];
  }, [selectedFarm]);

  // Generate tasks based on farm analysis and recommendations
  useEffect(() => {
    if (selectedFarm?.analysis?.recommendations) {
      // Transform recommendations into actionable tasks
      const newTasks = selectedFarm.analysis.recommendations.map((rec, index) => {
        // Generate due dates (Today, Tomorrow, Next week, etc.)
        const dueDates = ['Today', 'Tomorrow', '3 days', 'Next week', '2 weeks'];
        const priorities = ['high', 'medium', 'medium', 'low'];
        
        return {
          id: index + 1,
          title: rec,
          due: dueDates[index % dueDates.length],
          priority: priorities[index % priorities.length],
          completed: false
        };
      });
      
      // Add irrigation task if water management score is low
      if (selectedFarm.analysis.waterManagement < 70) {
        newTasks.push({
          id: newTasks.length + 1,
          title: 'Optimize irrigation system efficiency',
          due: 'This week',
          priority: 'high',
          completed: false
        });
      }
      
      // Add soil amendment task if soil health is low
      if (selectedFarm.analysis.soilHealth < 70) {
        newTasks.push({
          id: newTasks.length + 1,
          title: 'Apply organic matter amendments to soil',
          due: 'Next week',
          priority: 'medium',
          completed: false
        });
      }
      
      setFarmTasks(newTasks);
    } else {
      // Default tasks if no analysis
      setFarmTasks([
        { id: 1, title: 'Set up farm for analysis', due: 'Today', priority: 'high', completed: false },
        { id: 2, title: 'Update crop information', due: 'This week', priority: 'medium', completed: false }
      ]);
    }
  }, [selectedFarm]);

  // Replace the task completion percentage calculation
  const taskCompletionPercentage = useMemo(() => {
    const completedTasks = farmTasks.filter(task => task.completed).length;
    return farmTasks.length > 0 ? Math.round((completedTasks / farmTasks.length) * 100) : 0;
  }, [farmTasks]);

  // Update the toggleTaskCompletion function
  const toggleTaskCompletion = (taskId: number) => {
    setFarmTasks(farmTasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  // Replace the content where the Farm Insights card is used
  const renderFarmInsightsCard = () => {
    return (
      <Card className={cn(
        "transition-all duration-300",
        expandedCard === 'insights' && "md:col-span-3"
      )}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <LayoutDashboard className="mr-2 h-5 w-5 text-agri-freshGreen" />
              {t('dashboard.farmAnalytics')}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => toggleCardExpansion('insights')}
            >
              {expandedCard === 'insights' ? 
                <Minimize2 className="h-4 w-4" /> : 
                <Maximize2 className="h-4 w-4" />
              }
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingFarms ? (
            <div className="flex items-center justify-center py-6">
              <Loader className="h-6 w-6 text-agri-green animate-spin mr-2" />
              <span>Loading farm data...</span>
            </div>
          ) : userFarms.length === 0 ? (
            <div className="text-center py-6">
              <div className="mb-4">
                <Tractor className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No farms found</p>
              </div>
              <Button 
                variant="default" 
                className="bg-agri-green hover:bg-agri-green/90"
                onClick={() => navigate('/farm')}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Your First Farm
              </Button>
            </div>
          ) : (
            <>
              {/* Farm Selector */}
              <div className="mb-4">
                <label className="text-sm text-gray-500 mb-1 block">Select Farm</label>
                <Select 
                  value={selectedFarmId || ''} 
                  onValueChange={(value) => setSelectedFarmId(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a farm" />
                  </SelectTrigger>
                  <SelectContent>
                    {userFarms.map(farm => (
                      <SelectItem key={farm.id} value={farm.id}>
                        {farm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedFarm ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <h3 className="text-sm font-medium text-green-800">Farm Details</h3>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm"><span className="text-gray-500">Location:</span> {selectedFarm.location}</p>
                        <p className="text-sm"><span className="text-gray-500">Size:</span> {selectedFarm.size} hectares</p>
                        <p className="text-sm"><span className="text-gray-500">Soil Type:</span> {selectedFarm.soilType}</p>
                        <p className="text-sm"><span className="text-gray-500">Farm Type:</span> {selectedFarm.farmType}</p>
                      </div>
                    </div>
                    
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <h3 className="text-sm font-medium text-amber-800">Crops</h3>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedFarm.crops.map((crop, index) => (
                          <Badge key={index} className="bg-white text-amber-700 border-amber-200">
                            {crop}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Analytics Metrics */}
                  {selectedFarm.analysis ? (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Soil Health</p>
                          <div className="flex items-center">
                            <span className="text-2xl font-bold mr-2">{selectedFarm.analysis.soilHealth}%</span>
                            <Progress value={selectedFarm.analysis.soilHealth} className="h-2 flex-1" />
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Crop Health</p>
                          <div className="flex items-center">
                            <span className="text-2xl font-bold mr-2">{selectedFarm.analysis.cropHealth}%</span>
                            <Progress value={selectedFarm.analysis.cropHealth} className="h-2 flex-1" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Water Management</p>
                          <div className="flex items-center">
                            <span className="text-2xl font-bold mr-2">{selectedFarm.analysis.waterManagement}%</span>
                            <Progress value={selectedFarm.analysis.waterManagement} className="h-2 flex-1" />
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Pest Risk</p>
                          <div className="flex items-center">
                            <span className="text-2xl font-bold mr-2">{selectedFarm.analysis.pestRisk}%</span>
                            <Progress value={selectedFarm.analysis.pestRisk}
                              // Lower is better for pest risk
                              className={cn("h-2 flex-1", 
                                selectedFarm.analysis.pestRisk < 30 ? "bg-green-200" : 
                                selectedFarm.analysis.pestRisk < 60 ? "bg-amber-200" : "bg-red-200"
                              )} 
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Recommendations */}
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h3>
                        <ul className="space-y-1">
                          {selectedFarm.analysis.recommendations.slice(0, 3).map((rec, index) => (
                            <li key={index} className="text-sm flex">
                              <ArrowRight className="h-4 w-4 text-green-600 mr-1 flex-shrink-0 mt-0.5" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {selectedFarm.lastAnalyzed && (
                        <div className="mt-4 flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            Last analyzed: {selectedFarm.lastAnalyzed ? 
                              new Date(selectedFarm.lastAnalyzed).toLocaleDateString() : 'Never'}
                          </span>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-green-700"
                            onClick={() => navigate(`/farm?id=${selectedFarm.id}`)}
                          >
                            View Details
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <div className="mb-4">
                        <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-2" />
                        <p className="text-gray-600">This farm hasn't been analyzed yet</p>
                      </div>
                      <Button 
                        variant="default" 
                        className="bg-agri-green hover:bg-agri-green/90"
                        onClick={() => navigate(`/farm?id=${selectedFarm.id}&tab=analysis`)}
                      >
                        <Scan className="h-4 w-4 mr-2" />
                        Analyze Farm
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">Select a farm to see analytics</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  // Modify the content where the Farm Insights card is used
  const renderDefaultLayout = () => {
    return (
      <>
        {/* Welcome Banner */}
        <div className="mb-6 p-6 rounded-xl bg-gradient-to-r from-agri-blue to-agri-green/60 text-white">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-4 md:mb-0">
              <p className="text-white/80">{getTimeOfDay()}</p>
              <h2 className="text-3xl font-bold flex items-center gap-2">
                Welcome to {selectedFarm ? selectedFarm.name : 'Your Farm Dashboard'}! <Sun className="h-6 w-6 text-yellow-300" />
              </h2>
              <p className="mt-2 text-white/90">
                {selectedFarm 
                  ? `View insights and recommendations for your ${selectedFarm.farmType} farm in ${selectedFarm.location}.` 
                  : 'Select a farm to view personalized insights and recommendations.'}
              </p>
              
              <div className="flex mt-4 space-x-4">
                <div className="flex items-center bg-white/10 px-3 py-1.5 rounded-md">
                  <Leaf className="h-4 w-4 mr-2 text-green-200" />
                  <span className="text-sm">Season: Spring</span>
                </div>
                <div className="flex items-center bg-white/10 px-3 py-1.5 rounded-md">
                  <MapPin className="h-4 w-4 mr-2 text-green-200" />
                  <span className="text-sm">
                    {locationFetching ? (
                      <span className="flex items-center">
                        Loading location... <Loader className="h-3 w-3 ml-1 animate-spin" />
                      </span>
                    ) : userLocation ? (
                      <span>
                        {userLocation}
                        {usingFallback && <span className="ml-1 text-xs text-yellow-200">(Default)</span>}
                      </span>
                    ) : (
                      'Unknown Location'
                    )}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-xl p-4 flex flex-col items-end">
              <div className="flex items-center">
                <Sun className="h-6 w-6 text-yellow-300 mr-2" />
                <span className="text-3xl font-bold">{weatherData.temperature}°C</span>
              </div>
              <p className="text-lg text-white/80 mb-2">{weatherData.condition}</p>
              
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div className="text-center">
                  <p className="text-xs text-white/60">Humidity</p>
                  <div className="flex flex-col items-center">
                    <Droplets className="h-4 w-4 text-white/80" />
                    <p className="font-medium">{weatherData.humidity}%</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/60">Wind</p>
                  <div className="flex flex-col items-center">
                    <Wind className="h-4 w-4 text-white/80" />
                    <p className="font-medium">{weatherData.wind} km/h</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/60">Feels like</p>
                  <div className="flex flex-col items-center">
                    <Thermometer className="h-4 w-4 text-white/80" />
                    <p className="font-medium">{weatherData.feelsLike || (weatherData.temperature + 2)}°C</p>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-white/60 mt-2">
                Today's forecast for {selectedFarm ? selectedFarm.location : userLocation || 'your location'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-agri-soil/10 hover:bg-agri-soil/20 cursor-pointer transition-colors" onClick={() => handleQuickAction('soil-analysis')}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Droplets className="h-8 w-8 text-agri-soil mb-2" />
              <h3 className="font-medium text-sm">{t('soilAnalysis')}</h3>
            </CardContent>
          </Card>
          
          <Card className="bg-agri-tomato/10 hover:bg-agri-tomato/20 cursor-pointer transition-colors" onClick={() => handleQuickAction('disease-scan')}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Scan className="h-8 w-8 text-agri-tomato mb-2" />
              <h3 className="font-medium text-sm">{t('common.diseaseScan')}</h3>
            </CardContent>
          </Card>
          
          <Card className="bg-agri-freshGreen/10 hover:bg-agri-freshGreen/20 cursor-pointer transition-colors" onClick={() => handleQuickAction('crop-advisor')}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Leaf className="h-8 w-8 text-agri-freshGreen mb-2" />
              <h3 className="font-medium text-sm">{t('common.cropAdvisor')}</h3>
            </CardContent>
          </Card>
          
          <Card className="bg-agri-amber/10 hover:bg-agri-amber/20 cursor-pointer transition-colors" onClick={() => handleQuickAction('market-prices')}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <BarChart4 className="h-8 w-8 text-agri-amber mb-2" />
              <h3 className="font-medium text-sm">{t('dashboard.marketPrices')}</h3>
            </CardContent>
          </Card>
        </div>
        
        {/* Main dashboard content grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* First column */}
          <div className="col-span-1 space-y-6">
            {/* Weather Card */}
            <Card className={cn(
              "transition-all duration-300",
              expandedCard === 'weather' && "md:col-span-3"
            )}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center">
                    <Sun className="mr-2 h-5 w-5 text-agri-amber" />
                    {t('dashboard.weatherForecast')}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => toggleCardExpansion('weather')}
                  >
                    {expandedCard === 'weather' ? 
                      <Minimize2 className="h-4 w-4" /> : 
                      <Maximize2 className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-3xl font-bold">{weatherData.temperature}°C</span>
                    <p className="text-sm text-gray-500">{weatherData.condition}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-sm text-gray-500">
                      <Droplets className="h-4 w-4 mr-1" />
                      <span>{weatherData.humidity}%</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Wind className="h-4 w-4 mr-1" />
                      <span>{weatherData.wind} km/h</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Soil Health Card */}
            <Card className={cn(
              "transition-all duration-300",
              expandedCard === 'soil' && "md:col-span-3"
            )}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center">
                    <Thermometer className="mr-2 h-5 w-5 text-agri-amber" />
                    {t('dashboard.soilHealth')}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => toggleCardExpansion('soil')}
                  >
                    {expandedCard === 'soil' ? 
                      <Minimize2 className="h-4 w-4" /> : 
                      <Maximize2 className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedFarm && selectedFarm.analysis ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-3xl font-bold">{farmSoilHealth.moisture}%</span>
                        <p className="text-sm text-gray-500">Moisture</p>
                      </div>
                      <div>
                        <span className="text-3xl font-bold">{farmSoilHealth.phLevel}</span>
                        <p className="text-sm text-gray-500">pH Level</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-3xl font-bold">{farmSoilHealth.organicMatter}%</span>
                        <p className="text-sm text-gray-500">Organic Matter</p>
                      </div>
                      <div>
                        <span className="text-3xl font-bold">{farmSoilHealth.fertility}</span>
                        <p className="text-sm text-gray-500">Fertility</p>
                      </div>
                    </div>
                    {farmSoilHealth.problems.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">Issues to Address:</p>
                        <ul className="text-sm text-gray-600 mt-1">
                          {farmSoilHealth.problems.slice(0, 2).map((problem, idx) => (
                            <li key={idx} className="flex items-start">
                              <AlertTriangle className="h-3 w-3 text-amber-500 mr-1 mt-0.5 flex-shrink-0" />
                              <span>{problem}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-2 text-right">
                      <span className="text-xs text-gray-500">Last updated: {farmSoilHealth.lastUpdated}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-2" />
                    <p className="text-gray-600 mb-2">Select a farm to view soil health data</p>
                    {!selectedFarm && userFarms.length > 0 && (
                      <Select 
                        value={selectedFarmId || ''} 
                        onValueChange={(value) => setSelectedFarmId(value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a farm" />
                        </SelectTrigger>
                        <SelectContent>
                          {userFarms.map(farm => (
                            <SelectItem key={farm.id} value={farm.id}>
                              {farm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Irrigation Plan Guide */}
            <IrrigationPlanGuide />
          </div>
          
          {/* Second column */}
          <div className="col-span-1 space-y-6">
            {/* Crop Status Card */}
            <Card className={cn(
              "transition-all duration-300",
              expandedCard === 'crop' && "md:col-span-3"
            )}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center">
                    <Leaf className="mr-2 h-5 w-5 text-agri-freshGreen" />
                    {t('dashboard.cropStatus')}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => toggleCardExpansion('crop')}
                  >
                    {expandedCard === 'crop' ? 
                      <Minimize2 className="h-4 w-4" /> : 
                      <Maximize2 className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedFarm && farmCrops.length > 0 ? (
                  <>
                    {farmCrops.map((crop) => (
                      <div key={crop.name} className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className={cn(
                            "w-2 h-2 rounded-full mr-2",
                            crop.health >= 80 ? "bg-agri-freshGreen" : crop.health >= 60 ? "bg-agri-amber" : "bg-agri-tomato"
                          )}></div>
                          <div>
                            <span className="font-medium">{crop.name}</span>
                            <div className="flex text-xs text-gray-500">
                              <span>{crop.stage}</span>
                              <span className="mx-1">•</span>
                              <span>{crop.daysToHarvest} days to harvest</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center">
                            <span className={cn(
                              "text-sm font-medium",
                              getHealthColor(crop.health)
                            )}>{crop.health}%</span>
                          </div>
                          {crop.alert && (
                            <div className="flex items-center text-xs text-agri-tomato">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              <span>{crop.alert}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {farmCrops.length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-gray-500">No crops found for this farm</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <Leaf className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600 mb-2">Select a farm to view crop status</p>
                    {!selectedFarm && userFarms.length > 0 && (
                      <Select 
                        value={selectedFarmId || ''} 
                        onValueChange={(value) => setSelectedFarmId(value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a farm" />
                        </SelectTrigger>
                        <SelectContent>
                          {userFarms.map(farm => (
                            <SelectItem key={farm.id} value={farm.id}>
                              {farm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Market Prices Card */}
            <Card className={cn(
              "transition-all duration-300",
              expandedCard === 'market' && "md:col-span-3"
            )}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center">
                    <BarChart4 className="mr-2 h-5 w-5 text-agri-amber" />
                    {t('dashboard.marketPrices')}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => toggleCardExpansion('market')}
                  >
                    {expandedCard === 'market' ? 
                      <Minimize2 className="h-4 w-4" /> : 
                      <Maximize2 className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {marketPrices.map((price) => (
                  <div key={price.crop} className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500">{price.crop}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">{price.price}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          
          {/* Third column */}
          <div className="col-span-1 space-y-6">
            {/* Tasks Card */}
            <Card className={cn(
              "transition-all duration-300",
              expandedCard === 'tasks' && "md:col-span-3"
            )}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center">
                    <Tractor className="mr-2 h-5 w-5 text-agri-freshGreen" />
                    {t('dashboard.tasks')}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => toggleCardExpansion('tasks')}
                  >
                    {expandedCard === 'tasks' ? 
                      <Minimize2 className="h-4 w-4" /> : 
                      <Maximize2 className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedFarm ? (
                  farmTasks.length > 0 ? (
                    <>
                      {farmTasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div 
                              className={cn(
                                "w-4 h-4 rounded border mr-2 flex items-center justify-center cursor-pointer",
                                task.completed ? "bg-agri-freshGreen border-agri-freshGreen" : "border-gray-300"
                              )}
                              onClick={() => toggleTaskCompletion(task.id)}
                            >
                              {task.completed && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div>
                              <span className={task.completed ? "line-through text-gray-500" : ""}>{task.title}</span>
                              <div className="flex items-center">
                                <Badge variant="outline" className={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                                <span className="text-xs text-gray-500 ml-2">{task.due}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No tasks available for this farm</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-6">
                    <Clock className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600 mb-2">Select a farm to view tasks</p>
                    {!selectedFarm && userFarms.length > 0 && (
                      <Select 
                        value={selectedFarmId || ''} 
                        onValueChange={(value) => setSelectedFarmId(value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a farm" />
                        </SelectTrigger>
                        <SelectContent>
                          {userFarms.map(farm => (
                            <SelectItem key={farm.id} value={farm.id}>
                              {farm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Farm Analytics Card (replacing Farm Insights) */}
            {renderFarmInsightsCard()}
          </div>
        </div>
        
        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Task Completion Progress */}
          <Card className={cn(
            "transition-all duration-300",
            expandedCard === 'taskCompletion' && "md:col-span-2"
          )}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center">
                  <BarChart4 className="mr-2 h-5 w-5 text-agri-freshGreen" />
                  {t('dashboard.taskCompletion')}
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  onClick={() => toggleCardExpansion('taskCompletion')}
                >
                  {expandedCard === 'taskCompletion' ? 
                    <Minimize2 className="h-4 w-4" /> : 
                    <Maximize2 className="h-4 w-4" />
                  }
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-3xl font-bold">{taskCompletionPercentage}%</span>
                  <p className="text-sm text-gray-500">Completed Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  };
  
  // Render dashboard based on selected layout
  const renderDashboardContent = () => {
    switch (dashboardLayout) {
      case 'compact':
        return <CompactDashboardLayout 
          weatherData={weatherData}
          cropStatus={farmCrops}
          soilHealth={farmSoilHealth}
          tasks={farmTasks}
          marketPrices={marketPrices}
          userLocation={userLocation}
          selectedFarm={selectedFarm}
          farms={userFarms}
        />;
      case 'detailed':
        return <DetailedDashboardLayout 
          weatherData={weatherData}
          cropStatus={farmCrops}
          soilHealth={farmSoilHealth}
          tasks={farmTasks}
          marketPrices={marketPrices}
          userLocation={userLocation}
          selectedFarm={selectedFarm}
          farms={userFarms}
        />;
      default:
        return renderDefaultLayout();
    }
  };

  // Helper function to get time of day greeting
  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'soil-analysis':
        navigate('/soil-lab');
        break;
      case 'disease-scan':
        navigate('/disease-scan');
        break;
      case 'crop-advisor':
        navigate('/crop-advisor');
        break;
      case 'market-prices':
        navigate('/market');
        break;
      default:
        break;
    }
  };

  // Add the marketPrices state back - place after farmTasks state declaration
  const [marketPrices, setMarketPrices] = useState([
    { crop: 'Rice', price: '₹2,450/q', change: '+3.2%', trend: 'up' },
    { crop: 'Cotton', price: '₹6,780/q', change: '+1.5%', trend: 'up' },
    { crop: 'Sugarcane', price: '₹3,200/q', change: '-0.8%', trend: 'down' },
    { crop: 'Wheat', price: '₹2,100/q', change: '+2.1%', trend: 'up' },
  ]);

  // Add these back right before the toggleTaskCompletion function
  const getHealthColor = (health: number) => {
    if (health >= 80) return 'text-agri-freshGreen';
    if (health >= 60) return 'text-agri-amber';
    return 'text-agri-tomato';
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return 'bg-agri-freshGreen';
    if (value >= 60) return 'bg-agri-amber';
    return 'bg-agri-tomato';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-agri-tomato/10 text-agri-tomato';
      case 'medium': return 'bg-agri-amber/10 text-agri-amber';
      case 'low': return 'bg-agri-blue/10 text-agri-blue';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <div className="flex items-center text-gray-500">
              <p>
                {t('dashboard.welcome', { name: currentUser?.displayName || 'User' })}
              </p>
              {locationFetching ? (
                <div className="flex items-center ml-1">
                  <Loader className="h-3 w-3 animate-spin ml-1" />
                </div>
              ) : userLocation ? (
                <div className="flex items-center text-agri-darkGreen ml-1">
                  <MapPin className="h-3 w-3 ml-1 mr-0.5" />
                  <span className="font-medium">{userLocation}</span>
                  {usingFallback && <span className="text-xs ml-1 text-amber-600">(Default)</span>}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center" 
              onClick={refreshData}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isRefreshing && "animate-spin")} />
              {isRefreshing ? t('common.refreshing') : t('common.refresh')}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('dashboard.settings')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {renderDashboardContent()}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
