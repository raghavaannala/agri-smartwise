import React, { useState, useRef, ChangeEvent } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Droplets, Upload, Loader2, AlertTriangle, Check, Info, FlaskConical, Leaf, Camera } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setNoSoilDetected(false);
    setAnalysisResult(null);

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('fileTooLarge'),
        description: t('pleaseSelectAnImageSmallerThan5MB'),
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const imageData = reader.result as string;
        setSelectedImage(imageData);
        setIsAnalyzing(true);
        
        try {
          const analysis = await analyzeSoil(imageData);
          
          if (!analysis.soilPresent) {
            setNoSoilDetected(true);
            setIsAnalyzing(false);
            toast({
              title: t('noSoilDetected'),
              description: t('pleaseUploadAnImageThatClearlyShowsSoil'),
              variant: "destructive"
            });
            return;
          }
          
          setAnalysisResult({
            soilType: analysis.soilType || 'Loamy',
            fertility: analysis.fertility || 'Medium',
            phLevel: analysis.phLevel || '6.5',
            recommendations: analysis.recommendations || t('soilLab.defaultRecommendation'),
            suitableCrops: analysis.suitableCrops || [t('soilLab.wheat'), t('soilLab.corn'), t('soilLab.rice')],
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
              ph: analysis.properties?.ph || 6.5,
              texture: analysis.properties?.texture || 'Loamy',
              waterRetention: analysis.properties?.waterRetention || 65,
              drainage: analysis.properties?.drainage || 'Good'
            },
            confidenceScore: analysis.confidenceScore
          });
          
          toast({
            title: t('soilAnalysisComplete'),
            description: `${t('soilType')}: ${analysis.soilType}, ${t('fertility')}: ${analysis.fertility}`,
            variant: "default"
          });
        } catch (error) {
          console.error('Error analyzing soil:', error);
          toast({
            title: t('analysisFailed'),
            description: t('unableToAnalyzeTheSoilImagePleaseTryAgain'),
            variant: "destructive"
          });
        } finally {
          setIsAnalyzing(false);
        }
      } catch (error) {
        console.error('Error processing image:', error);
        setIsAnalyzing(false);
        toast({
          title: t('error'),
          description: t('errorProcessingImage'),
          variant: "destructive"
        });
      }
    };
    
    reader.onerror = () => {
      console.error('FileReader error');
      setIsAnalyzing(false);
      toast({
        title: t('error'),
        description: t('errorReadingFile'),
        variant: "destructive"
      });
    };
    
    reader.readAsDataURL(file);
  };

  const handleAnalyzeButtonClick = () => {
    if (!selectedImage || isAnalyzing) return;
    
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

  const renderUploadSection = () => {
    return (
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <FlaskConical className="h-12 w-12 text-agri-soil mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">{t('soilAnalysis')}</h3>
        <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
          {t('uploadAClearPhotoOfYourSoilSampleToGetDetailedAnalysisOfSoilTypeFertilityPHLevelAndCropRecommendations')}
        </p>
        <label htmlFor="soil-image-upload">
          <div className="relative inline-block">
            <Button className="bg-agri-soil hover:bg-agri-soil/90" disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('analyzingSoil')}...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('uploadSoilImage')}
                </>
              )}
            </Button>
            <input
              id="soil-image-upload"
              type="file"
              accept="image/*"
              capture="environment"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleImageUpload}
              disabled={isAnalyzing}
            />
          </div>
        </label>
      </div>
    );
  };

  const renderSoilResult = () => {
    if (!analysisResult) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <img 
            src={analysisResult.imageSrc ?? ''} 
            alt="Soil image" 
            className="w-full h-auto"
          />
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-agri-darkGreen flex items-center">
              <Droplets className="h-5 w-5 text-agri-blue mr-2" />
              {analysisResult.soilType}
            </h3>
            <div className="mt-2 flex items-center">
              <span className="text-sm text-gray-500 mr-2">{t('fertility')}:</span>
              <span className={`font-medium ${getFertilityColor(analysisResult.fertility)}`}>
                {analysisResult.fertility}
              </span>
            </div>
            <div className="mt-1">
              <span className="text-sm text-gray-500 mr-2">{t('phLevel')}:</span>
              <span className="font-medium">{analysisResult.phLevel}</span>
            </div>
            <div className="mt-1 flex items-center">
              <span className="text-sm text-gray-500 mr-2">{t('soilLab.analysisConfidence')}:</span>
              <span className={`font-medium ${getConfidenceColor(analysisResult)}`}>
                {getConfidenceDisplay(analysisResult)}
              </span>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-1">{t('recommendations')}</h4>
            <p className="text-sm text-gray-600">{analysisResult.recommendations}</p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-2">{t('suitableCrops')}</h4>
            <div className="flex flex-wrap gap-2">
              {analysisResult.suitableCrops.map((crop, index) => (
                <Badge 
                  key={index} 
                  className="bg-agri-freshGreen/10 text-agri-freshGreen hover:bg-agri-freshGreen/20"
                >
                  <Leaf className="h-3 w-3 mr-1" />
                  {crop}
                </Badge>
              ))}
            </div>
          </div>

          {hasLowConfidence(analysisResult) && (
            <Alert variant="default" className="mt-4">
              <AlertTitle className="flex items-center">
                <Info className="mr-2 h-4 w-4" />
                {t('soilLab.limitedConfidence')}
              </AlertTitle>
              <AlertDescription>
                {t('soilLab.labTestingRecommended')}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex space-x-3 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setAnalysisResult(null)}
              className="flex-1"
            >
              {t('analyzeAnotherSample')}
            </Button>
            <Button className="bg-agri-soil hover:bg-agri-soil/90">
              {t('saveReport')}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-agri-darkGreen mb-2">
            {t('soilLab.title')}
          </h1>
          <p className="text-gray-600">
            {t('soilLab.subtitle')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Image Upload Section */}
          <Card className="lg:col-span-1">
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
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  selectedImage ? 'border-agri-soil' : 'border-gray-300 hover:border-agri-soil'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedImage ? (
                  <div className="space-y-4">
                    <div className="relative w-full h-48 mx-auto">
                      <img 
                        src={selectedImage} 
                        alt="Soil sample" 
                        className="w-full h-full object-cover rounded-md"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      {t('soilLab.clickToChangeImage')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Droplets className="h-12 w-12 text-agri-soil/30 mx-auto" />
                    <div>
                      <p className="text-agri-soil font-medium">
                        {t('soilLab.dragAndDrop')}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {t('soilLab.orClickToUpload')}
                      </p>
                    </div>
                  </div>
                )}
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
                  className="flex-1 bg-agri-soil hover:bg-agri-soil/90"
                  disabled={!selectedImage || isAnalyzing}
                  onClick={handleAnalyzeButtonClick}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('soilLab.analyzing')}...
                    </>
                  ) : (
                    <>
                      {t('soilLab.analyzeNow')}
                    </>
                  )}
                </Button>
                
                <label htmlFor="camera-capture-soil" className="relative inline-block">
                  <Button 
                    className="bg-agri-blue hover:bg-agri-blue/90" 
                    disabled={isAnalyzing}
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
                    disabled={isAnalyzing}
                  />
                </label>
              </div>
            </CardContent>
          </Card>
          
          {/* Analysis Results Section */}
          <Card className={`lg:col-span-2 ${!analysisResult && 'flex items-center justify-center'}`}>
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
                  <Tabs defaultValue="nutrients">
                    <TabsList className="mb-4">
                      <TabsTrigger value="nutrients">{t('soilLab.nutrients')}</TabsTrigger>
                      <TabsTrigger value="properties">{t('soilLab.properties')}</TabsTrigger>
                      <TabsTrigger value="recommendations">{t('soilLab.recommendations')}</TabsTrigger>
                    </TabsList>
                    
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
      </div>
    </MainLayout>
  );
};

export default SoilLab;
