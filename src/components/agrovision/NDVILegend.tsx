import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Satellite, CloudOff, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NDVILegendProps {
  isRealData?: boolean;
  className?: string;
}

const NDVILegend: React.FC<NDVILegendProps> = ({ isRealData = true, className }) => {
  const { t } = useTranslation();
  
  return (
    <Card className={cn("p-3 shadow-md overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">{t('agroVision.ndviLegend', 'NDVI Legend')}</div>
        <div className={cn(
          "flex items-center text-xs px-2 py-0.5 rounded-full",
          isRealData 
            ? "bg-green-100 text-green-800" 
            : "bg-amber-100 text-amber-800"
        )}>
          {isRealData ? (
            <>
              <Satellite className="h-3 w-3 mr-1" />
              {t('agroVision.realSatelliteData', 'Satellite Data')}
            </>
          ) : (
            <>
              <CloudOff className="h-3 w-3 mr-1" />
              {t('agroVision.simulatedData', 'Simulated')}
            </>
          )}
        </div>
      </div>
      
      {/* Legend items */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div className="flex items-center">
          <div className="w-4 h-4 mr-2" style={{ backgroundColor: '#8B4513' }}></div>
          <span className="text-xs">{'< 0.0'} ({t('agroVision.waterSoil', 'Water/Soil')})</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 mr-2" style={{ backgroundColor: '#FFEDA0' }}></div>
          <span className="text-xs">0.0 - 0.2 ({t('agroVision.poor', 'Poor')})</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 mr-2" style={{ backgroundColor: '#FED976' }}></div>
          <span className="text-xs">0.2 - 0.4 ({t('agroVision.fair', 'Fair')})</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 mr-2" style={{ backgroundColor: '#93C47D' }}></div>
          <span className="text-xs">0.4 - 0.6 ({t('agroVision.good', 'Good')})</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 mr-2" style={{ backgroundColor: '#38761D' }}></div>
          <span className="text-xs">0.6 - 0.8 ({t('agroVision.veryGood', 'Very Good')})</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 mr-2" style={{ backgroundColor: '#0B5345' }}></div>
          <span className="text-xs">{'> 0.8'} ({t('agroVision.excellent', 'Excellent')})</span>
        </div>
      </div>
      
      {/* Info footer */}
      {!isRealData && (
        <div className="mt-2 text-xs flex items-start border-t border-amber-200 pt-2 text-amber-700">
          <Info className="h-3.5 w-3.5 mr-1 flex-shrink-0 mt-0.5" />
          <span>
            {t('agroVision.simulatedDataNote', 'Values shown are simulated. Real satellite data will be displayed when available.')}
          </span>
        </div>
      )}
    </Card>
  );
};

export default NDVILegend; 