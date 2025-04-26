import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import i18n from '@/i18n/i18n';
import { useTranslation } from 'react-i18next';

type Language = {
  name: string;
  code: string;
};

type LanguageContextType = {
  currentLanguage: Language;
  changeLanguage: (lang: Language) => void;
  languages: Language[];
};

const languages: Language[] = [
  { name: 'English', code: 'en' },
  { name: 'Telugu', code: 'te' },
  { name: 'Hindi', code: 'hi' },
];

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use the i18next translation hook to ensure proper updates
  const { i18n: i18nInstance } = useTranslation();
  
  // Initialize with the stored language or default to English
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      try {
        const parsed = JSON.parse(savedLanguage);
        return parsed;
      } catch (error) {
        console.error('Error parsing saved language:', error);
      }
    }
    return languages[0]; // Default to English
  });

  // Effect to change the i18n language when currentLanguage changes
  useEffect(() => {
    const applyLanguage = async () => {
      console.log('Changing language to:', currentLanguage.code);
      await i18n.changeLanguage(currentLanguage.code);
      // Force reload i18next instance
      i18nInstance.reloadResources();
      localStorage.setItem('language', JSON.stringify(currentLanguage));
    };
    
    applyLanguage();
  }, [currentLanguage, i18nInstance]);

  const changeLanguage = useCallback((lang: Language) => {
    console.log('Language selected:', lang.name, lang.code);
    
    // First update the context state
    setCurrentLanguage(lang);
    
    // Then directly change the i18n language
    // This ensures immediate language change throughout the app
    i18n.changeLanguage(lang.code).then(() => {
      console.log('Language changed successfully to:', lang.code);
      
      // Force reload resources to ensure all translations are loaded
      i18n.reloadResources(lang.code).then(() => {
        console.log('Resources reloaded for language:', lang.code);
        
        // Save to localStorage
        localStorage.setItem('language', JSON.stringify(lang));
        
        // Force a global re-render by dispatching a custom event
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang.code }));
      });
    });
  }, []);

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, languages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
