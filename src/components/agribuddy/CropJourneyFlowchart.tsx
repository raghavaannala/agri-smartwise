import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Droplets, 
  Sprout, 
  Target, 
  AlertTriangle,
  PlayCircle,
  CheckCircle,
  Circle,
  ArrowRight
} from 'lucide-react';
import { CropJourney, CropStage } from '@/services/agriBuddyService';

interface CropJourneyFlowchartProps {
  journey: CropJourney;
}

const CropJourneyFlowchart: React.FC<CropJourneyFlowchartProps> = ({ journey }) => {
  const [selectedStage, setSelectedStage] = useState<CropStage | null>(null);

  const getStageStatus = (stage: CropStage) => {
    const currentStageIndex = journey.stages.findIndex(s => s.id === journey.currentStage);
    const stageIndex = journey.stages.findIndex(s => s.id === stage.id);
    
    if (stageIndex < currentStageIndex) return 'completed';
    if (stageIndex === currentStageIndex) return 'active';
    return 'upcoming';
  };

  const getStageIcon = (stage: CropStage) => {
    const status = getStageStatus(stage);
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'active':
        return <PlayCircle className="h-6 w-6 text-blue-600" />;
      default:
        return <Circle className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStageColor = (stage: CropStage) => {
    const status = getStageStatus(stage);
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'active':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Crop Journey Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
            <div className="space-y-6">
              {journey.stages.map((stage, index) => (
                <div key={stage.id} className="relative flex items-start gap-4">
                  <div className="relative z-10 flex-shrink-0">
                    {getStageIcon(stage)}
                  </div>
                  <div 
                    className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${getStageColor(stage)}`}
                    onClick={() => setSelectedStage(selectedStage?.id === stage.id ? null : stage)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{stage.name}</h3>
                      <div className="text-sm opacity-75">{stage.duration} days</div>
                    </div>
                    <p className="text-sm mb-3 opacity-90">{stage.description}</p>
                  </div>
                  {index < journey.stages.length - 1 && (
                    <div className="absolute left-8 top-12 transform -translate-x-1/2">
                      <ArrowRight className="h-4 w-4 text-gray-400 rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedStage && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStageIcon(selectedStage)}
              {selectedStage.name} - Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  Critical Actions
                </h4>
                <div className="space-y-2">
                  {selectedStage.criticalActions.map((action, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Sprout className="h-4 w-4 text-green-600" />
                  Expected Outcome
                </h4>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">{selectedStage.expectedOutcome}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CropJourneyFlowchart;
