
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, TrendingUp, TrendingDown, LineChart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, LineChart as ReChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

type Market = {
  name: string;
  todayPrice: number;
  yesterdayPrice: number;
  change: number;
};

type Crop = {
  id: string;
  name: string;
  markets: Market[];
  priceHistory: {
    date: string;
    price: number;
  }[];
};

const crops: Crop[] = [
  {
    id: 'rice',
    name: 'Rice',
    markets: [
      { name: 'Tirupati Mandi', todayPrice: 2450, yesterdayPrice: 2400, change: 2.08 },
      { name: 'Nellore Market', todayPrice: 2500, yesterdayPrice: 2480, change: 0.81 },
      { name: 'Chittoor Mandi', todayPrice: 2380, yesterdayPrice: 2420, change: -1.65 },
    ],
    priceHistory: [
      { date: '1 Jul', price: 2400 },
      { date: '8 Jul', price: 2420 },
      { date: '15 Jul', price: 2380 },
      { date: '22 Jul', price: 2400 },
      { date: '29 Jul', price: 2450 },
      { date: '5 Aug', price: 2460 },
      { date: 'Today', price: 2450 },
    ],
  },
  {
    id: 'tomato',
    name: 'Tomato',
    markets: [
      { name: 'Tirupati Mandi', todayPrice: 3850, yesterdayPrice: 3500, change: 10.0 },
      { name: 'Nellore Market', todayPrice: 4000, yesterdayPrice: 3700, change: 8.11 },
      { name: 'Chittoor Mandi', todayPrice: 3750, yesterdayPrice: 3600, change: 4.17 },
    ],
    priceHistory: [
      { date: '1 Jul', price: 2200 },
      { date: '8 Jul', price: 2600 },
      { date: '15 Jul', price: 3000 },
      { date: '22 Jul', price: 3400 },
      { date: '29 Jul', price: 3500 },
      { date: '5 Aug', price: 3700 },
      { date: 'Today', price: 3850 },
    ],
  },
  {
    id: 'groundnut',
    name: 'Groundnut',
    markets: [
      { name: 'Tirupati Mandi', todayPrice: 5200, yesterdayPrice: 5250, change: -0.95 },
      { name: 'Nellore Market', todayPrice: 5300, yesterdayPrice: 5350, change: -0.93 },
      { name: 'Chittoor Mandi', todayPrice: 5150, yesterdayPrice: 5100, change: 0.98 },
    ],
    priceHistory: [
      { date: '1 Jul', price: 5300 },
      { date: '8 Jul', price: 5250 },
      { date: '15 Jul', price: 5200 },
      { date: '22 Jul', price: 5150 },
      { date: '29 Jul', price: 5180 },
      { date: '5 Aug', price: 5200 },
      { date: 'Today', price: 5200 },
    ],
  },
];

const formatPrice = (price: number) => {
  return `₹${price.toLocaleString('en-IN')}`;
};

const MarketPriceCard = () => {
  const [selectedCrop, setSelectedCrop] = useState<Crop>(crops[0]);

  const handleCropChange = (value: string) => {
    const crop = crops.find(c => c.id === value);
    if (crop) {
      setSelectedCrop(crop);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-agri-green">
          <div className="flex items-center">
            <BarChart2 className="mr-2 h-5 w-5" />
            Market Price Analysis
          </div>
        </CardTitle>
        <div className="w-40">
          <Select 
            value={selectedCrop.id} 
            onValueChange={handleCropChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select crop" />
            </SelectTrigger>
            <SelectContent>
              {crops.map((crop) => (
                <SelectItem key={crop.id} value={crop.id}>{crop.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedCrop.markets.map((market) => (
              <div 
                key={market.name} 
                className="bg-white border rounded-lg p-3 shadow-sm"
              >
                <div className="text-sm text-gray-500 mb-1">{market.name}</div>
                <div className="flex justify-between items-center">
                  <div className="text-lg font-bold">{formatPrice(market.todayPrice)}</div>
                  <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                    market.change > 0 
                      ? 'text-green-700 bg-green-100' 
                      : market.change < 0 
                        ? 'text-red-700 bg-red-100' 
                        : 'text-gray-700 bg-gray-100'
                  }`}>
                    {market.change > 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : market.change < 0 ? (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    ) : (
                      <LineChart className="h-3 w-3 mr-1" />
                    )}
                    {market.change > 0 ? '+' : ''}{market.change}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2 text-gray-700 flex items-center">
            <LineChart className="h-4 w-4 mr-1 text-agri-green" />
            Price Trend - Last 30 Days
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ReChart
                data={selectedCrop.priceHistory}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  padding={{ left: 10, right: 10 }} 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  domain={['dataMin - 100', 'dataMax + 100']}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  formatter={(value) => [`₹${value}`, 'Price']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#4CAF50" 
                  strokeWidth={2}
                  activeDot={{ r: 6 }} 
                  name={`${selectedCrop.name} Price`}
                />
              </ReChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketPriceCard;
