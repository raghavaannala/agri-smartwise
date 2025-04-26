import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FlaskConical, Loader2 } from 'lucide-react';
import { getUserSoilData, SoilData } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

type SoilParameter = {
  name: string;
  value: number;
  maxValue: number;
  status: 'Low' | 'Medium' | 'Optimal' | 'High';
  color: string;
};

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

const getStatus = (name: string, value: number): 'Low' | 'Medium' | 'Optimal' | 'High' => {
  switch (name) {
    case 'pH':
      if (value < 5.5) return 'Low';
      if (value > 7.5) return 'High';
      if (value >= 6.0 && value <= 7.0) return 'Optimal';
      return 'Medium';
    case 'Moisture':
      if (value < 20) return 'Low';
      if (value > 80) return 'High';
      if (value >= 40 && value <= 60) return 'Optimal';
      return 'Medium';
    case 'Nitrogen':
      if (value < 30) return 'Low';
      if (value > 90) return 'High';
      if (value >= 50 && value <= 75) return 'Optimal';
      return 'Medium';
    case 'Phosphorus':
      if (value < 25) return 'Low';
      if (value > 85) return 'High';
      if (value >= 45 && value <= 70) return 'Optimal';
      return 'Medium';
    case 'Potassium':
      if (value < 25) return 'Low';
      if (value > 85) return 'High';
      if (value >= 45 && value <= 75) return 'Optimal';
      return 'Medium';
    default:
      return 'Medium';
  }
};

const getColor = (status: 'Low' | 'Medium' | 'Optimal' | 'High'): string => {
  switch (status) {
    case 'Low':
      return 'bg-red-500';
    case 'Medium':
      return 'bg-yellow-500';
    case 'Optimal':
      return 'bg-green-500';
    case 'High':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
};

const SoilStatusCard = () => {
  const { t, i18n } = useTranslation();
  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  
  // Add state to track language changes
  const [currentLang, setCurrentLang] = useState(i18n.language);
  
  // Update when language changes
  useEffect(() => {
    const handleLanguageChanged = () => {
      console.log('Language changed in SoilStatusCard to:', i18n.language);
      setCurrentLang(i18n.language);
    };
    
    // Listen for language changes
    i18n.on('languageChanged', handleLanguageChanged);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  useEffect(() => {
    const fetchSoilData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const data = await getUserSoilData(currentUser.uid);
        setSoilData(data.length > 0 ? data[0] : null);
      } catch (err) {
        console.error('Error fetching soil data:', err);
        setError('Failed to load soil data');
      } finally {
        setLoading(false);
      }
    };

    fetchSoilData();
  }, [currentUser]);

  // Convert soilData to soilParameters array for display
  const soilParameters: SoilParameter[] = soilData ? [
    { 
      name: 'pH', 
      value: soilData.ph, 
      maxValue: 14, 
      status: getStatus('pH', soilData.ph),
      color: getColor(getStatus('pH', soilData.ph))
    },
    { 
      name: 'Moisture', 
      value: soilData.moisture, 
      maxValue: 100, 
      status: getStatus('Moisture', soilData.moisture),
      color: getColor(getStatus('Moisture', soilData.moisture))
    },
    { 
      name: 'Nitrogen', 
      value: soilData.nitrogen, 
      maxValue: 100, 
      status: getStatus('Nitrogen', soilData.nitrogen),
      color: getColor(getStatus('Nitrogen', soilData.nitrogen))
    },
    { 
      name: 'Phosphorus', 
      value: soilData.phosphorus, 
      maxValue: 100, 
      status: getStatus('Phosphorus', soilData.phosphorus),
      color: getColor(getStatus('Phosphorus', soilData.phosphorus))
    },
    { 
      name: 'Potassium', 
      value: soilData.potassium, 
      maxValue: 100, 
      status: getStatus('Potassium', soilData.potassium),
      color: getColor(getStatus('Potassium', soilData.potassium))
    },
  ] : [];

  // Use dummy data if no soil data is available yet
  const dummyParameters: SoilParameter[] = [
    { 
      name: t('soilLab.ph'), 
      value: 6.5, 
      maxValue: 14, 
      status: 'Optimal', 
      color: 'bg-green-500'
    },
    { 
      name: t('soilLab.moisture'), 
      value: 28, 
      maxValue: 100, 
      status: 'Low', 
      color: 'bg-yellow-500'
    },
    { 
      name: t('soilLab.nitrogen'), 
      value: 45, 
      maxValue: 100, 
      status: 'Medium', 
      color: 'bg-yellow-500'
    },
    { 
      name: t('soilLab.phosphorus'), 
      value: 70, 
      maxValue: 100, 
      status: 'Optimal', 
      color: 'bg-green-500'
    },
    { 
      name: t('soilLab.potassium'), 
      value: 60, 
      maxValue: 100, 
      status: 'Medium', 
      color: 'bg-yellow-500'
    },
  ];

  const displayParameters = soilData ? soilParameters : dummyParameters;
  const lastUpdated = soilData ? format(soilData.createdAt, 'MMM dd, yyyy') : 'Not available';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-agri-green">
          <div className="flex items-center">
            <FlaskConical className="mr-2 h-5 w-5" />
            {t('soilLab.title')}
          </div>
        </CardTitle>
        <span className="text-xs bg-agri-green/10 text-agri-green px-2 py-1 rounded-full">
          {t('common.lastUpdated')}: {loading ? '...' : lastUpdated}
        </span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-agri-green" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">{error}</div>
        ) : (
          <div className="space-y-4">
            {displayParameters.map((param) => (
              <div key={param.name} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{param.name}</span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium">
                      {param.name === 'pH' ? param.value : `${param.value}%`}
                    </span>
                    <span className={`ml-2 text-xs ${getStatusColor(param.status)}`}>
                      {t(`common.${param.status.toLowerCase()}`)}
                      {param.status === 'Low' || param.status === 'Medium' ? ' ⚠️' : ''}
                    </span>
                  </div>
                </div>
                <Progress value={(param.value / param.maxValue) * 100} className={param.color} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SoilStatusCard;
