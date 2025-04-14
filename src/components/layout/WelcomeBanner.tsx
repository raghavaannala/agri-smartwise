
import React from 'react';
import { CloudSun } from 'lucide-react';

type WelcomeBannerProps = {
  userName: string;
  temperature: number;
  weatherCondition: string;
  location: string;
};

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  userName,
  temperature,
  weatherCondition,
  location
}) => {
  return (
    <div className="bg-gradient-to-r from-agri-green/90 to-agri-blue/90 rounded-lg p-4 md:p-6 text-white mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold mb-1">
            Welcome back, {userName}!
          </h1>
          <p className="text-white/90">
            Your farm is looking good today. Here's your personalized dashboard.
          </p>
        </div>
        <div className="flex items-center mt-3 md:mt-0 bg-white/10 px-4 py-2 rounded-lg">
          <CloudSun className="h-6 w-6 mr-2" />
          <div>
            <div className="font-medium">{temperature}°C | {weatherCondition}</div>
            <div className="text-xs text-white/80">{location}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
