import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, TrendingUp, TrendingDown, Search, Filter, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';

const Market = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const marketData = [
    { name: 'Rice', price: '2,350', change: 2.4, trend: 'up', lastUpdated: 'Today at 8:30 AM', volume: '1000', market: 'Delhi', unit: 'q' },
    { name: 'Cotton', price: '6,700', change: 1.2, trend: 'up', lastUpdated: 'Today at 8:30 AM', volume: '500', market: 'Mumbai', unit: 'q' },
    { name: 'Wheat', price: '2,050', change: -0.8, trend: 'down', lastUpdated: 'Today at 8:30 AM', volume: '2000', market: 'Chennai', unit: 'q' },
    { name: 'Sugarcane', price: '350', change: 0.5, trend: 'up', lastUpdated: 'Today at 8:30 AM', volume: '1500', market: 'Kolkata', unit: 'q' }
  ];

  const getPriceChangeColor = (priceChange: number) => {
    if (priceChange > 0) {
      return 'bg-green-50';
    } else if (priceChange < 0) {
      return 'bg-red-50';
    } else {
      return 'bg-gray-50';
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold text-agri-darkGreen mb-2">
          {t('market.title')}
        </h1>
        <p className="text-gray-600 mb-6">
          {t('market.subtitle')}
        </p>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              className="pl-10" 
              placeholder={t('market.searchCommodities')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter size={18} />
            {t('market.filter')}
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowUpDown size={18} />
            {t('market.sort')}
          </Button>
        </div>
        
        <Tabs defaultValue="all" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="all" onClick={() => setActiveTab('all')}>
              {t('market.allCommodities')}
            </TabsTrigger>
            <TabsTrigger value="grains" onClick={() => setActiveTab('grains')}>
              {t('market.grains')}
            </TabsTrigger>
            <TabsTrigger value="vegetables" onClick={() => setActiveTab('vegetables')}>
              {t('market.vegetables')}
            </TabsTrigger>
            <TabsTrigger value="fruits" onClick={() => setActiveTab('fruits')}>
              {t('market.fruits')}
            </TabsTrigger>
            <TabsTrigger value="livestock" onClick={() => setActiveTab('livestock')}>
              {t('market.livestock')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketData
              .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((item, index) => (
                <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow duration-300">
                  <CardHeader className={`pb-2 ${getPriceChangeColor(item.change)}`}>
                    <CardTitle className="flex justify-between items-center text-lg">
                      <span>{item.name}</span>
                      <span className="text-base font-normal">₹{item.price}/{item.unit}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        {item.change > 0 ? (
                          <TrendingUp className="text-green-500 mr-1" size={18} />
                        ) : (
                          <TrendingDown className="text-red-500 mr-1" size={18} />
                        )}
                        <span className={`text-sm ${item.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {item.change > 0 ? '+' : ''}{item.change}%
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {t('market.lastUpdated')}: {item.lastUpdated}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('market.volume')}</span>
                        <span>{item.volume} {t('market.tons')}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-500">{t('market.market')}</span>
                        <span>{item.market}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
          
          {/* Other tab contents would be similar */}
          <TabsContent value="grains">
            <div className="text-center py-8">
              <BarChart2 className="h-12 w-12 text-agri-amber/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                {t('market.grainsMarketData')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('market.filteringByCategory')}
              </p>
            </div>
          </TabsContent>
          
          {/* Repeat for other categories */}
        </Tabs>
        
        <Card className="mb-6">
          <CardHeader className="bg-agri-amber/10">
            <CardTitle className="text-agri-darkGreen flex items-center">
              <BarChart2 className="mr-2 h-5 w-5" />
              {t('market.marketTrends')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-600 mb-4">
              {t('market.trendsDescription')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-green-50">
                <CardContent className="p-4">
                  <h3 className="font-medium text-green-700 mb-2 flex items-center">
                    <TrendingUp className="mr-1 h-4 w-4" />
                    {t('market.topGainers')}
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span>Tomatoes</span>
                      <span className="text-green-600">+12.5%</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Potatoes</span>
                      <span className="text-green-600">+8.2%</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Onions</span>
                      <span className="text-green-600">+6.7%</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="bg-red-50">
                <CardContent className="p-4">
                  <h3 className="font-medium text-red-700 mb-2 flex items-center">
                    <TrendingDown className="mr-1 h-4 w-4" />
                    {t('market.topLosers')}
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span>Wheat</span>
                      <span className="text-red-600">-5.3%</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Corn</span>
                      <span className="text-red-600">-3.8%</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Soybeans</span>
                      <span className="text-red-600">-2.1%</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <h3 className="font-medium text-blue-700 mb-2">
                    {t('market.forecast')}
                  </h3>
                  <p className="text-sm text-gray-700">
                    {t('market.forecastDescription')}
                  </p>
                  <Button variant="outline" className="w-full mt-3 text-xs">
                    {t('market.viewDetailedForecast')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Market;
