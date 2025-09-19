import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Droplets, Upload, Loader2, AlertTriangle, Check, Info, FlaskConical, Leaf, Camera, Cpu, Wifi, Zap, TrendingUp, BarChart3, Thermometer, Activity } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeSoil } from '@/services/geminiService';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SoilNutrients {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter: number;
  sulfur: number;
}

interface SoilProperties {
  ph: number;
  texture: string;
  waterRetention: number;
  drainage: string;
}

type SoilAnalysisResult = {
  soilType: string;
  fertility: 'Low' | 'Medium' | 'High';
  phLevel: string;
  recommendations: string;
  suitableCrops: string[];
  imageSrc: string | null;
  soilPresent: boolean;
  nutrients: SoilNutrients;
  properties: SoilProperties;
  confidenceScore?: number;
};

const SoilLab = () => {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SoilAnalysisResult | null>(null);
  const [noSoilDetected, setNoSoilDetected] = useState(false);
  const [serviceReady, setServiceReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Check if Gemini service is available
  useEffect(() => {
    const checkService = async () => {
      try {
        // Check if API key is configured
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
          console.error('Gemini API key not configured');
          toast({
            title: 'Service Configuration Error',
            description: 'AI service is not properly configured. Please check your API key.',
            variant: "destructive"
          });
          return;
        }
        
        setServiceReady(true);
        console.log('Soil Lab service ready');
      } catch (error) {
        console.error('Service check failed:', error);
        toast({
          title: 'Service Error',
          description: 'AI service is not available. Please try again later.',
          variant: "destructive"
        });
      }
    };

    checkService();
  }, [toast]);

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a valid image file (PNG, JPG, JPEG)',
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 10MB',
        variant: "destructive"
      });
      return;
    }

    setNoSoilDetected(false);
    setAnalysisResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const imageData = reader.result as string;
        setSelectedImage(imageData);
        setIsAnalyzing(true);
        
        console.log('Starting soil analysis...');
        
        try {
          const analysis = await analyzeSoil(imageData);
          console.log('Soil analysis result:', analysis);
          
          if (!analysis) {
            throw new Error('No analysis result received');
          }
          
          if (!analysis.soilPresent) {
            setNoSoilDetected(true);
            setIsAnalyzing(false);
            toast({
              title: 'No Soil Detected',
              description: 'Please upload an image that clearly shows soil',
              variant: "destructive"
            });
            return;
          }
          
          setAnalysisResult({
            soilType: analysis.soilType || 'Loamy Soil',
            fertility: analysis.fertility || 'Medium',
            phLevel: analysis.phLevel || '6.5-7.0',
            recommendations: analysis.recommendations || 'Regular soil testing recommended for optimal crop management.',
            suitableCrops: analysis.suitableCrops || ['Wheat', 'Corn', 'Rice'],
            imageSrc: imageData,
            soilPresent: true,
            nutrients: {
              nitrogen: analysis.nutrients?.nitrogen || 35,
              phosphorus: analysis.nutrients?.phosphorus || 28,
              potassium: analysis.nutrients?.potassium || 42,
              organicMatter: analysis.nutrients?.organicMatter || 15,
              sulfur: analysis.nutrients?.sulfur || 10
            },
            properties: {
              ph: analysis.properties?.ph || 6.8,
              texture: analysis.properties?.texture || 'Loamy',
              waterRetention: analysis.properties?.waterRetention || 65,
              drainage: analysis.properties?.drainage || 'Good'
            },
            confidenceScore: analysis.confidenceScore || 6
          });
          
          toast({
            title: 'Soil Analysis Complete',
            description: `Soil Type: ${analysis.soilType}, Fertility: ${analysis.fertility}`,
            variant: "default"
          });
        } catch (error: any) {
          console.error('Error analyzing soil:', error);
          
          // Handle specific error types
          let errorTitle = 'Analysis Failed';
          let errorDescription = error.message || 'Unable to analyze the soil image. Please try again.';
          let errorVariant: "default" | "destructive" = "destructive";
          
          if (error.message && error.message.includes('429')) {
            errorTitle = 'API Quota Exceeded';
            errorDescription = 'Daily API limit reached. Please try again in a few hours or upgrade your plan for unlimited analysis.';
            errorVariant = "default";
          } else if (error.message && error.message.includes('timeout')) {
            errorTitle = 'Analysis Timeout';
            errorDescription = 'Analysis took too long. Please try again with a smaller or clearer image.';
          } else if (error.message && error.message.includes('safety')) {
            errorTitle = 'Content Issue';
            errorDescription = 'Image content was flagged. Please ensure the image shows only soil and try again.';
          }
          
          toast({
            title: errorTitle,
            description: errorDescription,
            variant: errorVariant
          });
        } finally {
          setIsAnalyzing(false);
        }
      } catch (error) {
        console.error('Error processing image:', error);
        setIsAnalyzing(false);
        toast({
          title: 'Error',
          description: 'Error processing image. Please try again.',
          variant: "destructive"
        });
      }
    };
    
    reader.onerror = () => {
      console.error('FileReader error');
      setIsAnalyzing(false);
      toast({
        title: 'Error',
        description: 'Error reading file. Please try again.',
        variant: "destructive"
      });
    };
    
    reader.readAsDataURL(file);
  };

  const handleAnalyzeButtonClick = () => {
    if (!selectedImage || isAnalyzing || !serviceReady) return;
    
    const dataURLtoBlob = (dataURL: string) => {
      const arr = dataURL.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    };
    
    const blob = dataURLtoBlob(selectedImage);
    const file = new File([blob], 'soil-image.jpg', { type: 'image/jpeg' });
    
    const mockEvent = {
      target: {
        files: [file]
      }
    } as unknown as ChangeEvent<HTMLInputElement>;
    
    handleImageUpload(mockEvent);
  };

  const getFertilityColor = (fertility: SoilAnalysisResult['fertility']) => {
    switch (fertility) {
      case 'Low':
        return 'text-red-500';
      case 'Medium':
        return 'text-yellow-500';
      case 'High':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getNutrientStatus = (nutrient: keyof SoilNutrients, value: number): string => {
    if (value < 20) {
      return t('soilLab.nutrientLow', { nutrient: t(`soilLab.${nutrient}`) });
    } else if (value < 40) {
      return t('soilLab.nutrientModerate', { nutrient: t(`soilLab.${nutrient}`) });
    } else {
      return t('soilLab.nutrientHigh', { nutrient: t(`soilLab.${nutrient}`) });
    }
  };

  const getOrganicMatterStatus = (value: number): string => {
    if (value < 10) {
      return t('soilLab.organicMatterLow');
    } else if (value < 30) {
      return t('soilLab.organicMatterModerate');
    } else {
      return t('soilLab.organicMatterHigh');
    }
  };

  const getPHStatus = (value: number): string => {
    if (value < 5.5) {
      return t('soilLab.phAcidic');
    } else if (value < 7.5) {
      return t('soilLab.phNeutral');
    } else {
      return t('soilLab.phAlkaline');
    }
  };

  const getMoistureStatus = (value: number): string => {
    if (value < 30) {
      return t('soilLab.moistureLow');
    } else if (value < 70) {
      return t('soilLab.moistureModerate');
    } else {
      return t('soilLab.moistureHigh');
    }
  };

  const getSoilTypeDescription = (texture: string): string => {
    switch (texture.toLowerCase()) {
      case 'sandy':
        return t('soilLab.sandyDescription');
      case 'silty':
        return t('soilLab.siltyDescription');
      case 'clay':
        return t('soilLab.clayDescription');
      case 'loamy':
      default:
        return t('soilLab.loamyDescription');
    }
  };

  const hasLowConfidence = (result: SoilAnalysisResult | null): boolean => {
    if (!result) return false;
    
    if (result.confidenceScore !== undefined) {
      return result.confidenceScore < 5;
    }
    
    return result.soilType.toLowerCase().includes('low confidence');
  };

  const getConfidenceDisplay = (result: SoilAnalysisResult | null): string => {
    if (!result) return '';
    
    if (result.confidenceScore !== undefined) {
      if (result.confidenceScore <= 3) return t('soilLab.lowConfidence');
      if (result.confidenceScore <= 7) return t('soilLab.moderateConfidence');
      return t('soilLab.highConfidence');
    }
    
    if (result.soilType.toLowerCase().includes('low confidence')) {
      return t('soilLab.lowConfidence');
    } else if (result.soilType.toLowerCase().includes('high confidence')) {
      return t('soilLab.highConfidence');
    }
    
    return t('soilLab.moderateConfidence');
  };

  const getConfidenceColor = (result: SoilAnalysisResult | null): string => {
    if (!result) return 'text-gray-500';
    
    const level = getConfidenceDisplay(result);
    if (level === t('soilLab.lowConfidence')) return 'text-red-500';
    if (level === t('soilLab.moderateConfidence')) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Calculate soil health score based on multiple factors
  const calculateSoilHealthScore = (result: SoilAnalysisResult): number => {
    let score = 0;
    
    // pH score (0-25 points)
    const ph = result.properties.ph;
    if (ph >= 6.0 && ph <= 7.5) score += 25; // Optimal range
    else if (ph >= 5.5 && ph <= 8.0) score += 20; // Good range
    else if (ph >= 5.0 && ph <= 8.5) score += 15; // Acceptable range
    else score += 5; // Poor range
    
    // Organic matter score (0-25 points)
    const organicMatter = result.nutrients.organicMatter;
    if (organicMatter >= 4) score += 25; // Excellent
    else if (organicMatter >= 3) score += 20; // Good
    else if (organicMatter >= 2) score += 15; // Fair
    else score += 5; // Poor
    
    // Nutrient balance score (0-30 points)
    const { nitrogen, phosphorus, potassium } = result.nutrients;
    const avgNutrients = (nitrogen + phosphorus + potassium) / 3;
    if (avgNutrients >= 40) score += 30; // Excellent
    else if (avgNutrients >= 30) score += 25; // Good
    else if (avgNutrients >= 20) score += 20; // Fair
    else score += 10; // Poor
    
    // Water retention score (0-20 points)
    const waterRetention = result.properties.waterRetention;
    if (waterRetention >= 60 && waterRetention <= 80) score += 20; // Optimal
    else if (waterRetention >= 50 && waterRetention <= 90) score += 15; // Good
    else if (waterRetention >= 40 && waterRetention <= 95) score += 10; // Fair
    else score += 5; // Poor
    
    return Math.min(100, score);
  };

  // Get health score color and label
  const getHealthScoreInfo = (score: number) => {
    if (score >= 80) return { color: 'text-green-600', bg: 'bg-green-100', label: 'Excellent', icon: '🌟' };
    if (score >= 65) return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Good', icon: '👍' };
    if (score >= 50) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Fair', icon: '⚠️' };
    return { color: 'text-red-600', bg: 'bg-red-100', label: 'Poor', icon: '🚨' };
  };

  // Generate personalized recommendations based on analysis
  const generateSmartRecommendations = (result: SoilAnalysisResult): string[] => {
    const recommendations: string[] = [];
    const { nutrients, properties } = result;
    
    // pH recommendations
    if (properties.ph < 6.0) {
      recommendations.push("🔬 Add agricultural lime to raise pH and reduce acidity");
    } else if (properties.ph > 7.5) {
      recommendations.push("🔬 Add sulfur or organic matter to lower pH");
    }
    
    // Nutrient recommendations
    if (nutrients.nitrogen < 25) {
      recommendations.push("🌱 Apply nitrogen-rich fertilizer or plant legumes to fix nitrogen");
    }
    if (nutrients.phosphorus < 20) {
      recommendations.push("🦴 Add bone meal or rock phosphate for phosphorus");
    }
    if (nutrients.potassium < 25) {
      recommendations.push("🍌 Apply potash or wood ash for potassium");
    }
    
    // Organic matter recommendations
    if (nutrients.organicMatter < 3) {
      recommendations.push("🍂 Add compost, manure, or cover crops to increase organic matter");
    }
    
    // Water management
    if (properties.waterRetention < 50) {
      recommendations.push("💧 Improve water retention with organic matter and mulching");
    } else if (properties.waterRetention > 85) {
      recommendations.push("🌊 Improve drainage with sand or raised beds");
    }
    
    // Texture-based recommendations
    if (properties.texture.toLowerCase().includes('clay')) {
      recommendations.push("🏗️ Add organic matter and sand to improve clay soil structure");
    } else if (properties.texture.toLowerCase().includes('sand')) {
      recommendations.push("🌾 Add organic matter and clay to improve sandy soil retention");
    }
    
    return recommendations;
  };

  // Get crop recommendations based on soil conditions
  const getOptimizedCropRecommendations = (result: SoilAnalysisResult): Array<{crop: string, suitability: number, reason: string}> => {
    const crops = [
      { name: 'Tomatoes', phRange: [6.0, 6.8], nutrients: { n: 30, p: 25, k: 35 } },
      { name: 'Corn', phRange: [6.0, 6.8], nutrients: { n: 40, p: 30, k: 25 } },
      { name: 'Wheat', phRange: [6.0, 7.0], nutrients: { n: 35, p: 20, k: 20 } },
      { name: 'Rice', phRange: [5.5, 6.5], nutrients: { n: 25, p: 15, k: 20 } },
      { name: 'Soybeans', phRange: [6.0, 7.0], nutrients: { n: 20, p: 25, k: 30 } },
      { name: 'Potatoes', phRange: [5.8, 6.2], nutrients: { n: 30, p: 35, k: 40 } }
    ];
    
    return crops.map(crop => {
      let suitability = 0;
      let reasons: string[] = [];
      
      // pH suitability
      const ph = result.properties.ph;
      if (ph >= crop.phRange[0] && ph <= crop.phRange[1]) {
        suitability += 40;
        reasons.push('optimal pH');
      } else if (Math.abs(ph - (crop.phRange[0] + crop.phRange[1]) / 2) <= 0.5) {
        suitability += 25;
        reasons.push('acceptable pH');
      }
      
      // Nutrient suitability
      const nMatch = Math.max(0, 100 - Math.abs(result.nutrients.nitrogen - crop.nutrients.n));
      const pMatch = Math.max(0, 100 - Math.abs(result.nutrients.phosphorus - crop.nutrients.p));
      const kMatch = Math.max(0, 100 - Math.abs(result.nutrients.potassium - crop.nutrients.k));
      
      const avgNutrientMatch = (nMatch + pMatch + kMatch) / 3;
      suitability += (avgNutrientMatch / 100) * 40;
      
      if (avgNutrientMatch > 80) reasons.push('excellent nutrient match');
      else if (avgNutrientMatch > 60) reasons.push('good nutrients');
      
      // Water retention suitability
      if (result.properties.waterRetention >= 50 && result.properties.waterRetention <= 80) {
        suitability += 20;
        reasons.push('good water retention');
      }
      
      return {
        crop: crop.name,
        suitability: Math.round(suitability),
        reason: reasons.join(', ') || 'needs soil improvement'
      };
    }).sort((a, b) => b.suitability - a.suitability);
  };

  return (
    <MainLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto p-4 max-w-7xl"
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-agri-darkGreen mb-2 flex items-center">
            <FlaskConical className="mr-3 h-8 w-8 text-agri-soil" />
            {t('soilLab.title')}
          </h1>
          <p className="text-gray-600 text-lg">
            {t('soilLab.subtitle')} - Advanced AI-powered soil analysis with precision insights
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="xl:col-span-1"
          >
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-agri-darkGreen flex items-center">
                  <Upload className="mr-2 h-5 w-5 text-agri-soil" />
                  {t('soilLab.uploadSoil')}
                </CardTitle>
                <CardDescription>
                  {t('soilLab.uploadDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-300 ${
                    selectedImage ? 'border-agri-soil bg-agri-soil/5' : 'border-gray-300 hover:border-agri-soil hover:bg-agri-soil/5'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <AnimatePresence mode="wait">
                    {selectedImage ? (
                      <motion.div 
                        key="image"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="space-y-4"
                      >
                        <div className="relative w-full h-48 mx-auto">
                          <img 
                            src={selectedImage} 
                            alt="Soil sample" 
                            className="w-full h-full object-cover rounded-md shadow-md"
                          />
                          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                            Ready
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">
                          {t('soilLab.clickToChangeImage')}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="placeholder"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="space-y-4"
                      >
                        <Droplets className="h-12 w-12 text-agri-soil/30 mx-auto" />
                        <div>
                          <p className="text-agri-soil font-medium">
                            {t('soilLab.dragAndDrop')}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {t('soilLab.orClickToUpload')}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                  />
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    className="flex-1 bg-agri-soil hover:bg-agri-soil/90 transition-all duration-300"
                    disabled={!selectedImage || isAnalyzing || !serviceReady}
                    onClick={handleAnalyzeButtonClick}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('soilLab.analyzing')}...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        {t('soilLab.analyzeNow')}
                      </>
                    )}
                  </Button>
                  
                  <label htmlFor="camera-capture-soil" className="relative inline-block">
                    <Button 
                      className="bg-agri-blue hover:bg-agri-blue/90 transition-all duration-300" 
                      disabled={isAnalyzing || !serviceReady}
                      type="button"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {t('soilLab.takeSoilPhoto')}
                    </Button>
                    <input
                      id="camera-capture-soil"
                      type="file"
                      accept="image/*" 
                      capture="environment"
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      onChange={handleImageUpload}
                      disabled={isAnalyzing || !serviceReady}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Future Sensors Integration Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <Card className="border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="text-blue-700 flex items-center text-lg">
                    <Cpu className="mr-2 h-5 w-5" />
                    Future: IoT Sensors
                  </CardTitle>
                  <CardDescription className="text-blue-600">
                    Coming Soon - Real-time soil monitoring
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2 p-2 bg-white/50 rounded-md">
                      <Thermometer className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium">Temperature</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 bg-white/50 rounded-md">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Moisture</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 bg-white/50 rounded-md">
                      <Activity className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">pH Level</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 bg-white/50 rounded-md">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">Nutrients</span>
                    </div>
                  </div>
                  
                  <Alert className="border-blue-200 bg-blue-50">
                    <Wifi className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-700">Smart Integration</AlertTitle>
                    <AlertDescription className="text-blue-600 text-sm">
                      We're developing IoT sensors that will provide 24/7 real-time soil monitoring, 
                      automatic data collection, and predictive analytics for optimal crop management.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="text-center">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      <TrendingUp className="mr-1 h-3 w-3" />
                      Enhanced Accuracy Coming Soon
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
          <Card className={`xl:col-span-3 ${!analysisResult && 'flex items-center justify-center'}`}>
            {noSoilDetected && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>{t('noSoilDetected')}</AlertTitle>
                <AlertDescription>{t('pleaseUploadAnImageThatClearlyShowsSoil')}</AlertDescription>
              </Alert>
            )}
            {!analysisResult ? (
              <div className="text-center p-8">
                <Droplets className="h-16 w-16 text-agri-soil/20 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-agri-darkGreen mb-2">
                  {t('soilLab.noAnalysisYet')}
                </h3>
                <p className="text-gray-500 max-w-md">
                  {t('soilLab.uploadSoilMessage')}
                </p>
              </div>
            ) : (
              <>
                <CardHeader>
                  <CardTitle className="text-agri-darkGreen flex items-center">
                    <Droplets className="mr-2 h-5 w-5 text-agri-soil" />
                    {t('soilLab.results')}
                  </CardTitle>
                  <CardDescription>
                    {t('soilLab.analysisCompleted')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overview">
                    <TabsList className="mb-4">
                      <TabsTrigger value="overview">{t('soilLab.overview')}</TabsTrigger>
                      <TabsTrigger value="nutrients">{t('soilLab.nutrients')}</TabsTrigger>
                      <TabsTrigger value="properties">{t('soilLab.properties')}</TabsTrigger>
                      <TabsTrigger value="recommendations">{t('soilLab.recommendations')}</TabsTrigger>
                      <TabsTrigger value="healthScore">{t('soilLab.healthScore')}</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview" className="space-y-4">
                      {/* Soil Health Score Card */}
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-r from-agri-green/10 to-agri-blue/10 p-6 rounded-lg border border-agri-green/20"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-agri-darkGreen">Soil Health Score</h3>
                          <div className="flex items-center space-x-2">
                            <span className="text-3xl font-bold text-agri-darkGreen">
                              {calculateSoilHealthScore(analysisResult)}
                            </span>
                            <span className="text-sm text-gray-500">/100</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 mb-3">
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthScoreInfo(calculateSoilHealthScore(analysisResult)).bg} ${getHealthScoreInfo(calculateSoilHealthScore(analysisResult)).color}`}>
                            {getHealthScoreInfo(calculateSoilHealthScore(analysisResult)).icon} {getHealthScoreInfo(calculateSoilHealthScore(analysisResult)).label}
                          </div>
                        </div>
                        
                        <Progress 
                          value={calculateSoilHealthScore(analysisResult)} 
                          className="h-3 bg-gray-200"
                        >
                          <div 
                            className="h-full bg-gradient-to-r from-agri-green to-agri-blue rounded-full transition-all duration-500" 
                            style={{ width: `${calculateSoilHealthScore(analysisResult)}%` }}
                          ></div>
                        </Progress>
                      </motion.div>

                      {/* Quick Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="bg-white p-4 rounded-lg border border-agri-green/20 text-center"
                        >
                          <div className="text-2xl mb-2">🌱</div>
                          <div className="text-sm text-gray-500">Fertility</div>
                          <div className="font-semibold text-agri-darkGreen">{analysisResult.fertility}</div>
                        </motion.div>
                        
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="bg-white p-4 rounded-lg border border-agri-blue/20 text-center"
                        >
                          <div className="text-2xl mb-2">🔬</div>
                          <div className="text-sm text-gray-500">pH Level</div>
                          <div className="font-semibold text-agri-darkGreen">{analysisResult.properties.ph}</div>
                        </motion.div>
                        
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="bg-white p-4 rounded-lg border border-agri-amber/20 text-center"
                        >
                          <div className="text-2xl mb-2">💧</div>
                          <div className="text-sm text-gray-500">Water Retention</div>
                          <div className="font-semibold text-agri-darkGreen">{analysisResult.properties.waterRetention}%</div>
                        </motion.div>
                        
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="bg-white p-4 rounded-lg border border-agri-tomato/20 text-center"
                        >
                          <div className="text-2xl mb-2">🍂</div>
                          <div className="text-sm text-gray-500">Organic Matter</div>
                          <div className="font-semibold text-agri-darkGreen">{analysisResult.nutrients.organicMatter}%</div>
                        </motion.div>
                      </div>

                      {/* Top Crop Recommendations */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white p-6 rounded-lg border border-agri-green/20"
                      >
                        <h3 className="text-lg font-semibold text-agri-darkGreen mb-4 flex items-center">
                          <Leaf className="h-5 w-5 mr-2 text-agri-green" />
                          Best Crop Matches
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {getOptimizedCropRecommendations(analysisResult).slice(0, 3).map((crop, index) => (
                            <div key={index} className="p-3 bg-agri-green/5 rounded-lg border border-agri-green/10">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-agri-darkGreen">{crop.crop}</span>
                                <Badge variant="secondary" className="bg-agri-green/20 text-agri-darkGreen">
                                  {crop.suitability}%
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600">{crop.reason}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>

                      {/* Analysis Details */}
                      <div className="bg-agri-soil/10 p-4 rounded-md">
                        <h4 className="font-medium flex items-center text-agri-darkGreen mb-2">
                          <FlaskConical className="h-4 w-4 mr-1 text-agri-soil" />
                          Analysis Summary
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Soil Type:</strong> {analysisResult.soilType}</p>
                            <p><strong>Texture:</strong> {analysisResult.properties.texture}</p>
                            <p><strong>Drainage:</strong> {analysisResult.properties.drainage}</p>
                          </div>
                          <div>
                            <p><strong>Confidence:</strong> 
                              <span className={getConfidenceColor(analysisResult)}>
                                {getConfidenceDisplay(analysisResult)}
                              </span>
                            </p>
                            <p><strong>Analysis Date:</strong> {new Date().toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="nutrients" className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{t('soilLab.nitrogen')}</span>
                          <span>{analysisResult.nutrients.nitrogen}%</span>
                        </div>
                        <Progress value={analysisResult.nutrients.nitrogen} className="h-2 bg-gray-100">
                          <div 
                            className="h-full bg-agri-green rounded-full" 
                            style={{ inlineSize: `${analysisResult.nutrients.nitrogen}%` }}
                          ></div>
                        </Progress>
                        <p className="text-xs text-gray-500">
                          {getNutrientStatus('nitrogen', analysisResult.nutrients.nitrogen)}
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{t('soilLab.phosphorus')}</span>
                          <span>{analysisResult.nutrients.phosphorus}%</span>
                        </div>
                        <Progress value={analysisResult.nutrients.phosphorus} className="h-2 bg-gray-100">
                          <div 
                            className="h-full bg-agri-amber rounded-full" 
                            style={{ inlineSize: `${analysisResult.nutrients.phosphorus}%` }}
                          ></div>
                        </Progress>
                        <p className="text-xs text-gray-500">
                          {getNutrientStatus('phosphorus', analysisResult.nutrients.phosphorus)}
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{t('soilLab.potassium')}</span>
                          <span>{analysisResult.nutrients.potassium}%</span>
                        </div>
                        <Progress value={analysisResult.nutrients.potassium} className="h-2 bg-gray-100">
                          <div 
                            className="h-full bg-agri-tomato rounded-full" 
                            style={{ inlineSize: `${analysisResult.nutrients.potassium}%` }}
                          ></div>
                        </Progress>
                        <p className="text-xs text-gray-500">
                          {getNutrientStatus('potassium', analysisResult.nutrients.potassium)}
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{t('soilLab.organicMatter')}</span>
                          <span>{analysisResult.nutrients.organicMatter}%</span>
                        </div>
                        <Progress value={analysisResult.nutrients.organicMatter} className="h-2 bg-gray-100">
                          <div 
                            className="h-full bg-agri-darkGreen rounded-full" 
                            style={{ inlineSize: `${analysisResult.nutrients.organicMatter}%` }}
                          ></div>
                        </Progress>
                        <p className="text-xs text-gray-500">
                          {getOrganicMatterStatus(analysisResult.nutrients.organicMatter)}
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{t('soilLab.sulfur')}</span>
                          <span>{analysisResult.nutrients.sulfur}%</span>
                        </div>
                        <Progress value={analysisResult.nutrients.sulfur} className="h-2 bg-gray-100">
                          <div 
                            className="h-full bg-yellow-500 rounded-full" 
                            style={{ inlineSize: `${analysisResult.nutrients.sulfur}%` }}
                          ></div>
                        </Progress>
                        <p className="text-xs text-gray-500">
                          {getNutrientStatus('sulfur', analysisResult.nutrients.sulfur)}
                        </p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="properties" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{t('soilLab.ph')}</span>
                            <span>{analysisResult.properties.ph}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full relative">
                            <div className="absolute top-0 bottom-0 left-0 right-0 flex">
                              <div className="h-full bg-red-400 flex-1 rounded-l-full"></div>
                              <div className="h-full bg-orange-400 flex-1"></div>
                              <div className="h-full bg-yellow-400 flex-1"></div>
                              <div className="h-full bg-green-400 flex-1"></div>
                              <div className="h-full bg-blue-400 flex-1"></div>
                              <div className="h-full bg-indigo-400 flex-1 rounded-r-full"></div>
                            </div>
                            <div 
                              className="absolute top-[-4px] h-3 w-3 bg-white border-2 border-gray-500 rounded-full transform -translate-x-1/2"
                              style={{ insetInlineStart: `${(analysisResult.properties.ph / 14) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500">
                            {getPHStatus(analysisResult.properties.ph)}
                          </p>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{t('soilLab.moisture')}</span>
                            <span>{analysisResult.properties.waterRetention}%</span>
                          </div>
                          <Progress value={analysisResult.properties.waterRetention} className="h-2 bg-gray-100">
                            <div 
                              className="h-full bg-agri-blue rounded-full" 
                              style={{ inlineSize: `${analysisResult.properties.waterRetention}%` }}
                            ></div>
                          </Progress>
                          <p className="text-xs text-gray-500">
                            {getMoistureStatus(analysisResult.properties.waterRetention)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="font-medium text-sm mb-2">{t('soilLab.soilType')}</h4>
                        <div className="bg-agri-soil/10 p-3 rounded-md">
                          <p className="font-medium">{analysisResult.properties.texture}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {getSoilTypeDescription(analysisResult.properties.texture)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="font-medium text-sm mb-2">{t('soilLab.texture')}</h4>
                        <div className="bg-agri-soil/10 p-3 rounded-md">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-xs text-gray-500">{t('soilLab.sand')}</p>
                              <p className="font-medium">{analysisResult.properties.texture === 'Sandy' ? '80%' : '20%'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">{t('soilLab.silt')}</p>
                              <p className="font-medium">{analysisResult.properties.texture === 'Silty' ? '80%' : '20%'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">{t('soilLab.clay')}</p>
                              <p className="font-medium">{analysisResult.properties.texture === 'Clay' ? '80%' : '20%'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="recommendations" className="space-y-4">
                      <div className="bg-agri-green/10 p-4 rounded-md mb-4">
                        <h4 className="font-medium flex items-center text-agri-darkGreen mb-2">
                          <Check className="h-4 w-4 mr-1 text-agri-green" />
                          {t('soilLab.suitableCrops')}
                        </h4>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {analysisResult.suitableCrops.map((crop, index) => (
                            <li key={index}>{crop}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {hasLowConfidence(analysisResult) && (
                        <Alert variant="default" className="mb-4">
                          <Info className="h-4 w-4" />
                          <AlertTitle>{t('soilLab.disclaimer')}</AlertTitle>
                          <AlertDescription>
                            {t('soilLab.visualAnalysisLimitation')}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="bg-agri-amber/10 p-4 rounded-md mb-4">
                        <h4 className="font-medium flex items-center text-agri-darkGreen mb-2">
                          <Info className="h-4 w-4 mr-1 text-agri-amber" />
                          {t('soilLab.fertilizerRecommendations')}
                        </h4>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {analysisResult.recommendations.split(',').map((fertilizer, index) => (
                            <li key={index}>{fertilizer}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="bg-agri-tomato/10 p-4 rounded-md">
                        <h4 className="font-medium flex items-center text-agri-darkGreen mb-2">
                          <AlertTriangle className="h-4 w-4 mr-1 text-agri-tomato" />
                          {t('soilLab.improvementNeeded')}
                        </h4>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {analysisResult.recommendations.split(',').map((improvement, index) => (
                            <li key={index}>{improvement}</li>
                          ))}
                        </ul>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="healthScore" className="space-y-4">
                      <div className="bg-agri-green/10 p-4 rounded-md mb-4">
                        <h4 className="font-medium flex items-center text-agri-darkGreen mb-2">
                          <Check className="h-4 w-4 mr-1 text-agri-green" />
                          {t('soilLab.soilHealthScore')}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <p className="text-3xl font-bold">{calculateSoilHealthScore(analysisResult)}</p>
                          <p className="text-sm text-gray-500">/100</p>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">{getHealthScoreInfo(calculateSoilHealthScore(analysisResult)).label}</p>
                          <p className="text-xs text-gray-500">{getHealthScoreInfo(calculateSoilHealthScore(analysisResult)).icon}</p>
                        </div>
                      </div>
                      
                      <div className="bg-agri-amber/10 p-4 rounded-md mb-4">
                        <h4 className="font-medium flex items-center text-agri-darkGreen mb-2">
                          <Info className="h-4 w-4 mr-1 text-agri-amber" />
                          {t('soilLab.smartRecommendations')}
                        </h4>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {generateSmartRecommendations(analysisResult).map((recommendation, index) => (
                            <li key={index}>{recommendation}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="bg-agri-tomato/10 p-4 rounded-md">
                        <h4 className="font-medium flex items-center text-agri-darkGreen mb-2">
                          <AlertTriangle className="h-4 w-4 mr-1 text-agri-tomato" />
                          {t('soilLab.optimizedCropRecommendations')}
                        </h4>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {getOptimizedCropRecommendations(analysisResult).map((recommendation, index) => (
                            <li key={index}>{recommendation.crop} ({recommendation.suitability}% - {recommendation.reason})</li>
                          ))}
                        </ul>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setSelectedImage(null);
                      setAnalysisResult(null);
                    }}
                  >
                    {t('soilLab.startNewAnalysis')}
                  </Button>
                </CardFooter>
              </>
            )}
          </Card>
        </div>
      </motion.div>
    </MainLayout>
  );
};

export default SoilLab;
