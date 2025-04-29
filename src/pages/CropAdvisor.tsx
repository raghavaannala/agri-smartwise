import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Droplets, Thermometer, Leaf, Clock, ArrowRight, Loader2, Sun, Cloud, Calendar, Building2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getFarmingRecommendation } from '@/services/geminiService';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getUserFarms, FarmData } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Sample crop icons and colors for recommendations
const cropIcons = {
  rice: { icon: <Droplets className="h-5 w-5" />, color: 'bg-blue-100 text-blue-700' },
  wheat: { icon: <Sun className="h-5 w-5" />, color: 'bg-amber-100 text-amber-700' },
  cotton: { icon: <Sun className="h-5 w-5" />, color: 'bg-amber-100 text-amber-700' },
  sugarcane: { icon: <Leaf className="h-5 w-5" />, color: 'bg-green-100 text-green-700' },
  default: { icon: <Leaf className="h-5 w-5" />, color: 'bg-green-100 text-green-700' }
};

// Sample climate data
const climateData = {
  default: {
    temperature: {
      summer: { value: 90, range: '32-40°C' },
      monsoon: { value: 70, range: '26-32°C' },
      winter: { value: 40, range: '18-26°C' }
    },
    rainfall: {
      'Jun-Sep': { value: 85, range: '700-900mm' },
      'Oct-Dec': { value: 40, range: '200-350mm' },
      'Jan-May': { value: 10, range: '50-150mm' }
    },
    seasons: [
      { month: 'June-July', condition: 'Monsoon Onset', advice: 'Ideal for rice planting' },
      { month: 'August-September', condition: 'Heavy Rainfall', advice: 'Ensure proper drainage' },
      { month: 'October-November', condition: 'Post-Monsoon', advice: 'Start wheat and rabi crops' }
    ]
  }
};

