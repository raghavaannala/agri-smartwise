import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scan, Upload, AlertTriangle, Loader2, Droplets, Bug, Leaf, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { analyzeCropDisease, analyzeSoil, analyzePestImage } from '@/services/geminiService';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';

type DetectionResult = {
  disease: string;
  confidence: number;
  treatment: string;
  severity: 'Low' | 'Medium' | 'High';
  imageSrc: string | null;
  details?: string;
};

type SoilAnalysisResult = {
  soilType: string;
  fertility: 'Low' | 'Medium' | 'High';
  phLevel: string;
  recommendations: string;
  suitableCrops: string[];
  imageSrc: string | null;
  confidenceScore?: number;
  nutrients?: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    organicMatter: number;
    sulfur: number;
  };
  properties?: {
    ph: number;
    texture: string;
    waterRetention: number;
    drainage: string;
  };
};

type PesticideResult = {
  pestType: string;
  pesticideRecommendations: string;
  organicAlternatives: string;
  preventionTips: string;
  severity: 'Low' | 'Medium' | 'High';
  imageSrc: string | null;
  confidence?: number;
};

type AnalysisType = 'disease' | 'soil' | 'pesticide';

interface DiseaseDetectionCardProps {
  initialImage?: string | null;
  initialAnalysisType?: AnalysisType;
}

