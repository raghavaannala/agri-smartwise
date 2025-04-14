
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, DropletIcon, CoinsIcon, PercentIcon } from 'lucide-react';

type CropRecommendation = {
  name: string;
  confidence: number;
  expectedYield: string;
  roi: string;
  waterNeeds: 'Low' | 'Medium' | 'High';
  imagePath: string;
};

const cropRecommendations: CropRecommendation[] = [
  {
    name: 'Maize',
    confidence: 92,
    expectedYield: '45 q/ha',
    roi: '140%',
    waterNeeds: 'Medium',
    imagePath: 'https://img.freepik.com/free-photo/closeup-fresh-corn-cob_53876-32179.jpg?size=626&ext=jpg&ga=GA1.1.1291604040.1670274528&semt=sph',
  },
  {
    name: 'Tomato',
    confidence: 85,
    expectedYield: '280 q/ha',
    roi: '125%',
    waterNeeds: 'High',
    imagePath: 'https://img.freepik.com/free-photo/tomatoes_144627-15415.jpg?size=626&ext=jpg&ga=GA1.1.1291604040.1670274528&semt=sph',
  },
  {
    name: 'Cotton',
    confidence: 78,
    expectedYield: '20 q/ha',
    roi: '90%',
    waterNeeds: 'Low',
    imagePath: 'https://img.freepik.com/free-photo/cotton-flower-branch-fluffy-cotton-bolls_116317-3688.jpg?size=626&ext=jpg&ga=GA1.1.1291604040.1670274528&semt=sph',
  },
];

const getWaterNeedsColor = (needs: string) => {
  switch (needs) {
    case 'Low':
      return 'text-green-500';
    case 'Medium':
      return 'text-yellow-500';
    case 'High':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
};

const CropRecommendationCard = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-agri-green">
          <div className="flex items-center">
            <Leaf className="mr-2 h-5 w-5" />
            AI Crop Recommendations
          </div>
        </CardTitle>
        <span className="text-xs bg-agri-blue/10 text-agri-blue px-2 py-1 rounded-full">
          Based on soil analysis
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cropRecommendations.map((crop) => (
            <div 
              key={crop.name} 
              className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-32 overflow-hidden">
                <img 
                  src={crop.imagePath} 
                  alt={crop.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">{crop.name}</h3>
                  <div className="flex items-center bg-agri-green/10 px-2 py-0.5 rounded-full">
                    <PercentIcon className="h-3 w-3 text-agri-green mr-1" />
                    <span className="text-xs font-medium text-agri-green">{crop.confidence}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <div className="flex flex-col items-center">
                    <span className="text-gray-500">Yield</span>
                    <div className="flex items-center mt-1">
                      <span className="font-medium">{crop.expectedYield}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-gray-500">ROI</span>
                    <div className="flex items-center mt-1">
                      <CoinsIcon className="h-3 w-3 text-yellow-500 mr-1" />
                      <span className="font-medium">{crop.roi}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-gray-500">Water</span>
                    <div className="flex items-center mt-1">
                      <DropletIcon className={`h-3 w-3 mr-1 ${getWaterNeedsColor(crop.waterNeeds)}`} />
                      <span className={`font-medium ${getWaterNeedsColor(crop.waterNeeds)}`}>
                        {crop.waterNeeds}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CropRecommendationCard;
