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
  nutrients?: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    organicMatter: number;
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

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('diseaseScan.fileTooLarge'),
        description: t('diseaseScan.fileTooLargeDescription'),
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = reader.result as string;
      await handleAnalyzeImage(imageData, activeTab);
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
        imageSrc: imageData
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

          <label htmlFor="camera-capture">
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
                className="absolute inset-0 opacity-0 cursor-pointer"
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
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <img 
            src={detectionResult.imageSrc ?? ''} 
            alt="Plant image" 
            className="w-full h-auto"
          />
        </div>
        <div>
          <div className="flex items-center mb-3">
            <AlertTriangle className={`h-5 w-5 ${getSeverityColor(detectionResult.severity)} mr-2`} />
            <h3 className="font-semibold text-lg">{detectionResult.disease}</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">{t('diseaseScan.confidence')}</span>
              <div className="flex items-center">
                <div className="h-2 bg-gray-200 rounded-full flex-1 mr-2">
                  <div 
                    className="h-full bg-agri-green rounded-full" 
                    style={{ inlineSize: `${detectionResult.confidence}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium">{detectionResult.confidence}%</span>
              </div>
            </div>
            
            <div>
              <span className="text-sm text-gray-500">{t('diseaseScan.severity')}</span>
              <div className="flex items-center">
                <span className={`font-medium ${getSeverityColor(detectionResult.severity)}`}>
                  {detectionResult.severity}
                  {detectionResult.severity !== 'Low' ? ' ⚠️' : ''}
                </span>
              </div>
            </div>
            
            <div>
              <span className="text-sm text-gray-500">{t('diseaseScan.recommendedTreatment')}</span>
              <p className="text-sm">{detectionResult.treatment}</p>
            </div>
            
            {detectionResult.details && (
              <div>
                <span className="text-sm text-gray-500">{t('diseaseScan.additionalDetails')}</span>
                <p className="text-sm">{detectionResult.details}</p>
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setDetectionResult(null)}
              className="w-full"
            >
              {t('diseaseScan.scanAnotherImage')}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderSoilResult = () => {
    if (!soilResult) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <img 
            src={soilResult.imageSrc ?? ''} 
            alt="Soil image" 
            className="w-full h-auto"
          />
        </div>
        <div>
          <div className="flex items-center mb-3">
            <Droplets className="h-5 w-5 text-agri-blue mr-2" />
            <h3 className="font-semibold text-lg">{soilResult.soilType}</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">{t('soilAnalysis.fertility')}</span>
              <div className="flex items-center">
                <span className={`font-medium ${getFertilityColor(soilResult.fertility)}`}>
                  {soilResult.fertility}
                </span>
              </div>
            </div>
            
            <div>
              <span className="text-sm text-gray-500">{t('soilAnalysis.phLevel')}</span>
              <p className="text-sm font-medium">{soilResult.phLevel}</p>
            </div>
            
            <div>
              <span className="text-sm text-gray-500">{t('soilAnalysis.recommendations')}</span>
              <p className="text-sm">{soilResult.recommendations}</p>
            </div>
            
            <div>
              <span className="text-sm text-gray-500">{t('soilAnalysis.suitableCrops')}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {soilResult.suitableCrops.map((crop, index) => (
                  <span 
                    key={index} 
                    className="px-2 py-1 bg-agri-freshGreen/10 text-agri-freshGreen rounded-full text-xs"
                  >
                    {crop}
                  </span>
                ))}
              </div>
            </div>
            
            {soilResult.nutrients && (
              <div>
                <span className="text-sm text-gray-500">{t('soilAnalysis.nutrients')}</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span 
                    className="px-2 py-1 bg-agri-freshGreen/10 text-agri-freshGreen rounded-full text-xs"
                  >
                    {t('soilAnalysis.nitrogen')}: {soilResult.nutrients.nitrogen}%
                  </span>
                  <span 
                    className="px-2 py-1 bg-agri-freshGreen/10 text-agri-freshGreen rounded-full text-xs"
                  >
                    {t('soilAnalysis.phosphorus')}: {soilResult.nutrients.phosphorus}%
                  </span>
                  <span 
                    className="px-2 py-1 bg-agri-freshGreen/10 text-agri-freshGreen rounded-full text-xs"
                  >
                    {t('soilAnalysis.potassium')}: {soilResult.nutrients.potassium}%
                  </span>
                  <span 
                    className="px-2 py-1 bg-agri-freshGreen/10 text-agri-freshGreen rounded-full text-xs"
                  >
                    {t('soilAnalysis.organicMatter')}: {soilResult.nutrients.organicMatter}%
                  </span>
                </div>
              </div>
            )}
            
            {soilResult.properties && (
              <div>
                <span className="text-sm text-gray-500">{t('soilAnalysis.properties')}</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span 
                    className="px-2 py-1 bg-agri-freshGreen/10 text-agri-freshGreen rounded-full text-xs"
                  >
                    {t('soilAnalysis.ph')}: {soilResult.properties.ph}
                  </span>
                  <span 
                    className="px-2 py-1 bg-agri-freshGreen/10 text-agri-freshGreen rounded-full text-xs"
                  >
                    {t('soilAnalysis.texture')}: {soilResult.properties.texture}
                  </span>
                  <span 
                    className="px-2 py-1 bg-agri-freshGreen/10 text-agri-freshGreen rounded-full text-xs"
                  >
                    {t('soilAnalysis.waterRetention')}: {soilResult.properties.waterRetention}%
                  </span>
                  <span 
                    className="px-2 py-1 bg-agri-freshGreen/10 text-agri-freshGreen rounded-full text-xs"
                  >
                    {t('soilAnalysis.drainage')}: {soilResult.properties.drainage}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setSoilResult(null)}
              className="w-full"
            >
              {t('soilAnalysis.analyzeAnotherSoilSample')}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderPesticideResult = () => {
    if (!pesticideResult) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <img 
            src={pesticideResult.imageSrc ?? ''} 
            alt="Crop pest image" 
            className="w-full h-auto"
          />
        </div>
        <div>
          <div className="flex items-center mb-3">
            <Bug className={`h-5 w-5 ${getSeverityColor(pesticideResult.severity)} mr-2`} />
            <h3 className="font-semibold text-lg">{pesticideResult.pestType}</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">{t('pestAnalysis.severity')}</span>
              <div className="flex items-center">
                <span className={`font-medium ${getSeverityColor(pesticideResult.severity)}`}>
                  {pesticideResult.severity}
                  {pesticideResult.severity !== 'Low' ? ' ⚠️' : ''}
                </span>
              </div>
            </div>
            
            <div>
              <span className="text-sm text-gray-500">{t('pestAnalysis.recommendedPesticides')}</span>
              <p className="text-sm">{pesticideResult.pesticideRecommendations}</p>
            </div>
            
            <div>
              <span className="text-sm text-gray-500">{t('pestAnalysis.organicAlternatives')}</span>
              <p className="text-sm">{pesticideResult.organicAlternatives}</p>
            </div>
            
            <div>
              <span className="text-sm text-gray-500">{t('pestAnalysis.preventionTips')}</span>
              <p className="text-sm">{pesticideResult.preventionTips}</p>
            </div>
          </div>
          
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setPesticideResult(null)}
              className="w-full"
            >
              {t('pestAnalysis.analyzeAnotherImage')}
            </Button>
          </div>
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
            {t('diseaseScan and AiCropAnalysis')}
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