const DiseaseDetectionCard = ({ initialImage = null, initialAnalysisType = 'disease' }: DiseaseDetectionCardProps) => {
  const [activeTab, setActiveTab] = useState<AnalysisType>(initialAnalysisType);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [soilResult, setSoilResult] = useState<SoilAnalysisResult | null>(null);
  const [pesticideResult, setPesticideResult] = useState<PesticideResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  // Process initialImage if provided
  useEffect(() => {
    if (initialImage) {
      handleAnalyzeImage(initialImage, initialAnalysisType);
    }
  }, [initialImage, initialAnalysisType]);

  const resetResults = () => {
    setDetectionResult(null);
    setSoilResult(null);
    setPesticideResult(null);
  };

  const handleAnalyzeImage = async (imageData: string, analysisType: 'disease' | 'soil' | 'pesticide') => {
    setIsAnalyzing(true);
    
    try {
      if (analysisType === 'disease') {
        await analyzeDiseaseImage(imageData);
      } else if (analysisType === 'soil') {
        await analyzeSoilImage(imageData);
      } else if (analysisType === 'pesticide') {
        await handlePestDetection(imageData);
      }
    } catch (error) {
      console.error(`Error analyzing image for ${analysisType}:`, error);
      toast({
        title: t('diseaseScan.errorAnalyzingImage'),
        description: t('diseaseScan.errorAnalyzingImageDescription'),
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const imageData = reader.result as string;
        await handleAnalyzeImage(imageData, activeTab);
      } catch (error) {
        console.error('Error processing image:', error);
        toast({
          title: t('error'),
          description: t('errorProcessingImage'),
          variant: "destructive"
        });
      }
    };
    
    reader.onerror = () => {
      console.error('FileReader error');
      toast({
        title: t('error'),
        description: t('errorReadingFile'),
        variant: "destructive"
      });
    };
    
    reader.readAsDataURL(file);
  };

  const analyzeDiseaseImage = async (imageData: string) => {
    try {
      // Use Gemini AI to analyze the image for disease
      const analysis = await analyzeCropDisease(imageData);
      
      setDetectionResult({
        disease: analysis.disease,
        confidence: analysis.confidence,
        treatment: analysis.treatment,
        severity: analysis.severity,
        imageSrc: imageData,
        details: analysis.details
      });
      
      toast({
        title: t('diseaseScan.diseaseAnalysisComplete'),
        description: `${t('diseaseScan.detected')}: ${analysis.disease} with ${analysis.confidence}% confidence`,
        variant: analysis.severity === 'High' ? "destructive" : "default"
      });
    } catch (error) {
      console.error('Error analyzing disease:', error);
      throw error;
    }
  };

  const analyzeSoilImage = async (imageData: string) => {
    try {
      // Use Gemini AI to analyze the soil
      const analysis = await analyzeSoil(imageData);
      
      setSoilResult({
        soilType: analysis.soilType,
        fertility: analysis.fertility,
        phLevel: analysis.phLevel,
        recommendations: analysis.recommendations,
        suitableCrops: analysis.suitableCrops,
        imageSrc: imageData,
        confidenceScore: analysis.confidenceScore,
        nutrients: analysis.nutrients,
        properties: analysis.properties
      });
      
      toast({
        title: t('soilAnalysis.soilAnalysisComplete'),
        description: `${t('soilAnalysis.soilType')}: ${analysis.soilType}, ${t('soilAnalysis.fertility')}: ${analysis.fertility}`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error analyzing soil:', error);
      throw error;
    }
  };

  const handlePestDetection = async (imageData: string) => {
    setIsAnalyzing(true);
    
    try {
      // Use Gemini AI to analyze pesticide needs
      const analysis = await analyzePestImage(imageData, i18n.language);
      
      setPesticideResult({
        pestType: analysis.pestType,
        pesticideRecommendations: analysis.pesticideRecommendations,
        organicAlternatives: analysis.organicAlternatives,
        preventionTips: analysis.preventionTips,
        severity: analysis.severity,
        imageSrc: imageData,
        confidence: 75 // Add a default confidence value
      });
      
      toast({
        title: t('pestAnalysis.pestAnalysisComplete'),
        description: `${t('pestAnalysis.detected')}: ${analysis.pestType}, ${t('pestAnalysis.severity')}: ${analysis.severity}`,
        variant: analysis.severity === 'High' ? "destructive" : "default"
      });
    } catch (error) {
      console.error('Error analyzing pest image:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Low':
        return 'text-yellow-500';
      case 'Medium':
        return 'text-orange-500';
      case 'High':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getFertilityColor = (fertility: string) => {
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

  const handleTabChange = (value: string) => {
    setActiveTab(value as AnalysisType);
  };

  const renderUploadSection = () => {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-4 border border-dashed border-gray-300 rounded-lg">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
          {activeTab === 'disease' && <Leaf className="h-8 w-8 text-agri-green" />}
          {activeTab === 'soil' && <Leaf className="h-8 w-8 text-agri-soil" />}
          {activeTab === 'pesticide' && <AlertTriangle className="h-8 w-8 text-amber-500" />}
        </div>
        <p className="text-center text-sm text-gray-500">
          {t('diseaseScan.uploadMessage')}
        </p>
        
        <div className="flex flex-wrap gap-2 justify-center">
          <label htmlFor="image-upload">
            <div className="relative inline-block">
              <Button className="bg-agri-green hover:bg-agri-green/90" disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('diseaseScan.analyzingWithAI')}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('diseaseScan.uploadImage')}
                  </>
                )}
              </Button>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleImageUpload}
                disabled={isAnalyzing}
              />
            </div>
          </label>

          <label htmlFor="camera-capture" className="relative inline-block">
            <div className="relative inline-block">
              <Button className="bg-agri-blue hover:bg-agri-blue/90" disabled={isAnalyzing}>
                <Camera className="mr-2 h-4 w-4" />
                {t('diseaseScan.takePhoto')}
              </Button>
              <input
                id="camera-capture"
                type="file"
                accept="image/*"
                capture="environment"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                onChange={handleImageUpload}
                disabled={isAnalyzing}
              />
            </div>
          </label>
        </div>
      </div>
    );
  };

  const renderDiseaseResult = () => {
    if (!detectionResult) return null;
    
    // Function to get severity color with better contrast
    const getSeverityIndicator = (severity: string) => {
      const colors = {
        'Low': 'bg-emerald-500 border-emerald-600',
        'Medium': 'bg-amber-500 border-amber-600',
        'High': 'bg-red-500 border-red-600'
      };
      
      const icons = {
        'Low': '●',
        'Medium': '●●',
        'High': '●●●'
      };
      
      return (
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${colors[severity as keyof typeof colors]}`}></div>
          <span className={`text-sm font-medium ${
            severity === 'Low' ? 'text-emerald-700' : 
            severity === 'Medium' ? 'text-amber-700' : 
            'text-red-700'
          }`}>
            {severity} Severity
          </span>
        </div>
      );
    };
    
    // Function to determine if confidence is low
    const hasLowConfidence = (): boolean => {
      return detectionResult.confidence < 65;
    };
    
    // Function to get confidence level text
    const getConfidenceText = (): string => {
      if (detectionResult.confidence < 50) return t('diseaseAnalysis.veryLowConfidence');
      if (detectionResult.confidence < 65) return t('diseaseAnalysis.lowConfidence'); 
      if (detectionResult.confidence < 85) return t('diseaseAnalysis.moderateConfidence');
      return t('diseaseAnalysis.highConfidence');
    };
    
    // Function to get confidence level color
    const getConfidenceColor = (): string => {
      if (detectionResult.confidence < 50) return 'text-red-600';
      if (detectionResult.confidence < 65) return 'text-orange-600';
      if (detectionResult.confidence < 85) return 'text-yellow-600';
      return 'text-green-600';
    };
    
    return (
      <div className="space-y-6">
        {/* Disease header with confidence indicator */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border border-orange-100">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-shrink-0 relative overflow-hidden w-full md:w-24 h-24 rounded-lg border border-orange-200">
              <img 
                src={detectionResult.imageSrc ?? ''} 
                alt={detectionResult.disease}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={`h-5 w-5 ${getSeverityColor(detectionResult.severity)}`} />
                <h3 className="font-semibold text-lg text-slate-800">{detectionResult.disease}</h3>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center mb-2">
                {getSeverityIndicator(detectionResult.severity)}
                <div className="flex items-center gap-1">
                  <div className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    {detectionResult.confidence}% Confidence
                  </div>
                  <span className={`text-xs font-medium ${getConfidenceColor()}`}>
                    ({getConfidenceText()})
                  </span>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                <div 
                  className={`h-full rounded-full ${
                    detectionResult.confidence > 85 ? 'bg-green-500' : 
                    detectionResult.confidence > 70 ? 'bg-lime-500' : 
                    detectionResult.confidence > 55 ? 'bg-yellow-500' : 
                    'bg-orange-500'
                  }`}
                  style={{ width: `${detectionResult.confidence}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Warning for low confidence results */}
        {hasLowConfidence() && (
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <div className="flex items-start">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium text-yellow-700">{t('diseaseAnalysis.limitedConfidence')}</h5>
                <p className="text-xs text-yellow-600">{t('diseaseAnalysis.considerConsultingExpert')}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Treatment and details section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center">
              <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-green-700 mr-2">
                <span className="text-xs">1</span>
              </div>
              Recommended Treatment
            </h4>
            <div className="bg-green-50 p-3 rounded-md border border-green-100">
              <p className="text-sm text-slate-700 whitespace-pre-line max-h-40 overflow-y-auto">{detectionResult.treatment}</p>
            </div>
          </div>
          
          {detectionResult.details && (
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center">
                <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 mr-2">
                  <span className="text-xs">2</span>
                </div>
                Disease Details
              </h4>
              <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                <p className="text-sm text-slate-700 whitespace-pre-line max-h-40 overflow-y-auto">{detectionResult.details}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Image section */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          <div className="aspect-w-16 aspect-h-9 bg-gray-100">
            <img 
              src={detectionResult.imageSrc ?? ''} 
              alt="Full plant image" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        
        <div className="flex justify-center mt-4">
          <Button 
            variant="outline" 
            onClick={() => setDetectionResult(null)}
            className="px-6"
          >
            {t('diseaseScan.scanAnotherImage')}
          </Button>
        </div>
      </div>
    );
  };

  const renderSoilResult = () => {
    if (!soilResult) return null;
    
    // Helper function to get color for nutrient bars
    const getNutrientColor = (value: number) => {
      if (value < 10) return 'bg-red-400';
      if (value < 25) return 'bg-orange-400';
      if (value < 50) return 'bg-yellow-400';
      return 'bg-green-500';
    };
    
    // Helper function to get soil texture icon
    const getSoilTextureIcon = (texture: string) => {
      switch(texture.toLowerCase()) {
        case 'sandy':
          return <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                   <div className="h-6 w-6 rounded-full border-2 border-yellow-600 flex items-center justify-center">
                     <div className="h-3 w-3 rounded-full bg-yellow-600"></div>
                   </div>
                 </div>;
        case 'silty':
          return <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                   <div className="h-7 w-7 rounded-md border-2 border-amber-700"></div>
                 </div>;
        case 'clay':
          return <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-800">
                   <div className="h-6 w-6 bg-orange-800 rounded-full"></div>
                 </div>;
        case 'loamy':
          return <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                   <div className="h-6 w-6 rounded-md border-2 border-dashed border-green-700"></div>
                 </div>;
        default:
          return <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                   <div className="h-6 w-6 rounded-md border border-dashed border-blue-600 flex items-center justify-center">
                     <span className="text-xs font-medium">?</span>
                   </div>
                 </div>;
      }
    };
    
    // Helper function to get confidence level display
    const getConfidenceDisplay = (): string => {
      if (soilResult.confidenceScore === undefined) return '';
      
      if (soilResult.confidenceScore <= 3) return t('soilAnalysis.lowConfidence');
      if (soilResult.confidenceScore <= 7) return t('soilAnalysis.moderateConfidence');
      return t('soilAnalysis.highConfidence');
    };
    
    // Helper function to get confidence color
    const getConfidenceColor = (): string => {
      if (soilResult.confidenceScore === undefined) return 'text-gray-500';
      
      if (soilResult.confidenceScore <= 3) return 'text-red-500';
      if (soilResult.confidenceScore <= 7) return 'text-yellow-500';
      return 'text-green-500';
    };
    
    // Check if analysis has low confidence
    const hasLowConfidence = (): boolean => {
      if (soilResult.confidenceScore !== undefined) {
        return soilResult.confidenceScore < 5;
      }
      
      return soilResult.soilType.toLowerCase().includes('low confidence');
    };
    
    // Check if soil type is undetermined
    const isUndetermined = soilResult.soilType === 'Unable to determine' || soilResult.soilType === 'Unknown';
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <img 
              src={soilResult.imageSrc ?? ''} 
              alt="Soil image" 
              className="w-full h-auto object-cover"
            />
          </div>
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              {soilResult.properties?.texture && getSoilTextureIcon(soilResult.properties.texture)}
              <div>
                <h3 className="font-semibold text-lg text-slate-800">
                  {isUndetermined ? 'Soil Analysis Available' : soilResult.soilType}
                </h3>
                <div className="flex items-center gap-2">
                  <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    soilResult.fertility === 'High' ? 'bg-green-100 text-green-800' :
                    soilResult.fertility === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {soilResult.fertility} Fertility
                  </div>
                  <div className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    pH {soilResult.phLevel}
                  </div>
                </div>
                
                {/* Add confidence level display */}
                {soilResult.confidenceScore !== undefined && (
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-gray-500 mr-1">{t('soilAnalysis.confidence')}:</span>
                    <span className={`text-xs font-medium ${getConfidenceColor()}`}>
                      {getConfidenceDisplay()}
                    </span>
                  </div>
                )}
                
                {isUndetermined && (
                  <p className="mt-2 text-sm text-blue-700">
                    <span className="inline-flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2h.01a1 1 0 000-2H9z" clipRule="evenodd" />
                      </svg>
                      Nutrient data available without specific soil classification
                    </span>
                  </p>
                )}
              </div>
            </div>
            
            {/* Low confidence warning */}
            {hasLowConfidence() && (
              <div className="mb-4 bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <div className="flex items-start">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-medium text-yellow-700">{t('soilAnalysis.limitedConfidence')}</h5>
                    <p className="text-xs text-yellow-600">{t('soilAnalysis.labTestingRecommended')}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Nutrient gauge chart - visible only if nutrients data exists */}
            {soilResult.nutrients && (
              <div className="mb-4 bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                <h4 className="text-sm font-medium text-slate-700 mb-3">Soil Nutrient Profile</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Nitrogen</span>
                      <span className="font-medium">{soilResult.nutrients.nitrogen}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getNutrientColor(soilResult.nutrients.nitrogen)}`} 
                        style={{ width: `${Math.min(100, soilResult.nutrients.nitrogen * 3)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Phosphorus</span>
                      <span className="font-medium">{soilResult.nutrients.phosphorus}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getNutrientColor(soilResult.nutrients.phosphorus)}`} 
                        style={{ width: `${Math.min(100, soilResult.nutrients.phosphorus * 3)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Potassium</span>
                      <span className="font-medium">{soilResult.nutrients.potassium}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getNutrientColor(soilResult.nutrients.potassium)}`} 
                        style={{ width: `${Math.min(100, soilResult.nutrients.potassium * 3)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Add sulfur content */}
                  {soilResult.nutrients.sulfur !== undefined && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Sulfur</span>
                        <span className="font-medium">{soilResult.nutrients.sulfur}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getNutrientColor(soilResult.nutrients.sulfur)}`} 
                          style={{ width: `${Math.min(100, soilResult.nutrients.sulfur * 3)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Organic Matter</span>
                      <span className="font-medium">{soilResult.nutrients.organicMatter}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getNutrientColor(soilResult.nutrients.organicMatter)}`} 
                        style={{ width: `${Math.min(100, soilResult.nutrients.organicMatter * 3)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Soil properties section */}
            {soilResult.properties && (
              <div className="mb-4 bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Soil Properties</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-blue-50 rounded-md">
                    <span className="block text-xs text-gray-500">pH Level</span>
                    <div className="flex items-center mt-1">
                      <span className="font-medium">{soilResult.properties.ph.toFixed(1)}</span>
                      <div className="ml-2 h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            soilResult.properties.ph < 6 ? 'bg-orange-500' : 
                            soilResult.properties.ph > 8 ? 'bg-purple-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, (soilResult.properties.ph / 14) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2 bg-green-50 rounded-md">
                    <span className="block text-xs text-gray-500">Texture</span>
                    <span className="font-medium">{soilResult.properties.texture}</span>
                  </div>
                  
                  <div className="p-2 bg-blue-50 rounded-md">
                    <span className="block text-xs text-gray-500">Water Retention</span>
                    <div className="flex items-center mt-1">
                      <span className="font-medium">{soilResult.properties.waterRetention}%</span>
                      <div className="ml-2 h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${soilResult.properties.waterRetention}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2 bg-green-50 rounded-md">
                    <span className="block text-xs text-gray-500">Drainage</span>
                    <span className="font-medium">{soilResult.properties.drainage}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Recommendations section */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center">
              <Droplets className="h-4 w-4 text-blue-500 mr-2" />
              {t('soilAnalysis.recommendations')}
            </h4>
            <p className="text-sm text-slate-600 max-h-32 overflow-y-auto">{soilResult.recommendations}</p>
          </div>
          
          {/* Suitable crops section */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center">
              <Leaf className="h-4 w-4 text-green-500 mr-2" />
              {t('soilAnalysis.suitableCrops')}
            </h4>
            <div className="flex flex-wrap gap-2 mt-1">
              {soilResult.suitableCrops.map((crop, index) => (
                <span 
                  key={index} 
                  className="px-3 py-1.5 bg-green-50 text-green-800 rounded-full text-xs font-medium shadow-sm border border-green-100"
                >
                  {crop}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mt-4">
          <Button 
            variant="outline" 
            onClick={() => setSoilResult(null)}
            className="px-6"
          >
            {t('soilAnalysis.analyzeAnotherSoilSample')}
          </Button>
        </div>
      </div>
    );
  };

  const renderPesticideResult = () => {
    if (!pesticideResult) return null;
    
    // Helper function for pest severity badges
    const getSeverityBadge = (severity: string) => {
      const severityStyles = {
        'Low': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'Medium': 'bg-orange-100 text-orange-800 border-orange-200',
        'High': 'bg-red-100 text-red-800 border-red-200'
      };
      
      const severityIcons = {
        'Low': '●',
        'Medium': '●●',
        'High': '●●●'
      };
      
      return (
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${severityStyles[severity as keyof typeof severityStyles]}`}>
          <span className="mr-1">{severityIcons[severity as keyof typeof severityIcons]}</span>
          {severity} Severity
        </div>
      );
    };

    // Function to get confidence display
    const getConfidenceText = (): string => {
      const confidence = pesticideResult.confidence || 75;
      if (confidence < 60) return t('pestAnalysis.lowConfidence');
      if (confidence < 80) return t('pestAnalysis.moderateConfidence');
      return t('pestAnalysis.highConfidence');
    };
    
    // Function to determine if confidence is low
    const hasLowConfidence = (): boolean => {
      return (pesticideResult.confidence || 75) < 65;
    };
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <img 
              src={pesticideResult.imageSrc ?? ''} 
              alt="Crop pest image" 
              className="w-full h-auto object-cover"
            />
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-red-50 rounded-lg p-4 border border-amber-100">
            <div className="flex items-center mb-4">
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 mr-3">
                <Bug className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-800">{pesticideResult.pestType}</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {getSeverityBadge(pesticideResult.severity)}
                  {pesticideResult.confidence && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                      {getConfidenceText()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Add a warning for low confidence results */}
            {hasLowConfidence() && (
              <div className="mb-4 p-2 bg-yellow-50 rounded border border-yellow-200">
                <div className="flex items-start">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-xs text-yellow-700">{t('pestAnalysis.considerConsultingExpert')}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-4 flex items-center">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${
                    pesticideResult.severity === 'Low' ? 'bg-yellow-500' :
                    pesticideResult.severity === 'Medium' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}
                  style={{ 
                    width: `${
                      pesticideResult.severity === 'Low' ? '33' :
                      pesticideResult.severity === 'Medium' ? '66' : '100'
                    }%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recommended pesticides card */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center">
              <div className="h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 mr-2">
                <span className="text-xs">1</span>
              </div>
              {t('pestAnalysis.recommendedPesticides')}
            </h4>
            <div className="bg-amber-50 p-3 rounded-md border border-amber-100">
              <p className="text-sm text-slate-700 max-h-24 overflow-y-auto">{pesticideResult.pesticideRecommendations}</p>
            </div>
          </div>
          
          {/* Organic alternatives card */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center">
              <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-green-800 mr-2">
                <span className="text-xs">2</span>
              </div>
              {t('pestAnalysis.organicAlternatives')}
            </h4>
            <div className="bg-green-50 p-3 rounded-md border border-green-100">
              <p className="text-sm text-slate-700 max-h-24 overflow-y-auto">{pesticideResult.organicAlternatives}</p>
            </div>
          </div>
          
          {/* Prevention tips card */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center">
              <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 mr-2">
                <span className="text-xs">3</span>
              </div>
              {t('pestAnalysis.preventionTips')}
            </h4>
            <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
              <p className="text-sm text-slate-700 max-h-24 overflow-y-auto">{pesticideResult.preventionTips}</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mt-4">
          <Button 
            variant="outline" 
            onClick={() => setPesticideResult(null)}
            className="px-6"
          >
            {t('pestAnalysis.analyzeAnotherImage')}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-agri-green">
          <div className="flex items-center">
            <Scan className="mr-2 h-5 w-5" />
            AgroLab and AI Crop Analysis
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue="disease" 
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full mb-4"
        >
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger 
              value="disease" 
              onClick={() => resetResults()}
              className="data-[state=active]:bg-agri-tomato/80 data-[state=active]:text-white"
            >
              <Leaf className="h-4 w-4 mr-2" />
              {t('diseaseScan.title')}
            </TabsTrigger>
            <TabsTrigger 
              value="soil" 
              onClick={() => resetResults()}
              className="data-[state=active]:bg-agri-soil/80 data-[state=active]:text-white"
            >
              <Droplets className="h-4 w-4 mr-2" />
              {t('soilAnalysis')}
            </TabsTrigger>
            <TabsTrigger 
              value="pesticide" 
              onClick={() => resetResults()}
              className="data-[state=active]:bg-agri-amber/80 data-[state=active]:text-white"
            >
              <Bug className="h-4 w-4 mr-2" />
              {t('pestAnalysis')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="disease">
            {!detectionResult ? renderUploadSection() : renderDiseaseResult()}
          </TabsContent>
          
          <TabsContent value="soil">
            {!soilResult ? renderUploadSection() : renderSoilResult()}
          </TabsContent>
          
          <TabsContent value="pesticide">
            {!pesticideResult ? renderUploadSection() : renderPesticideResult()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DiseaseDetectionCard;
