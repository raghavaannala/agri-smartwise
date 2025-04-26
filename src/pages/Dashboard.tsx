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
  Loader
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
  
  const [cropStatus, setCropStatus] = useState([
    { name: 'Rice', health: 85, stage: 'Flowering', daysToHarvest: 45, alert: null },
    { name: 'Cotton', health: 72, stage: 'Vegetative', daysToHarvest: 90, alert: 'Low water levels detected' },
    { name: 'Sugarcane', health: 92, stage: 'Maturation', daysToHarvest: 30, alert: null },
  ]);
  
  const [soilHealth, setSoilHealth] = useState({
    moisture: 68,
    nitrogen: 75,
    phosphorus: 62,
    potassium: 88,
    ph: 6.8,
    lastUpdated: '2 days ago'
  });
  
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Apply fertilizer to cotton field', due: 'Today', priority: 'high', completed: false },
    { id: 2, title: 'Irrigation maintenance', due: 'Tomorrow', priority: 'medium', completed: false },
    { id: 3, title: 'Harvest planning meeting', due: '3 days', priority: 'medium', completed: true },
    { id: 4, title: 'Order new seeds', due: 'Next week', priority: 'low', completed: false },
  ]);
  
  const [marketPrices, setMarketPrices] = useState([
    { crop: 'Rice', price: '₹2,450/q', change: '+3.2%', trend: 'up' },
    { crop: 'Cotton', price: '₹6,780/q', change: '+1.5%', trend: 'up' },
    { crop: 'Sugarcane', price: '₹3,200/q', change: '-0.8%', trend: 'down' },
    { crop: 'Wheat', price: '₹2,100/q', change: '+2.1%', trend: 'up' },
  ]);
  
  // Enhanced farm insights data
  const [farmInsights, setFarmInsights] = useState({
    totalArea: '12.5 acres',
    activeFields: 3,
    waterUsage: {
      current: '2,450 L',
      change: '-5%',
      trend: 'down'
    },
    yieldForecast: {
      rice: '4.2 tons/acre',
      cotton: '1.8 tons/acre',
      sugarcane: '35 tons/acre'
    },
    recommendations: [
      'Consider increasing irrigation for cotton fields',
      'Optimal time for rice fertilization in the next 3 days',
      'Weather conditions favorable for pest prevention measures'
    ]
  });
  
  // Calculate task completion percentage
  const taskCompletionPercentage = useMemo(() => {
    const completedTasks = tasks.filter(task => task.completed).length;
    return Math.round((completedTasks / tasks.length) * 100);
  }, [tasks]);
  
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
  
  const toggleTaskCompletion = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
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
  
  // Render dashboard content based on selected layout
  const renderDefaultLayout = () => {
    return (
      <>
        {/* Welcome Banner */}
        <div className="mb-6 p-6 rounded-xl bg-gradient-to-r from-agri-blue to-agri-green/60 text-white">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-4 md:mb-0">
              <p className="text-white/80">{getTimeOfDay()}</p>
              <h2 className="text-3xl font-bold flex items-center gap-2">
                Welcome back, {currentUser?.displayName || 'User'}! <Sun className="h-6 w-6 text-yellow-300" />
              </h2>
              <p className="mt-2 text-white/90">
                Your farm is looking good today. Check out your personalized insights 
                and recommendations for maximum productivity.
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
                Today's forecast for {userLocation || 'your location'}
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
          soilHealth={soilHealth}
          marketPrices={marketPrices}
          cropStatus={cropStatus}
          tasks={tasks}
          farmInsights={farmInsights}
          toggleTaskCompletion={toggleTaskCompletion}
          handleQuickAction={handleQuickAction}
          navigate={navigate}
          t={t}
          getHealthColor={getHealthColor}
          getProgressColor={getProgressColor}
          getPriorityColor={getPriorityColor}
          expandedCard={expandedCard}
          toggleCardExpansion={toggleCardExpansion}
          taskCompletionPercentage={taskCompletionPercentage}
        />;
      case 'detailed':
        return <DetailedDashboardLayout 
          weatherData={weatherData}
          soilHealth={soilHealth}
          marketPrices={marketPrices}
          cropStatus={cropStatus}
          tasks={tasks}
          farmInsights={farmInsights}
          toggleTaskCompletion={toggleTaskCompletion}
          handleQuickAction={handleQuickAction}
          navigate={navigate}
          t={t}
          getHealthColor={getHealthColor}
          getProgressColor={getProgressColor}
          getPriorityColor={getPriorityColor}
          expandedCard={expandedCard}
          toggleCardExpansion={toggleCardExpansion}
          taskCompletionPercentage={taskCompletionPercentage}
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
