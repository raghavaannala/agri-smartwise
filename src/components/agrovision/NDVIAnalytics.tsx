import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Minus, LineChart, BarChart, AlertTriangle, Calendar, Loader } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FarmNdviData, NdviDataPoint } from '@/services/ndviService';
import { useTranslation } from 'react-i18next';

// Add CustomArea interface
interface CustomArea {
  id: string;
  name: string;
  polygon: [number, number][];
  ndviValue: number | null;
  isAnalyzing: boolean;
  area?: number; // Area in acres
}

interface NdviAnalyticsProps {
  ndviData: FarmNdviData | null;
  isLoading: boolean;
  selectedFieldId?: string | null;
  customAreas?: CustomArea[];
  selectedCustomAreaId?: string | null;
}

const NdviAnalytics: React.FC<NdviAnalyticsProps> = ({ 
  ndviData, 
  isLoading, 
  selectedFieldId: propSelectedFieldId,
  customAreas = [],
  selectedCustomAreaId
}) => {
  const { t } = useTranslation();
  const [selectedFieldId, setSelectedFieldId] = useState<string | 'all' | 'custom'>('all');
  const [timeRange, setTimeRange] = useState<'1w' | '1m' | '3m'>('1m');
  
  // Reset selected field when ndviData changes or when prop changes
  useEffect(() => {
    console.log("NDVIAnalytics props changed:", { 
      propSelectedFieldId, 
      selectedCustomAreaId, 
      customAreas: customAreas.length,
      currentValue: selectedFieldId
    });
    
    if (selectedCustomAreaId) {
      // Prioritize custom areas
      console.log("Setting selectedFieldId to custom area:", selectedCustomAreaId);
      setSelectedFieldId(selectedCustomAreaId);
    } else if (propSelectedFieldId) {
      console.log("Setting selectedFieldId to prop value:", propSelectedFieldId);
      setSelectedFieldId(propSelectedFieldId);
    } else if (customAreas.length > 0) {
      // Default to the first custom area if available
      console.log("Setting selectedFieldId to first custom area:", customAreas[0].id);
      setSelectedFieldId(customAreas[0].id);
    } else {
      console.log("Setting selectedFieldId to 'all'");
      setSelectedFieldId('all');
    }
  }, [ndviData, propSelectedFieldId, selectedCustomAreaId, customAreas]);
  
  if (!ndviData && customAreas.length === 0) {
    return (
      <Card className="h-[400px] flex items-center justify-center">
        <div className="text-center p-8">
          <LineChart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-slate-700 mb-2">{t('agroVision.noAnalysisYet', 'No NDVI Data Available')}</h3>
          <p className="text-slate-500 max-w-md">
            {t('agroVision.drawFields', 'Draw an area on the map to analyze')}
          </p>
        </div>
      </Card>
    );
  }
  
  // Get data for selected field or average across all fields
  const getSelectedFieldData = () => {
    // If a custom area is selected, return its data
    if (selectedFieldId === 'custom' && selectedCustomAreaId) {
      const customArea = customAreas.find(a => a.id === selectedCustomAreaId);
      if (customArea && !customArea.isAnalyzing && customArea.ndviValue !== null) {
        return {
          name: customArea.name,
          currentNdvi: customArea.ndviValue,
          healthStatus: getHealthStatus(customArea.ndviValue).label.toLowerCase() as 'poor' | 'moderate' | 'good' | 'excellent',
          area: customArea.area || 0
        };
      }
    }

    // Regular field data
    if (!ndviData) {
      return {
        name: t('agroVision.noData', 'No Data'),
        currentNdvi: 0,
        healthStatus: 'poor'
      };
    }
    
    if (selectedFieldId === 'all') {
      return {
        name: t('agroVision.allFields', 'All Fields'),
        currentNdvi: ndviData.averageNdvi,
        healthStatus: getHealthStatus(ndviData.averageNdvi).label.toLowerCase() as 'poor' | 'moderate' | 'good' | 'excellent'
      };
    } else {
      const field = ndviData.fields.find(f => f.id === selectedFieldId);
      return field || {
        name: t('agroVision.allFields', 'All Fields'),
        currentNdvi: ndviData.averageNdvi,
        healthStatus: getHealthStatus(ndviData.averageNdvi).label.toLowerCase() as 'poor' | 'moderate' | 'good' | 'excellent'
      };
    }
  };
  
  // Filter time series data based on selected time range
  const getFilteredTimeSeries = (): NdviDataPoint[] => {
    if (!ndviData || !ndviData.fields || ndviData.fields.length === 0) {
      return [];
    }
    
    if (selectedFieldId === 'all') {
      // For all fields, average the NDVI values for each date
      const dates = ndviData.fields[0]?.ndviTimeSeries.map(item => item.date) || [];
      return dates.map(date => {
        const pointsForDate = ndviData.fields.map(field => 
          field.ndviTimeSeries.find(point => point.date === date)
        ).filter(Boolean) as NdviDataPoint[];
        
        const avgValue = pointsForDate.reduce((sum, point) => sum + point.value, 0) / pointsForDate.length;
        return {
          date,
          value: Math.round(avgValue * 100) / 100,
          health: getHealthStatus(avgValue).label.toLowerCase() as 'poor' | 'moderate' | 'good' | 'excellent'
        };
      });
    } else {
      const field = ndviData.fields.find(f => f.id === selectedFieldId);
      return field?.ndviTimeSeries || [];
    }
  };
  
  // Get time-filtered data points
  const getTimeFilteredData = (): NdviDataPoint[] => {
    const allData = getFilteredTimeSeries();
    const now = new Date();
    
    switch (timeRange) {
      case '1w':
        // Last 7 days
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return allData.filter(item => new Date(item.date) >= weekAgo);
      case '1m':
        // Last 30 days
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        return allData.filter(item => new Date(item.date) >= monthAgo);
      case '3m':
        // Last 90 days
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setDate(now.getDate() - 90);
        return allData.filter(item => new Date(item.date) >= threeMonthsAgo);
      default:
        return allData;
    }
  };
  
  // Calculate average NDVI for the selected time period
  const calculateAverageNdvi = (): number => {
    const filteredData = getTimeFilteredData();
    if (filteredData.length === 0) return 0;
    
    const sum = filteredData.reduce((total, point) => total + point.value, 0);
    return Math.round((sum / filteredData.length) * 100) / 100;
  };
  
  // Calculate trend (increasing, decreasing, or stable)
  const calculateTrend = (): 'up' | 'down' | 'stable' => {
    const filteredData = getTimeFilteredData();
    if (filteredData.length < 2) return 'stable';
    
    // Get the first and last data points for comparison
    const firstPoint = filteredData[0];
    const lastPoint = filteredData[filteredData.length - 1];
    
    const difference = lastPoint.value - firstPoint.value;
    if (difference > 0.05) return 'up';
    if (difference < -0.05) return 'down';
    return 'stable';
  };
  
  // Determine health status based on NDVI value
  const getHealthStatus = (ndvi: number) => {
    if (ndvi > 0.7) return { 
      label: 'Excellent', 
      color: 'bg-green-100 text-green-800',
      description: t('agroVision.ndviExcellent', 'Vegetation is very healthy and dense')
    };
    if (ndvi > 0.5) return { 
      label: 'Good', 
      color: 'bg-green-50 text-green-600',
      description: t('agroVision.ndviGood', 'Vegetation is healthy with good density')
    };
    if (ndvi > 0.3) return { 
      label: 'Moderate', 
      color: 'bg-yellow-100 text-yellow-800',
      description: t('agroVision.ndviModerate', 'Vegetation shows moderate growth')
    };
    if (ndvi > 0.1) return { 
      label: 'Poor', 
      color: 'bg-amber-100 text-amber-800',
      description: t('agroVision.ndviPoor', 'Vegetation is sparse or stressed')
    };
    return { 
      label: 'Very Poor', 
      color: 'bg-red-100 text-red-800',
      description: t('agroVision.ndviVeryPoor', 'Little to no vegetation detected')
    };
  };
  
  // Render a simple line chart for NDVI time series
  const renderLineChart = () => {
    const data = getTimeFilteredData();
    if (data.length === 0) return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-slate-500">{t('agroVision.noDataAvailable', 'No data available for selected time range')}</p>
      </div>
    );
    
    // Chart dimensions
    const width = 700;
    const height = 250;
    const paddingX = 40;
    const paddingY = 20;
    const chartWidth = width - (paddingX * 2);
    const chartHeight = height - (paddingY * 2);
    
    // Find min/max values for scaling
    const minValue = Math.max(0, Math.min(...data.map(d => d.value)) - 0.1);
    const maxValue = Math.min(1, Math.max(...data.map(d => d.value)) + 0.1);
    
    // Create coordinates for the line path
    const points = data.map((point, index) => {
      const x = paddingX + (index / (data.length - 1)) * chartWidth;
      const y = height - (paddingY + ((point.value - minValue) / (maxValue - minValue)) * chartHeight);
      return `${x},${y}`;
    });
    
    return (
      <div className="overflow-x-auto">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto">
          {/* X and Y axis */}
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#d1d5db" strokeWidth="1" />
          <line x1={paddingX} y1={paddingY} x2={paddingX} y2={height - paddingY} stroke="#d1d5db" strokeWidth="1" />
          
          {/* NDVI value labels */}
          <text x={paddingX - 30} y={height - paddingY} className="text-xs" fill="#6b7280" dominantBaseline="middle" textAnchor="start">0.0</text>
          <text x={paddingX - 30} y={paddingY + (chartHeight / 2)} className="text-xs" fill="#6b7280" dominantBaseline="middle" textAnchor="start">0.5</text>
          <text x={paddingX - 30} y={paddingY} className="text-xs" fill="#6b7280" dominantBaseline="middle" textAnchor="start">1.0</text>
          
          {/* Date labels - show first and last */}
          <text x={paddingX} y={height - paddingY + 15} className="text-xs" fill="#6b7280" dominantBaseline="hanging" textAnchor="middle">{data[0]?.date}</text>
          <text x={width - paddingX} y={height - paddingY + 15} className="text-xs" fill="#6b7280" dominantBaseline="hanging" textAnchor="middle">{data[data.length - 1]?.date}</text>
          
          {/* NDVI line */}
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke="#16a34a"
            strokeWidth="2"
          />
          
          {/* Data points */}
          {data.map((point, index) => {
            const x = paddingX + (index / (data.length - 1)) * chartWidth;
            const y = height - (paddingY + ((point.value - minValue) / (maxValue - minValue)) * chartHeight);
            const color = 
              point.value > 0.7 ? "#166534" :
              point.value > 0.5 ? "#16a34a" :
              point.value > 0.3 ? "#eab308" :
              point.value > 0.1 ? "#f59e0b" : "#ef4444";
            
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={4}
                fill={color}
                stroke="white"
                strokeWidth="1"
              />
            );
          })}
        </svg>
      </div>
    );
  };
  
  const selectedField = getSelectedFieldData() || { name: 'No Selection', currentNdvi: 0, healthStatus: 'poor' };
  const averageNdvi = calculateAverageNdvi();
  const trend = calculateTrend();
  const healthStatus = getHealthStatus(averageNdvi || 0);
  const timeSeriesData = getTimeFilteredData();
  
  // Add a component to render custom area analytics
  const renderCustomAreaAnalytics = () => {
    if (customAreas.length === 0) {
      return (
        <div className="p-6 text-center">
          <p className="text-slate-600">
            No custom areas drawn yet. Use the "Draw Area" button to create areas for analysis.
          </p>
        </div>
      );
    }

    // Try to find the selected custom area
    const selectedArea = customAreas.find(area => area.id === selectedFieldId);
    
    if (!selectedArea) {
      return (
        <div className="p-6 text-center">
          <p className="text-slate-600">
            Please select a custom area from the dropdown to view analytics.
          </p>
        </div>
      );
    }

    // Show detailed analytics for the selected custom area
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Custom Area Analysis: {selectedArea.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-1">Area Size:</h4>
                <p className="font-medium">{selectedArea.area?.toFixed(2)} acres</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-1">NDVI Value:</h4>
                <p className="font-medium">{selectedArea.ndviValue?.toFixed(2) || 'Analyzing...'}</p>
              </div>
              
              {selectedArea.ndviValue && (
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Health Status:</h4>
                  <Badge className={getHealthStatusStyle(selectedArea.ndviValue)}>
                    {getHealthStatusLabel(selectedArea.ndviValue)}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Vegetation Health Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedArea.isAnalyzing ? (
              <div className="flex items-center justify-center p-6">
                <Loader className="h-8 w-8 animate-spin text-amber-500 mr-3" />
                <p>Analyzing vegetation health...</p>
              </div>
            ) : selectedArea.ndviValue ? (
              <div>
                <div className="mb-4">
                  <h4 className="font-medium mb-2">NDVI Analysis:</h4>
                  <p className="text-slate-700 mb-2">
                    {getNdviDescription(selectedArea.ndviValue)}
                  </p>
                  
                  <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden mt-4">
                    <div 
                      className={`h-full ${getNdviBarColor(selectedArea.ndviValue)}`}
                      style={{ width: `${Math.min(100, selectedArea.ndviValue * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Poor (0.0)</span>
                    <span>Moderate (0.3)</span>
                    <span>Good (0.6)</span>
                    <span>Excellent (0.8+)</span>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h4 className="font-medium mb-2">Recommendations:</h4>
                  <ul className="list-disc pl-5 space-y-2 text-slate-700">
                    {selectedArea.ndviValue > 0.7 ? (
                      <>
                        <li>The selected area shows excellent vegetation health.</li>
                        <li>Continue with current practices and prepare for optimal yield.</li>
                      </>
                    ) : selectedArea.ndviValue > 0.5 ? (
                      <>
                        <li>The selected area shows good health.</li>
                        <li>Consider minor adjustments to irrigation to optimize growth.</li>
                      </>
                    ) : selectedArea.ndviValue > 0.3 ? (
                      <>
                        <li>Moderate vegetation health detected.</li>
                        <li>Consider reviewing soil nutrition and moisture levels.</li>
                      </>
                    ) : (
                      <>
                        <li>Low vegetation health detected.</li>
                        <li>Immediate action recommended - check irrigation, nutrient levels, and possible pest issues.</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-slate-600">No analysis data available for this area yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Helper functions for the custom area analytics
  const getHealthStatusLabel = (ndvi: number): string => {
    if (ndvi > 0.7) return 'Excellent';
    if (ndvi > 0.5) return 'Good';
    if (ndvi > 0.3) return 'Moderate';
    return 'Poor';
  };

  const getHealthStatusStyle = (ndvi: number): string => {
    if (ndvi > 0.7) return 'bg-green-100 text-green-800';
    if (ndvi > 0.5) return 'bg-green-50 text-green-600';
    if (ndvi > 0.3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-amber-100 text-amber-800';
  };

  const getNdviBarColor = (ndvi: number): string => {
    if (ndvi > 0.7) return 'bg-green-600';
    if (ndvi > 0.5) return 'bg-green-500';
    if (ndvi > 0.3) return 'bg-yellow-500';
    return 'bg-amber-500';
  };

  const getNdviDescription = (ndvi: number): string => {
    if (ndvi > 0.7) return 'The vegetation in this area is very healthy and dense, indicating excellent growing conditions.';
    if (ndvi > 0.5) return 'The vegetation in this area shows good health with decent density. Minor improvements could optimize growth.';
    if (ndvi > 0.3) return 'The vegetation shows moderate growth. There may be some stress factors affecting plant health.';
    return 'The vegetation is sparse or stressed. This area requires attention to improve plant health.';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>{customAreas.length > 0 ? 'Custom Area Analytics' : 'Field Health Analysis'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="w-full sm:w-48">
              <Select 
                value={selectedFieldId ? selectedFieldId.toString() : 'all'} 
                onValueChange={value => setSelectedFieldId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('agroVision.selectField', 'Select Area')} />
                </SelectTrigger>
                <SelectContent>
                  {/* Show custom areas first */}
                  {customAreas.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-bold text-slate-600">
                        Custom Drawn Areas
                      </div>
                      {customAreas.map(area => (
                        <SelectItem 
                          key={area.id} 
                          value={area.id}
                          disabled={area.isAnalyzing || area.ndviValue === null}
                        >
                          {area.name} {area.area ? `(${area.area.toFixed(2)} acres)` : ''}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  
                  {/* Then show regular fields if available */}
                  {ndviData && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-bold text-slate-600 border-t mt-1 pt-2">
                        Farm Fields
                      </div>
                      <SelectItem value="all">{t('agroVision.allFields', 'All Fields')}</SelectItem>
                      {ndviData?.fields.map(field => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center mb-3">
              <div className="text-5xl font-bold text-green-600 mr-3">
                {averageNdvi.toFixed(2)}
              </div>
              {trend === 'up' && <TrendingUp className="h-8 w-8 text-green-600" />}
              {trend === 'down' && <TrendingDown className="h-8 w-8 text-amber-600" />}
              {trend === 'stable' && <Minus className="h-8 w-8 text-blue-600" />}
            </div>
            <Badge className={`px-3 py-1 ${healthStatus.color}`}>
              {healthStatus.label}
            </Badge>
            <p className="mt-4 text-center text-gray-600">{healthStatus.description}</p>
            
            {/* Time range selector */}
            <div className="flex items-center mt-6 space-x-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">{t('agroVision.timeRange', 'Time Range')}:</span>
              <div className="flex border rounded-md overflow-hidden">
                <button 
                  className={`px-3 py-1 text-sm ${timeRange === '1w' ? 'bg-green-100 text-green-700' : 'bg-white text-slate-600'}`}
                  onClick={() => setTimeRange('1w')}
                >
                  1W
                </button>
                <button 
                  className={`px-3 py-1 text-sm border-l ${timeRange === '1m' ? 'bg-green-100 text-green-700' : 'bg-white text-slate-600'}`}
                  onClick={() => setTimeRange('1m')}
                >
                  1M
                </button>
                <button 
                  className={`px-3 py-1 text-sm border-l ${timeRange === '3m' ? 'bg-green-100 text-green-700' : 'bg-white text-slate-600'}`}
                  onClick={() => setTimeRange('3m')}
                >
                  3M
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Show custom area analytics or regular NDVI analytics based on selection */}
      {customAreas.length > 0 && customAreas.some(area => area.id === selectedFieldId) 
        ? renderCustomAreaAnalytics()
        : !ndviData ? (
          <Card className="p-6">
            <div className="text-center">
              <p className="text-slate-600">No NDVI data available. Draw and analyze an area first.</p>
            </div>
          </Card>
        ) : (
          <div>
            <Card>
              <CardHeader>
                <CardTitle>{t('agroVision.fieldSummary', 'Field Summary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-1">{t('agroVision.selectedField', 'Selected Field')}:</h4>
                    <p className="font-medium">{selectedField?.name || 'No field selected'}</p>
                  </div>
                  
                  {selectedFieldId !== 'all' && ndviData && ndviData.fields && ndviData.fields.find(f => f.id === selectedFieldId)?.boundaries?.crop && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-1">{t('cropAdvisor.crop', 'Crop')}:</h4>
                      <p>{ndviData.fields.find(f => f.id === selectedFieldId)?.boundaries.crop}</p>
                    </div>
                  )}
                  
                  {selectedFieldId !== 'all' && ndviData && ndviData.fields && ndviData.fields.find(f => f.id === selectedFieldId)?.boundaries?.area && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-1">{t('agroVision.area', 'Area')}:</h4>
                      <p>{ndviData.fields.find(f => f.id === selectedFieldId)?.boundaries.area} ha</p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-1">{t('agroVision.healthStatus', 'Health Status')}:</h4>
                    <Badge className={healthStatus.color}>
                      {healthStatus.label}
                    </Badge>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-1">{t('agroVision.lastUpdated', 'Last Updated')}:</h4>
                    <p className="text-sm">{ndviData && ndviData.lastUpdated ? new Date(ndviData.lastUpdated).toLocaleString() : '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>{t('agroVision.ndviTimeSeries', 'NDVI Time Series')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="chart">
                  <TabsList className="mb-4">
                    <TabsTrigger value="chart">Chart View</TabsTrigger>
                    <TabsTrigger value="table">Table View</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="chart">
                    <div className="rounded-md border overflow-x-auto">
                      {renderLineChart()}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="table">
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Date</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">NDVI Value</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Status</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Trend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {timeSeriesData.map((item, index) => {
                            const status = getHealthStatus(item.value);
                            const trend = index > 0 
                              ? item.value > timeSeriesData[index - 1].value 
                                ? 'up' 
                                : item.value < timeSeriesData[index - 1].value
                                  ? 'down'
                                  : 'stable'
                              : 'stable';
                            
                            return (
                              <tr key={item.date}>
                                <td className="px-4 py-2 text-sm text-slate-700">{item.date}</td>
                                <td className="px-4 py-2 text-sm font-medium text-slate-900">{item.value.toFixed(2)}</td>
                                <td className="px-4 py-2">
                                  <Badge className={`${status.color}`}>{status.label}</Badge>
                                </td>
                                <td className="px-4 py-2">
                                  {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                                  {trend === 'down' && <TrendingDown className="h-4 w-4 text-amber-600" />}
                                  {trend === 'stable' && <Minus className="h-4 w-4 text-blue-600" />}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>{t('agroVision.recommendations', 'Recommendations')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {averageNdvi > 0.7 ? (
                    <p className="text-slate-700">
                      {t('agroVision.excellentHealthRecommendation', 'The selected field shows excellent vegetation health. Continue with current practices and prepare for optimal yield.')}
                    </p>
                  ) : averageNdvi > 0.5 ? (
                    <p className="text-slate-700">
                      {t('agroVision.goodHealthRecommendation', 'The selected field shows good health. Consider minor adjustments to irrigation to optimize growth.')}
                    </p>
                  ) : averageNdvi > 0.3 ? (
                    <p className="text-slate-700">
                      {t('agroVision.moderateHealthRecommendation', 'Moderate vegetation health detected. Consider reviewing soil nutrition and moisture levels.')}
                    </p>
                  ) : (
                    <p className="text-slate-700">
                      {t('agroVision.poorHealthRecommendation', 'Low vegetation health detected. Immediate action recommended - check irrigation, nutrient levels, and possible pest issues.')}
                    </p>
                  )}
                  
                  <ul className="list-disc pl-5 space-y-2 text-slate-700">
                    {selectedFieldId !== 'all' ? (
                      <>
                        <li>{t('agroVision.specificMonitoring', 'Continue monitoring this field over the next week to track changes')}</li>
                        <li>{t('agroVision.fieldVisit', 'Consider an in-person field visit to verify satellite data findings')}</li>
                      </>
                    ) : (
                      <li>{t('agroVision.selectSpecificField', 'Select a specific field for more detailed recommendations')}</li>
                    )}
                    
                    {trend === 'down' && (
                      <li className="text-amber-700 font-medium">{t('agroVision.downwardTrendWarning', 'Warning: Downward NDVI trend detected. Review recent farming practices and environmental conditions.')}</li>
                    )}
                    
                    {trend === 'up' && (
                      <li className="text-green-700 font-medium">{t('agroVision.upwardTrendPositive', 'Positive: Upward NDVI trend detected. Current practices are having a positive effect.')}</li>
                    )}
                  </ul>
                  
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mt-4">
                    <p className="text-blue-800 font-medium">{t('common.note', 'Note')}:</p>
                    <p className="text-blue-700 text-sm">
                      {t('agroVision.satelliteDataNote', 'These recommendations are based on satellite NDVI analysis. For comprehensive assessment, combine with soil testing and in-field observations.')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }
    </div>
  );
};

export default NdviAnalytics; 