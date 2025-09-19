import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Settings, 
  Bell, 
  BellOff,
  CloudRain, 
  Thermometer,
  Droplets,
  Wind,
  Sprout,
  AlertTriangle,
  Eye,
  Volume2,
  VolumeX,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

export interface AlertSettings {
  enabled: boolean;
  categories: {
    weather: boolean;
    irrigation: boolean;
    pest: boolean;
    fertilizer: boolean;
    harvest: boolean;
    general: boolean;
  };
  priorities: {
    urgent: boolean;
    warning: boolean;
    info: boolean;
    success: boolean;
  };
  thresholds: {
    temperature: number;
    humidity: number;
    windSpeed: number;
  };
  notifications: {
    sound: boolean;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    autoHide: boolean;
    hideDelay: number;
    maxAlerts: number;
    cooldownMinutes: number;
  };
}

interface AlertSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: (settings: AlertSettings) => void;
}

const defaultSettings: AlertSettings = {
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
    maxAlerts: 3,
    cooldownMinutes: 30,
  },
};

const AlertSettings: React.FC<AlertSettingsProps> = ({ isOpen, onClose, onSettingsChange }) => {
  const [settings, setSettings] = useState<AlertSettings>(defaultSettings);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('farmingAlertSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading alert settings:', error);
      }
    }
  }, []);

  const updateSettings = (newSettings: AlertSettings) => {
    setSettings(newSettings);
    localStorage.setItem('farmingAlertSettings', JSON.stringify(newSettings));
    onSettingsChange(newSettings);
  };

  const toggleCategory = (category: keyof AlertSettings['categories']) => {
    updateSettings({
      ...settings,
      categories: {
        ...settings.categories,
        [category]: !settings.categories[category],
      },
    });
  };

  const togglePriority = (priority: keyof AlertSettings['priorities']) => {
    updateSettings({
      ...settings,
      priorities: {
        ...settings.priorities,
        [priority]: !settings.priorities[priority],
      },
    });
  };

  const updateThreshold = (threshold: keyof AlertSettings['thresholds'], value: number) => {
    updateSettings({
      ...settings,
      thresholds: {
        ...settings.thresholds,
        [threshold]: value,
      },
    });
  };

  const resetToDefaults = () => {
    updateSettings(defaultSettings);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Alert Settings
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {settings.enabled ? (
                <Bell className="h-5 w-5 text-green-600" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <h3 className="font-semibold">Enable Farming Alerts</h3>
                <p className="text-sm text-gray-600">Turn on/off all farming alerts</p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) =>
                updateSettings({ ...settings, enabled: checked })
              }
            />
          </div>

          {settings.enabled && (
            <>
              {/* Alert Categories */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  Alert Categories
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(settings.categories).map(([category, enabled]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        {category === 'weather' && <CloudRain className="h-4 w-4 text-blue-500" />}
                        {category === 'irrigation' && <Droplets className="h-4 w-4 text-blue-600" />}
                        {category === 'pest' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        {category === 'fertilizer' && <Sprout className="h-4 w-4 text-green-500" />}
                        {category === 'harvest' && <Eye className="h-4 w-4 text-orange-500" />}
                        {category === 'general' && <Bell className="h-4 w-4 text-gray-500" />}
                        <span className="capitalize text-sm font-medium">{category}</span>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => toggleCategory(category as keyof AlertSettings['categories'])}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Levels */}
              <div>
                <h3 className="font-semibold mb-4">Priority Levels</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(settings.priorities).map(([priority, enabled]) => (
                    <div
                      key={priority}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            priority === 'urgent'
                              ? 'destructive'
                              : priority === 'warning'
                              ? 'secondary'
                              : priority === 'info'
                              ? 'default'
                              : 'outline'
                          }
                          className="text-xs"
                        >
                          {priority.toUpperCase()}
                        </Badge>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => togglePriority(priority as keyof AlertSettings['priorities'])}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Weather Thresholds */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-red-500" />
                  Weather Alert Thresholds
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">High Temperature Alert</label>
                      <span className="text-sm text-gray-600">{settings.thresholds.temperature}°C</span>
                    </div>
                    <Slider
                      value={[settings.thresholds.temperature]}
                      onValueChange={([value]) => updateThreshold('temperature', value)}
                      min={25}
                      max={45}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">High Humidity Alert</label>
                      <span className="text-sm text-gray-600">{settings.thresholds.humidity}%</span>
                    </div>
                    <Slider
                      value={[settings.thresholds.humidity]}
                      onValueChange={([value]) => updateThreshold('humidity', value)}
                      min={60}
                      max={95}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Strong Wind Alert</label>
                      <span className="text-sm text-gray-600">{settings.thresholds.windSpeed} m/s</span>
                    </div>
                    <Slider
                      value={[settings.thresholds.windSpeed]}
                      onValueChange={([value]) => updateThreshold('windSpeed', value)}
                      min={5}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div>
                <h3 className="font-semibold mb-4">Notification Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {settings.notifications.sound ? (
                        <Volume2 className="h-4 w-4 text-blue-500" />
                      ) : (
                        <VolumeX className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm font-medium">Sound Notifications</span>
                    </div>
                    <Switch
                      checked={settings.notifications.sound}
                      onCheckedChange={(checked) =>
                        updateSettings({
                          ...settings,
                          notifications: { ...settings.notifications, sound: checked },
                        })
                      }
                      size="sm"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Auto-hide Alerts</span>
                      <Badge variant="outline" className="text-xs">Recommended</Badge>
                    </div>
                    <Switch
                      checked={settings.notifications.autoHide}
                      onCheckedChange={(checked) =>
                        updateSettings({
                          ...settings,
                          notifications: { ...settings.notifications, autoHide: checked },
                        })
                      }
                      size="sm"
                    />
                  </div>

                  {settings.notifications.autoHide && (
                    <div className="ml-6">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Auto-hide after</label>
                        <span className="text-sm text-gray-600">{settings.notifications.hideDelay} seconds</span>
                      </div>
                      <Slider
                        value={[settings.notifications.hideDelay]}
                        onValueChange={([value]) =>
                          updateSettings({
                            ...settings,
                            notifications: { ...settings.notifications, hideDelay: value },
                          })
                        }
                        min={3}
                        max={15}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  )}

                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Max Alerts at Once</span>
                      </div>
                      <span className="text-sm text-gray-600">{settings.notifications.maxAlerts}</span>
                    </div>
                    <Slider
                      value={[settings.notifications.maxAlerts]}
                      onValueChange={([value]) =>
                        updateSettings({
                          ...settings,
                          notifications: { ...settings.notifications, maxAlerts: value },
                        })
                      }
                      min={1}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Prevents alert spam</p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Alert Cooldown</span>
                        <Badge variant="outline" className="text-xs">Anti-spam</Badge>
                      </div>
                      <span className="text-sm text-gray-600">{settings.notifications.cooldownMinutes} min</span>
                    </div>
                    <Slider
                      value={[settings.notifications.cooldownMinutes]}
                      onValueChange={([value]) =>
                        updateSettings({
                          ...settings,
                          notifications: { ...settings.notifications, cooldownMinutes: value },
                        })
                      }
                      min={5}
                      max={120}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Time between same alert types</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={resetToDefaults} variant="outline" className="flex-1">
              Reset to Defaults
            </Button>
            <Button onClick={onClose} className="flex-1">
              Save Settings
            </Button>
          </div>
        </CardContent>
      </motion.div>
    </motion.div>
  );
};

export default AlertSettings;
