import React, { useEffect, useState } from 'react';
import { CloudSun, Droplets, Wind, Sun, Thermometer, Leaf, Map, ArrowRight, Loader, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile } from '@/lib/firestore';
import { motion } from 'framer-motion';
import { useLocation } from '../../hooks/useLocation';
import { getCurrentWeather } from '../../services/weatherService';
import { useNavigate } from 'react-router-dom';

type WelcomeBannerProps = {
  userName: string;
  temperature: number;
  weatherCondition: string;
  location: string;
};

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  userName,
  temperature: defaultTemperature,
  weatherCondition: defaultCondition,
  location: defaultLocation
}) => {
  const { currentUser } = useAuth();
  const isGuest = !currentUser || userName === 'Guest';
  const [profileName, setProfileName] = useState<string>(userName);
  const { location: geoLocation, loading: locationLoading, usingFallback } = useLocation();
  const navigate = useNavigate();
  
  // States for live weather data
  const [locationFetching, setLocationFetching] = useState(false);
  const [realLocation, setRealLocation] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState({
    temperature: defaultTemperature,
    condition: defaultCondition,
    humidity: 68,
    wind: 12,
    feelsLike: defaultTemperature + 2
  });
  
  // Fetch location-based weather data
  useEffect(() => {
    const fetchWeatherData = async () => {
      if (geoLocation) {
        try {
          console.log(`WelcomeBanner fetching weather for: ${geoLocation.latitude}, ${geoLocation.longitude}`);
          setLocationFetching(true);
          
          const data = await getCurrentWeather(geoLocation.latitude, geoLocation.longitude);
          console.log('Weather data received in banner:', data);
          
          if (data && data.name) {
            // Format location with city and country
            const locationDisplay = `${data.name}${data.sys.country ? ', ' + data.sys.country : ''}`;
            setRealLocation(locationDisplay);
            
            // Update weather data
            setWeatherData({
              temperature: Math.round(data.main.temp),
              condition: data.weather[0].main,
              humidity: data.main.humidity,
              wind: Math.round(data.wind.speed * 3.6), // convert m/s to km/h
              feelsLike: Math.round(data.main.feels_like)
            });
          }
        } catch (error) {
          console.error('Error fetching weather data in banner:', error);
        } finally {
          setLocationFetching(false);
        }
      }
    };
    
    fetchWeatherData();
  }, [geoLocation]);
  
  // Fetch the latest profile information directly when needed
  useEffect(() => {
    const fetchUserName = async () => {
      if (currentUser) {
        try {
          // Immediately update with basic info from Firebase Auth
          if (currentUser.displayName) {
            setProfileName(currentUser.displayName);
          } else if (currentUser.email) {
            const emailName = currentUser.email.split('@')[0] || 'User';
            setProfileName(emailName);
          }
          
          // Then fetch complete profile from Firestore
          const userProfile = await getUserProfile(currentUser.uid);
          if (userProfile?.displayName) {
            setProfileName(userProfile.displayName);
          }
          
          console.log('WelcomeBanner: User profile loaded', { 
            name: userProfile?.displayName || currentUser.displayName || currentUser.email?.split('@')[0],
            userId: currentUser.uid 
          });
        } catch (error) {
          console.error('Error fetching user name:', error);
        }
      } else {
        setProfileName('Guest');
      }
    };
    
    fetchUserName();
  }, [currentUser]);
  
  const getWeatherEmoji = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('rain') || lowerCondition.includes('shower')) return '🌧️';
    if (lowerCondition.includes('cloud')) return '☁️';
    if (lowerCondition.includes('sun') || lowerCondition.includes('clear')) return '☀️';
    if (lowerCondition.includes('snow')) return '❄️';
    if (lowerCondition.includes('storm') || lowerCondition.includes('thunder')) return '⛈️';
    if (lowerCondition.includes('mist') || lowerCondition.includes('fog')) return '🌫️';
    return '🌤️';
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  };

  const getGreeting = () => {
    const timeOfDay = getTimeOfDay();
    const greetings = {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
      night: 'Good night'
    };
    return greetings[timeOfDay];
  };
  
  const weatherIcon = () => {
    const lowerCondition = weatherData.condition.toLowerCase();
    if (lowerCondition.includes('rain')) return <Droplets className="text-agri-lightBlue" />;
    if (lowerCondition.includes('cloud')) return <CloudSun className="text-agri-slate" />;
    if (lowerCondition.includes('sun') || lowerCondition.includes('clear')) return <Sun className="text-agri-yellow" />;
    if (lowerCondition.includes('wind')) return <Wind className="text-agri-blue" />;
    return <CloudSun className="text-agri-lightBlue" />;
  };

  // Get the location to display - prioritize real location from API
  const displayLocation = realLocation || defaultLocation;

  const timeOfDay = getTimeOfDay();
  const bannerGradients = {
    morning: 'from-agri-amber via-agri-lightBlue to-agri-blue',
    afternoon: 'from-agri-blue via-agri-lightBlue to-agri-lime',
    evening: 'from-agri-orange via-agri-amber to-agri-blue',
    night: 'from-agri-darkGreen via-agri-blue to-agri-eggplant'
  };

  // Function to handle navigation to the farm page
  const handleViewFarm = () => {
    navigate('/farm');
  };

  return (
    <motion.div 
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`bg-gradient-to-r ${bannerGradients[timeOfDay]} rounded-xl p-6 text-white mb-8 overflow-hidden relative shadow-lg`}
    >
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-1 h-1 rounded-full bg-white/20`}
            animate={{
              x: [Math.random() * 100 + "%", Math.random() * 100 + "%"],
              y: [Math.random() * 100 + "%", Math.random() * 100 + "%"],
              opacity: [0.2, 0.8, 0.2]
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between">
        <div className="md:max-w-[60%]">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="text-sm font-medium text-white/80 mb-1">{getGreeting()}</h2>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center">
              {isGuest 
                ? "Welcome to SmartAgroX!" 
                : `Welcome back, ${profileName || userName}! ${getWeatherEmoji(weatherData.condition)}`
              }
            </h1>
            <p className="text-white/90 max-w-xl leading-relaxed">
              {isGuest
                ? "Discover agricultural insights, smart farming recommendations, and data-driven decisions for optimal crop yields."
                : `Your farm is looking good today. Check out your personalized insights and recommendations for maximum productivity.`
              }
            </p>
          </motion.div>
          
          {!isGuest && (
            <motion.div 
              className="flex items-center mt-4 space-x-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <Leaf className="h-4 w-4 mr-2 text-agri-lime" />
                <span className="text-sm font-medium">Season: Spring</span>
              </div>
              
              <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <MapPin className="h-4 w-4 mr-2 text-agri-sand" />
                <span className="text-sm font-medium">
                  {locationFetching ? (
                    <span className="flex items-center">
                      Loading location... <Loader className="h-3 w-3 ml-1 animate-spin" />
                    </span>
                  ) : displayLocation ? (
                    <span>
                      {displayLocation}
                      {usingFallback && realLocation && <span className="ml-1 text-xs text-yellow-200">(Default)</span>}
                    </span>
                  ) : (
                    defaultLocation
                  )}
                </span>
              </div>
              
              <button 
                className="flex items-center bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg transition-colors"
                onClick={handleViewFarm}
              >
                <span className="text-sm font-medium mr-1">View Farm</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </div>
        
        <motion.div 
          className="flex items-center mt-5 md:mt-0"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  {weatherIcon()}
                  <span className="ml-2 font-semibold text-lg">{weatherData.condition}</span>
                </div>
                <div className="text-3xl font-bold flex items-start">
                  {weatherData.temperature}<span className="text-xl">°C</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white/10 rounded-lg p-2">
                  <Droplets className="h-4 w-4 mx-auto mb-1" />
                  <div className="text-xs font-medium">Humidity</div>
                  <div className="text-sm">{weatherData.humidity}%</div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-2">
                  <Wind className="h-4 w-4 mx-auto mb-1" />
                  <div className="text-xs font-medium">Wind</div>
                  <div className="text-sm">{weatherData.wind} km/h</div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-2">
                  <Thermometer className="h-4 w-4 mx-auto mb-1" />
                  <div className="text-xs font-medium">Feels like</div>
                  <div className="text-sm">{weatherData.feelsLike}°C</div>
                </div>
              </div>
              
              <div className="text-center mt-3 text-xs text-white/70">
                Today's forecast for {displayLocation}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default WelcomeBanner;
