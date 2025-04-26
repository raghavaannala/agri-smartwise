import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scan } from 'lucide-react';
import DiseaseDetectionCard from '@/components/dashboard/DiseaseDetectionCard';
import { useTranslation } from 'react-i18next';

const DiseaseScan = () => {
  const { t } = useTranslation();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<'disease' | 'soil' | 'pesticide'>('disease');

  useEffect(() => {
    const storedImage = sessionStorage.getItem('uploadedImage');
    const storedAnalysisType = sessionStorage.getItem('analysisType') as 'disease' | 'soil' | 'pesticide' | null;
    
    if (storedImage) {
      setUploadedImage(storedImage);
      sessionStorage.removeItem('uploadedImage');
    }
    
    if (storedAnalysisType) {
      setAnalysisType(storedAnalysisType);
      sessionStorage.removeItem('analysisType');
    }
  }, []);

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold text-agri-darkGreen mb-6">
          {t('diseaseScan.title')}
        </h1>
        
        <div className="grid grid-cols-1 gap-6">
          <DiseaseDetectionCard 
            initialImage={uploadedImage}
            initialAnalysisType={analysisType}
          />
          
          <Card className="mb-6">
            <CardHeader className="bg-agri-tomato/10">
              <CardTitle className="text-agri-darkGreen flex items-center">
                <Scan className="mr-2 h-5 w-5" />
                {t('diseaseScan.howItWorks.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-700 mb-4">
                {t('diseaseScan.howItWorks.description')}
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                <li>{t('diseaseScan.howItWorks.step1')}</li>
                <li>{t('diseaseScan.howItWorks.step2')}</li>
                <li>{t('diseaseScan.howItWorks.step3')}</li>
                <li>{t('diseaseScan.howItWorks.step4')}</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default DiseaseScan;
