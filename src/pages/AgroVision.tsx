import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getUserFarms } from '@/lib/firestore';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader, MapPin, Calendar, HelpCircle, RefreshCw, WifiOff, AlertCircle, Pencil, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SatelliteMap from '@/components/agrovision/SatelliteMap';
import NDVIAnalytics from '@/components/agrovision/NDVIAnalytics';
import { FarmNdviData, getFarmNdviData, getNdviDataForDate } from '@/services/ndviService';
import { useTranslation } from 'react-i18next';

interface Farm {
  id: string;
  name: string;
  location?: string;
  // Add other farm fields as needed
}

const AgroVision = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [userFarms, setUserFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [ndviData, setNdviData] = useState<FarmNdviData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('map');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(300000); // 5 minutes default
  
  // Load user farms on component mount
  useEffect(() => {
    const loadFarms = async () => {
      if (currentUser?.uid) {
        try {
          setIsLoading(true);
          setError(null);
          const farms = await getUserFarms(currentUser.uid);
          setUserFarms(farms);
          if (farms.length > 0) setSelectedFarm(farms[0]);
        } catch (error) {
          console.error('Failed to load farms:', error);
          toast.error('Failed to load farms');
          setError('Failed to load farms. Please try again later.');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadFarms();
  }, [currentUser]);
  
  // Function to load NDVI data - extracted to a reusable function
  const loadNdviData = useCallback(async (forceRefresh = false) => {
    if (!selectedFarm) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Force refresh if requested
      if (forceRefresh) {
        sessionStorage.setItem('force_refresh_ndvi', 'true');
      }
      
      // Get NDVI data for the selected farm
      const data = await getFarmNdviData(selectedFarm.id, selectedFarm.name);
      
      // Filter data for selected date
      const dateFilteredData = getNdviDataForDate(data, selectedDate.toISOString());
      
      setNdviData(dateFilteredData);
      setLastUpdated(new Date());
      
      // Show appropriate toast notification based on data source
      if (dateFilteredData.usingRealData) {
        toast.success('NDVI data updated', {
          description: `Latest satellite data loaded for ${selectedFarm.name}`
        });
      } else {
        toast.info('Using simulated data', {
          description: 'Unable to connect to satellite provider. Using generated data instead.',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Failed to load NDVI data:', error);
      toast.error('Failed to load NDVI data');
      setError('Failed to load satellite data. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFarm, selectedDate]);
  
  // Load NDVI data when farm is selected or date changes
  useEffect(() => {
    if (selectedFarm && mapInitialized) {
      loadNdviData();
    }
  }, [selectedFarm, selectedDate, mapInitialized, loadNdviData]);
  
  // Set up auto-refresh timer if enabled
  useEffect(() => {
    let refreshTimer: number | null = null;
    
    if (autoRefresh && selectedFarm && mapInitialized) {
      refreshTimer = window.setInterval(() => {
        console.log('Auto-refreshing NDVI data...');
        loadNdviData();
      }, refreshInterval);
    }
    
    return () => {
      if (refreshTimer !== null) {
        clearInterval(refreshTimer);
      }
    };
  }, [autoRefresh, refreshInterval, selectedFarm, mapInitialized, loadNdviData]);
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
  };
  
  const handleInitializeMap = () => {
    setMapInitialized(true);
  };
  
  // Handle field selection from map
  const handleFieldSelect = (fieldId: string | null) => {
    setSelectedFieldId(fieldId);
    // Automatically switch to analytics tab when a field is selected
    if (fieldId && activeTab === 'map') {
      setActiveTab('analytics');
    }
  };
  
  // Handle manual refresh
  const handleManualRefresh = (forceRefresh = false) => {
    loadNdviData(forceRefresh);
  };
  
  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    if (!autoRefresh) {
      toast.info('Auto-refresh enabled', {
        description: `NDVI data will update every ${refreshInterval / 60000} minutes`
      });
    } else {
      toast.info('Auto-refresh disabled');
    }
  };
  
  // Calculate the time since last update
  const getLastUpdatedText = () => {
    if (!lastUpdated) return 'Not yet updated';
    
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };
  
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">{t('agroVision.title', 'AgroVision: Satellite Crop Health')}</h1>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleAutoRefresh}
              className={autoRefresh ? "bg-green-50" : ""}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "text-green-600" : ""} ${isLoading ? "animate-spin" : ""}`} />
              {autoRefresh ? t('common.autoRefreshOn', 'Auto-Refresh On') : t('common.autoRefreshOff', 'Auto-Refresh Off')}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleManualRefresh(false)}
              disabled={isLoading || !selectedFarm}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              {t('common.refresh', 'Refresh')}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleManualRefresh(true)}
              disabled={isLoading || !selectedFarm}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              {t('common.forceRefresh', 'Force Refresh')}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => toast.info('AgroVision Help Center', { description: 'Help documentation coming soon!' })}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              {t('common.help', 'Help')}
            </Button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
              <Button 
                variant="link" 
                className="text-red-700 p-0 h-auto text-sm"
                onClick={() => handleManualRefresh(true)}
              >
                Try again
              </Button>
            </div>
          </div>
        )}
        
        {/* Data source warning */}
        {ndviData && !ndviData.usingRealData && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">Using Simulated Data</h3>
              <p className="text-amber-700 text-sm">
                Unable to connect to the satellite data provider. The system is currently showing 
                simulated crop health data. Real-time data will be shown when available.
              </p>
              <Button 
                variant="link" 
                className="text-amber-700 p-0 h-auto text-sm"
                onClick={() => handleManualRefresh(true)}
              >
                Try again with force refresh
              </Button>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <Card className="p-4">
            <h3 className="font-medium mb-3">{t('agroVision.selectFarm', 'Select Farm')}</h3>
            <Select 
              disabled={userFarms.length === 0 || isLoading} 
              value={selectedFarm?.id || ''} 
              onValueChange={(value) => {
                const farm = userFarms.find(f => f.id === value);
                if (farm) {
                  setSelectedFarm(farm);
                  setSelectedFieldId(null);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('agroVision.selectFarmPlaceholder', 'Select a farm')} />
              </SelectTrigger>
              <SelectContent>
                {userFarms.map((farm) => (
                  <SelectItem key={farm.id} value={farm.id}>
                    {farm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {userFarms.length === 0 && !isLoading && (
              <p className="text-sm text-amber-600 mt-2">
                {t('agroVision.noFarmsWarning', 'You need to create a farm first.')}
              </p>
            )}
          </Card>
          
          <Card className="p-4">
            <h3 className="font-medium mb-3">{t('agroVision.selectDate', 'Select Date')}</h3>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={handleDateChange}
              max={new Date().toISOString().split('T')[0]}
            />
          </Card>
          
          <Card className="p-4 col-span-2">
            <h3 className="font-medium mb-3">{t('agroVision.status', 'Status')}</h3>
            <div className="flex items-center justify-between">
              <div>
                {isLoading ? (
                  <div className="flex items-center text-amber-600">
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    {t('agroVision.loadingData', 'Loading data...')}
                  </div>
                ) : selectedFarm ? (
                  <div className="text-green-600">
                    {t('agroVision.readyToAnalyze', 'Ready to analyze')} {selectedFarm.name}
                  </div>
                ) : (
                  <div className="text-slate-500">
                    {t('agroVision.selectFarmToBegin', 'Select a farm to begin')}
                  </div>
                )}
                
                {lastUpdated && (
                  <div className="text-xs text-slate-500 mt-1">
                    {t('common.lastUpdated', 'Last updated')}: {getLastUpdatedText()}
                  </div>
                )}
              </div>
              
              {selectedFieldId && ndviData && (
                <div className="flex items-center">
                  <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-md border border-blue-200">
                    {t('agroVision.analyzingField', 'Analyzing')}: {ndviData.fields.find(f => f.id === selectedFieldId)?.name}
                    <Button 
                      variant="link" 
                      className="text-xs text-blue-600 p-0 h-auto ml-1" 
                      onClick={() => setSelectedFieldId(null)}
                    >
                      {t('agroVision.clearSelection', 'Clear')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="map">
              <MapPin className="h-4 w-4 mr-2" />
              {t('agroVision.satelliteMap', 'Satellite Map')}
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <Calendar className="h-4 w-4 mr-2" />
              {t('agroVision.ndviAnalytics', 'NDVI Analytics')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="map" className="mt-4">
            <SatelliteMap 
              ndviData={ndviData}
              isLoading={isLoading}
              onInitialize={handleInitializeMap}
              onFieldSelect={handleFieldSelect}
              selectedFieldId={selectedFieldId}
            />
          </TabsContent>
          
          <TabsContent value="analytics">
            <NDVIAnalytics 
              ndviData={ndviData}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
        
        {/* Advanced Settings Panel - Can be hidden behind a disclosure or modal in production */}
        <Card className="p-4 mb-6">
          <h3 className="font-medium mb-3">Advanced Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Auto-Refresh Interval
              </label>
              <Select 
                value={refreshInterval.toString()} 
                onValueChange={(value) => {
                  setRefreshInterval(parseInt(value));
                  if (autoRefresh) {
                    toast.info(`Auto-refresh interval updated to ${parseInt(value) / 60000} minutes`);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60000">1 minute</SelectItem>
                  <SelectItem value="300000">5 minutes</SelectItem>
                  <SelectItem value="600000">10 minutes</SelectItem>
                  <SelectItem value="1800000">30 minutes</SelectItem>
                  <SelectItem value="3600000">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Connection Status
              </label>
              <div className="flex items-center">
                {navigator.onLine ? (
                  <>
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-sm">Online - Ready for real-time updates</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-amber-500 mr-2" />
                    <span className="text-sm text-amber-700">Offline - Using cached data</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Custom Area Analysis Feature */}
        <Card className="p-4 mb-6 border-l-4 border-l-blue-500">
          <div className="flex items-start">
            <Pencil className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1">{t('agroVision.customAreaAnalysis', 'Custom Area Analysis')}</h3>
              <p className="text-sm text-slate-600 mb-2">
                {t('agroVision.customAreaDescription', 'Draw your own areas on the map to analyze specific regions of your farm. Select the "Draw Custom Area" button in the map view to start.')}
              </p>
              <div className="flex items-center text-xs text-blue-600">
                <Info className="h-3.5 w-3.5 mr-1" />
                <span>{t('agroVision.customAreaTip', 'Double-click to complete your drawing after placing points')}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AgroVision; 