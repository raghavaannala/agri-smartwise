import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Bot, Loader2, VolumeX, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { generateTextResponse, getFarmingRecommendation } from '@/services/geminiService';
import { getUserProfile } from '@/lib/firestore';

const VoiceAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const { currentUser } = useAuth();
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation();
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Initialize speech recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      // Set language based on current app language
      recognitionRef.current.lang = currentLanguage.code === 'te' ? 'te-IN' : 
                                   currentLanguage.code === 'hi' ? 'hi-IN' : 'en-IN';
      
      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const transcriptText = result[0].transcript;
        
        if (result.isFinal) {
          setTranscript(transcriptText);
          if (transcriptText.trim().length > 0) {
            // Auto-submit after a brief pause when speech ends
            setTimeout(() => {
              processVoiceCommand(transcriptText);
              setIsListening(false);
              if (recognitionRef.current) {
                recognitionRef.current.stop();
              }
            }, 1000);
          }
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(t('voiceAssistant.error'));
        setIsListening(false);
      };
    } else {
      setError(t('voiceAssistant.browserNotSupported'));
    }
    
    // Initialize speech synthesis
    speechSynthesisRef.current = new SpeechSynthesisUtterance();
    
    // Clean up
    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
      if (speechSynthesis && isSpeaking) {
        speechSynthesis.cancel();
      }
    };
  }, [currentLanguage, t]);
  
  // Fetch user profile when opened
  useEffect(() => {
    if (isOpen && currentUser && !userProfile) {
      fetchUserProfile();
    }
  }, [isOpen, currentUser]);
  
  const fetchUserProfile = async () => {
    if (!currentUser) return;
    
    try {
      const profile = await getUserProfile(currentUser.uid);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };
  
  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError(t('voiceAssistant.browserNotSupported'));
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setError(null);
      recognitionRef.current.start();
      setIsListening(true);
    }
  };
  
  const processVoiceCommand = async (command: string) => {
    if (!command.trim()) return;
    
    setIsProcessing(true);
    
    try {
      let aiResponse;
      
      if (userProfile) {
        // Get personalized response based on user profile
        const userProfileForAI = {
          location: userProfile?.location || '',
          farmType: userProfile?.farmType || '',
          crops: userProfile?.crops || [],
          soilType: userProfile?.soilType || ''
        };
        
        aiResponse = await getFarmingRecommendation(
          userProfileForAI, 
          command, 
          currentLanguage.code
        );
      } else {
        // Generic response if no user profile
        aiResponse = await generateTextResponse(
          `${command} ${t('voiceAssistant.respondIn')} ${currentLanguage.name}`
        );
      }
      
      setResponse(aiResponse);
      speakResponse(aiResponse);
    } catch (error) {
      console.error('Error processing voice command:', error);
      setError(t('voiceAssistant.processingError'));
    } finally {
      setIsProcessing(false);
    }
  };
  
  const speakResponse = (text: string) => {
    if (!speechSynthesisRef.current) return;
    
    // Cancel any ongoing speech
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    
    // Set up speech synthesis
    speechSynthesisRef.current.text = text;
    
    // Try to find a voice that matches the current language
    const voices = speechSynthesis.getVoices();
    const langCode = currentLanguage.code === 'te' ? 'te' : 
                    currentLanguage.code === 'hi' ? 'hi' : 'en';
    
    const voice = voices.find(v => v.lang.includes(langCode)) || 
                 voices.find(v => v.lang.includes('en')) || 
                 voices[0];
    
    if (voice) {
      speechSynthesisRef.current.voice = voice;
    }
    
    speechSynthesisRef.current.rate = 0.9; // Slightly slower for clarity
    speechSynthesisRef.current.pitch = 1;
    
    speechSynthesisRef.current.onstart = () => setIsSpeaking(true);
    speechSynthesisRef.current.onend = () => setIsSpeaking(false);
    speechSynthesisRef.current.onerror = () => setIsSpeaking(false);
    
    speechSynthesis.speak(speechSynthesisRef.current);
  };
  
  const stopSpeaking = () => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };
  
  return (
    <div className="fixed bottom-24 right-8 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.3 }}
            className="mb-4 bg-white rounded-2xl shadow-xl border border-agri-green/20 overflow-hidden w-[350px]"
          >
            <div className="bg-gradient-to-r from-agri-green to-agri-freshGreen p-4 text-white flex justify-between items-center">
              <div className="flex items-center">
                <Bot className="mr-2 h-6 w-6" />
                <h3 className="font-medium text-lg">{t('voiceAssistant.title')}</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-white hover:bg-white/20 rounded-full p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {transcript && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">{t('voiceAssistant.youSaid')}:</p>
                  <div className="bg-gray-100 p-3 rounded-lg text-gray-800">
                    {transcript}
                  </div>
                </div>
              )}
              
              {isProcessing && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-agri-green" />
                  <p className="ml-2 text-gray-600">{t('voiceAssistant.thinking')}</p>
                </div>
              )}
              
              {response && !isProcessing && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">{t('voiceAssistant.response')}:</p>
                  <div className="bg-green-50 p-3 rounded-lg text-gray-800 relative">
                    {response}
                    
                    <div className="mt-2 flex justify-end">
                      {isSpeaking ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs flex items-center" 
                          onClick={stopSpeaking}
                        >
                          <VolumeX className="h-3 w-3 mr-1" />
                          {t('voiceAssistant.stopSpeaking')}
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs flex items-center" 
                          onClick={() => speakResponse(response)}
                        >
                          <Volume2 className="h-3 w-3 mr-1" />
                          {t('voiceAssistant.speak')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="bg-red-50 p-3 rounded-lg text-red-600 mb-4">
                  {error}
                </div>
              )}
              
              {!currentUser && (
                <div className="bg-yellow-50 p-3 rounded-lg text-yellow-700 mb-4">
                  {t('voiceAssistant.loginPrompt')}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-center">
              <Button
                onClick={toggleListening}
                disabled={isProcessing || !currentUser}
                className={cn(
                  "rounded-full h-16 w-16 flex items-center justify-center",
                  isListening 
                    ? "bg-red-500 hover:bg-red-600" 
                    : "bg-agri-green hover:bg-agri-green/90"
                )}
              >
                {isListening ? (
                  <MicOff className="h-8 w-8 text-white" />
                ) : (
                  <Mic className="h-8 w-8 text-white" />
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="relative"
      >
        <Button 
          onClick={() => setIsOpen(!isOpen)} 
          className={cn(
            "rounded-full h-20 w-20 shadow-lg",
            "flex items-center justify-center border-4 border-white",
            "bg-gradient-to-br from-agri-freshGreen to-agri-green"
          )}
        >
          <Mic className="h-10 w-10 text-white" />
        </Button>
      </motion.div>
    </div>
  );
};

export default VoiceAssistant;
