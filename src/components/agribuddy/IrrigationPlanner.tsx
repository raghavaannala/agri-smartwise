import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Droplets, 
  Calendar, 
  Clock, 
  Thermometer,
  CloudRain,
  Sun,
  AlertTriangle
} from 'lucide-react';
import { CropJourney } from '@/services/agriBuddyService';

interface IrrigationPlannerProps {
  journey: CropJourney;
  farmData: any;
}

const IrrigationPlanner: React.FC<IrrigationPlannerProps> = ({ journey, farmData }) => {
  const getCurrentStageSchedule = () => {
    const currentStage = journey.stages.find(stage => stage.id === journey.currentStage);
    if (!currentStage) return null;
    
    return journey.irrigationPlan.schedule.find(schedule => 
      schedule.stage.toLowerCase().includes(currentStage.name.toLowerCase().split(' ')[0])
    ) || journey.irrigationPlan.schedule[0];
  };

  const currentSchedule = getCurrentStageSchedule();

  return (
    <div className="space-y-6">
      {/* Current Irrigation Schedule */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Current Irrigation Schedule</h2>
              <div className="flex items-center gap-4 text-sm opacity-90">
                <div className="flex items-center gap-1">
                  <Droplets className="h-4 w-4" />
                  Method: {journey.irrigationPlan.method}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Frequency: {currentSchedule?.frequency || 'Variable'}
                </div>
                <div className="flex items-center gap-1">
                  <Thermometer className="h-4 w-4" />
                  Amount: {currentSchedule?.amount || 'Stage-dependent'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <Droplets className="h-16 w-16 opacity-20" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage-wise Schedule */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Stage-wise Irrigation Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {journey.irrigationPlan.schedule.map((schedule, index) => {
              const isCurrentStage = currentSchedule?.stage === schedule.stage;
              
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    isCurrentStage 
                      ? 'bg-blue-50 border-blue-300' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {isCurrentStage && <Droplets className="h-5 w-5 text-blue-600" />}
                      {schedule.stage}
                      {isCurrentStage && (
                        <Badge className="bg-blue-600 text-white">Current</Badge>
                      )}
                    </h3>
                    <div className="text-sm text-gray-600">
                      {schedule.timing}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        <strong>Frequency:</strong> {schedule.frequency}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        <strong>Amount:</strong> {schedule.amount}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Important Notes:</h4>
                    <ul className="space-y-1">
                      {schedule.notes.map((note, noteIndex) => (
                        <li key={noteIndex} className="text-sm text-gray-700 flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Seasonal Adjustments */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-orange-600" />
            Seasonal Adjustments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-blue-600" />
                Weather Considerations
              </h4>
              <div className="space-y-2">
                {journey.irrigationPlan.seasonalAdjustments.map((adjustment, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0"></div>
                    {adjustment}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Best Practices
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0"></div>
                  Check soil moisture before each irrigation
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0"></div>
                  Water early morning or late evening to reduce evaporation
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0"></div>
                  Adjust frequency based on rainfall and temperature
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0"></div>
                  Monitor plant stress indicators regularly
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Water Usage Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="text-center">
              <Droplets className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {currentSchedule?.amount || '20-25mm'}
              </div>
              <div className="text-sm text-gray-600">Current Stage Amount</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="text-center">
              <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600 mb-1">
                {currentSchedule?.frequency || 'Every 2-3 days'}
              </div>
              <div className="text-sm text-gray-600">Current Frequency</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="text-center">
              <Sun className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {currentSchedule?.timing || 'Early morning'}
              </div>
              <div className="text-sm text-gray-600">Best Timing</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IrrigationPlanner;
