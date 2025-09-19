import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CloudRain, 
  Sun, 
  Wind, 
  Thermometer,
  Droplets,
  Zap,
  Shield,
  Sprout,
  Clock,
  MapPin,
  X,
  CheckCircle,
  Bell,
  Umbrella,
  Snowflake,
  Eye,
  Settings,
  Target,
  CloudSun
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentWeather, getForecast } from '@/services/weatherService';
import AlertSettings, { AlertSettingsType } from './AlertSettings';

interface FarmingAlert {
  id: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  category: 'weather' | 'irrigation' | 'pest' | 'fertilizer' | 'harvest' | 'general';
  title: string;
  message: string;
  action?: string;
  icon: React.ReactNode;
  priority: number;
  expiresAt?: Date;
  farmSpecific?: {
    cropName?: string;
    soilType?: string;
    location?: string;
    farmSize?: number;
  };
}

interface FarmingAlertsProps {
  farmData?: {
    location: string;
    soilType: string;
    crops: string[];
    size: number;
    irrigationSystem: string;
  };
  cropJourney?: {
    cropName: string;
    currentStage: string;
    stages: any[];
  };
}

const FarmingAlerts: React.FC<FarmingAlertsProps> = ({ farmData, cropJourney }) => {
  console.log('FarmingAlerts component rendering...', { farmData, cropJourney });
  
  const [alerts, setAlerts] = useState<FarmingAlert[]>([]);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [permanentlyDismissedAlerts, setPermanentlyDismissedAlerts] = useState<string[]>(() => {
    const stored = localStorage.getItem('farmingAlerts_permanentlyDismissed');
    return stored ? JSON.parse(stored) : [];
  });
  const [showSettings, setShowSettings] = useState(false);
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);
  const [alertCooldowns, setAlertCooldowns] = useState<{[key: string]: number}>({});
  const activeTimers = useRef<{[alertId: string]: NodeJS.Timeout}>({});
  const [hasShownWelcome, setHasShownWelcome] = useState(() => {
    return localStorage.getItem('farmingAlerts_welcomeShown') === 'true';
  });
  const [alertSettings, setAlertSettings] = useState<AlertSettingsType>(() => {
    const storedSettings = localStorage.getItem('farmingAlertSettings');
    return storedSettings ? JSON.parse(storedSettings) : {
      enabled: true,
      categories: {
        weather: true,
        irrigation: true,
        pest: true,
        fertilizer: true,
        harvest: true,
        general: true,
      },
      priorities: {
        urgent: true,
        warning: true,
        info: true,
        success: true,
      },
      thresholds: {
        temperature: 35,
        humidity: 80,
        windSpeed: 10,
      },
      notifications: {
        sound: false,
        position: 'top-right',
        autoHide: true,
        hideDelay: 3,
        maxAlerts: 2,
        cooldownMinutes: 30,
      },
    };
  });

  // Show basic alert when no farm data exists
  useEffect(() => {
    if (!farmData) {
      console.log('No farm data - showing basic alert');
      setAlerts([{
        id: 'basic-alert',
        type: 'info',
        category: 'general',
        title: '🌱 SmartAgroX Active',
        message: 'Your smart farming assistant is monitoring conditions. Add farm details to get personalized weather and crop alerts!',
        icon: <Sprout className="h-5 w-5 text-green-600" />,
        priority: 1
      }]);
    } else {
      console.log('Farm data exists:', farmData.location);
      // TODO: Add weather-based alerts here
      setAlerts([{
        id: 'welcome-alert',
        type: 'success',
        category: 'general',
        title: `🌾 Welcome to ${farmData.location}!`,
        message: `Your ${farmData.soilType} soil farm is being monitored. Weather alerts and crop recommendations will appear here.`,
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        priority: 1
      }]);
    }
  }, [farmData]);

  // Auto-hide timer - simple implementation
  useEffect(() => {
    if (alerts.length === 0) return;

    console.log(`Setting auto-hide timers for ${alerts.length} alerts`);
    
    const timers = alerts.map((alert, index) => {
      const delay = (3 + index * 0.5) * 1000; // 3 seconds + stagger
      console.log(`Setting timer for ${alert.id} with delay ${delay}ms`);
      
      return setTimeout(() => {
        console.log(`Auto-hiding alert: ${alert.id}`);
        setAlerts(prev => prev.filter(a => a.id !== alert.id));
      }, delay);
    });

    return () => {
      console.log('Cleaning up timers');
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [alerts.map(a => a.id).join(',')]); // Only depend on alert IDs

  if (!alertSettings.enabled) {
    console.log('Alerts disabled in settings');
    return null;
  }

  console.log(`Alert component render - alerts.length: ${alerts.length}, dismissed: ${dismissedAlerts.length}, permanent: ${permanentlyDismissedAlerts.length}`);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      <AnimatePresence>
        {alerts.map((alert, index) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ 
              duration: 0.5, 
              delay: index * 0.1,
              type: "spring",
              stiffness: 100
            }}
          >
            <Card className="border-2 shadow-2xl overflow-hidden bg-gradient-to-r from-blue-400 to-blue-500 text-white border-blue-300">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {alert.icon}
                    <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                      {alert.category.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log(`Dismissing alert: ${alert.id}`);
                        setAlerts(prev => prev.filter(a => a.id !== alert.id));
                      }}
                      className="h-6 w-6 p-0 text-white hover:bg-white/20"
                      title="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-bold text-sm mb-2">{alert.title}</h3>
                <p className="text-xs text-white/90 mb-3 leading-relaxed">
                  {alert.message}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default FarmingAlerts;
