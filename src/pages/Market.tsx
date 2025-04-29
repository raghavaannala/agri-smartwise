import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart2, TrendingUp, TrendingDown, Search, Filter, ArrowUpDown, Map, Calendar, AlertCircle, Leaf, LineChart, BarChart, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, LineChart as ReChart, Line, BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const Market = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [selectedCommodity, setSelectedCommodity] = useState('rice');
  const [showInsights, setShowInsights] = useState(false);

  const marketData = [
    { name: 'Rice', price: '2,350', change: 2.4, trend: 'up', lastUpdated: 'Today at 8:30 AM', volume: '1000', market: 'Delhi', unit: 'q' },
    { name: 'Cotton', price: '6,700', change: 1.2, trend: 'up', lastUpdated: 'Today at 8:30 AM', volume: '500', market: 'Mumbai', unit: 'q' },
    { name: 'Wheat', price: '2,050', change: -0.8, trend: 'down', lastUpdated: 'Today at 8:30 AM', volume: '2000', market: 'Chennai', unit: 'q' },
    { name: 'Sugarcane', price: '350', change: 0.5, trend: 'up', lastUpdated: 'Today at 8:30 AM', volume: '1500', market: 'Kolkata', unit: 'q' },
    { name: 'Tomatoes', price: '1,250', change: 12.5, trend: 'up', lastUpdated: 'Today at 9:15 AM', volume: '800', market: 'Bengaluru', unit: 'q' },
    { name: 'Potatoes', price: '1,450', change: 8.2, trend: 'up', lastUpdated: 'Today at 9:30 AM', volume: '1200', market: 'Hyderabad', unit: 'q' },
    { name: 'Onions', price: '1,850', change: 6.7, trend: 'up', lastUpdated: 'Today at 9:45 AM', volume: '900', market: 'Pune', unit: 'q' },
    { name: 'Corn', price: '1,950', change: -3.8, trend: 'down', lastUpdated: 'Today at 8:45 AM', volume: '1800', market: 'Ahmedabad', unit: 'q' },
    { name: 'Soybeans', price: '3,950', change: -2.1, trend: 'down', lastUpdated: 'Today at 8:50 AM', volume: '700', market: 'Jaipur', unit: 'q' }
  ];

  // Price comparison data for multiple markets
  const priceComparisonData = [
    { date: 'June', delhi: 2200, mumbai: 2300, chennai: 2250, kolkata: 2280, bengaluru: 2320 },
    { date: 'July', delhi: 2250, mumbai: 2280, chennai: 2300, kolkata: 2350, bengaluru: 2400 },
    { date: 'Aug', delhi: 2300, mumbai: 2350, chennai: 2320, kolkata: 2400, bengaluru: 2450 },
    { date: 'Sept', delhi: 2350, mumbai: 2400, chennai: 2370, kolkata: 2450, bengaluru: 2500 },
    { date: 'Oct', delhi: 2380, mumbai: 2450, chennai: 2400, kolkata: 2500, bengaluru: 2550 },
    { date: 'Nov', delhi: 2400, mumbai: 2500, chennai: 2450, kolkata: 2550, bengaluru: 2600 },
    { date: 'Dec', delhi: 2350, mumbai: 2450, chennai: 2400, kolkata: 2500, bengaluru: 2580 }
  ];

  // Mandi/market locations data
  const mandiLocations = [
    { name: 'Delhi Agricultural Market', location: 'New Delhi', distance: '5 km', products: ['Rice', 'Wheat', 'Corn'], contact: '+91 11-2345-6789' },
    { name: 'Mumbai Wholesale Market', location: 'Mumbai', distance: '12 km', products: ['Cotton', 'Sugarcane', 'Vegetables'], contact: '+91 22-3456-7890' },
    { name: 'Chennai Farmers Market', location: 'Chennai', distance: '8 km', products: ['Rice', 'Vegetables', 'Fruits'], contact: '+91 44-2345-6789' },
    { name: 'Kolkata Agricultural Hub', location: 'Kolkata', distance: '10 km', products: ['Rice', 'Wheat', 'Jute'], contact: '+91 33-2345-6789' },
    { name: 'Bengaluru Fresh Market', location: 'Bengaluru', distance: '7 km', products: ['Vegetables', 'Fruits', 'Coffee'], contact: '+91 80-2345-6789' }
  ];

  // Seasonal crop prediction data
  const cropPredictions = [
    { crop: 'Rice', season: 'Kharif', suitability: 95, expectedPrice: '↑ +10%', markets: ['Delhi', 'Chennai', 'Kolkata'] },
    { crop: 'Wheat', season: 'Rabi', suitability: 80, expectedPrice: '↓ -5%', markets: ['Delhi', 'Mumbai', 'Pune'] },
    { crop: 'Cotton', season: 'Kharif', suitability: 85, expectedPrice: '↑ +5%', markets: ['Mumbai', 'Ahmedabad', 'Jaipur'] },
    { crop: 'Sugarcane', season: 'Annual', suitability: 75, expectedPrice: '→ Stable', markets: ['Mumbai', 'Chennai', 'Hyderabad'] }
  ];

  // Market insights data
  const marketInsights = [
    {
      title: 'Sugar Prices Expected to Rise',
      description: 'Due to reduced sugarcane production in Maharashtra and UP, sugar prices expected to rise by 8-10% in the next two months.',
      date: '2 days ago',
      impact: 'high'
    },
    {
      title: 'Rice Exports Increased by 15%',
      description: 'Government reports show rice exports have increased by 15% compared to last year, strengthening domestic prices.',
      date: '5 days ago',
      impact: 'medium'
    },
    {
      title: 'New MSP Announced for Kharif Crops',
      description: 'The government has announced new Minimum Support Prices for Kharif crops with an average increase of 5%.',
      date: '1 week ago',
      impact: 'high'
    }
  ];

  useEffect(() => {
    // Auto-show insights after a delay
    const timer = setTimeout(() => {
      setShowInsights(true);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  const getPriceChangeColor = (priceChange: number) => {
    if (priceChange > 0) {
      return 'bg-green-50';
    } else if (priceChange < 0) {
      return 'bg-red-50';
    } else {
      return 'bg-gray-50';
    }
  };

  const getImpactBadge = (impact) => {
    switch (impact) {
      case 'high':
        return <Badge variant="outline" className="bg-red-50 text-red-700">High Impact</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700">Medium Impact</Badge>;
      case 'low':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Low Impact</Badge>;
      default:
        return null;
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
        
        {/* Market Insights Alert - auto-shown */}
        {showInsights && (
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-800">Important Market Updates</AlertTitle>
            <AlertDescription className="text-amber-700">
              New MSP announced for Kharif crops with an average increase of 5%. Sugar prices expected to rise due to reduced production.
              <Button variant="link" className="p-0 h-auto text-amber-900 underline" onClick={() => document.getElementById('marketInsights')?.scrollIntoView({ behavior: 'smooth' })}>
                View all insights
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
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
        
        {/* ADDITION: Price Comparison Chart */}
        <Card className="mb-6">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-agri-darkGreen flex items-center">
              <LineChart className="mr-2 h-5 w-5" />
              Price Comparison Across Markets
            </CardTitle>
            <CardDescription>
              Compare commodity prices across different markets to find the best selling opportunities
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-gray-500 mb-1 block">Select Commodity</label>
                <Select defaultValue="rice">
                  <SelectTrigger>
                    <SelectValue placeholder="Select commodity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rice">Rice</SelectItem>
                    <SelectItem value="wheat">Wheat</SelectItem>
                    <SelectItem value="cotton">Cotton</SelectItem>
                    <SelectItem value="sugarcane">Sugarcane</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Timeframe</label>
                <div className="flex border rounded-md overflow-hidden">
                  {['1m', '3m', '6m', '1y'].map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTimeframe(time)}
                      className={`px-3 py-1 text-sm ${
                        selectedTimeframe === time
                          ? 'bg-green-100 text-green-800'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ReChart
                  data={priceComparisonData}
                  margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `₹${value}`} />
                  <Tooltip formatter={(value) => [`₹${value}`, '']} />
                  <Legend />
                  <Line type="monotone" dataKey="delhi" stroke="#4CAF50" name="Delhi" strokeWidth={2} />
                  <Line type="monotone" dataKey="mumbai" stroke="#2196F3" name="Mumbai" strokeWidth={2} />
                  <Line type="monotone" dataKey="chennai" stroke="#FF9800" name="Chennai" strokeWidth={2} />
                  <Line type="monotone" dataKey="kolkata" stroke="#9C27B0" name="Kolkata" strokeWidth={2} />
                  <Line type="monotone" dataKey="bengaluru" stroke="#F44336" name="Bengaluru" strokeWidth={2} />
                </ReChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ADDITION: Market Trends Section */}
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
        
        {/* ADDITION: Market Insights Section */}
        <Card className="mb-6" id="marketInsights">
          <CardHeader className="bg-amber-50">
            <CardTitle className="text-agri-darkGreen flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Market Insights & News
            </CardTitle>
            <CardDescription>
              Latest market developments that may affect crop prices and demand
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {marketInsights.map((insight, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{insight.title}</CardTitle>
                      {getImpactBadge(insight.impact)}
                    </div>
                    <CardDescription>{insight.date}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <p className="text-sm text-gray-700">{insight.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button className="w-full mt-4" variant="outline">
              View All Market Insights
            </Button>
          </CardContent>
        </Card>
        
        {/* ADDITION: Crop Predictions Section */}
        <Card className="mb-6">
          <CardHeader className="bg-agri-green/10">
            <CardTitle className="text-agri-darkGreen flex items-center">
              <Leaf className="mr-2 h-5 w-5" />
              Seasonal Crop Predictions
            </CardTitle>
            <CardDescription>
              Crop recommendations based on current market trends and seasonal factors
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cropPredictions.map((crop, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="pb-2 bg-green-50">
                    <CardTitle className="text-base flex justify-between">
                      <span>{crop.crop}</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {crop.season}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium mb-1">Suitability Score</div>
                        <div className="flex items-center">
                          <Progress value={crop.suitability} className="h-2 flex-1" />
                          <span className="ml-2 text-sm font-medium">{crop.suitability}%</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Expected Price Movement</span>
                        <span className={`font-medium ${
                          crop.expectedPrice.includes('+') 
                            ? 'text-green-600' 
                            : crop.expectedPrice.includes('-') 
                              ? 'text-red-600' 
                              : 'text-gray-600'
                        }`}>
                          {crop.expectedPrice}
                        </span>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-700 mb-1">Recommended Markets</div>
                        <div className="flex flex-wrap gap-1">
                          {crop.markets.map((market, idx) => (
                            <Badge key={idx} variant="outline" className="bg-gray-50">
                              {market}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* ADDITION: Mandi Locator */}
        <Card className="mb-6">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-agri-darkGreen flex items-center">
              <Map className="mr-2 h-5 w-5" />
              Nearby Mandis & Markets
            </CardTitle>
            <CardDescription>
              Find agricultural markets and mandis near your location
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input 
                  className="pl-10" 
                  placeholder="Search markets by name or location"
                />
              </div>
              <Button variant="outline" className="ml-4 whitespace-nowrap">
                <MapPin className="mr-2 h-4 w-4" />
                Use Current Location
              </Button>
            </div>
            
            <div className="space-y-4">
              {mandiLocations.map((mandi, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-base mb-1">{mandi.name}</h3>
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          <span>{mandi.location}</span>
                          <span className="mx-2">•</span>
                          <span>{mandi.distance}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                        {mandi.products.map((product, idx) => (
                          <Badge key={idx} variant="outline" className="bg-gray-50">
                            {product}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="text-xs">
                          Contact
                        </Button>
                        <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700">
                          Get Directions
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Button className="w-full mt-4" variant="outline">
              View All Markets
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Market;
