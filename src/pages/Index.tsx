import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import WelcomeBanner from '@/components/layout/WelcomeBanner';
import SoilStatusCard from '@/components/dashboard/SoilStatusCard';
import { useTranslation } from 'react-i18next';
import CropRecommendationCard from '@/components/dashboard/CropRecommendationCard';
import DiseaseDetectionCard from '@/components/dashboard/DiseaseDetectionCard';
import MarketPriceCard from '@/components/dashboard/MarketPriceCard';
import WeatherForecastCard from '@/components/dashboard/WeatherForecastCard';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { 
  LogIn, 
  Droplets, 
  LineChart, 
  Leaf, 
  Eye, 
  BarChart4, 
  CloudSun, 
  Sprout, 
  Sun, 
  Pill, 
  Fish, 
  Tractor,
  Wind,
  PieChart,
  LayoutGrid,
  LayoutList,
  Scan,
  Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useLocation } from '../hooks/useLocation';
import { getCurrentWeather } from '../services/weatherService';

const Index = () => {
  const { currentUser } = useAuth();
  const { t, i18n } = useTranslation();
  const [userName, setUserName] = useState('Guest');
  const [userLocation, setUserLocation] = useState('Tirupati, Andhra Pradesh');
  // Add state to track language changes
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('overview');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  
  // Location and weather data
  const { location, loading: locationLoading, usingFallback } = useLocation();
  const [weatherData, setWeatherData] = useState({
    temperature: 32,
    condition: 'Sunny'
  });
  
  // Reference to hidden file input
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Animation variants for cards
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: 'easeOut'
      }
    })
  };
  
  // Fetch location-based data
  useEffect(() => {
    const fetchLocationData = async () => {
      if (location) {
        try {
          console.log(`Index fetching weather for: ${location.latitude}, ${location.longitude}`);
          
          const data = await getCurrentWeather(location.latitude, location.longitude);
          console.log('Weather data received in Index:', data);
          
          if (data && data.name) {
            // Format location with city and country
            const locationDisplay = `${data.name}${data.sys.country ? ', ' + data.sys.country : ''}`;
            setUserLocation(locationDisplay);
            
            // Update weather data
            setWeatherData({
              temperature: Math.round(data.main.temp),
              condition: data.weather[0].main
            });
          }
        } catch (error) {
          console.error('Error fetching weather data in Index:', error);
        }
      }
    };
    
    fetchLocationData();
  }, [location]);
  
  const fetchUserProfile = async () => {
    setIsLoading(true);
    if (currentUser) {
      setIsAuthenticated(true);
      try {
        // Immediately update with basic info from Firebase Auth
        if (currentUser.displayName) {
          setUserName(currentUser.displayName);
        } else if (currentUser.email) {
          const emailName = currentUser.email.split('@')[0] || 'User';
          setUserName(emailName);
        }
        
        // Then fetch complete profile from Firestore
        const userProfile = await getUserProfile(currentUser.uid);
        
        // Set user name
        if (userProfile?.displayName) {
          setUserName(userProfile.displayName);
        }
        
        // Don't override location if already set by the weather API
        if (userProfile?.location && !userLocation.includes(",")) {
          setUserLocation(userProfile.location);
        }
        
        console.log('Index: User profile loaded', { 
          name: userProfile?.displayName || currentUser.displayName || currentUser.email?.split('@')[0],
          userId: currentUser.uid 
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Default for non-authenticated users
      setUserName('Guest');
      if (!userLocation.includes(",")) {
        setUserLocation('Tirupati, Andhra Pradesh');
      }
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchUserProfile();
    // Force a check of authentication status when component mounts
    console.log("Auth status on Index page:", { currentUser, isAuthenticated: !!currentUser });
  }, [currentUser, lastUpdate]);
  
  // Add effect to listen for language changes
  useEffect(() => {
    const handleLanguageChanged = () => {
      console.log('Language changed in Index to:', i18n.language);
      setCurrentLang(i18n.language);
    };
    
    // Listen for language changes
    i18n.on('languageChanged', handleLanguageChanged);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);
  
  // Function to refresh data
  const refreshUserData = () => {
    setLastUpdate(Date.now());
  };
  
  // Function to handle file upload for disease detection
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Function to handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Convert file to base64 and store in sessionStorage
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result as string;
        // Store the image data and analysis type in sessionStorage
        sessionStorage.setItem('uploadedImage', imageData);
        sessionStorage.setItem('analysisType', 'disease'); // Default to disease analysis
        
        // Navigate to the disease scan page
        navigate('/disease-scan');
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Farm activity status widget
  const renderFarmStatus = () => {
    // Show farm status if user is authenticated
    if (!currentUser && !isAuthenticated) return null;
    
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-100"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-700">{t('dashboard.farmActivityStatus')}</h3>
          <span className="text-xs text-agri-green bg-agri-green/10 px-2 py-1 rounded-full">{t('common.active')}</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center justify-center p-3 bg-agri-freshGreen/10 rounded-lg">
            <Droplets className="h-6 w-6 text-agri-blue mb-2" />
            <span className="text-xs text-gray-500">{t('dashboard.irrigation')}</span>
            <span className="font-medium text-sm">{t('common.last')}: {t('common.today')}</span>
          </div>
          
          <div className="flex flex-col items-center justify-center p-3 bg-agri-lime/10 rounded-lg">
            <Leaf className="h-6 w-6 text-agri-freshGreen mb-2" />
            <span className="text-xs text-gray-500">{t('dashboard.cropsHealth')}</span>
            <span className="font-medium text-sm">{t('common.good')}</span>
          </div>
          
          <div className="flex flex-col items-center justify-center p-3 bg-agri-soil/10 rounded-lg">
            <Tractor className="h-6 w-6 text-agri-soil mb-2" />
            <span className="text-xs text-gray-500">{t('dashboard.lastPlowed')}</span>
            <span className="font-medium text-sm">{t('common.daysAgo', { count: 3 })}</span>
          </div>
          
          <div className="flex flex-col items-center justify-center p-3 bg-agri-tomato/10 rounded-lg">
            <Pill className="h-6 w-6 text-agri-tomato mb-2" />
            <span className="text-xs text-gray-500">{t('dashboard.lastTreatment')}</span>
            <span className="font-medium text-sm">{t('common.weekAgo', { count: 1 })}</span>
          </div>
        </div>
      </motion.div>
    );
  };
  
  // Dashboard controls for tabs and view mode
  const renderDashboardControls = () => {
    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <Tabs 
          defaultValue="overview" 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value)}
          className="w-full md:w-auto"
        >
          <TabsList className="bg-white border border-gray-200 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-agri-green data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="soil" className="data-[state=active]:bg-agri-soil data-[state=active]:text-white">Soil Health</TabsTrigger>
            <TabsTrigger value="crops" className="data-[state=active]:bg-agri-freshGreen data-[state=active]:text-white">Crops</TabsTrigger>
            <TabsTrigger value="market" className="data-[state=active]:bg-agri-amber data-[state=active]:text-white">Market</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center space-x-2">
          <RadioGroup 
            defaultValue="grid" 
            value={viewMode}
            onValueChange={(value) => setViewMode(value as 'grid' | 'list')}
            className="flex items-center space-x-1"
          >
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="grid" id="grid" className="sr-only" />
              <Label 
                htmlFor="grid" 
                className={cn(
                  "cursor-pointer p-2 rounded-md",
                  viewMode === 'grid' ? "bg-gray-100" : "hover:bg-gray-50"
                )}
              >
                <LayoutGrid className="h-5 w-5 text-gray-700" />
              </Label>
            </div>
            
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="list" id="list" className="sr-only" />
              <Label 
                htmlFor="list" 
                className={cn(
                  "cursor-pointer p-2 rounded-md",
                  viewMode === 'list' ? "bg-gray-100" : "hover:bg-gray-50"
                )}
              >
                <LayoutList className="h-5 w-5 text-gray-700" />
              </Label>
            </div>
          </RadioGroup>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshUserData}
            className="text-gray-700"
          >
            {t('common.refresh')}
          </Button>
        </div>
      </div>
    );
  };
  
  // Simplified card component without motion for stability
  const renderCard = (index: number, title: string, icon: React.ReactNode, color: string, children: React.ReactNode) => {
    return (
      <div
        className={`bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300`}
      >
        <div className={`p-4 border-b ${color}`}>
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-800">{title}</h3>
            <div className="rounded-full bg-white/90 backdrop-blur-sm p-1.5">
              {icon}
            </div>
          </div>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    );
  };
  
  return (
    <MainLayout>
      <WelcomeBanner 
        userName={userName}
        temperature={weatherData.temperature}
        weatherCondition={weatherData.condition}
        location={userLocation}
      />
      
      {renderFarmStatus()}
      
      {renderDashboardControls()}
      
      <div className={cn(
        "gap-6 mb-8",
        viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "space-y-6"
      )}>
        {/* Soil Health Card */}
        {renderCard(
          0,
          t('soilLab.title'),
          <Droplets className="h-5 w-5 text-agri-blue" />,
          "bg-gradient-to-r from-agri-soil/20 to-agri-clay/20",
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs text-gray-500">{t('soilLab.lastAnalyzed')}</span>
                <p className="font-medium">{t('common.yesterday')}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">{t('soilLab.overallHealth')}</span>
                <p className="font-medium text-agri-green">{t('common.good')}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {[
                { name: t('soilLab.nitrogen'), value: 75, color: 'bg-agri-blue' },
                { name: t('soilLab.phosphorus'), value: 62, color: 'bg-agri-freshGreen' },
                { name: t('soilLab.potassium'), value: 88, color: 'bg-agri-tomato' },
                { name: t('soilLab.ph'), value: 6.8, color: 'bg-agri-amber', unit: 'pH' }
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-medium">
                      {typeof item.value === 'number' && item.value > 10 ? `${item.value}%` : item.value}
                      {item.unit ? ` ${item.unit}` : ''}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full`} 
                      style={{ width: typeof item.value === 'number' && item.value > 10 ? `${item.value}%` : '70%' }} 
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <Button variant="link" size="sm" className="mt-4 text-agri-soil p-0">
              View Full Report
            </Button>
          </div>
        )}
        
        {/* Crop Recommendations Card */}
        {renderCard(
          1,
          "Crop Recommendations",
          <Sprout className="h-5 w-5 text-agri-freshGreen" />,
          "bg-gradient-to-r from-agri-freshGreen/20 to-agri-lime/20",
          <div>
            <div className="text-xs text-gray-500 mb-3">Top recommendations based on soil & climate</div>
            
            {[
              { name: 'Rice', confidence: 92, yield: '5.8 tons/ha' },
              { name: 'Cotton', confidence: 87, yield: '2.3 tons/ha' },
              { name: 'Sugarcane', confidence: 78, yield: '80 tons/ha' }
            ].map((crop, i) => (
              <div key={i} className="flex items-center p-2 rounded-lg mb-2 hover:bg-gray-50">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center mr-3",
                  i === 0 ? "bg-agri-lime/20 text-agri-darkGreen" : 
                  i === 1 ? "bg-agri-blue/10 text-agri-blue" : 
                  "bg-agri-amber/10 text-agri-amber"
                )}>
                  {i === 0 && <Leaf className="h-5 w-5" />}
                  {i === 1 && <Sun className="h-5 w-5" />}
                  {i === 2 && <Droplets className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{crop.name}</span>
                    <span className="text-sm text-agri-green">{crop.confidence}%</span>
                  </div>
                  <div className="text-xs text-gray-500">Est. yield: {crop.yield}</div>
                </div>
              </div>
            ))}
            
            <Button variant="outline" size="sm" className="w-full mt-2 text-agri-freshGreen border-agri-freshGreen/30 hover:bg-agri-freshGreen/10">
              Get Detailed Analysis
            </Button>
          </div>
        )}
        
        {/* Disease Detection Card */}
        {renderCard(
          2,
          "Disease Detection",
          <Eye className="h-5 w-5 text-agri-tomato" />,
          "bg-gradient-to-r from-agri-tomato/20 to-agri-orange/20",
          <div className="text-center py-4">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-agri-tomato/10 text-agri-tomato mb-2">
                <Scan className="h-8 w-8" />
              </div>
              <h3 className="font-medium">Scan Crop Images for Diseases</h3>
              <p className="text-sm text-gray-500 mt-1">Upload photos of your crops to detect diseases</p>
            </div>
            
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            
            <Button 
              className="bg-agri-tomato hover:bg-agri-tomato/90"
              onClick={handleUploadClick}
            >
              Upload Images
            </Button>
          </div>
        )}
        
        {/* Market Prices Card */}
        {renderCard(
          3,
          "Market Prices",
          <BarChart4 className="h-5 w-5 text-agri-amber" />,
          "bg-gradient-to-r from-agri-amber/20 to-agri-gold/20",
          <div>
            <div className="flex justify-between items-center mb-3 text-sm">
              <span className="text-gray-500">Commodity</span>
              <span className="text-gray-500">Current Price</span>
            </div>
            
            {[
              { name: 'Rice', price: '₹2,350/q', change: '+2.4%' },
              { name: 'Cotton', price: '₹6,700/q', change: '+1.2%' },
              { name: 'Wheat', price: '₹2,050/q', change: '-0.8%' },
              { name: 'Sugarcane', price: '₹350/q', change: '+0.5%' }
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="font-medium">{item.name}</span>
                <div className="text-right">
                  <span className="font-medium">{item.price}</span>
                  <span className={cn(
                    "text-xs ml-2 px-1.5 py-0.5 rounded",
                    item.change.startsWith('+') ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                  )}>
                    {item.change}
                  </span>
                </div>
              </div>
            ))}
            
            <div className="text-xs text-gray-500 mt-3 text-right">
              Last updated: Today at 8:30 AM
            </div>
          </div>
        )}
        
        {/* Weather Forecast Card */}
        {renderCard(
          4,
          t('dashboard.weatherForecast'),
          <CloudSun className="h-5 w-5 text-agri-lightBlue" />,
          "bg-gradient-to-r from-agri-lightBlue/20 to-agri-blue/20",
          <div>
            <div className="flex flex-wrap -mx-2">
              {[
                { day: 'Today', icon: <Sun className="h-5 w-5 text-agri-yellow" />, temp: '32°/27°', desc: 'Sunny' },
                { day: 'Tomorrow', icon: <CloudSun className="h-5 w-5 text-agri-blue" />, temp: '30°/26°', desc: 'Partly Cloudy' },
                { day: 'Wed', icon: <Droplets className="h-5 w-5 text-agri-lightBlue" />, temp: '28°/25°', desc: 'Light Rain' },
                { day: 'Thu', icon: <Wind className="h-5 w-5 text-agri-slate" />, temp: '29°/24°', desc: 'Windy' },
              ].map((day, i) => (
                <div key={i} className="w-1/2 sm:w-1/4 px-2 mb-4">
                  <div className="text-center p-2 rounded-lg hover:bg-gray-50">
                    <div className="text-sm font-medium">{day.day}</div>
                    <div className="flex justify-center my-2">{day.icon}</div>
                    <div className="text-sm font-medium">{day.temp}</div>
                    <div className="text-xs text-gray-500">{day.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-2 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Precipitation: 20%</span>
              <span>Humidity: 68%</span>
              <span>Wind: 12 km/h</span>
            </div>
          </div>
        )}
        
        {/* Irrigation Planner Card */}
        {renderCard(
          5,
          t('dashboard.irrigation'),
          <Droplets className="h-5 w-5 text-agri-teal" />,
          "bg-gradient-to-r from-agri-teal/20 to-agri-lightBlue/20",
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs text-gray-500">{t('cropAdvisor.waterRequirement')}</span>
                <p className="font-medium">{t('common.medium')}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">{t('dashboard.nextIrrigation')}</span>
                <p className="font-medium text-agri-blue">{t('common.tomorrow')}</p>
              </div>
            </div>
            
            <div className="relative pt-2">
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="text-gray-500">{t('soilLab.moisture')}</span>
                <span className="font-medium">65%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div className="h-full bg-agri-blue rounded-full" style={{ width: '65%' }} />
              </div>
              <div className="absolute -top-1 left-[65%] w-4 h-4 rounded-full border-2 border-white bg-agri-blue transform -translate-x-1/2" />
            </div>
            
            <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                <div key={i} className="space-y-1">
                  <div>{day}</div>
                  <div className={cn(
                    "w-full py-1 rounded-md", 
                    i === 1 || i === 4 ? "bg-agri-blue text-white" : "bg-gray-100"
                  )}>
                    {i === 1 || i === 4 ? <Droplets className="h-3 w-3 mx-auto" /> : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Index;
