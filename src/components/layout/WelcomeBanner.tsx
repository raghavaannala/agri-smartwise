import React, { useEffect, useState } from 'react';
import { CloudSun, Droplets, Wind, Sun, Thermometer, Leaf, Map, ArrowRight, Loader, MapPin, Satellite, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile } from '@/lib/firestore';
import { motion } from 'framer-motion';
import { useLocation } from '../../hooks/useLocation';
import { getCurrentWeather } from '../../services/weatherService';
import { useNavigate } from 'react-router-dom';
import smartAgroXLogo from '@/assets/images/logooo.png';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

// Define different color themes for the banner
const colorThemes = [
  {
    name: 'purple',
    gradients: {
      morning: 'from-purple-600 via-purple-400 to-indigo-500',
      afternoon: 'from-indigo-600 via-purple-500 to-fuchsia-400',
      evening: 'from-fuchsia-600 via-purple-500 to-indigo-600',
      night: 'from-indigo-900 via-purple-800 to-fuchsia-900'
    },
    accent: 'purple',
    bgOpacity: '500/20',
    borderColor: 'purple-300/30',
    iconBg: 'purple-600/30',
    widgetBg: 'purple-700/20',
    iconText: 'purple-200',
    accentBtn: 'purple-600/40',
    accentBtnHover: 'purple-600/60'
  },
  {
    name: 'blue',
    gradients: {
      morning: 'from-blue-600 via-sky-400 to-cyan-500',
      afternoon: 'from-sky-600 via-blue-500 to-indigo-400',
      evening: 'from-indigo-600 via-blue-500 to-sky-600',
      night: 'from-blue-900 via-indigo-800 to-slate-900'
    },
    accent: 'blue',
    bgOpacity: '500/20',
    borderColor: 'blue-300/30',
    iconBg: 'blue-600/30',
    widgetBg: 'blue-700/20',
    iconText: 'blue-200',
    accentBtn: 'blue-600/40',
    accentBtnHover: 'blue-600/60'
  },
  {
    name: 'green',
    gradients: {
      morning: 'from-emerald-600 via-green-400 to-lime-500',
      afternoon: 'from-green-600 via-emerald-500 to-teal-400',
      evening: 'from-teal-600 via-emerald-500 to-green-600',
      night: 'from-teal-900 via-emerald-800 to-green-900'
    },
    accent: 'green',
    bgOpacity: '500/20',
    borderColor: 'green-300/30',
    iconBg: 'green-600/30',
    widgetBg: 'green-700/20',
    iconText: 'green-200',
    accentBtn: 'green-600/40',
    accentBtnHover: 'green-600/60'
  },
  {
    name: 'amber',
    gradients: {
      morning: 'from-amber-600 via-orange-400 to-yellow-500',
      afternoon: 'from-orange-600 via-amber-500 to-yellow-400',
      evening: 'from-red-600 via-amber-500 to-orange-600',
      night: 'from-amber-900 via-orange-800 to-red-900'
    },
    accent: 'amber',
    bgOpacity: '500/20',
    borderColor: 'amber-300/30',
    iconBg: 'amber-600/30',
    widgetBg: 'amber-700/20',
    iconText: 'amber-200',
    accentBtn: 'amber-600/40',
    accentBtnHover: 'amber-600/60'
  },
  {
    name: 'rose',
    gradients: {
      morning: 'from-rose-600 via-pink-400 to-red-500',
      afternoon: 'from-red-600 via-rose-500 to-pink-400',
      evening: 'from-pink-600 via-rose-500 to-red-600',
      night: 'from-rose-900 via-pink-800 to-red-900'
    },
    accent: 'rose',
    bgOpacity: '500/20',
    borderColor: 'rose-300/30',
    iconBg: 'rose-600/30',
    widgetBg: 'rose-700/20',
    iconText: 'rose-200',
    accentBtn: 'rose-600/40',
    accentBtnHover: 'rose-600/60'
  },
];

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
  const { t } = useTranslation();
  const isGuest = !currentUser || userName === 'Guest';
  const [profileName, setProfileName] = useState<string>(userName);
  const { location: geoLocation, loading: locationLoading, usingFallback } = useLocation();
  const navigate = useNavigate();
  
  // Generate a random color theme on component mount
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Get a random theme index
    const randomIndex = Math.floor(Math.random() * colorThemes.length);
    return colorThemes[randomIndex];
  });
  
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

  const translateWeatherCondition = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('rain') || lowerCondition.includes('shower')) return t('weather.lightRain');
    if (lowerCondition.includes('cloud')) return t('weather.partlyCloudy');
    if (lowerCondition.includes('sun') || lowerCondition.includes('clear')) return t('weather.sunny');
    if (lowerCondition.includes('wind')) return t('weather.windy');
    if (lowerCondition.includes('storm') || lowerCondition.includes('thunder')) return t('weather.stormy');
    if (lowerCondition.includes('mist') || lowerCondition.includes('fog')) return t('weather.foggy');
    return condition; // fallback to original if no match
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
      morning: t('common.goodMorning'),
      afternoon: t('common.goodAfternoon'),
      evening: t('common.goodEvening'),
      night: t('common.goodNight')
    };
    return greetings[timeOfDay];
  };
  
  const weatherIcon = () => {
    const lowerCondition = weatherData.condition.toLowerCase();
    if (lowerCondition.includes('rain')) return <Droplets className={`text-${currentTheme.iconText}`} />;
    if (lowerCondition.includes('cloud')) return <CloudSun className={`text-${currentTheme.iconText}`} />;
    if (lowerCondition.includes('sun') || lowerCondition.includes('clear')) return <Sun className={`text-${currentTheme.iconText}`} />;
    if (lowerCondition.includes('wind')) return <Wind className={`text-${currentTheme.iconText}`} />;
    return <CloudSun className={`text-${currentTheme.iconText}`} />;
  };

  // Get the location to display - prioritize real location from API
  const displayLocation = realLocation || defaultLocation;

  const timeOfDay = getTimeOfDay();

  // Function to handle navigation to the farm page
  const handleViewFarm = () => {
    navigate('/farm');
  };

  return (
    <motion.div 
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`bg-gradient-to-r ${currentTheme.gradients[timeOfDay]} rounded-xl p-6 text-white mb-8 overflow-hidden relative shadow-lg`}
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
      
      {/* Agriculture-themed background elements */}
      <div className="absolute bottom-0 right-0 w-40 h-40 md:w-64 md:h-64 opacity-20">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path d="M140,20 Q160,0 180,20 L180,180 Q160,200 140,180 L20,60 Q0,40 20,20 Z" fill="white"/>
        </svg>
      </div>
      
      <div className="absolute top-10 right-40 w-20 h-20 opacity-10">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path d="M20,20 L80,20 L80,80 L20,80 Z" stroke="white" strokeWidth="4"/>
        </svg>
      </div>
      
      {/* Seeds/leaves floating animation */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div 
          key={`leaf-${i}`}
          className="absolute"
          style={{
            left: `${10 + i * 15}%`,
            top: `${50 + (i % 3) * 10}%`,
          }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, i % 2 ? 15 : -15, 0],
            opacity: [0.2, 0.3, 0.2]
          }}
          transition={{
            duration: 5 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5
          }}
        >
          <Leaf className={`h-${3 + (i % 3)} w-${3 + (i % 3)} text-white/30`} />
        </motion.div>
      ))}
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex justify-center md:justify-start mb-4 md:mb-0">
          <img src={smartAgroXLogo} alt="SmartAgroX Logo" className="w-48 h-48 md:w-64 md:h-64" />
        </div>
        <div className="md:max-w-[60%] md:ml-8">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="text-sm font-medium text-white/90 mb-1">{getGreeting()}</h2>
            <h1 className="text-2xl md:text-3xl font-bold mb-3 flex items-center">
              {isGuest 
                ? t('dashboard.welcome') + "! 🌱"
                : t('dashboard.welcomeMessage', { name: profileName || userName }) + ` ${getWeatherEmoji(weatherData.condition)}`
              }
            </h1>
            {/* <p className="text-white/90 max-w-xl leading-relaxed backdrop-blur-sm bg-black/5 p-3 rounded-lg border border-white/10">
              {isGuest
                ? "Transform your farming with data-dYour farm is thriving! Explore personalized insights, weather impacts, and recommendations to maximize your agricultural success today.riven insights, smart recommendations, and precision agriculture technology for optimal yields and sustainability."
                : ``
              }
            </p> */}
          </motion.div>
          
          {!isGuest && (
            <motion.div 
              className="flex flex-wrap items-center mt-4 gap-3"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className={`flex items-center bg-${currentTheme.accent}-${currentTheme.bgOpacity} backdrop-blur-sm px-4 py-2 rounded-lg border border-${currentTheme.borderColor} shadow-sm`}>
                <Leaf className={`h-4 w-4 mr-2 text-${currentTheme.iconText}`} />
                <span className="text-sm font-medium">{t('common.season')}: {t('common.spring')}</span>
              </div>
              
              <div className={`flex items-center bg-${currentTheme.accent}-${currentTheme.bgOpacity} backdrop-blur-sm px-4 py-2 rounded-lg border border-${currentTheme.borderColor} shadow-sm`}>
                <MapPin className={`h-4 w-4 mr-2 text-${currentTheme.iconText}`} />
                <span className="text-sm font-medium">
                  {locationFetching ? (
                    <span className="flex items-center">
                      {t('common.loadingLocation')}... <Loader className="h-3 w-3 ml-1 animate-spin" />
                    </span>
                  ) : displayLocation ? (
                    <span>
                      {displayLocation}
                      {usingFallback && realLocation && <span className="ml-1 text-xs text-yellow-200">({t('common.default')})</span>}
                    </span>
                  ) : (
                    defaultLocation
                  )}
                </span>
              </div>
              
              <button 
                className={`flex items-center bg-${currentTheme.accentBtn} hover:bg-${currentTheme.accentBtnHover} backdrop-blur-sm px-4 py-2 rounded-lg transition-colors shadow-sm border border-${currentTheme.borderColor}`}
                onClick={handleViewFarm}
              >
                <span className="text-sm font-medium mr-1">{t('common.viewFarm')}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </div>
        
        {/* Weather widget with enhanced visual style */}
        <motion.div 
          className={`mt-8 md:mt-0 bg-${currentTheme.accent}-${currentTheme.bgOpacity} backdrop-blur-md rounded-xl p-4 border border-${currentTheme.borderColor} shadow-xl`}
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="flex items-center mb-2">
            <div className={`rounded-full bg-${currentTheme.iconBg} p-2 mr-3`}>
              {weatherIcon()}
            </div>
            <div>
              <p className="text-white/80 text-sm">{translateWeatherCondition(weatherData.condition)}</p>
              <p className="text-3xl font-bold">{weatherData.temperature}°C</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className={`flex flex-col items-center bg-${currentTheme.widgetBg} rounded-lg py-2`}>
              <Droplets className={`h-4 w-4 mb-1 text-${currentTheme.iconText}`} />
              <span className="text-xs text-white/70">{t('common.humidity')}</span>
              <span className="text-sm font-medium">{weatherData.humidity}%</span>
            </div>
            <div className={`flex flex-col items-center bg-${currentTheme.widgetBg} rounded-lg py-2`}>
              <Wind className={`h-4 w-4 mb-1 text-${currentTheme.iconText}`} />
              <span className="text-xs text-white/70">{t('common.wind')}</span>
              <span className="text-sm font-medium">{weatherData.wind} km/h</span>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-white/80">
              <span>{t('common.feelsLike')}: {weatherData.feelsLike}°C</span>
              <span className="flex items-center">
                <MapPin className="h-3 w-3 mr-1" /> 
                {locationFetching ? (
                  <span className="flex items-center">
                    <Loader className="h-2 w-2 mr-1 animate-spin" /> {t('common.loading')}
                  </span>
                ) : (
                  <span>{displayLocation.split(',')[0]}</span>
                )}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* AgroVision Feature Spotlight */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className={`mt-4 p-3 rounded-lg bg-${currentTheme.accent}-${currentTheme.bgOpacity} border border-${currentTheme.borderColor} relative overflow-hidden`}
      >
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-agri-teal/10 blur-2xl"></div>
        
        <div className="flex items-center mb-2">
          <div className={`p-2 rounded-lg bg-agri-teal/20 mr-3`}>
            <Satellite className="h-5 w-5 text-agri-teal" />
          </div>
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="font-medium text-white">{t('common.agroVision')}</h3>
              <Badge className="ml-2 bg-agri-teal/20 text-white border-agri-teal/30 text-xs">
                {t('common.new')}
              </Badge>
            </div>
            <p className="text-xs text-white/70">{t('common.satelliteCropHealthMonitoring')}</p>
          </div>
        </div>
        
        <p className="text-sm text-white/80 mb-3">
          {t('common.monitorYourFieldsWithRealTimeSatelliteImageryAndNDVIAnalysis')}
        </p>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center w-full justify-center text-sm text-white bg-agri-teal/40 hover:bg-agri-teal/60 py-1.5 px-3 rounded-md transition-colors`}
          onClick={() => navigate('/agrovision')}
        >
          <Globe className="h-4 w-4 mr-2" />
          {t('common.launchAgroVision')}
          <ArrowRight className="h-4 w-4 ml-1" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default WelcomeBanner;
