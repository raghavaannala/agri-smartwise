import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// This component forces a complete application re-render when the language changes
const LanguageObserver: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  // Using a counter to force re-renders
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    // Force immediate re-render on mount to ensure correct language
    setRenderKey(prev => prev + 1);
    
    const handleLanguageChanged = () => {
      console.log('Language changed globally to:', i18n.language);
      // Force complete re-render by changing the key
      setRenderKey(prev => prev + 1);
      
      // Force reload i18next resources
      i18n.reloadResources().then(() => {
        console.log('i18n resources reloaded successfully');
        // Force another re-render after resources are reloaded
        setRenderKey(prev => prev + 1);
      });
    };

    // Listen for language changes
    i18n.on('languageChanged', handleLanguageChanged);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  // Using the key prop to force a complete re-render of all children
  return <div key={renderKey} style={{ display: 'contents' }}>{children}</div>;
};

export default LanguageObserver;
