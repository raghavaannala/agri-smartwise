
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import WelcomeBanner from '@/components/layout/WelcomeBanner';
import SoilStatusCard from '@/components/dashboard/SoilStatusCard';
import CropRecommendationCard from '@/components/dashboard/CropRecommendationCard';
import DiseaseDetectionCard from '@/components/dashboard/DiseaseDetectionCard';
import MarketPriceCard from '@/components/dashboard/MarketPriceCard';
import WeatherForecastCard from '@/components/dashboard/WeatherForecastCard';

const Index = () => {
  return (
    <MainLayout>
      <WelcomeBanner 
        userName="Ramesh Kumar"
        temperature={32}
        weatherCondition="Sunny"
        location="Tirupati, Andhra Pradesh"
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SoilStatusCard />
        <CropRecommendationCard />
      </div>
      
      <div className="mb-6">
        <DiseaseDetectionCard />
      </div>
      
      <div className="mb-6">
        <MarketPriceCard />
      </div>
      
      <div className="mb-6">
        <WeatherForecastCard />
      </div>
    </MainLayout>
  );
};

export default Index;
