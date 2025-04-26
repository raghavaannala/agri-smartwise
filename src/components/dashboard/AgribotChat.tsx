import React, { useState, useEffect } from 'react';
import { Bot, X, Send, ChevronUp, ChevronDown, LogIn, Loader2, Sprout, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile } from '@/lib/firestore';
import { useNavigate } from 'react-router-dom';
import { generateTextResponse, getFarmingRecommendation } from '@/services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isLoading?: boolean;
};

const AgribotChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [userName, setUserName] = useState('User');
  const [userLocation, setUserLocation] = useState('');
  const [userFarmType, setUserFarmType] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  // Get the current language
  const currentLanguage = i18n.language;

  useEffect(() => {
    // Only fetch profile if the chat is open and user is authenticated
    if (isOpen && currentUser) {
      fetchUserProfile();
    }
  }, [isOpen, currentUser]);
  
  const fetchUserProfile = async () => {
    if (!currentUser) return;
    
    try {
      const userProfile = await getUserProfile(currentUser.uid);
      
      // Set user name
      if (userProfile?.displayName) {
        setUserName(userProfile.displayName.split(' ')[0] || 'User'); // First name only
      } else if (currentUser.displayName) {
        setUserName(currentUser.displayName.split(' ')[0] || 'User'); // First name only
      } else {
        // Use email prefix as fallback
        const emailName = currentUser.email?.split('@')[0] || 'User';
        setUserName(emailName);
      }
      
      // Set user location
      if (userProfile?.location) {
        setUserLocation(userProfile.location.split(',')[0] || '');
      }
      
      // Set farm type
      if (userProfile?.farmType) {
        setUserFarmType(userProfile.farmType);
      }
      
      // Create user profile for AI context
      const userProfileForAI = {
        location: userProfile?.location || '',
        farmType: userProfile?.farmType || '',
        crops: userProfile?.crops || [],
        soilType: userProfile?.soilType || ''
      };
      
      // Get personalized welcome message from Gemini
      const welcomePrompt = `Generate a brief, friendly welcome message for ${userName} who is a farmer. Include a personalized recommendation based on their profile if possible.`;
      
      try {
        // Add a loading message first
        const loadingMessage: Message = {
          id: Date.now(),
          text: t('agriBot.loadingRecommendations'),
          sender: 'bot',
          timestamp: new Date(),
          isLoading: true
        };
        setMessages([loadingMessage]);
        
        // Get AI-generated welcome message with the current language
        const aiWelcome = await getFarmingRecommendation(userProfileForAI, welcomePrompt, currentLanguage);
        
        // Replace loading message with actual welcome
        const welcomeMessage: Message = {
          id: Date.now(),
          text: aiWelcome,
          sender: 'bot',
          timestamp: new Date()
        };
        
        setMessages([welcomeMessage]);
      } catch (error) {
        console.error('Error getting AI welcome message:', error);
        // Fallback welcome message
        const fallbackMessage: Message = {
          id: Date.now(),
          text: t('agriBot.welcomeMessage', { name: userName }),
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages([fallbackMessage]);
      }
      
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fallback welcome message
      const fallbackMessage: Message = {
        id: Date.now(),
        text: t('agriBot.genericWelcome'),
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages([fallbackMessage]);
    }
  };

  const toggleOpen = () => {
    if (!currentUser) {
      // If not authenticated, set a login prompt message
      const loginPromptMessage: Message = {
        id: Date.now(),
        text: t('agriBot.signInPrompt'),
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages([loginPromptMessage]);
    } else if (!isOpen && messages.length === 0) {
      // If opening for the first time as an authenticated user
      fetchUserProfile();
    }
    
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;
    
    // If not authenticated, prompt to sign in
    if (!currentUser) {
      const loginPrompt: Message = {
        id: Date.now(),
        text: t('agriBot.signInPrompt'),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages([...messages, loginPrompt]);
      setInputValue('');
      return;
    }

    const userMessageText = inputValue;
    setInputValue(''); // Clear input immediately for better UX
    
    // Add user message to chat
    const newUserMessage: Message = {
      id: Date.now(),
      text: userMessageText,
      sender: 'user',
      timestamp: new Date(),
    };
    
    // Add a loading message for the bot
    const loadingMessage: Message = {
      id: Date.now() + 1,
      text: t('agriBot.thinking'),
      sender: 'bot',
      timestamp: new Date(),
      isLoading: true
    };
    
    setMessages(prev => [...prev, newUserMessage, loadingMessage]);
    setIsProcessing(true);
    
    try {
      // Get user profile for context
      let userProfile = {
        location: userLocation,
        farmType: userFarmType,
        crops: [],
        soilType: ''
      };
      
      if (currentUser) {
        try {
          const profile = await getUserProfile(currentUser.uid);
          userProfile = {
            location: profile?.location || userLocation,
            farmType: profile?.farmType || userFarmType,
            crops: profile?.crops || [],
            soilType: profile?.soilType || ''
          };
        } catch (error) {
          console.error('Error fetching user profile for AI context:', error);
        }
      }
      
      // Get AI response with the current language
      const aiResponse = await getFarmingRecommendation(userProfile, userMessageText, currentLanguage);
      
      // Remove loading message and add actual response
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => !msg.isLoading);
        return [...filteredMessages, {
          id: Date.now() + 2,
          text: aiResponse,
          sender: 'bot',
          timestamp: new Date()
        }];
      });
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Remove loading message and add error message
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => !msg.isLoading);
        return [...filteredMessages, {
          id: Date.now() + 2,
          text: t('agriBot.errorMessage'),
          sender: 'bot',
          timestamp: new Date()
        }];
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Render a sign-in button if user is not authenticated
  const renderSignInButton = () => {
    if (currentUser) return null;
    
    return (
      <div className="flex justify-center my-4">
        <Button 
          onClick={() => navigate('/login')}
          className="bg-agri-green hover:bg-agri-green/90"
        >
          <LogIn className="mr-2 h-4 w-4" />
          {t('agriBot.signInButton')}
        </Button>
      </div>
    );
  };

  // Custom plant-like bot icon
  const PlantBotIcon = () => (
    <div className="relative">
      <div className="absolute -top-3 -left-1">
        <Leaf className="h-4 w-4 text-agri-freshGreen" />
      </div>
      <div className="absolute -top-2 -right-1">
        <Leaf className="h-3 w-3 text-agri-lime" />
      </div>
      <Sprout className="h-6 w-6 text-agri-green" />
    </div>
  );

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "bg-white rounded-lg shadow-lg overflow-hidden mb-2 border border-gray-200 w-80 md:w-96",
              isMinimized ? "h-14" : "h-96"
            )}
          >
            <div className="bg-gradient-to-r from-agri-green to-agri-freshGreen text-white p-3 flex items-center justify-between">
              <div className="flex items-center">
                <PlantBotIcon />
                <span className="font-medium ml-2">{t('agriBot.botName')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={toggleMinimize}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  {isMinimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                <button 
                  onClick={toggleOpen}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            {!isMinimized && (
              <>
                <div className="p-3 h-72 overflow-y-auto">
                  {messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={cn(
                        "mb-3 max-w-[80%] rounded-lg p-2.5",
                        message.sender === 'user' 
                          ? "bg-agri-blue/10 text-gray-800 ml-auto" 
                          : "bg-green-50 text-gray-800"
                      )}
                    >
                      {message.isLoading ? (
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <p className="text-sm text-gray-500">{message.text}</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm">{message.text}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                  
                  {renderSignInButton()}
                </div>
                <div className="p-3 border-t border-gray-200">
                  <div className="flex items-center">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={currentUser ? t('agriBot.inputPlaceholder') : t('agriBot.signInPrompt')}
                      className="flex-1 focus-visible:ring-agri-green"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSendMessage();
                        }
                      }}
                      disabled={!currentUser || isProcessing}
                    />
                    <Button 
                      size="icon" 
                      onClick={handleSendMessage} 
                      className="ml-2 bg-agri-green hover:bg-agri-green/90"
                      disabled={!currentUser || isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={{ 
          y: [0, -10, 0],
          rotate: [0, 5, 0, -5, 0]
        }}
        transition={{ 
          y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
          rotate: { repeat: Infinity, duration: 4, ease: "easeInOut" }
        }}
        className="relative"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
        />
        <Button 
          onClick={toggleOpen} 
          className={cn(
            "rounded-full h-16 w-16 shadow-lg bg-gradient-to-br from-agri-freshGreen to-agri-green",
            "flex items-center justify-center border-4 border-white"
          )}
        >
          <div className="relative">
            <Leaf className="absolute -top-3 -left-2 h-4 w-4 text-agri-lime" />
            <Leaf className="absolute -top-2 right-0 h-3 w-3 text-agri-lime rotate-45" />
            <Sprout className="h-7 w-7 text-white" />
          </div>
        </Button>
      </motion.div>
    </div>
  );
};

export default AgribotChat;
