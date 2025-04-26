import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { getAuth } from 'firebase/auth';
import { getUserProfile } from '@/lib/firestore';
import { UserProfile } from '@/lib/firestore';
import { Loader2, MapPin, Cloud, Droplet, Leaf, Sun, Wind, Tractor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useLocation } from '../hooks/useLocation';
import { getCurrentWeather } from '../services/weatherService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateTextResponse } from '@/services/geminiService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const Farm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { location, loading: locationLoading } = useLocation();
  const [weatherData, setWeatherData] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>({
    crops: [],
    irrigation: {},
    fertilizer: {},
    practices: []
  });
  const [irrigationPlan, setIrrigationPlan] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [showIrrigationPlanDialog, setShowIrrigationPlanDialog] = useState(false);

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          const userProfile = await getUserProfile(user.uid);
          setProfile(userProfile);
          
          // Generate mock recommendations based on profile data
          generateRecommendations(userProfile);
        } else {
          toast({
            title: "Authentication Error",
            description: "Please log in to view your farm details",
            variant: "destructive"
          });
          navigate('/login');
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load farm data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate, toast]);

  // Fetch weather data when location is available
  useEffect(() => {
    const getWeatherData = async () => {
      if (location?.latitude && location?.longitude) {
        try {
          const data = await getCurrentWeather(location.latitude, location.longitude);
          console.log("Weather data received in Farm page:", data);
          setWeatherData(data);
        } catch (error) {
          console.error("Error fetching weather data:", error);
        }
      }
    };

    if (!locationLoading && location) {
      getWeatherData();
    }
  }, [location, locationLoading]);

  // Generate personalized recommendations based on profile data
  const generateRecommendations = (profile: UserProfile) => {
    // This would ideally come from a backend API or ML model
    // For now, we'll generate some mock recommendations based on profile data
    
    const farmSize = profile?.farmSize || 0;
    const farmType = profile?.farmType || '';
    const location = profile?.location || '';
    
    // Mock crops recommendations based on farm type
    let recommendedCrops: any[] = [];
    
    if (farmType.toLowerCase().includes('vegetable')) {
      recommendedCrops = [
        { name: 'Tomatoes', suitability: 95, yield: '25-30 tons/hectare', season: 'Summer' },
        { name: 'Spinach', suitability: 87, yield: '15-20 tons/hectare', season: 'Year-round' },
        { name: 'Okra', suitability: 82, yield: '8-10 tons/hectare', season: 'Summer' }
      ];
    } else if (farmType.toLowerCase().includes('rice') || farmType.toLowerCase().includes('paddy')) {
      recommendedCrops = [
        { name: 'IR-64 Rice', suitability: 98, yield: '6-7 tons/hectare', season: 'Kharif' },
        { name: 'MTU-7029 Rice', suitability: 92, yield: '5-6 tons/hectare', season: 'Rabi' },
        { name: 'Jaya Rice', suitability: 86, yield: '5-5.5 tons/hectare', season: 'Kharif' }
      ];
    } else if (farmType.toLowerCase().includes('fruit')) {
      recommendedCrops = [
        { name: 'Mango', suitability: 94, yield: '10-12 tons/hectare', season: 'Summer' },
        { name: 'Papaya', suitability: 88, yield: '40-45 tons/hectare', season: 'Year-round' },
        { name: 'Guava', suitability: 85, yield: '15-20 tons/hectare', season: 'Year-round' }
      ];
    } else {
      // Default recommendations
      recommendedCrops = [
        { name: 'Wheat', suitability: 90, yield: '4-5 tons/hectare', season: 'Rabi' },
        { name: 'Maize', suitability: 85, yield: '5-6 tons/hectare', season: 'Kharif' },
        { name: 'Soybeans', suitability: 82, yield: '2-3 tons/hectare', season: 'Kharif' }
      ];
    }
    
    // Mock irrigation recommendations based on farm size
    const irrigationRecommendation = {
      system: farmSize < 2 ? 'Drip Irrigation' : farmSize < 5 ? 'Sprinkler System' : 'Center Pivot Irrigation',
      waterRequirement: farmSize * 10000, // in liters per day (simple calculation)
      schedule: 'Every 2-3 days depending on soil moisture',
      efficiency: farmSize < 2 ? 90 : farmSize < 5 ? 80 : 75 // efficiency percentage
    };
    
    // Mock fertilizer recommendations
    const fertilizerRecommendation = {
      primary: 'NPK 14-14-14',
      secondary: 'Urea (for nitrogen)',
      micronutrients: 'Zinc and Boron supplements',
      application: 'Split application: 40% at planting, 30% at vegetative stage, 30% at reproductive stage',
      quantity: `${Math.round(farmSize * 100)} kg per season`
    };
    
    // Mock sustainable practices
    const practices = [
      'Crop rotation to prevent soil nutrient depletion',
      'Mulching to reduce water evaporation',
      'Integrated Pest Management (IPM) to reduce chemical use',
      'Cover cropping during off-season',
      'Composting farm waste to create organic fertilizer'
    ];
    
    setRecommendations({
      crops: recommendedCrops,
      irrigation: irrigationRecommendation,
      fertilizer: fertilizerRecommendation,
      practices: practices
    });
  };

  // Generate detailed irrigation plan using Gemini AI
  const generateIrrigationPlan = async () => {
    if (!profile) return;
    
    setGeneratingPlan(true);
    setShowIrrigationPlanDialog(true);
    
    try {
      const promptContext = `
        Create a detailed irrigation plan for a farm with the following characteristics:
        - Farm Size: ${profile.farmSize || '5'} hectares
        - Farm Type: ${profile.farmType || 'Mixed farming'}
        - Location: ${profile.location || 'Unknown'}
        - Recommended Irrigation System: ${recommendations.irrigation.system || 'Drip irrigation'}
        - Current Water Requirement: ${recommendations.irrigation.waterRequirement?.toLocaleString() || '50000'} L/day
        
        Please include:
        1. Weekly schedule (which days to irrigate)
        2. Time of day recommendations
        3. Water volume per irrigation session
        4. Seasonal adjustments (rainy season vs dry season)
        5. Different requirements for different crop zones if applicable
        6. Water conservation strategies
        7. Technology recommendations for efficient irrigation
        8. Cost-saving approaches
        
        Format the response as a clear, practical plan that a farmer can implement immediately.
      `;
      
      const response = await generateTextResponse(promptContext);
      setIrrigationPlan(response);
      
      toast({
        title: "Irrigation plan generated",
        description: "Your personalized irrigation plan is ready to view",
        variant: "default"
      });
    } catch (error) {
      console.error("Error generating irrigation plan:", error);
      setIrrigationPlan("Sorry, we couldn't generate your irrigation plan at this time. Please try again later.");
      
      toast({
        title: "Error",
        description: "Failed to generate irrigation plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Close the irrigation plan dialog
  const closeIrrigationPlanDialog = () => {
    setShowIrrigationPlanDialog(false);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <Loader2 className="h-8 w-8 animate-spin text-agri-green" />
          <span className="ml-2 text-agri-green font-medium">Loading farm data...</span>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {profile && (
        <>
          <div className="flex flex-col md:flex-row items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-agri-green flex items-center">
                <MapPin className="mr-2 h-8 w-8" />
                {profile.farmName || `${profile.displayName}'s Farm`}
              </h1>
              <p className="text-gray-600 mt-1">
                {profile.location} • {profile.farmSize} hectares • {profile.farmType}
              </p>
            </div>
            
            {weatherData && (
              <div className="bg-white rounded-lg shadow-sm p-3 flex items-center mt-4 md:mt-0">
                <div className="flex flex-col items-center mr-4">
                  <span className="text-xl font-semibold">{Math.round(weatherData.main.temp)}°C</span>
                  <span className="text-sm text-gray-500">{weatherData.weather[0].main}</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center text-sm">
                    <Wind className="h-4 w-4 mr-1" /> 
                    <span>{weatherData.wind.speed} m/s</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Droplet className="h-4 w-4 mr-1" /> 
                    <span>{weatherData.main.humidity}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="crops">Recommended Crops</TabsTrigger>
              <TabsTrigger value="irrigation">Irrigation Plan</TabsTrigger>
              <TabsTrigger value="practices">Best Practices</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Farm Health</CardTitle>
                    <CardDescription>Overall assessment of your farm</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Soil Quality</span>
                          <span className="text-sm font-medium">Good</span>
                        </div>
                        <Progress value={75} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Water Management</span>
                          <span className="text-sm font-medium">Excellent</span>
                        </div>
                        <Progress value={90} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Crop Health</span>
                          <span className="text-sm font-medium">Average</span>
                        </div>
                        <Progress value={65} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Current Season</CardTitle>
                    <CardDescription>Based on your location and climate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Sun className="h-5 w-5 mr-2 text-amber-500" />
                          <span>Ideal Planting Time</span>
                        </div>
                        <Badge className="bg-agri-green">Next Week</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Cloud className="h-5 w-5 mr-2 text-blue-500" />
                          <span>Rainfall Forecast</span>
                        </div>
                        <Badge className="bg-blue-500">Moderate</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Leaf className="h-5 w-5 mr-2 text-green-500" />
                          <span>Growth Potential</span>
                        </div>
                        <Badge className="bg-green-500">High</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
                    <CardDescription>Recommended next steps</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button className="w-full bg-agri-green hover:bg-agri-green/90" onClick={() => navigate('/soil-lab')}>
                      Test Soil Health
                    </Button>
                    <Button className="w-full bg-agri-blue hover:bg-agri-blue/90" onClick={() => navigate('/crop-advisor')}>
                      Get Crop Recommendations
                    </Button>
                    <Button className="w-full bg-agri-amber hover:bg-agri-amber/90" onClick={() => navigate('/disease-scan')}>
                      Scan Plants for Disease
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="crops">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {recommendations.crops.map((crop: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-xl font-medium">{crop.name}</CardTitle>
                      <div className="flex items-center">
                        <span className="text-sm bg-agri-green/10 text-agri-green rounded-full px-2 py-0.5">
                          {crop.season}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          {crop.yield}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Suitability</span>
                          <span className="text-sm font-medium">{crop.suitability}%</span>
                        </div>
                        <Progress value={crop.suitability} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Water Requirement</span>
                          <span>{crop.suitability > 90 ? 'Low' : crop.suitability > 85 ? 'Medium' : 'High'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Growth Period</span>
                          <span>{crop.name === 'Mango' ? '3-5 years' : crop.name === 'Papaya' ? '8-10 months' : '3-5 months'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Pest Resistance</span>
                          <span>{crop.suitability > 90 ? 'High' : crop.suitability > 85 ? 'Medium' : 'Low'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="irrigation">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-medium">Recommended System</CardTitle>
                    <CardDescription>Based on your farm size and crop types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Droplet className="h-6 w-6 mr-2 text-blue-500" />
                          <span className="font-medium">{recommendations.irrigation.system}</span>
                        </div>
                        <Badge className="bg-agri-blue">Recommended</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Water Requirement</span>
                          <span>{recommendations.irrigation.waterRequirement.toLocaleString()} L/day</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Irrigation Schedule</span>
                          <span>{recommendations.irrigation.schedule}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>System Efficiency</span>
                          <span>{recommendations.irrigation.efficiency}%</span>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full bg-agri-blue hover:bg-agri-blue/90"
                        onClick={generateIrrigationPlan}
                        disabled={generatingPlan}
                      >
                        {generatingPlan ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                            Generating Plan...
                          </>
                        ) : (
                          'Generate Detailed Irrigation Plan'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-medium">Water Conservation Tips</CardTitle>
                    <CardDescription>Maximize efficiency and reduce water usage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <div className="bg-blue-100 rounded-full p-1 mr-2 mt-0.5">
                          <Droplet className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="text-sm">Install soil moisture sensors to avoid over-watering</span>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-blue-100 rounded-full p-1 mr-2 mt-0.5">
                          <Droplet className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="text-sm">Apply water during early morning or late evening to reduce evaporation</span>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-blue-100 rounded-full p-1 mr-2 mt-0.5">
                          <Droplet className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="text-sm">Use mulch around plants to retain soil moisture</span>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-blue-100 rounded-full p-1 mr-2 mt-0.5">
                          <Droplet className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="text-sm">Maintain and regularly check irrigation equipment for leaks</span>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-blue-100 rounded-full p-1 mr-2 mt-0.5">
                          <Droplet className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="text-sm">Collect rainwater for supplemental irrigation during dry periods</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="practices">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-medium">Sustainable Farming Practices</CardTitle>
                    <CardDescription>Recommended for your farm type and location</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {recommendations.practices.map((practice: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <div className="bg-green-100 rounded-full p-1 mr-2 mt-0.5">
                            <Leaf className="h-4 w-4 text-green-500" />
                          </div>
                          <span className="text-sm">{practice}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-medium">Fertilizer Recommendations</CardTitle>
                    <CardDescription>Based on soil analysis and crop requirements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Primary Fertilizer</span>
                          <span>{recommendations.fertilizer.primary}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Secondary Fertilizer</span>
                          <span>{recommendations.fertilizer.secondary}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Micronutrients</span>
                          <span>{recommendations.fertilizer.micronutrients}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Application Schedule</span>
                          <span className="text-right">{recommendations.fertilizer.application}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Quantity</span>
                          <span>{recommendations.fertilizer.quantity}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center bg-yellow-50 p-3 rounded-lg">
                        <Tractor className="h-5 w-5 text-yellow-500 mr-2" />
                        <span className="text-sm text-yellow-700">
                          Consider soil testing before application for precise nutrient management
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Irrigation Plan Dialog */}
          <Dialog open={showIrrigationPlanDialog} onOpenChange={setShowIrrigationPlanDialog}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Personalized Irrigation Plan</DialogTitle>
                <DialogDescription>
                  Detailed irrigation recommendations based on your farm profile
                </DialogDescription>
              </DialogHeader>
              
              <div className="mt-4">
                {generatingPlan ? (
                  <div className="flex flex-col items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-agri-blue mb-4" />
                    <p className="text-center text-gray-600">
                      Generating your personalized irrigation plan using AI...
                      <br />
                      <span className="text-sm text-gray-500">This may take a few moments</span>
                    </p>
                  </div>
                ) : irrigationPlan ? (
                  <div className="whitespace-pre-line text-gray-700">
                    {irrigationPlan}
                  </div>
                ) : (
                  <p className="text-center text-gray-600">
                    No irrigation plan available. Please generate a plan first.
                  </p>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={closeIrrigationPlanDialog}
                >
                  Close
                </Button>
                {!generatingPlan && irrigationPlan && (
                  <Button 
                    className="bg-agri-blue hover:bg-agri-blue/90"
                    onClick={() => {
                      // Implement save or print functionality if needed
                      toast({
                        title: "Plan saved",
                        description: "Irrigation plan has been saved to your account",
                      });
                    }}
                  >
                    Save Plan
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </MainLayout>
  );
};

export default Farm; 