import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scan, AlertCircle, Loader2 } from 'lucide-react';
import DiseaseDetectionCard from '@/components/dashboard/DiseaseDetectionCard';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';

const DiseaseScan = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<'disease' | 'soil' | 'pesticide'>('disease');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Use a short delay to ensure the component is mounted before reading from storage
    const loadImageFromStorage = setTimeout(() => {
      try {
        const storedImage = sessionStorage.getItem('uploadedImage');
        const storedAnalysisType = sessionStorage.getItem('analysisType') as 'disease' | 'soil' | 'pesticide' | null;
        
        if (storedImage) {
          console.log('Fetched image from sessionStorage');
          setUploadedImage(storedImage);
          // Clean up after successful retrieval
          sessionStorage.removeItem('uploadedImage');
        } else {
          console.log('No image found in sessionStorage');
        }
        
        if (storedAnalysisType) {
          setAnalysisType(storedAnalysisType);
          sessionStorage.removeItem('analysisType');
        }
      } catch (error) {
        console.error('Error retrieving from sessionStorage:', error);
        setError(true);
        toast({
          title: "Error loading image",
          description: "There was a problem retrieving your image. Please try uploading again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(loadImageFromStorage);
  }, [toast]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-agri-green mb-4" />
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
          <h2 className="text-xl font-medium mb-2">{t('error')}</h2>
          <p className="text-gray-600 mb-4">{t('errorLoadingImage')}</p>
          <p className="text-sm text-gray-500">{t('pleaseUploadImageAgain')}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Scan className="mr-2 h-6 w-6 text-agri-green" />
              {t('diseaseScan.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DiseaseDetectionCard 
              initialImage={uploadedImage} 
              initialAnalysisType={analysisType} 
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DiseaseScan;
