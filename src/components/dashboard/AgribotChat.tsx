import React, { useState, useEffect } from 'react';
import { Bot, X, Send, ChevronUp, ChevronDown, LogIn, Loader2, Sprout, Leaf, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile } from '@/lib/firestore';
import { useNavigate } from 'react-router-dom';
import { generateTextResponse, getFarmingRecommendation } from '@/services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { isFounderQuery, generateFounderResponse } from '@/services/foundersService';
import { toast } from 'sonner';

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
      const welcomePrompt = `Generate a brief, friendly welcome message for ${userName} who is a farmer. Include a personalized recommendation based on their profile if possible. Introduce yourself as an AI assistant that can help guide them through the app and provide farm-specific suggestions.`;
      
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

  // Auto-open chat for new users or after login
  useEffect(() => {
    if (currentUser) {
      // Check if this is the first time the user has seen the guide
      const hasSeenGuide = localStorage.getItem('hasSeenAgribotGuide');
      if (!hasSeenGuide) {
        // Give a small delay before opening to let page load
        const timer = setTimeout(() => {
          setIsOpen(true);
          fetchUserProfile();
          // Mark that the user has seen the guide
          localStorage.setItem('hasSeenAgribotGuide', 'true');
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser]);

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
      // Check if this is a founder-related query
      if (isFounderQuery(userMessageText)) {
        console.log("Founder query detected in AgriBot");
        const founderResponse = generateFounderResponse(userMessageText);
        
        // Remove loading message and add founder response
        setMessages(prev => {
          const filteredMessages = prev.filter(msg => !msg.isLoading);
          return [...filteredMessages, {
            id: Date.now() + 2,
            text: founderResponse,
            sender: 'bot',
            timestamp: new Date()
          }];
        });
        setIsProcessing(false);
        return;
      }
      
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
      console.error('Error generating AI response:', error);
      
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
    }
    
    setIsProcessing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const renderSignInButton = () => {
    return (
      <Button
        onClick={() => navigate('/login')}
        className="w-full mt-4 bg-agri-green hover:bg-agri-darkGreen text-white flex items-center justify-center gap-2"
      >
        <LogIn size={16} />
        {t('agriBot.signInButton')}
      </Button>
    );
  };

  // Stylized Plant Bot Icon
  const PlantBotIcon = () => (
    <div className="flex items-center justify-center relative">
      <Sprout className="h-6 w-6 text-white z-10" strokeWidth={2} />
      <span className="absolute inset-0 rounded-full bg-white/30 scale-0 group-hover:scale-100 transition-transform duration-300"></span>
    </div>
  );

  // Helper function to add sample queries based on profile completeness
  const getSampleQueries = () => {
    const samples = [];
    
    // Always include app guide
    samples.push({
      text: t('agriBot.appGuide', 'Guide me through the app'),
      onClick: () => {
        setInputValue(t('agriBot.appGuide', 'Guide me through the app'));
        handleSendMessage();
      }
    });
    
    // For users with crops defined
    const hasDefinedCrops = currentUser && userFarmType;
    if (hasDefinedCrops) {
      samples.push({
        text: t('agriBot.cropSpecificAdvice', 'Advice for my crops'),
        onClick: () => {
          setInputValue(t('agriBot.cropSpecificAdvice', 'What should I do with my crops this season?'));
          handleSendMessage();
        }
      });
    }
    
    // For users with location defined
    if (userLocation) {
      samples.push({
        text: t('agriBot.weatherImpact', 'Weather impact on my farm'),
        onClick: () => {
          setInputValue(t('agriBot.weatherImpact', 'How will current weather affect my farm?'));
          handleSendMessage();
        }
      });
    }
    
    return samples;
  };

  return (
    <div className="absolute bottom-20 left-[270px] z-50 flex flex-col items-start">
      {/* AgriBot Dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            className={cn(
              "fixed bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden",
              isMinimized
                ? "w-72 h-auto"
                : "bottom-24 left-[270px] w-[90vw] md:w-[400px] h-[500px] max-h-[80vh]"
            )}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 via-teal-500 to-emerald-500 dark:from-green-700 dark:via-teal-600 dark:to-emerald-600 text-white p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bot size={22} className="text-white drop-shadow-md" />
                  <span className="absolute -inset-1 bg-white/20 rounded-full blur-sm animate-pulse opacity-60"></span>
                </div>
                <h3 className="font-semibold">
                  {t('agriBot.botName', 'GrowthGuide AI')}
                  <span className="ml-2 text-xs opacity-80 bg-white/20 px-1.5 py-0.5 rounded-full">
                    {currentLanguage === 'en' ? 'EN' : 
                     currentLanguage === 'hi' ? 'हिंदी' : 
                     currentLanguage === 'te' ? 'తెలుగు' : currentLanguage.toUpperCase()}
                  </span>
                </h3>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleMinimize}
                  className="rounded-full hover:bg-white/20 p-1.5 flex items-center"
                >
                  {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button
                  onClick={toggleOpen}
                  className="rounded-full hover:bg-white/20 p-1.5 flex items-center"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900 h-[calc(100%-110px)]">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "p-3 rounded-lg max-w-[90%] break-words",
                          message.sender === 'user'
                            ? "bg-blue-50 dark:bg-blue-900/30 ml-auto"
                            : "bg-green-50 dark:bg-green-900/30 mr-auto",
                          message.isLoading && "animate-pulse"
                        )}
                      >
                        {message.isLoading ? (
                          <div className="flex items-center justify-center p-2">
                            <div className="flex space-x-1">
                              <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                              {message.sender === 'user' ? t('agriBot.you', 'You') : t('agriBot.botName', 'GrowthGuide AI')}
                            </div>
                            <div className="dark:text-gray-100">{message.text}</div>
                            {message.sender === 'bot' && (
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(message.text)
                                      .then(() => toast.success(t('copied', 'Copied to clipboard')))
                                      .catch(() => toast.error(t('copyFailed', 'Failed to copy')));
                                  }}
                                  className="text-xs flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 w-3 h-3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                                  {t('copy', 'Copy')}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* App Guide & Suggestion Buttons */}
                  {messages.length > 0 && !messages[messages.length - 1].isLoading && (
                    <div className="mt-4 mb-2">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                        {t('agriBot.quickHelp', 'Quick Help:')}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getSampleQueries().map((sample, index) => (
                          <button
                            key={index}
                            onClick={sample.onClick}
                            className="text-xs px-2 py-1 rounded-md bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                          >
                            {sample.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Sign in button if not authenticated */}
                  {!currentUser && messages.some(m => m.text === t('agriBot.signInPrompt')) && renderSignInButton()}
                </div>
                
                {/* Input area */}
                <div className="border-t border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder={t('agriBot.inputPlaceholder', 'Ask me anything about farming...')}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isProcessing || !isOpen}
                      className="flex-1 focus-visible:ring-2 focus-visible:ring-green-500 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isProcessing || !inputValue.trim()}
                      className={cn(
                        "rounded-full w-10 h-10 p-0",
                        "bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600",
                        "text-white flex items-center justify-center shadow-md"
                      )}
                    >
                      {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: -5 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleOpen}
        className={cn(
          "rounded-full text-white w-16 h-16 flex items-center justify-center shadow-xl border-2",
          "bg-gradient-to-br from-green-500 via-teal-500 to-emerald-500 dark:from-green-600 dark:via-teal-600 dark:to-emerald-600",
          "border-white/40 dark:border-white/20",
          "group relative overflow-hidden"
        )}
        aria-label={t('agriBot.toggle', 'Toggle AgriBot')}
      >
        {/* Enhanced background effects */}
        <div className="absolute inset-0 w-full h-full">
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent"></div>
          <div className="absolute -inset-2 bg-gradient-to-br from-green-500/20 to-teal-500/20 blur-xl group-hover:opacity-80 opacity-0 transition-opacity duration-500"></div>
        </div>
        
        {/* Pulse animation for idle state */}
        <div className="absolute inset-0 rounded-full bg-white/10 animate-pulse opacity-70"></div>
        
        {/* Enhanced bot icon */}
        <span className="relative z-10 inline-flex items-center justify-center">
          <PlantBotIcon />
          <span className="absolute inset-0 rounded-full bg-white/30 scale-0 group-hover:scale-100 transition-transform duration-300"></span>
        </span>
        
        {/* Radial glow effect on hover */}
        <span className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400/0 via-teal-400/0 to-emerald-400/0 group-hover:from-green-400/20 group-hover:via-teal-400/20 group-hover:to-emerald-400/20 transition-colors duration-300"></span>
      </motion.button>
    </div>
  );
};

export default AgribotChat;
