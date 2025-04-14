
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scan, Upload, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type DetectionResult = {
  disease: string;
  confidence: number;
  treatment: string;
  severity: 'Low' | 'Medium' | 'High';
  imageSrc: string | null;
};

const DiseaseDetectionCard = () => {
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setIsAnalyzing(true);
      
      // Simulate AI analysis with a delay
      setTimeout(() => {
        setDetectionResult({
          disease: 'Early Blight',
          confidence: 87,
          treatment: 'Apply copper-based fungicide every 7-10 days. Remove infected leaves and ensure proper spacing for airflow.',
          severity: 'Medium',
          imageSrc: reader.result as string,
        });
        setIsAnalyzing(false);
      }, 2000);
    };
    reader.readAsDataURL(file);
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-agri-green">
          <div className="flex items-center">
            <Scan className="mr-2 h-5 w-5" />
            Disease Detection
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!detectionResult ? (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <Upload className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 mb-4 text-center">
              Upload a photo of your plant leaf to detect diseases
            </p>
            <label htmlFor="leaf-upload">
              <div className="relative inline-block">
                <Button className="bg-agri-green hover:bg-agri-green/90">
                  {isAnalyzing ? 'Analyzing...' : 'Upload Image'}
                </Button>
                <input
                  id="leaf-upload"
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleImageUpload}
                />
              </div>
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <img 
                src={detectionResult.imageSrc ?? ''} 
                alt="Plant leaf" 
                className="w-full h-auto"
              />
            </div>
            <div>
              <div className="flex items-center mb-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                <h3 className="font-semibold text-lg">{detectionResult.disease} Detected</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Confidence</span>
                  <div className="flex items-center">
                    <div className="h-2 bg-gray-200 rounded-full flex-1 mr-2">
                      <div 
                        className="h-full bg-agri-green rounded-full" 
                        style={{ width: `${detectionResult.confidence}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium">{detectionResult.confidence}%</span>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">Severity</span>
                  <div className="flex items-center">
                    <span className={`font-medium ${getSeverityColor(detectionResult.severity)}`}>
                      {detectionResult.severity}
                      {detectionResult.severity !== 'Low' ? ' ⚠️' : ''}
                    </span>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">Recommended Treatment</span>
                  <p className="text-sm">{detectionResult.treatment}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setDetectionResult(null)}
                  className="w-full"
                >
                  Scan Another Image
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiseaseDetectionCard;
