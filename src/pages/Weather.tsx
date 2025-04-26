import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CloudSun, Sun, Cloud, CloudRain, Wind } from 'lucide-react';

const Weather = () => {
  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold text-agri-darkGreen mb-6">Weather Forecast</h1>
        
        <Card className="mb-6">
          <CardHeader className="bg-agri-lightBlue/10">
            <CardTitle className="text-agri-darkGreen flex items-center">
              <CloudSun className="mr-2 h-5 w-5" />
              Weather Forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between bg-gradient-to-r from-agri-lightBlue/10 to-agri-blue/5 p-4 rounded-xl">
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <h3 className="text-xl font-medium text-gray-700">Tirupati, Andhra Pradesh</h3>
                  <p className="text-sm text-gray-500">Today, {new Date().toLocaleDateString()}</p>
                </div>
                <div className="flex items-center">
                  <Sun className="h-10 w-10 text-agri-yellow mr-3" />
                  <div className="text-center">
                    <span className="text-3xl font-bold text-gray-800">32°C</span>
                    <p className="text-sm text-gray-500">Sunny</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { day: 'Tomorrow', icon: <Cloud className="h-8 w-8 text-agri-blue" />, temp: '30°/26°', desc: 'Partly Cloudy' },
                  { day: 'Wednesday', icon: <CloudRain className="h-8 w-8 text-agri-lightBlue" />, temp: '28°/25°', desc: 'Light Rain' },
                  { day: 'Thursday', icon: <Wind className="h-8 w-8 text-agri-slate" />, temp: '29°/24°', desc: 'Windy' },
                  { day: 'Friday', icon: <Sun className="h-8 w-8 text-agri-yellow" />, temp: '31°/25°', desc: 'Sunny' },
                ].map((day, i) => (
                  <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 text-center">
                    <p className="font-medium text-gray-700">{day.day}</p>
                    <div className="flex justify-center my-2">{day.icon}</div>
                    <p className="font-medium text-gray-800">{day.temp}</p>
                    <p className="text-xs text-gray-500">{day.desc}</p>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Humidity</p>
                  <p className="text-xl font-medium text-gray-800">68%</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Wind</p>
                  <p className="text-xl font-medium text-gray-800">12 km/h</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Precipitation</p>
                  <p className="text-xl font-medium text-gray-800">20%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Weather;
