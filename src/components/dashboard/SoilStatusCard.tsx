
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Flask } from 'lucide-react';

type SoilParameter = {
  name: string;
  value: number;
  maxValue: number;
  status: 'Low' | 'Medium' | 'Optimal' | 'High';
  color: string;
};

const soilParameters: SoilParameter[] = [
  { 
    name: 'pH', 
    value: 6.5, 
    maxValue: 14, 
    status: 'Optimal', 
    color: 'bg-green-500'
  },
  { 
    name: 'Moisture', 
    value: 28, 
    maxValue: 100, 
    status: 'Low', 
    color: 'bg-yellow-500'
  },
  { 
    name: 'Nitrogen', 
    value: 45, 
    maxValue: 100, 
    status: 'Medium', 
    color: 'bg-yellow-500'
  },
  { 
    name: 'Phosphorus', 
    value: 70, 
    maxValue: 100, 
    status: 'Optimal', 
    color: 'bg-green-500'
  },
  { 
    name: 'Potassium', 
    value: 60, 
    maxValue: 100, 
    status: 'Medium', 
    color: 'bg-yellow-500'
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Low':
      return 'text-red-500';
    case 'Medium':
      return 'text-yellow-500';
    case 'Optimal':
      return 'text-green-500';
    case 'High':
      return 'text-purple-500';
    default:
      return 'text-gray-500';
  }
};

const SoilStatusCard = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-agri-green">
          <div className="flex items-center">
            <Flask className="mr-2 h-5 w-5" />
            Soil Health Status
          </div>
        </CardTitle>
        <span className="text-xs bg-agri-green/10 text-agri-green px-2 py-1 rounded-full">
          Last updated: Today
        </span>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {soilParameters.map((param) => (
            <div key={param.name} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{param.name}</span>
                <div className="flex items-center">
                  <span className="text-sm font-medium">
                    {param.name === 'pH' ? param.value : `${param.value}%`}
                  </span>
                  <span className={`ml-2 text-xs ${getStatusColor(param.status)}`}>
                    {param.status}
                    {param.status === 'Low' || param.status === 'Medium' ? ' ⚠️' : ''}
                  </span>
                </div>
              </div>
              <Progress value={(param.value / param.maxValue) * 100} className={param.color} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SoilStatusCard;
