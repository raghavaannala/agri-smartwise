import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Droplets, 
  Leaf, 
  MapPin, 
  Sprout, 
  Target, 
  TrendingUp,
  AlertTriangle,
  Bell,
  ChevronRight,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Zap,
  Sun,
  CloudRain,
  Thermometer,
  Wind
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserFarms } from '@/lib/firestore';
import agriBuddyService, { 
  CropJourney, 
  CropTask, 
  CropStage, 
  FarmData,
  Milestone,
  WeatherAlert
} from '@/services/agriBuddyService';
import CropJourneyFlowchart from '@/components/agribuddy/CropJourneyFlowchart';
import TaskManager from '@/components/agribuddy/TaskManager';
import IrrigationPlanner from '@/components/agribuddy/IrrigationPlanner';
import WeatherIntegration from '@/components/agribuddy/WeatherIntegration';
import MainLayout from '@/components/layout/MainLayout';

const AgriBuddy: React.FC = () => {
  const { currentUser: user, loading: authLoading } = useAuth();
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<any>(null);
  const [cropJourney, setCropJourney] = useState<CropJourney | null>(null);
  const [loading, setLoading] = useState(false); 
  const [activeTab, setActiveTab] = useState('overview');
  const [upcomingTasks, setUpcomingTasks] = useState<CropTask[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<CropTask[]>([]);

  useEffect(() => {
    console.log('🔍 AgriBuddy: Auth state changed, user:', user);
    console.log('🔍 AgriBuddy: Auth loading:', authLoading);
    
    // Don't try to load farms while auth is still loading
    if (authLoading) {
      console.log('⏳ AgriBuddy: Waiting for authentication to complete...');
      return;
    }
    
    if (user) {
      console.log('✅ AgriBuddy: User authenticated, loading farms...', user.uid);
      loadUserFarms();
    } else {
      console.log('❌ AgriBuddy: User not authenticated');
      setFarms([]);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (cropJourney) {
      setUpcomingTasks(agriBuddyService.getUpcomingTasks(cropJourney));
      setOverdueTasks(agriBuddyService.getOverdueTasks(cropJourney));
    }
  }, [cropJourney]);

  const loadUserFarms = async () => {
    try {
      setLoading(true);
      console.log('🔍 AgriBuddy: Loading farms for user:', user?.uid);
      console.log('🔍 AgriBuddy: User object:', user);
      
      if (!user?.uid) {
        console.error('❌ AgriBuddy: No user ID found');
        setFarms([]);
        return;
      }
      
      console.log('📡 AgriBuddy: Calling getUserFarms...');
      const userFarms = await getUserFarms(user.uid);
      console.log('✅ AgriBuddy: Raw farms data:', userFarms);
      console.log('📊 AgriBuddy: Number of farms found:', userFarms?.length || 0);
      
      if (userFarms && Array.isArray(userFarms)) {
        setFarms(userFarms);
        console.log('✅ AgriBuddy: Farms set successfully');
        
        if (userFarms.length > 0) {
          setSelectedFarm(userFarms[0]);
          console.log('🎯 AgriBuddy: Selected first farm:', userFarms[0]);
        } else {
          console.log('⚠️ AgriBuddy: No farms in array');
        }
      } else {
        console.error('❌ AgriBuddy: Invalid farms data:', userFarms);
        setFarms([]);
      }
    } catch (error) {
      console.error('💥 AgriBuddy: Error loading farms:', error);
      setFarms([]);
    } finally {
      setLoading(false);
      console.log('🏁 AgriBuddy: Loading complete');
    }
  };

  const startCropJourney = async (cropName: string) => {
    if (!selectedFarm) return;

    try {
      setLoading(true);
      console.log('🚀 Starting crop journey for:', cropName);
      console.log('🏡 Using farm data:', selectedFarm);
      
      // Enhanced farm data with analysis integration
      const farmData: FarmData = {
        id: selectedFarm.id,
        name: selectedFarm.name,
        location: selectedFarm.location,
        size: selectedFarm.size,
        soilType: selectedFarm.soilType,
        crops: selectedFarm.crops,
        irrigationSystem: selectedFarm.irrigationSystem,
        farmType: selectedFarm.farmType,
        previousCrops: selectedFarm.previousCrops || [],
        climate: selectedFarm.climate || await getClimateFromLocation(selectedFarm.location)
      };

      // Add existing analysis data if available
      if (selectedFarm.analysis) {
        console.log('📊 Using existing farm analysis data');
        // Integrate existing analysis into the journey planning
        farmData.existingAnalysis = {
          soilHealth: selectedFarm.analysis.soilHealth,
          cropHealth: selectedFarm.analysis.cropHealth,
          waterManagement: selectedFarm.analysis.waterManagement,
          recommendations: selectedFarm.analysis.recommendations,
          lastAnalyzed: selectedFarm.analysis.lastAnalyzed
        };
      }

      console.log('🤖 Creating AI-powered crop journey...');
      const journey = await agriBuddyService.createCropJourney(farmData, cropName);
      
      console.log('✅ Crop journey created successfully!');
      setCropJourney(journey);
      
      // Save crop journey for alerts system
      try {
        sessionStorage.setItem('currentCropJourney', JSON.stringify(journey));
        console.log('💾 Crop journey saved for alerts');
      } catch (error) {
        console.error('Error saving crop journey:', error);
      }
      
      setActiveTab('journey');
    } catch (error) {
      console.error('❌ Error creating crop journey:', error);
      // Add user-friendly error handling
      alert('Failed to create crop journey. Please try again or check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get climate data from location
  const getClimateFromLocation = async (location: string): Promise<string> => {
    // Simple climate mapping based on location
    const locationLower = location.toLowerCase();
    if (locationLower.includes('plateau') || locationLower.includes('hill')) {
      return 'temperate';
    } else if (locationLower.includes('coast') || locationLower.includes('beach')) {
      return 'coastal';
    } else if (locationLower.includes('desert') || locationLower.includes('arid')) {
      return 'arid';
    } else {
      return 'tropical'; // Default for most Indian regions
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    if (!cropJourney) return;

    try {
      await agriBuddyService.updateTaskStatus(cropJourney.id, taskId, true);
      
      // Update local state
      const updatedJourney = {
        ...cropJourney,
        overallTasks: cropJourney.overallTasks.map(task =>
          task.id === taskId ? { ...task, completed: true } : task
        )
      };
      
      setCropJourney(updatedJourney);
      setUpcomingTasks(agriBuddyService.getUpcomingTasks(updatedJourney));
      setOverdueTasks(agriBuddyService.getOverdueTasks(updatedJourney));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getCurrentStage = (): CropStage | null => {
    if (!cropJourney) return null;
    return cropJourney.stages.find(stage => stage.id === cropJourney.currentStage) || cropJourney.stages[0];
  };

  const getProgressPercentage = (): number => {
    if (!cropJourney) return 0;
    return agriBuddyService.calculateJourneyProgress(cropJourney);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'irrigation': return <Droplets className="h-4 w-4" />;
      case 'fertilization': return <Leaf className="h-4 w-4" />;
      case 'pest_control': return <Zap className="h-4 w-4" />;
      case 'monitoring': return <Target className="h-4 w-4" />;
      case 'harvesting': return <Sprout className="h-4 w-4" />;
      case 'soil_management': return <MapPin className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (authLoading || (loading && !cropJourney)) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            {authLoading ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Authenticating...</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-600 to-green-600 text-white">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-6">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mr-4"></div>
                      <div className="text-left">
                        <h3 className="text-xl font-bold mb-2">🤖 Creating Your AI Farming Plan...</h3>
                        <p className="text-white/90">Please wait while we analyze your farm data</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="font-semibold mb-1">📍 Location Analysis</div>
                        <div className="text-white/80">Analyzing {selectedFarm?.location} climate</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="font-semibold mb-1">🌱 Crop Planning</div>
                        <div className="text-white/80">Creating cultivation timeline</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="font-semibold mb-1">🌤️ Weather Integration</div>
                        <div className="text-white/80">Fetching weather forecasts</div>
                      </div>
                      <div className="bg-white/20 rounded-lg p-3">
                        <div className="font-semibold mb-1">✅ Task Generation</div>
                        <div className="text-white/80">Creating smart reminders</div>
                      </div>
                    </div>
                    
                    <div className="mt-6 text-white/90">
                      <p className="text-sm">
                        ⏱️ This usually takes 10-15 seconds. We're using AI to create a personalized farming plan 
                        for your {selectedFarm?.size} hectare {selectedFarm?.soilType} soil farm.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-600 rounded-xl">
                <Sprout className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">AgriBuddy</h1>
                <p className="text-gray-600">Your AI-powered crop cultivation companion</p>
              </div>
            </div>

            {/* Farm Selection */}
            {farms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {farms.map((farm) => (
                  <Button
                    key={farm.id}
                    variant={selectedFarm?.id === farm.id ? "default" : "outline"}
                    onClick={() => setSelectedFarm(farm)}
                    className="flex items-center gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    {farm.name}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {!cropJourney ? (
            /* Welcome Screen */
            <div className="max-w-4xl mx-auto">
              {/* Quick Guide for Farmers */}
              <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-amber-100 to-orange-100 border-l-4 border-l-amber-500">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-amber-500 rounded-full">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-amber-800 mb-2">
                        🌾 How to Use AgriBuddy - Your AI Farming Assistant
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-amber-700">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                          <div>
                            <strong>Select Your Crop</strong><br />
                            Click on your crop button below to start your AI-powered farming journey
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                          <div>
                            <strong>Get AI Plan</strong><br />
                            AgriBuddy creates a complete cultivation timeline based on your farm data
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                          <div>
                            <strong>Follow & Track</strong><br />
                            Use the interactive timeline, tasks, and weather alerts to optimize your farming
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-8 border-0 shadow-lg bg-gradient-to-r from-green-600 to-blue-600 text-white">
                <CardContent className="p-8">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Welcome to Your Farming Journey!</h2>
                    <p className="text-lg mb-6 opacity-90">
                      Let AgriBuddy create a personalized cultivation plan for your crops with AI-powered insights,
                      step-by-step guidance, and smart reminders.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div className="bg-white/10 rounded-lg p-4">
                        <Target className="h-8 w-8 mx-auto mb-2" />
                        <h3 className="font-semibold">Smart Planning</h3>
                        <p className="text-sm opacity-80">AI-generated cultivation timeline</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-4">
                        <Bell className="h-8 w-8 mx-auto mb-2" />
                        <h3 className="font-semibold">Smart Reminders</h3>
                        <p className="text-sm opacity-80">Never miss critical farming tasks</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-4">
                        <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                        <h3 className="font-semibold">Progress Tracking</h3>
                        <p className="text-sm opacity-80">Visual journey through crop lifecycle</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedFarm && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-green-600" />
                      Start Your Crop Journey
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h3 className="font-semibold mb-3">Farm Details</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Location:</span>
                            <span className="font-medium">{selectedFarm.location}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Size:</span>
                            <span className="font-medium">{selectedFarm.size} hectares</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Soil Type:</span>
                            <span className="font-medium">{selectedFarm.soilType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Irrigation:</span>
                            <span className="font-medium">{selectedFarm.irrigationSystem}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Sprout className="h-5 w-5 text-green-600" />
                          Available Crops - Click to Start AI Journey
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          🤖 Click on your crop to get AI-powered cultivation guidance with:
                        </p>
                        <div className="mb-4 text-xs text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            <span>Step-by-step farming timeline</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            <span>Smart task reminders & scheduling</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            <span>Weather-based recommendations</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            <span>Irrigation & fertilization plans</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                          {selectedFarm.crops?.map((crop: string, index: number) => (
                            <div key={index} className="relative group">
                              <Button
                                variant="outline"
                                onClick={() => startCropJourney(crop)}
                                disabled={loading}
                                className="w-full justify-start h-auto p-4 hover:bg-green-50 hover:border-green-300 hover:shadow-md transition-all duration-300 border-2"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-full">
                                      <Sprout className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div className="text-left">
                                      <div className="font-semibold text-lg capitalize">{crop}</div>
                                      <div className="text-sm text-gray-600">
                                        Click to start AI-powered {crop} cultivation journey
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                                      🤖 AI Powered
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                                  </div>
                                </div>
                              </Button>
                              
                              {/* Hover tooltip */}
                              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                                  Get personalized {crop} farming plan for {selectedFarm.location}
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Additional help text */}
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-start gap-2">
                            <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-800">
                              <strong>What happens next?</strong> After clicking your crop, AgriBuddy will create a complete farming timeline with tasks, weather alerts, and expert recommendations specifically for your {selectedFarm.size} hectare {selectedFarm.soilType} soil farm in {selectedFarm.location}.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {loading && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                        <p className="text-gray-600">Creating your personalized crop journey...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* No Farms Available */}
              {!loading && farms.length === 0 && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      No Farms Found
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <div className="mb-4">
                        <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Farms Available</h3>
                        <p className="text-gray-600 mb-6">
                          We couldn't find any farms for your account. This could be because:
                        </p>
                        <div className="text-left max-w-md mx-auto mb-6">
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• You haven't created a farm yet</li>
                            <li>• There's a loading issue with your data</li>
                            <li>• You're not logged in properly</li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button 
                          onClick={() => loadUserFarms()} 
                          variant="outline"
                          className="px-6 py-3"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Refresh Farms
                        </Button>
                        <Button 
                          onClick={() => window.location.href = '/farm'} 
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Go to Farm Management
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* Journey Dashboard */
            <div>
              {/* Journey Header */}
              <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-green-600 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">
                        {cropJourney.cropName} Journey - {selectedFarm?.name}
                      </h2>
                      <div className="flex items-center gap-4 text-sm opacity-90">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Planted: {cropJourney.plantingDate.toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          Harvest: {cropJourney.expectedHarvestDate.toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {cropJourney.totalDuration} days
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold mb-1">{getProgressPercentage()}%</div>
                      <div className="text-sm opacity-90">Complete</div>
                      <Progress value={getProgressPercentage()} className="w-32 mt-2 bg-white/20" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="border-0 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Current Stage</p>
                        <p className="font-semibold">{getCurrentStage()?.name}</p>
                      </div>
                      <PlayCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Upcoming Tasks</p>
                        <p className="font-semibold">{upcomingTasks.length}</p>
                      </div>
                      <Bell className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Overdue Tasks</p>
                        <p className="font-semibold text-red-600">{overdueTasks.length}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Days Remaining</p>
                        <p className="font-semibold">
                          {Math.max(0, Math.ceil((cropJourney.expectedHarvestDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="journey">Journey</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="irrigation">Irrigation</TabsTrigger>
                  <TabsTrigger value="weather">Weather</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Current Stage Details */}
                    <Card className="border-0 shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PlayCircle className="h-5 w-5 text-green-600" />
                          Current Stage: {getCurrentStage()?.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 mb-4">{getCurrentStage()?.description}</p>
                        
                        <div className="mb-4">
                          <h4 className="font-semibold mb-2">Critical Actions:</h4>
                          <div className="space-y-2">
                            {getCurrentStage()?.criticalActions.map((action, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                {action}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-3">
                          <h4 className="font-semibold text-green-800 mb-1">Expected Outcome:</h4>
                          <p className="text-sm text-green-700">{getCurrentStage()?.expectedOutcome}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Upcoming Tasks */}
                    <Card className="border-0 shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Bell className="h-5 w-5 text-blue-600" />
                          Upcoming Tasks
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {upcomingTasks.slice(0, 5).map((task) => (
                            <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                {getCategoryIcon(task.category)}
                                <div>
                                  <p className="font-medium text-sm">{task.title}</p>
                                  <p className="text-xs text-gray-600">
                                    Due: {task.dueDate.toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                                <Button
                                  size="sm"
                                  onClick={() => handleTaskComplete(task.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          
                          {upcomingTasks.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p>No upcoming tasks. Great job!</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="journey">
                  <CropJourneyFlowchart journey={cropJourney} />
                </TabsContent>

                <TabsContent value="tasks">
                  <TaskManager 
                    journey={cropJourney} 
                    onTaskComplete={handleTaskComplete}
                  />
                </TabsContent>

                <TabsContent value="irrigation">
                  <IrrigationPlanner 
                    journey={cropJourney}
                    farmData={selectedFarm}
                  />
                </TabsContent>

                <TabsContent value="weather">
                  <WeatherIntegration 
                    journey={cropJourney}
                    location={selectedFarm?.location}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AgriBuddy;
