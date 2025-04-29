import React, { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import AgribotChat from '../dashboard/AgribotChat';
import VoiceAssistant from '../voice/VoiceAssistant';
import { AnimatePresence, motion } from 'framer-motion';

type MainLayoutProps = {
  children: React.ReactNode;
};

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  // State to track if content is ready (for animations)
  const [contentReady, setContentReady] = useState(false);
  
  // Set content ready after a small delay for animation purposes
  useEffect(() => {
    const timer = setTimeout(() => {
      setContentReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      
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
              className="flex-1 p-4 md:p-6 overflow-y-auto"
            >
              {children}
            </motion.main>
            
            <Footer />
            
            {/* Assistants with floating positions*/}
            <div className="assistants-container">
              <AgribotChat />
              <VoiceAssistant />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
