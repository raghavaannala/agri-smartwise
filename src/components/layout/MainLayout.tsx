import React, { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import AgribotChat from '../dashboard/AgribotChat';
import VoiceAssistant from '../voice/VoiceAssistant';
import FarmingAlerts from '@/components/common/FarmingAlerts';
import { useAuth } from '@/contexts/AuthContext';
import { getUserFarms } from '@/lib/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';

type MainLayoutProps = {
  children: React.ReactNode;
};

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  // State to track if content is ready (for animations)
  const [contentReady, setContentReady] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const { currentUser } = useAuth();
  const [userFarms, setUserFarms] = useState<any[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<any>(null);
  const [cropJourney, setCropJourney] = useState<any>(null);

  useEffect(() => {
    if (currentUser) {
      loadUserFarms();
    }
  }, [currentUser]);

  const loadUserFarms = async () => {
    try {
      if (!currentUser?.uid) return;
      
      const farms = await getUserFarms(currentUser.uid);
      setUserFarms(farms);
      
      // Auto-select first farm for alerts
      if (farms.length > 0) {
        setSelectedFarm(farms[0]);
      }
    } catch (error) {
      console.error('Error loading farms for alerts:', error);
    }
  };

  // Get crop journey from sessionStorage or context if available
  useEffect(() => {
    try {
      const savedJourney = sessionStorage.getItem('currentCropJourney');
      if (savedJourney) {
        setCropJourney(JSON.parse(savedJourney));
      }
    } catch (error) {
      console.error('Error loading crop journey:', error);
    }
  }, []);

  // Set content ready after a small delay for animation purposes
  useEffect(() => {
    const timer = setTimeout(() => {
      setContentReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-hidden flex-col md:flex-row">
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      
      <AnimatePresence>
        {contentReady && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex-1 flex flex-col"
          >
            <Header />
            
            <motion.main 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex-1 p-3 md:p-6 overflow-y-auto"
            >
              {children}
            </motion.main>
            
            <Footer />
            
            {/* Assistants with floating positions - adjust for mobile */}
            <div className={`assistants-container ${isMobile ? 'bottom-16 right-2' : 'bottom-4 right-4'}`}>
              <AgribotChat />
              <VoiceAssistant />
            </div>
            
            {/* Farming Alerts - Always show */}
            <FarmingAlerts 
              farmData={selectedFarm ? {
                location: selectedFarm.location,
                soilType: selectedFarm.soilType,
                crops: selectedFarm.crops || [],
                size: selectedFarm.size,
                irrigationSystem: selectedFarm.irrigationSystem
              } : undefined}
              cropJourney={cropJourney}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
