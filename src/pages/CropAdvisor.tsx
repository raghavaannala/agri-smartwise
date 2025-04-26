import React, { useState, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Droplets, Thermometer, Leaf, Clock, Tractor, ArrowRight, Loader2, Sun, Cloud, Calendar, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { getFarmingRecommendation } from '@/services/geminiService';
import { useTranslation } from 'react-i18next';

type CropRecommendation = {
  cropName: string;
  confidence: number;
  expectedYield: string;
  growingPeriod: string;
  waterRequirements: string;
  fertilizers: string[];
  icon: React.ReactNode;
  color: string;
};

const CropAdvisor = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<CropRecommendation[]>([]);
  const [activeTab, setActiveTab] = useState('recommendations');
  const [formData, setFormData] = useState({
    location: 'Tirupati, Andhra Pradesh',
    soilType: 'clay',
    cropType: 'grain',
    waterAvailability: 70,
    landSize: '5',
    previousCrop: ''
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGetRecommendations = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would call the AI service with the form data
      // For now, we'll simulate a response
      const userProfile = {
        location: formData.location,
        farmType: formData.cropType,
        crops: [formData.previousCrop],
        soilType: formData.soilType
      };
      
      const query = `Recommend crops for ${formData.soilType} soil with ${formData.waterAvailability}% water availability`;
      
      // Call the AI service
      const aiResponse = await getFarmingRecommendation(userProfile, query);
      console.log("AI Response:", aiResponse);
      
      // Simulate recommendations based on form data
      const mockRecommendations: CropRecommendation[] = [
        {
          cropName: 'Rice',
          confidence: 92,
          expectedYield: '5.8 tons/ha',
          growingPeriod: '120-140 days',
          waterRequirements: 'High (1200-1500mm)',
          fertilizers: ['Urea', 'DAP', 'Potash'],
          icon: <Droplets className="h-5 w-5" />,
          color: 'bg-agri-blue/10 text-agri-blue'
        },
        {
          cropName: 'Cotton',
          confidence: 87,
          expectedYield: '2.3 tons/ha',
          growingPeriod: '160-180 days',
          waterRequirements: 'Medium (700-900mm)',
          fertilizers: ['Nitrogen', 'Phosphorus', 'Potassium'],
          icon: <Sun className="h-5 w-5" />,
          color: 'bg-agri-amber/10 text-agri-amber'
        },
        {
          cropName: 'Sugarcane',
          confidence: 78,
          expectedYield: '80 tons/ha',
          growingPeriod: '10-12 months',
          waterRequirements: 'High (1500-2500mm)',
          fertilizers: ['Nitrogen', 'Phosphorus', 'Potassium', 'Zinc'],
          icon: <Leaf className="h-5 w-5" />,
          color: 'bg-agri-freshGreen/10 text-agri-freshGreen'
        },
        {
          cropName: 'Groundnut',
          confidence: 72,
          expectedYield: '2.5 tons/ha',
          growingPeriod: '90-120 days',
          waterRequirements: 'Medium (500-700mm)',
          fertilizers: ['Calcium', 'Phosphorus', 'Gypsum'],
          icon: <Sun className="h-5 w-5" />,
          color: 'bg-agri-soil/10 text-agri-soil'
        }
      ];
      
      setRecommendations(mockRecommendations);
      setActiveTab('recommendations');
      
      toast({
        title: t('cropAdvisor.recommendationsReady'),
        description: t('cropAdvisor.recommendationsDescription'),
        variant: "default"
      });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      toast({
        title: t('error'),
        description: t('cropAdvisor.errorDescription'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderRecommendationForm = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="location">{t('cropAdvisor.location')}</Label>
              <Input 
                id="location" 
                value={formData.location} 
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder={t('cropAdvisor.locationPlaceholder')}
              />
            </div>
            
            <div>
              <Label htmlFor="soilType">{t('cropAdvisor.soilType')}</Label>
              <Select 
                value={formData.soilType} 
                onValueChange={(value) => handleInputChange('soilType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('cropAdvisor.selectSoilType')} />
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
              <Label htmlFor="cropType">{t('cropAdvisor.preferredCropType')}</Label>
              <Select 
                value={formData.cropType} 
                onValueChange={(value) => handleInputChange('cropType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('cropAdvisor.selectCropType')} />
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
                <Label>{t('cropAdvisor.waterAvailability')}</Label>
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
              <Label htmlFor="landSize">{t('cropAdvisor.landSize')}</Label>
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
              <Label htmlFor="previousCrop">{t('cropAdvisor.previousCrop')}</Label>
              <Input 
                id="previousCrop" 
                value={formData.previousCrop} 
                onChange={(e) => handleInputChange('previousCrop', e.target.value)}
                placeholder={t('cropAdvisor.previousCropPlaceholder')}
              />
            </div>
          </div>
        </div>
        
        <Button 
          className="w-full bg-agri-freshGreen hover:bg-agri-freshGreen/90"
          onClick={handleGetRecommendations}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('loading')}...
            </>
          ) : (
            <>
              {t('cropAdvisor.getRecommendations')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    );
  };

  const renderRecommendations = () => {
    if (recommendations.length === 0) {
      return (
        <div className="text-center py-12">
          <Leaf className="h-12 w-12 text-agri-freshGreen/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            {t('cropAdvisor.noRecommendationsYet')}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {t('cropAdvisor.fillParametersMessage')}
          </p>
          <Button 
            variant="outline" 
            onClick={() => setActiveTab('form')}
          >
            {t('cropAdvisor.goToForm')}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.map((crop, index) => (
            <Card key={index} className="overflow-hidden border-gray-200 hover:shadow-md transition-shadow">
              <div className={`p-4 flex items-center justify-between ${index === 0 ? 'bg-gradient-to-r from-agri-freshGreen/20 to-agri-lime/10' : ''}`}>
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${crop.color}`}>
                    {crop.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">{crop.cropName}</h3>
                    <div className="flex items-center">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full mr-2">
                        <div 
                          className="h-full bg-agri-freshGreen rounded-full" 
                          style={{ inlineSize: `${crop.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs text-agri-freshGreen">{crop.confidence}% match</span>
                    </div>
                  </div>
                </div>
                {index === 0 && (
                  <span className="text-xs bg-agri-freshGreen text-white px-2 py-1 rounded-full">
                    {t('cropAdvisor.bestMatch')}
                  </span>
                )}
              </div>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs">{t('cropAdvisor.expectedYield')}</span>
                    <span className="font-medium">{crop.expectedYield}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">{t('cropAdvisor.growingPeriod')}</span>
                    <span className="font-medium">{crop.growingPeriod}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">{t('cropAdvisor.waterNeeds')}</span>
                    <span className="font-medium">{crop.waterRequirements}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">{t('cropAdvisor.recommendedFertilizers')}</span>
                    <span className="font-medium">{crop.fertilizers.join(', ')}</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4 text-xs">
                  {t('cropAdvisor.viewDetailedGuide')} <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => setActiveTab('form')}
          className="w-full"
        >
          {t('cropAdvisor.adjustParameters')}
        </Button>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold text-agri-darkGreen mb-6">
          {t('cropAdvisor.title')}
        </h1>
        
        <Card className="mb-6">
          <CardHeader className="bg-agri-freshGreen/10">
            <CardTitle className="text-agri-darkGreen flex items-center">
              <Leaf className="mr-2 h-5 w-5" />
              {t('cropAdvisor.cropRecommendations')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="form">{t('cropAdvisor.farmParameters')}</TabsTrigger>
                <TabsTrigger value="recommendations">{t('cropAdvisor.recommendations')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="form">
                {renderRecommendationForm()}
              </TabsContent>
              
              <TabsContent value="recommendations">
                {renderRecommendations()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="bg-agri-blue/10 p-4">
              <CardTitle className="text-agri-darkGreen text-base flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                {t('cropAdvisor.cropCalendar')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 mb-4">
                {t('cropAdvisor.viewOptimalPlantingTimes')}
              </p>
              <Button variant="outline" className="w-full">
                {t('cropAdvisor.openCalendar')}
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="bg-agri-amber/10 p-4">
              <CardTitle className="text-agri-darkGreen text-base flex items-center">
                <Thermometer className="mr-2 h-4 w-4" />
                {t('cropAdvisor.climateAnalysis')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 mb-4">
                {t('cropAdvisor.seeHowClimateAffectsCropChoices')}
              </p>
              <Button variant="outline" className="w-full">
                {t('cropAdvisor.viewAnalysis')}
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="bg-agri-lime/10 p-4">
              <CardTitle className="text-agri-darkGreen text-base flex items-center">
                <Cloud className="mr-2 h-4 w-4" />
                {t('cropAdvisor.seasonalForecast')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500 mb-4">
                {t('cropAdvisor.checkUpcomingSeasonalConditions')}
              </p>
              <Button variant="outline" className="w-full">
                {t('cropAdvisor.viewForecast')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default CropAdvisor;