const CropAdvisor = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('recommendations');
  const [activeSubTab, setActiveSubTab] = useState('form');
  const [userFarms, setUserFarms] = useState<FarmData[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [error, setError] = useState('');
  
  // Form data state
  const [formData, setFormData] = useState({
    location: 'Andhra Pradesh, India',
    soilType: 'clay',
    cropType: 'grain',
    waterAvailability: 70,
    landSize: '5',
    previousCrop: 'rice'
  });
  
  // Recommendations state
  const [recommendations, setRecommendations] = useState([
    {
      cropName: 'Rice',
      confidence: 92,
      expectedYield: '5.8 tons/ha',
      growingPeriod: '120-140 days',
      waterRequirements: 'High (1200-1500mm)',
      icon: cropIcons.rice.icon,
      color: cropIcons.rice.color
    },
    {
      cropName: 'Cotton',
      confidence: 87,
      expectedYield: '2.3 tons/ha',
      growingPeriod: '160-180 days',
      waterRequirements: 'Medium (700-900mm)',
      icon: cropIcons.cotton.icon,
      color: cropIcons.cotton.color
    },
    {
      cropName: 'Sugarcane',
      confidence: 78,
      expectedYield: '80 tons/ha',
      growingPeriod: '10-12 months',
      waterRequirements: 'High (1500-2500mm)',
      icon: cropIcons.sugarcane.icon,
      color: cropIcons.sugarcane.color
    }
  ]);
  
  // Load user farms
  useEffect(() => {
    const loadUserFarms = async () => {
      if (currentUser) {
        setIsLoading(true);
        try {
          const farms = await getUserFarms(currentUser.uid);
          setUserFarms(farms);
          
          if (farms.length > 0) {
            setSelectedFarmId(farms[0].id);
            populateFormFromFarm(farms[0]);
          }
        } catch (error) {
          console.error("Error loading farms:", error);
          toast({
            title: "Error",
            description: "Failed to load your farms",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadUserFarms();
  }, [currentUser, toast]);
  
  // Populate form from farm
  const populateFormFromFarm = (farm: FarmData) => {
    const mainCrop = farm.crops && farm.crops.length > 0 ? farm.crops[0] : '';
    
    setFormData({
      location: farm.location || 'Andhra Pradesh, India',
      soilType: farm.soilType || 'clay',
      cropType: farm.farmType || 'grain',
      waterAvailability: 70,
      landSize: farm.size?.toString() || '5',
      previousCrop: mainCrop
    });
  };
  
  // Handle form input changes
  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle farm selection
  const handleFarmChange = (farmId: string) => {
    setSelectedFarmId(farmId);
    const selectedFarm = userFarms.find(farm => farm.id === farmId);
    if (selectedFarm) {
      populateFormFromFarm(selectedFarm);
    }
  };
  
  // Get crop recommendations
  const handleGetRecommendations = async () => {
    setIsLoading(true);
    setError('');
    
    if (!formData.location) {
      setError('Please provide a location for accurate recommendations');
      setIsLoading(false);
      return;
    }
    
    try {
      // Create a structured query for better results from Gemini
      const structuredQuery = `
        Based on the following farm details, recommend 3-5 suitable crops:
        
        Location: ${formData.location}
        Soil Type: ${formData.soilType}
        Water Availability: ${formData.waterAvailability}%
        Land Size: ${formData.landSize} hectares
        Previous Crop: ${formData.previousCrop || 'None'}
        Preferred Crop Type: ${formData.cropType}
        
        Return your response in this exact JSON format:
        {
          "crops": [
            {
              "name": "Crop Name",
              "suitability": <number between 1-100>,
              "expectedYield": "X tons/ha",
              "growingPeriod": "X-Y days or months",
              "waterRequirement": "Low/Medium/High (Amount in mm)"
            },
            ... more crops ...
          ]
        }
        
        Only respond with the JSON data and nothing else. Ensure the JSON is valid and properly formatted.
      `;
      
      // Prepare data for the AI service
      const farmData = {
        location: formData.location,
        farmType: formData.cropType,
        soilType: formData.soilType,
        crops: formData.previousCrop ? [formData.previousCrop] : [],
        waterAvailability: formData.waterAvailability
      };
      
      console.log("Sending query to AI service:", structuredQuery);
      
      // Call the AI service
      const response = await getFarmingRecommendation(farmData, structuredQuery);
      console.log("AI Response:", response);
      
      // Create a default set of recommendations in case parsing fails
      const defaultRecommendations = [
        {
          cropName: 'Rice',
          confidence: 92,
          expectedYield: '5.8 tons/ha',
          growingPeriod: '120-140 days',
          waterRequirements: 'High (1200-1500mm)',
          icon: cropIcons.rice.icon,
          color: cropIcons.rice.color
        },
        {
          cropName: 'Cotton',
          confidence: 87,
          expectedYield: '2.3 tons/ha',
          growingPeriod: '160-180 days',
          waterRequirements: 'Medium (700-900mm)',
          icon: cropIcons.cotton.icon,
          color: cropIcons.cotton.color
        },
        {
          cropName: 'Sugarcane',
          confidence: 78,
          expectedYield: '80 tons/ha',
          growingPeriod: '10-12 months',
          waterRequirements: 'High (1500-2500mm)',
          icon: cropIcons.sugarcane.icon,
          color: cropIcons.sugarcane.color
        }
      ];
      
      let formattedRecommendations = [...defaultRecommendations];
      
      try {
        // Extract JSON from the response if it's embedded in text
        let jsonString = response;
        
        // Look for JSON pattern in the response (if AI wrapped it in text)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
        
        const processedRecommendations = JSON.parse(jsonString);
        
        if (processedRecommendations && 
            Array.isArray(processedRecommendations.crops) && 
            processedRecommendations.crops.length > 0) {
          
          // Transform AI response into our recommendations format
          formattedRecommendations = processedRecommendations.crops.map(crop => {
            const cropName = crop.name || 'Unknown Crop';
            const cropNameLower = cropName.toLowerCase();
            
            // Find matching icon or use default
            let iconConfig = cropIcons.default;
            
            // Check for closest match in our icon set
            for (const key in cropIcons) {
              if (cropNameLower.includes(key) || key.includes(cropNameLower)) {
                iconConfig = cropIcons[key as keyof typeof cropIcons];
                break;
              }
            }
            
            return {
              cropName: cropName,
              confidence: crop.suitability || Math.floor(Math.random() * 20) + 75,
              expectedYield: crop.expectedYield || `${(Math.random() * 5 + 2).toFixed(1)} tons/ha`,
              growingPeriod: crop.growingPeriod || `${Math.floor(Math.random() * 60) + 90} days`,
              waterRequirements: crop.waterRequirement || 'Medium (700-1100mm)',
              icon: iconConfig.icon,
              color: iconConfig.color
            };
          });
          
          console.log("Successfully processed AI recommendations:", formattedRecommendations);
        } else {
          console.warn("AI response didn't contain valid crops array:", processedRecommendations);
          // Keep using default recommendations
        }
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        console.log("Raw response:", response);
        // Keep using default recommendations
      }
      
      // Update recommendations state with either the parsed data or defaults
      setRecommendations(formattedRecommendations);
      
      // Switch to recommendations tab
      setActiveSubTab('recommendations');
      
      toast({
        title: "Recommendations Ready",
        description: "Check out the suitable crops for your farm",
      });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      
      // Set default recommendations even when there's an error
      setRecommendations([
        {
          cropName: 'Rice',
          confidence: 92,
          expectedYield: '5.8 tons/ha',
          growingPeriod: '120-140 days',
          waterRequirements: 'High (1200-1500mm)',
          icon: cropIcons.rice.icon,
          color: cropIcons.rice.color
        },
        {
          cropName: 'Cotton',
          confidence: 87,
          expectedYield: '2.3 tons/ha',
          growingPeriod: '160-180 days',
          waterRequirements: 'Medium (700-900mm)',
          icon: cropIcons.cotton.icon,
          color: cropIcons.cotton.color
        },
        {
          cropName: 'Sugarcane',
          confidence: 78,
          expectedYield: '80 tons/ha',
          growingPeriod: '10-12 months',
          waterRequirements: 'High (1500-2500mm)',
          icon: cropIcons.sugarcane.icon,
          color: cropIcons.sugarcane.color
        }
      ]);
      
      // Still switch to recommendations tab
      setActiveSubTab('recommendations');
      
      // Show error in the UI
      setError('AI recommendation service unavailable. Showing default recommendations instead.');
      
      toast({
        title: "Using Default Recommendations",
        description: "AI service is currently unavailable. Showing general recommendations based on common crops.",
        variant: "default"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <MainLayout>
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center text-green-700 mb-6">
          <Leaf className="h-5 w-5 mr-2" />
          <h1 className="text-2xl font-semibold">Crop Recommendations</h1>
        </div>
        
        {/* Main Tabs */}
        <Tabs defaultValue="recommendations" value={activeMainTab} onValueChange={setActiveMainTab} className="mb-8">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="cropCalendar">Crop Calendar</TabsTrigger>
            <TabsTrigger value="climateAnalysis">Climate Analysis</TabsTrigger>
            <TabsTrigger value="seasonalForecast">Seasonal Forecast</TabsTrigger>
          </TabsList>
          
          {/* Recommendations Tab Content */}
          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Farm Parameters</CardTitle>
                  <div className="space-x-2">
                    <Button 
                      variant={activeSubTab === 'form' ? 'default' : 'outline'} 
                      onClick={() => setActiveSubTab('form')}
                    >
                      Farm Parameters
                    </Button>
                    <Button 
                      variant={activeSubTab === 'recommendations' ? 'default' : 'outline'} 
                      onClick={() => setActiveSubTab('recommendations')}
                    >
                      Recommendations
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Form Tab Content */}
                {activeSubTab === 'form' && (
                  <div className="space-y-6">
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Farm Selection Card */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                      <div className="flex items-center mb-2">
                        <Building2 className="h-5 w-5 text-green-600 mr-2" />
                        <h3 className="text-md font-medium text-green-700">Select Farm for Analysis</h3>
                      </div>
                      
                      {userFarms.length === 0 ? (
                        <div className="mb-2">
                          <p className="text-sm text-gray-600 mb-3">No farms found. Create a farm first to get personalized recommendations.</p>
                          <Button 
                            size="sm" 
                            onClick={() => navigate('/farm')}
                            variant="outline"
                            className="text-green-700 border-green-300"
                          >
                            Go to Farm Management
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="farmSelect">Choose a farm to analyze</Label>
                          <Select 
                            value={selectedFarmId} 
                            onValueChange={handleFarmChange}
                            disabled={isLoading}
                          >
                            <SelectTrigger id="farmSelect" className="bg-white">
                              <SelectValue placeholder="Select a farm" />
                            </SelectTrigger>
                            <SelectContent>
                              {userFarms.map(farm => (
                                <SelectItem key={farm.id} value={farm.id}>
                                  {farm.name} ({farm.size} ha, {farm.location})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">Farm data will be used to provide accurate crop recommendations</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="location">Location</Label>
                          <Input 
                            id="location" 
                            value={formData.location} 
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            placeholder="e.g. Tirupati, Andhra Pradesh"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="soilType">Soil Type</Label>
                          <Select 
                            value={formData.soilType} 
                            onValueChange={(value) => handleInputChange('soilType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select soil type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="clay">Clay</SelectItem>
                              <SelectItem value="loam">Loam</SelectItem>
                              <SelectItem value="sandy">Sandy</SelectItem>
                              <SelectItem value="silt">Silt</SelectItem>
                              <SelectItem value="black">Black Soil</SelectItem>
                              <SelectItem value="red">Red Soil</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="cropType">Preferred Crop Type</Label>
                          <Select 
                            value={formData.cropType} 
                            onValueChange={(value) => handleInputChange('cropType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select crop type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="grain">Grain</SelectItem>
                              <SelectItem value="vegetable">Vegetable</SelectItem>
                              <SelectItem value="fruit">Fruit</SelectItem>
                              <SelectItem value="cash">Cash Crop</SelectItem>
                              <SelectItem value="pulse">Pulse</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label>Water Availability</Label>
                            <span className="text-sm text-gray-500">{formData.waterAvailability}%</span>
                          </div>
                          <Slider 
                            value={[formData.waterAvailability]} 
                            onValueChange={(value) => handleInputChange('waterAvailability', value[0])}
                            max={100}
                            step={5}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="landSize">Land Size (hectares)</Label>
                          <Input 
                            id="landSize" 
                            value={formData.landSize} 
                            onChange={(e) => handleInputChange('landSize', e.target.value)}
                            type="number"
                            min="0.1"
                            step="0.1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="previousCrop">Previous Crop</Label>
                          <Input 
                            id="previousCrop" 
                            value={formData.previousCrop} 
                            onChange={(e) => handleInputChange('previousCrop', e.target.value)}
                            placeholder="e.g. Rice, Cotton, etc."
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={handleGetRecommendations}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Get Recommendations
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                {/* Recommendations Tab Content */}
                {activeSubTab === 'recommendations' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recommendations.map((crop, idx) => (
                        <Card key={idx} className="overflow-hidden hover:shadow-md transition-all">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">{crop.cropName}</CardTitle>
                              <div className={`rounded-full p-2 ${crop.color}`}>
                                {crop.icon}
                              </div>
                            </div>
                            <CardDescription>
                              Suitability:
                              <span className="font-medium text-green-600 ml-1">{crop.confidence}%</span>
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pb-4">
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Expected Yield</span>
                                <span className="text-sm font-medium">{crop.expectedYield}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Growing Period</span>
                                <span className="text-sm font-medium">{crop.growingPeriod}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Water Requirement</span>
                                <span className="text-sm font-medium">{crop.waterRequirements}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveSubTab('form')}
                      className="mt-4"
                    >
                      Back to Farm Parameters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Crop Calendar Tab Content */}
          <TabsContent value="cropCalendar">
            <Card>
              <CardHeader>
                <CardTitle>Crop Calendar</CardTitle>
                <CardDescription>Plan your farming activities based on optimal growing seasons</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                    <h3 className="text-lg font-medium text-blue-700 mb-2">Optimal Planting Times</h3>
                    <p className="text-blue-600 mb-4">Track the best planting and harvesting times for recommended crops throughout the year.</p>
                    <Button 
                      variant="outline" 
                      className="border-blue-200 text-blue-700 hover:bg-blue-100"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Open Calendar
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { crop: 'Rice', planting: 'June - July', harvesting: 'November - December' },
                      { crop: 'Cotton', planting: 'April - May', harvesting: 'October - November' },
                      { crop: 'Sugarcane', planting: 'January - March', harvesting: 'December - February' }
                    ].map((item, idx) => (
                      <Card key={idx} className="border-l-4 border-l-green-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{item.crop}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Planting:</span>
                              <span className="font-medium">{item.planting}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Harvesting:</span>
                              <span className="font-medium">{item.harvesting}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Climate Analysis Tab Content */}
          <TabsContent value="climateAnalysis">
            <Card>
              <CardHeader>
                <CardTitle>Climate Analysis</CardTitle>
                <CardDescription>Understand how climate affects your crop choices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 mb-6">
                    <h3 className="text-lg font-medium text-amber-700 mb-2">How Climate Affects Crop Choices</h3>
                    <p className="text-amber-600 mb-4">Understand how seasonal climate patterns affect different crop varieties in your region.</p>
                    <Button 
                      variant="outline" 
                      className="border-amber-200 text-amber-700 hover:bg-amber-100"
                    >
                      <Thermometer className="h-4 w-4 mr-2" />
                      View Analysis
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Seasonal Temperature</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-40 bg-gray-100 rounded-md flex items-center justify-center">
                          <Sun className="h-8 w-8 text-amber-500" />
                        </div>
                        <div className="mt-4 space-y-2">
                          {Object.entries(climateData.default.temperature).map(([season, data], idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span className="capitalize">{season}</span>
                              <div className="w-32">
                                <Progress value={data.value} className="h-2 bg-amber-100" />
                              </div>
                              <span className="font-medium">{data.range}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Rainfall Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-40 bg-gray-100 rounded-md flex items-center justify-center">
                          <Cloud className="h-8 w-8 text-blue-500" />
                        </div>
                        <div className="mt-4 space-y-2">
                          {Object.entries(climateData.default.rainfall).map(([period, data], idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span>{period}</span>
                              <div className="w-32">
                                <Progress value={data.value} className="h-2 bg-blue-200" />
                              </div>
                              <span className="font-medium">{data.range}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Seasonal Forecast Tab Content */}
          <TabsContent value="seasonalForecast">
            <Card>
              <CardHeader>
                <CardTitle>Seasonal Forecast</CardTitle>
                <CardDescription>See the upcoming seasonal conditions for better planning</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100 mb-6">
                    <h3 className="text-lg font-medium text-green-700 mb-2">Upcoming Seasonal Conditions</h3>
                    <p className="text-green-600 mb-4">Get insights on upcoming weather patterns and how they may affect your farming decisions.</p>
                    <Button 
                      variant="outline" 
                      className="border-green-200 text-green-700 hover:bg-green-100"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      View Forecast
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {climateData.default.seasons.map((season, idx) => (
                      <Card key={idx}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{season.month}</CardTitle>
                          <CardDescription>{season.condition}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">{season.advice}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default CropAdvisor;
