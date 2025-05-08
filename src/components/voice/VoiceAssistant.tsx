import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, X, Volume2, Settings, Trash2, Moon, Sun, History, Maximize2, Minimize2, Languages, Share } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { generateTextResponse, getFarmingRecommendation } from '@/services/geminiService';
import { getUserProfile } from '@/lib/firestore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { setupGeminiClient } from '@/config/geminiConfig';
import { isFounderQuery, generateFounderResponse } from '@/services/foundersService';
import { useTheme } from 'next-themes';
import logoImage from '@/assets/images/logooo.png';

// Speech Recognition type
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

/**
 * EnhancedVoiceAssistant - An advanced voice assistant for agricultural queries
 * Features: multilingual support, voice customization, themes, history tracking
 */
const VoiceAssistant = () => {
  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [visualizationType, setVisualizationType] = useState<'bar'|'wave'|'circle'>('bar');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragControls = useDragControls();

  // Speech State
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Voice Settings
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Theme integration
  const { theme, setTheme } = useTheme();
  
  // Conversation State
  const [messages, setMessages] = useState<{
    type: 'user' | 'ai';
    text: string;
    time: Date;
    category?: string;
  }[]>([]);
  
  // History State
  const [conversationHistory, setConversationHistory] = useState<{
    id: string;
    title: string;
    date: Date;
    messages: typeof messages;
  }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionAttemptsRef = useRef(0);
  
  // Get user context
  const { currentUser } = useAuth();
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const { t } = useTranslation();
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (containerRef.current && messages.length > 0) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Check speech support
  const [speechSupported, setSpeechSupported] = useState(false);
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (SpeechRecognition) {
      setSpeechSupported(true);
      console.log("Speech recognition is supported");
      
      // Additional check for mobile devices
      if (isMobile) {
        console.log("Mobile device detected");
        // Test if we can access the microphone
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            console.log("Microphone access granted on mobile");
            // Stop the test stream
            stream.getTracks().forEach(track => track.stop());
          })
          .catch(err => {
            console.error("Mobile microphone access error:", err);
            toast.error(t('voiceAssistant.mobileMicError', 'Please ensure microphone access is enabled in your mobile browser settings'));
          });
      }
    } else {
      console.log("Speech recognition is not supported");
      toast.error(t('voiceAssistant.notSupported', 'Speech recognition not supported in your browser'));
    }
  }, [t]);

  // Initialize Gemini client when component mounts
  useEffect(() => {
    const initializeGemini = async () => {
      try {
        const success = await setupGeminiClient();
        if (!success) {
          console.error("Failed to initialize Gemini client");
        }
      } catch (error) {
        console.error("Error initializing Gemini client:", error);
      }
    };
    
    initializeGemini();
  }, []);
  
  // Fetch user profile if needed
  const [userProfile, setUserProfile] = useState<any>(null);
  useEffect(() => {
    if (isOpen && currentUser && !userProfile) {
      getUserProfile(currentUser.uid)
        .then(profile => setUserProfile(profile))
        .catch(err => console.error("Failed to load user profile:", err));
    }
  }, [isOpen, currentUser, userProfile]);
  
  // Initialize speech synthesis voices
  useEffect(() => {
    // Load voices when available
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Auto-select appropriate voice for current language
      if (voices.length > 0 && currentLanguage) {
        const langCode = currentLanguage.code === 'te' ? 'te' : 
                        currentLanguage.code === 'hi' ? 'hi' : 'en';
        
        const matchingVoice = voices.find(v => v.lang.startsWith(langCode));
        if (matchingVoice) {
          setSelectedVoice(matchingVoice.name);
        }
      }
    };
    
    // Load voices immediately in case they're already available
    if (window.speechSynthesis) {
      loadVoices();
      
      // Also set up event listener for when voices change/load
      window.speechSynthesis.onvoiceschanged = loadVoices;
      
      // Cleanup
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, [currentLanguage]);

  // Save conversation history to local storage
  useEffect(() => {
    if (messages.length > 0) {
      const historyData = localStorage.getItem('voiceAssistantHistory');
      const history = historyData ? JSON.parse(historyData) : [];
      
      // Check if we're in an existing conversation
      const currentConversationId = localStorage.getItem('currentConversationId');
      
      if (currentConversationId) {
        // Update existing conversation
        const updatedHistory = history.map((conv: any) => 
          conv.id === currentConversationId 
            ? { ...conv, messages: messages }
            : conv
        );
        localStorage.setItem('voiceAssistantHistory', JSON.stringify(updatedHistory));
        setConversationHistory(updatedHistory);
      } else if (messages.length >= 2) {
        // Create new conversation after at least one exchange
        const newId = Date.now().toString();
        const title = messages[0].text.length > 30 
          ? messages[0].text.substring(0, 30) + '...'
          : messages[0].text;
          
        const newConversation = {
          id: newId,
          title: title,
          date: new Date(),
          messages: messages
        };
        
        const updatedHistory = [newConversation, ...history].slice(0, 20); // Keep last 20 conversations
        localStorage.setItem('voiceAssistantHistory', JSON.stringify(updatedHistory));
        localStorage.setItem('currentConversationId', newId);
        setConversationHistory(updatedHistory);
      }
    }
  }, [messages]);

  // Load conversation history
  useEffect(() => {
    if (isOpen) {
      const historyData = localStorage.getItem('voiceAssistantHistory');
      if (historyData) {
        try {
          const parsedHistory = JSON.parse(historyData);
          setConversationHistory(parsedHistory);
                } catch (e) {
          console.error("Failed to parse conversation history:", e);
        }
      }
    }
  }, [isOpen]);

  // Automatic language detection with feedback
  const detectLanguage = useCallback((text: string) => {
    if (!text || text.length < 5) return null;
    
    // Very simple language detection heuristics
    // This would be better with a proper language detection library
    const hiIndicators = /[\u0900-\u097F]/; // Hindi unicode range
    const teIndicators = /[\u0C00-\u0C7F]/; // Telugu unicode range
    
    if (hiIndicators.test(text)) {
      return 'hi';
    } else if (teIndicators.test(text)) {
      return 'te';
    }
    
    // Default to English if no specific indicators
    return 'en';
  }, []);
  
  // Enhanced speak text function with improved Telugu and Hindi support
  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply custom voice settings
    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;
    utterance.volume = 1.0;
    
    // Get language code
    const langCode = currentLanguage.code === 'te' ? 'te' : 
                     currentLanguage.code === 'hi' ? 'hi' : 'en';
    
    // Special handling for Telugu and Hindi
    if (langCode === 'te' || langCode === 'hi') {
      // Try exact match first
      const exactMatchVoice = availableVoices.find(v => 
        v.lang === `${langCode}-IN` || 
        v.lang === `${langCode}-${langCode.toUpperCase()}` ||
        v.lang.toLowerCase() === langCode.toLowerCase()
      );
      
      if (exactMatchVoice) {
        utterance.voice = exactMatchVoice;
        console.log(`Using exact match voice for ${langCode}: ${exactMatchVoice.name}`);
      } else {
        // Try partial match
        const partialMatchVoice = availableVoices.find(v => v.lang.startsWith(langCode));
        if (partialMatchVoice) {
          utterance.voice = partialMatchVoice;
          console.log(`Using partial match voice for ${langCode}: ${partialMatchVoice.name}`);
        } else {
          // If no specific voice found, use default but adjust pronunciation for better results
          console.log(`No specific voice found for ${langCode}, using default with optimized settings`);
          // Slightly slower rate for non-English languages for better pronunciation
          utterance.rate = voiceRate * 0.9;
          // Use Indian English voice if available (better for Indian languages)
          const indianEnglishVoice = availableVoices.find(v => v.lang === 'en-IN');
          if (indianEnglishVoice) {
            utterance.voice = indianEnglishVoice;
          }
        }
      }
    } else {
      // For English, use selected voice or default to English
      if (selectedVoice) {
        const voice = availableVoices.find(v => v.name === selectedVoice);
    if (voice) {
      utterance.voice = voice;
        }
    } else {
        // Default English voice selection
        const englishVoice = availableVoices.find(v => v.lang === 'en-US' || v.lang === 'en-GB') || 
                          availableVoices.find(v => v.lang.startsWith('en')) || 
                          availableVoices[0];
        
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
      }
    }
    
    // Add event handlers to track speech status
    utterance.onstart = () => console.log("Speech started");
    utterance.onend = () => console.log("Speech ended");
    utterance.onerror = (e) => console.error("Speech error:", e);
    
    // Set utterance language explicitly
    utterance.lang = langCode === 'te' ? 'te-IN' : 
                    langCode === 'hi' ? 'hi-IN' : 'en-US';
    
    // Speak
    window.speechSynthesis.speak(utterance);
  }, [currentLanguage.code, voiceRate, voicePitch, selectedVoice, availableVoices]);
  
  // Advanced process command with auto language switching
  const processCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;
    
    setIsProcessing(true);
    
    // Auto-detect language and suggest switching if needed
    const detectedLang = detectLanguage(command);
    if (detectedLang && detectedLang !== currentLanguage.code) {
      const langName = languages.find(l => l.code === detectedLang)?.name || detectedLang;
      
      // Suggest language switch
      const suggestLangSwitch = () => {
        setMessages(prev => [...prev, {
          type: 'ai',
          text: t('voiceAssistant.languageDetected', 'I detected {{language}}. Would you like to switch to that language?', {language: langName}),
          time: new Date(),
          category: 'system'
        }]);
        
        // Add buttons for user to confirm language switch
        // This would be implemented in the UI
      };
      
      // For now, we'll just auto-switch if confident
      if (command.length > 20) { // Only auto-switch for longer phrases
        const foundLang = languages.find(l => l.code === detectedLang);
        if (foundLang) {
          changeLanguage(foundLang);
          toast.info(t('voiceAssistant.languageSwitched', 'Switched to {{language}}', {language: langName}));
        }
      }
    }
    
    // Add user message
    setMessages(prev => [...prev, {
      type: 'user',
      text: command,
      time: new Date()
    }]);
    
    try {
      // Add typing indicator
      setMessages(prev => [...prev, {
        type: 'ai',
        text: '...',
        time: new Date()
      }]);
      
      // Check if this is a founder-related query
      if (isFounderQuery(command)) {
        console.log("Founder query detected");
        const founderResponse = generateFounderResponse(command);
        
        // Remove typing indicator
        setMessages(prev => prev.filter(msg => msg.text !== '...'));
        
        // Add founder response
        setMessages(prev => [...prev, {
          type: 'ai',
          text: founderResponse,
          time: new Date()
        }]);
        
        // Speak response
        speakText(founderResponse);
      } else {
        // Get AI response for non-founder queries
        let response;
        
        // Use profile data if available
        if (userProfile) {
          const profileData = {
            location: userProfile?.location || '',
            farmType: userProfile?.farmType || '',
            crops: userProfile?.crops || [],
            soilType: userProfile?.soilType || ''
          };
          
          response = await getFarmingRecommendation(
            profileData,
            command,
            currentLanguage.code
          );
        } else {
          // Generic response
          response = await generateTextResponse(
            `${command} ${t('voiceAssistant.respondIn', 'Respond in')} ${currentLanguage.name}`
          );
        }
        
        // Remove typing indicator
        setMessages(prev => prev.filter(msg => msg.text !== '...'));
        
        // Add AI response
        setMessages(prev => [...prev, {
          type: 'ai',
          text: response,
          time: new Date()
        }]);
        
        // Speak response
        speakText(response);
      }
    } catch (err) {
      console.error("Error processing command:", err);
      
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.text !== '...'));
      
      // Add error message
      setMessages(prev => [...prev, {
        type: 'ai',
        text: t('voiceAssistant.error', 'Sorry, I could not process your request.'),
        time: new Date()
      }]);
      
    } finally {
      setIsProcessing(false);
    }
  }, [userProfile, currentLanguage, t, speakText, detectLanguage, languages, changeLanguage]);
  
  // Setup audio visualization and monitoring
  const setupAudioMonitoring = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;
      
      // Create audio context and analyzer
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      // Setup audio level monitoring
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        if (!analyserRef.current || !isListening) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalizedLevel = Math.min(average / 128, 1);
        
        setAudioLevel(normalizedLevel);
        
        // Detect silence (low audio level for extended period)
        if (normalizedLevel < 0.05) {
          if (!silenceTimeoutRef.current) {
            silenceTimeoutRef.current = setTimeout(() => {
              console.log("Extended silence detected, restarting recognition");
              if (isListening && recognitionRef.current) {
                // Restart recognition after silence
                try {
                  recognitionRef.current.stop();
                  setTimeout(() => {
                    if (isListening) {
                      startListening();
                    }
                  }, 300);
                } catch (e) {
                  console.error("Error restarting after silence:", e);
                }
              }
              silenceTimeoutRef.current = null;
            }, 3000); // 3 seconds of silence
          }
        } else {
          // Reset silence timeout if audio detected
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        }
        
        // Continue monitoring if still listening
        if (isListening) {
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      requestAnimationFrame(updateAudioLevel);
      
      return true;
    } catch (error) {
      console.error("Failed to setup audio monitoring:", error);
      return false;
    }
  }, [isListening]);
  
  // Stop listening function
  const stopListening = useCallback(() => {
    // Clear any restart timeouts
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    // Clear any silence detection timeouts
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    // Stop the recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }
    
    setIsListening(false);
    setAudioLevel(0);
    recognitionAttemptsRef.current = 0;
  }, []);
  
  // Start speech recognition
  const startListening = useCallback(async () => {
    if (!speechSupported) {
      toast.error(t('voiceAssistant.notSupported', 'Speech recognition not supported in your browser'));
      return;
    }
    
    // Setup audio monitoring if not already set up
    if (!analyserRef.current) {
      const success = await setupAudioMonitoring();
      if (!success) {
        toast.error(t('voiceAssistant.micDenied', 'Microphone access denied'));
        return;
      }
    }
    
    try {
      setTranscript('');
      recognitionAttemptsRef.current += 1;
      
      // Create recognition instance
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Configure with optimal settings for better recognition
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3; // Get multiple alternatives
      
      // Set language
      const langMap: Record<string, string> = {
        'te': 'te-IN',
        'hi': 'hi-IN',
        'en': 'en-US'
      };
      
      const langCode = langMap[currentLanguage.code] || 'en-US';
      recognition.lang = langCode;
      console.log(`Speech recognition language set to: ${langCode}`);
      
      // Handle start
      recognition.onstart = () => {
        setIsListening(true);
        // Show a more prominent message on mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          toast.success(t('voiceAssistant.listeningMobile', "I'm listening... Tap the microphone again when you're done."), { duration: 3000 });
        } else {
          toast.success(t('voiceAssistant.listening', "I'm listening..."), { duration: 1500 });
        }
        console.log("Speech recognition started");
      };
      
      // Handle results with mobile-specific handling
      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          // Get the most confident transcript
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          console.log(`Recognition result: "${transcript}" (confidence: ${confidence.toFixed(2)})`);
          
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        
        // Update transcript
        if (interim) {
          setTranscript(interim);
          console.log("Interim transcript:", interim);
        }
        
        // Process final result
        if (final) {
          console.log("Final transcript:", final);
          setTranscript(final);
          
          // Adjust confidence threshold for mobile
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          const minConfidence = isMobile ? 0.3 : 0.5; // Lower threshold for mobile
          
          // Only process if confidence is reasonable or we've had multiple attempts
          const shouldProcess = recognitionAttemptsRef.current >= 3 || final.length > 5;
          
          if (shouldProcess) {
            stopListening();
            processCommand(final);
          } else {
            console.log("Low confidence or short transcript, trying again");
            // Try again without stopping
            setTranscript('');
          }
        }
      };
      
      // Handle errors with mobile-specific messages
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error, event);
        
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (event.error === 'not-allowed') {
          toast.error(t('voiceAssistant.micDenied', 'Microphone access denied'));
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          console.log("No speech detected");
          
          // If we've had too many no-speech errors, show a message
          if (recognitionAttemptsRef.current > 3) {
            const message = isMobile 
              ? t('voiceAssistant.noSpeechMobile', 'No speech detected. Please speak clearly and try again.')
              : t('voiceAssistant.noSpeech', 'No speech detected. Please try again.');
            toast.info(message);
          }
          
          // Restart recognition after a brief pause
          restartTimeoutRef.current = setTimeout(() => {
            if (isListening) {
              try {
                recognition.stop();
                setTimeout(() => {
                  if (isListening) {
                    startListening();
                  }
                }, 300);
              } catch (e) {
                console.error("Error restarting recognition:", e);
                setIsListening(false);
              }
            }
          }, 1000);
          
          return; // Don't set isListening to false
        } else if (event.error === 'aborted') {
          // User or system aborted, just log it
          console.log("Speech recognition aborted");
        } else if (event.error === 'network') {
          toast.error(t('voiceAssistant.networkError', 'Network error. Please check your connection.'));
        } else if (event.error === 'audio-capture') {
          const message = isMobile
            ? t('voiceAssistant.audioErrorMobile', 'Audio capture problem. Please check your microphone permissions in browser settings.')
            : t('voiceAssistant.audioError', 'Audio capture problem. Please check your microphone.');
          toast.error(message);
        } else {
          toast.error(t('voiceAssistant.recognitionError', 'Speech recognition error. Please try again.'));
        }
        
        setIsListening(false);
      };
      
      // Handle end
      recognition.onend = () => {
        console.log("Speech recognition ended");
        
        // If we're still supposed to be listening but recognition ended,
        // restart it (unless we're explicitly stopping)
        if (isListening && !restartTimeoutRef.current) {
          console.log("Recognition ended but we should still be listening, restarting...");
          restartTimeoutRef.current = setTimeout(() => {
            restartTimeoutRef.current = null;
            if (isListening) {
              startListening();
            }
          }, 300);
        } else {
          setIsListening(false);
        }
      };
      
      // Start recognition
      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
      toast.error(t('voiceAssistant.startFailed', 'Failed to start speech recognition'));
    }
  }, [speechSupported, currentLanguage.code, stopListening, processCommand, t, setupAudioMonitoring, isListening]);
  
  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      // Request microphone with better error handling
      if (navigator.mediaDevices?.getUserMedia) {
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };
        
        navigator.mediaDevices.getUserMedia(constraints)
          .then(stream => {
            // Store the stream for audio monitoring
            microphoneStreamRef.current = stream;
            startListening();
          })
          .catch(err => {
            console.error("Microphone error:", err);
            let errorMessage = t('voiceAssistant.micDenied', 'Microphone access denied');
            
            if (err.name === 'NotAllowedError') {
              errorMessage = t('voiceAssistant.micPermissionDenied', 'Please allow microphone access in your browser settings');
            } else if (err.name === 'NotFoundError') {
              errorMessage = t('voiceAssistant.micNotFound', 'No microphone found. Please connect a microphone and try again');
            } else if (err.name === 'NotReadableError') {
              errorMessage = t('voiceAssistant.micInUse', 'Microphone is in use by another application');
            }
            
            toast.error(errorMessage);
          });
      } else {
        toast.error(t('voiceAssistant.micNotSupported', 'Microphone access is not supported in your browser'));
      }
    }
  }, [isListening, startListening, stopListening, t]);
  
  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setTranscript('');
  }, []);
  
  // Audio visualization renderer based on selected type and current language
  const renderAudioVisualization = useCallback(() => {
    if (!isListening) return null;
    
    // Special visualizations for Telugu and Hindi
    if (currentLanguage.code === 'te' || currentLanguage.code === 'hi') {
      if (visualizationType === 'wave') {
  return (
          <div className="flex items-center justify-center h-6 gap-1">
            {Array.from({ length: 10 }).map((_, i) => {
              // More vibrant colors for Telugu and Hindi
              const bgColor = currentLanguage.code === 'te' 
                ? 'bg-orange-500 dark:bg-orange-600' 
                : 'bg-pink-500 dark:bg-pink-600';
                
              const randomHeight = 0.2 + (Math.sin((Date.now() / 400) + i) + 1) * 0.4 * audioLevel;
              return (
                <motion.div
                  key={i}
                  className={`w-1 ${bgColor} rounded-full`}
                  animate={{
                    height: `${randomHeight * 24}px`
                  }}
                  transition={{ duration: 0.1 }}
                />
              );
            })}
          </div>
        );
      }
      
      if (visualizationType === 'circle') {
        // Cultural color themes based on language
        const colors = currentLanguage.code === 'te' 
          ? ['bg-orange-100', 'bg-orange-300', 'bg-orange-500']
          : ['bg-pink-100', 'bg-pink-300', 'bg-pink-500'];
          
        return (
          <div className="relative h-8 w-8 mx-auto">
            <motion.div
              className={`absolute inset-0 rounded-full ${colors[0]}`}
              animate={{
                scale: [1, 1 + audioLevel * 0.5, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className={`absolute inset-0 rounded-full ${colors[1]} opacity-70`}
              animate={{
                scale: [1, 1 + audioLevel * 0.3, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 1,
                ease: "easeInOut",
                delay: 0.2
              }}
            />
            <motion.div
              className={`absolute inset-0 rounded-full ${colors[2]}`}
              animate={{
                scale: [1, 1 + audioLevel * 0.1, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 0.8,
                ease: "easeInOut",
                delay: 0.4
              }}
            />
          </div>
        );
      }
      
      // Custom bar visualization for Telugu and Hindi
      const bgColorFromTo = currentLanguage.code === 'te'
        ? 'from-orange-500 to-yellow-500 dark:from-orange-600 dark:to-yellow-600'
        : 'from-pink-500 to-purple-500 dark:from-pink-600 dark:to-purple-600';
        
      return (
        <div className="w-full h-2 mb-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full bg-gradient-to-r ${bgColorFromTo}`}
            animate={{ width: `${audioLevel * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      );
    }
    
    // Default visualizations for other languages (original code)
    switch (visualizationType) {
      case 'wave':
        return (
          <div className="flex items-center justify-center h-6 gap-1">
            {Array.from({ length: 10 }).map((_, i) => {
              const randomHeight = 0.2 + (Math.sin((Date.now() / 500) + i) + 1) * 0.4 * audioLevel;
              return (
                <motion.div
                  key={i}
                  className="w-1 bg-green-500 rounded-full"
                  animate={{
                    height: `${randomHeight * 24}px`
                  }}
                  transition={{ duration: 0.1 }}
                />
              );
            })}
          </div>
        );
        
      case 'circle':
        return (
          <div className="relative h-8 w-8 mx-auto">
            <motion.div
              className="absolute inset-0 rounded-full bg-green-100"
              animate={{
                scale: [1, 1 + audioLevel * 0.5, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full bg-green-300 opacity-70"
              animate={{
                scale: [1, 1 + audioLevel * 0.3, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 1,
                ease: "easeInOut",
                delay: 0.2
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full bg-green-500"
              animate={{
                scale: [1, 1 + audioLevel * 0.1, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 0.8,
                ease: "easeInOut",
                delay: 0.4
              }}
            />
          </div>
        );
        
      case 'bar':
      default:
        return (
          <div className="w-full h-2 mb-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-green-500"
              animate={{ width: `${audioLevel * 100}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        );
    }
  }, [isListening, audioLevel, visualizationType, currentLanguage.code]);

  // Settings panel component
  const SettingsPanel = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="border-t border-gray-200 dark:border-gray-700 p-4"
    >
      <h3 className="font-medium mb-3 text-gray-800 dark:text-gray-200">{t('voiceAssistant.settings', 'Settings')}</h3>
      
      {/* Language Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {t('voiceAssistant.language', 'Language')}
        </label>
        <div className="flex flex-wrap gap-2">
          {languages.map(lang => {
            // Flag emoji for languages
            const flagEmoji = lang.code === 'en' ? '🇬🇧' : 
                            lang.code === 'hi' ? '🇮🇳' : 
                            lang.code === 'te' ? '🇮🇳' : '';
            
            return (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang)}
                className={cn(
                  "px-2 py-1 text-xs rounded-md flex items-center gap-1 transition-all shadow-sm",
                  currentLanguage.code === lang.code
                    ? "bg-gradient-to-r from-indigo-100 via-purple-50 to-pink-50 text-purple-800 dark:from-indigo-900/70 dark:via-purple-900/70 dark:to-pink-900/70 dark:text-purple-100 border border-purple-200 dark:border-purple-800/50"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 border border-transparent"
                )}
              >
                <span className="text-base">{flagEmoji}</span>
                <span className="font-medium">{lang.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Voice Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {t('voiceAssistant.voice', 'Voice')}
        </label>
        <select
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        >
          <option value="">{t('voiceAssistant.systemDefault', 'System Default')}</option>
          {availableVoices
            .filter(voice => voice.lang.startsWith(currentLanguage.code) || voice.lang.startsWith('en'))
            .map(voice => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))
          }
        </select>
      </div>
      
      {/* Voice Rate */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {t('voiceAssistant.rate', 'Speech Rate')}: {voiceRate.toFixed(1)}
        </label>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={voiceRate}
          onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>
      
      {/* Voice Pitch */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {t('voiceAssistant.pitch', 'Speech Pitch')}: {voicePitch.toFixed(1)}
        </label>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          value={voicePitch}
          onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>
      
      {/* Visualization Type */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {t('voiceAssistant.visualization', 'Audio Visualization')}
        </label>
        <div className="flex gap-2">
          {['bar', 'wave', 'circle'].map(type => (
            <button
              key={type}
              onClick={() => setVisualizationType(type as any)}
              className={cn(
                "px-3 py-1 text-sm rounded-md border",
                visualizationType === type
                  ? "bg-green-100 border-green-500 text-green-800 dark:bg-green-900 dark:text-green-100"
                  : "bg-white border-gray-300 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-100"
              )}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Theme Toggle */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {t('voiceAssistant.theme', 'Theme')}
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setTheme('light')}
            className={cn(
              "px-3 py-1 text-sm rounded-md border flex items-center",
              theme === 'light'
                ? "bg-blue-100 border-blue-500 text-blue-800"
                : "bg-white border-gray-300 hover:bg-gray-200"
            )}
          >
            <Sun size={14} className="mr-1" /> {t('voiceAssistant.light', 'Light')}
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={cn(
              "px-3 py-1 text-sm rounded-md border flex items-center",
              theme === 'dark'
                ? "bg-purple-100 border-purple-500 text-purple-800 dark:bg-purple-900 dark:text-purple-100"
                : "bg-white border-gray-300 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-100"
            )}
          >
            <Moon size={14} className="mr-1" /> {t('voiceAssistant.dark', 'Dark')}
          </button>
          <button
            onClick={() => setTheme('system')}
            className={cn(
              "px-3 py-1 text-sm rounded-md border",
              theme === 'system'
                ? "bg-gray-100 border-gray-500 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
                : "bg-white border-gray-300 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-100"
            )}
          >
            {t('voiceAssistant.system', 'System')}
          </button>
        </div>
      </div>
    </motion.div>
  );

  // History panel component
  const HistoryPanel = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="border-t border-gray-200 dark:border-gray-700 p-4 max-h-[300px] overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-gray-800 dark:text-gray-200">
          {t('voiceAssistant.history', 'Conversation History')}
        </h3>
        <button
          onClick={() => {
            localStorage.removeItem('voiceAssistantHistory');
            setConversationHistory([]);
            toast.success(t('voiceAssistant.historyCleared', 'History cleared'));
          }}
          className="text-xs text-red-500 hover:text-red-700 flex items-center"
        >
          <Trash2 size={12} className="mr-1" />
          {t('voiceAssistant.clearAll', 'Clear All')}
        </button>
      </div>
      
      {conversationHistory.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          {t('voiceAssistant.noHistory', 'No conversation history yet')}
        </p>
      ) : (
        <div className="space-y-2">
          {conversationHistory.map(conv => (
            <button
              key={conv.id}
              onClick={() => {
                setMessages(conv.messages);
                localStorage.setItem('currentConversationId', conv.id);
                setShowHistory(false);
              }}
              className="w-full text-left p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors"
            >
              <div className="font-medium truncate">{conv.title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(conv.date).toLocaleDateString()} · {conv.messages.length} messages
              </div>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when the assistant is open
      if (!isOpen) return;
      
      // Escape key closes the assistant
      if (e.key === 'Escape') {
        setIsOpen(false);
        stopListening();
        window.speechSynthesis?.cancel();
      }
      
      // Space toggles listening when not in an input/textarea
      if (e.key === ' ' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        toggleListening();
      }
      
      // F key toggles fullscreen
      if (e.key === 'f' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
      }
      
      // S key opens settings
      if (e.key === 's' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setShowSettings(prev => !prev);
        setShowHistory(false);
      }
      
      // H key opens history
      if (e.key === 'h' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setShowHistory(prev => !prev);
        setShowSettings(false);
      }
      
      // C key clears messages
      if (e.key === 'c' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        clearMessages();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, stopListening, toggleListening, clearMessages]);

  // Load saved positions on component mount
  useEffect(() => {
    const savedPosition = localStorage.getItem('voiceAssistantPosition');
    const savedButtonPosition = localStorage.getItem('voiceAssistantButtonPosition');
    
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
      } catch (err) {
        console.error('Error parsing saved position', err);
      }
    }
    
    if (savedButtonPosition) {
      try {
        const pos = JSON.parse(savedButtonPosition);
        setButtonPosition(pos);
      } catch (err) {
        console.error('Error parsing saved button position', err);
      }
    }
  }, []);

  return (
    <>
      {/* Voice Assistant Dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            className={cn(
              "fixed bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden z-50",
              isFullscreen
                ? "inset-4 h-auto w-auto"
                : "w-[90vw] md:w-[400px] h-[500px] max-h-[80vh]"
            )}
            style={{
              bottom: isFullscreen ? undefined : '5rem',
              right: isFullscreen ? undefined : '2rem',
              x: isFullscreen ? 0 : position.x,
              y: isFullscreen ? 0 : position.y
            }}
            drag={!isFullscreen}
            dragConstraints={{ left: -300, right: 300, top: -300, bottom: 100 }}
            dragElastic={0.1}
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => {
              setIsDragging(false);
              // Save position in localStorage for persistence
              localStorage.setItem('voiceAssistantPosition', JSON.stringify(position));
            }}
            onDrag={(event, info) => {
              setPosition({ 
                x: position.x + info.delta.x, 
                y: position.y + info.delta.y 
              });
            }}
          >
            {/* Header - Draggable Handle */}
            <div 
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 text-white p-3 flex justify-between items-center cursor-move"
              onPointerDown={(e) => {
                if (!isFullscreen) {
                  dragControls.start(e);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <img 
                    src={logoImage} 
                    alt="SmartAgroX" 
                    className="w-8 h-8 rounded-full object-cover drop-shadow-md" 
                  />
                  <span className="absolute -inset-1 bg-white/20 rounded-full blur-sm animate-pulse opacity-60"></span>
                </div>
                <h3 className="font-semibold">
                  {t('voiceAssistant.title', 'Voice Assistant')}
                  <span className="ml-2 text-xs opacity-80 bg-white/20 px-1.5 py-0.5 rounded-full">
                    {currentLanguage.code === 'en' ? 'EN' : 
                     currentLanguage.code === 'hi' ? 'हिंदी' : 
                     currentLanguage.code === 'te' ? 'తెలుగు' : 
                     currentLanguage.code}
                  </span>
                </h3>
              </div>
              
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowHistory(prev => !prev)}
                  className="rounded-full hover:bg-white/20 p-1.5 flex items-center"
                  title={`${t('voiceAssistant.history', 'History')} (H)`}
                >
                  <History size={16} />
                </button>
                
                <button 
                  onClick={() => setShowSettings(prev => !prev)}
                  className={cn(
                    "rounded-full hover:bg-white/20 p-1.5 flex items-center",
                    showSettings && "bg-white/20"
                  )}
                  title={`${t('voiceAssistant.settings', 'Settings')} (S)`}
                >
                  <Settings size={16} />
                </button>
                
                <button 
                  onClick={() => setIsFullscreen(prev => !prev)}
                  className="rounded-full hover:bg-white/20 p-1.5 flex items-center"
                  title={isFullscreen 
                    ? `${t('voiceAssistant.minimize', 'Minimize')} (F)` 
                    : `${t('voiceAssistant.maximize', 'Maximize')} (F)`}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                
                <button 
                  onClick={clearMessages}
                  className="rounded-full hover:bg-white/20 p-1.5 flex items-center"
                  title={`${t('voiceAssistant.clear', 'Clear conversation')} (C)`}
                >
                  <Trash2 size={16} />
                </button>
                
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    stopListening();
                    window.speechSynthesis?.cancel();
                  }}
                  className="rounded-full hover:bg-white/20 p-1.5 flex items-center"
                  title={`${t('voiceAssistant.close', 'Close')} (Esc)`}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            {/* Messages container and other content */}
            <div 
              ref={containerRef}
              className={cn(
                "p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900",
                isFullscreen 
                  ? "h-[calc(100%-190px)]" 
                  : "h-[calc(100%-130px)]",
                showSettings && "h-[calc(100%-420px)]",
                showHistory && "h-[calc(100%-430px)]"
              )}
            >
              {/* Welcome message when empty */}
              {messages.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <img 
                    src={logoImage} 
                    alt="SmartAgroX" 
                    className="mx-auto mb-3 h-20 w-20 opacity-70" 
                  />
                  <p className="mb-2">
                    {currentLanguage.code === 'en' && t('voiceAssistant.welcomeEnhanced', 'Welcome to Enhanced Voice Assistant')}
                    {currentLanguage.code === 'hi' && "स्मार्ट वॉयस असिस्टेंट में आपका स्वागत है"}
                    {currentLanguage.code === 'te' && "స్మార్ట్ వాయిస్ అసిస్టెంట్‌కు స్వాగతం"}
                  </p>
                  <p className="text-sm opacity-70">
                    {t('voiceAssistant.tapMic', 'Tap the microphone button and speak to ask about farming.')}
                  </p>
                  <div className="grid grid-cols-1 gap-2 max-w-xs mx-auto mt-4">
                    <button 
                      onClick={() => processCommand(t('voiceAssistant.sampleQuery2', 'Who is the founder of SmartAgroX?'))}
                      className="text-sm p-2 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors text-green-700 dark:text-green-300"
                    >
                      {t('voiceAssistant.sampleQuery2', 'Who is the founder of SmartAgroX?')}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Conversation */}
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "p-3 rounded-lg max-w-[90%] break-words transition-all",
                      msg.type === 'user' 
                        ? "bg-blue-50 dark:bg-blue-900/30 ml-auto" 
                        : msg.category === 'system'
                        ? "bg-gray-100 dark:bg-gray-800/50 mr-auto"
                        : "bg-green-50 dark:bg-green-900/30 mr-auto",
                      msg.text === '...' && "animate-pulse"
                    )}
                  >
                    {msg.text === '...' ? (
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
                          {msg.type === 'user' ? t('voiceAssistant.you', 'You') : t('voiceAssistant.assistant', 'Assistant')}
                        </div>
                        <div className="dark:text-gray-100">{msg.text}</div>
                        {msg.type === 'ai' && (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => speakText(msg.text)}
                              className="text-xs flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                              <Volume2 size={12} className="mr-1" />
                              {t('voiceAssistant.speak', 'Speak')}
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(msg.text)
                                  .then(() => toast.success(t('voiceAssistant.copied', 'Copied to clipboard')))
                                  .catch(() => toast.error(t('voiceAssistant.copyFailed', 'Failed to copy')));
                              }}
                              className="text-xs flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 w-3 h-3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                              {t('voiceAssistant.copy', 'Copy')}
                            </button>
                            <button
                              onClick={() => {
                                if (navigator.share) {
                                  navigator.share({
                                    text: msg.text
                                  }).catch(console.error);
                                } else {
                                  navigator.clipboard.writeText(msg.text)
                                    .then(() => toast.success(t('voiceAssistant.copied', 'Copied to clipboard')))
                                    .catch(() => toast.error(t('voiceAssistant.copyFailed', 'Failed to copy')));
                                }
                              }}
                              className="text-xs flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                              <Share size={12} className="mr-1" />
                              {t('voiceAssistant.share', 'Share')}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Transcript */}
              {transcript && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('voiceAssistant.listening', 'Listening')}:</div>
                  <div className="italic dark:text-blue-100">{transcript}</div>
                </div>
              )}

            </div>
            
            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && <SettingsPanel />}
            </AnimatePresence>
            
            {/* History Panel */}
            <AnimatePresence>
              {showHistory && <HistoryPanel />}
            </AnimatePresence>
            
            {/* Controls */}
            <div className="border-t border-gray-200 dark:border-gray-800 p-4 flex flex-col items-center">
              {/* Audio level visualization */}
              {isListening && renderAudioVisualization()}
              
              {/* Microphone button */}
              <button
                onClick={toggleListening}
                disabled={isProcessing}
                className={cn(
                  "rounded-full w-16 h-16 flex items-center justify-center transition-all shadow-lg",
                  isListening 
                    ? "bg-red-500 text-white animate-pulse" 
                    : "bg-green-500 text-white hover:bg-green-600",
                  isProcessing ? "opacity-50 cursor-not-allowed" : "",
                  "transition-transform transform hover:scale-105 active:scale-95 relative overflow-hidden border-2 border-white/40 dark:border-white/20"
                )}
                title={`${t('voiceAssistant.toggleListening', 'Toggle listening')} (Space)`}
              >
                {isListening ? (
                  <MicOff className="h-7 w-7 text-white drop-shadow-lg relative z-10" />
                ) : (
                  <Mic className="h-7 w-7 text-white drop-shadow-lg relative z-10" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Floating Button with Popup Message */}
      <motion.div 
        className="fixed z-50"
        style={{ 
          bottom: '5rem', 
          right: '1.5rem',
          x: buttonPosition.x,
          y: buttonPosition.y
        }}
        drag
        dragConstraints={{ left: -300, right: 300, top: -300, bottom: 100 }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => {
          setIsDragging(false);
          // Save position for persistence
          localStorage.setItem('voiceAssistantButtonPosition', JSON.stringify(buttonPosition));
        }}
        onDrag={(event, info) => {
          setButtonPosition({ 
            x: buttonPosition.x + info.delta.x, 
            y: buttonPosition.y + info.delta.y 
          });
        }}
      >
        {/* Popup Message */}
        <AnimatePresence>
          {!isOpen && !isDragging && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 whitespace-nowrap"
              style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
            >
              <div className="flex items-center gap-2">
                <img 
                  src={logoImage} 
                  alt="SmartAgroX" 
                  className="w-7 h-7 rounded-full object-cover" 
                />
                <span>Ask me anything about farming!</span>
              </div>
              <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-3 h-3 bg-white dark:bg-gray-800"></div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Enhanced Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (!isOpen) {
              setIsOpen(true);
              
              // Auto-focus the input field when opening
              setTimeout(() => {
                const inputEl = document.getElementById('voice-assistant-input');
                if (inputEl) inputEl.focus();
              }, 300);
              
              // Track usage
              try {
                if (currentUser) {
                  // Track voice assistant usage in analytics or user profile
                }
              } catch (error) {
                console.error("Error tracking voice assistant usage:", error);
              }
            } else {
              setIsOpen(false);
              stopListening();
              window.speechSynthesis?.cancel();
            }
          }}
          className="group relative bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center"
          aria-label={isOpen ? t('voiceAssistant.close', 'Close voice assistant') : t('voiceAssistant.open', 'Open voice assistant')}
        >
          {/* Animated rings */}
          <span className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-125 transition-transform duration-500 ease-out opacity-0 group-hover:opacity-100"></span>
          <span className="absolute inset-0 rounded-full bg-white/10 scale-0 group-hover:scale-150 transition-transform duration-700 ease-out opacity-0 group-hover:opacity-100 delay-100"></span>
          
          {/* Logo with background */}
          <div className="relative z-10 bg-white rounded-full p-1.5 overflow-hidden">
            <img 
              src={logoImage} 
              alt="SmartAgroX" 
              className="w-8 h-8 rounded-full object-cover" 
            />
            <span className="absolute inset-0 bg-gradient-to-r from-green-200 to-emerald-300 opacity-30"></span>
          </div>
          
          {/* Pulse animation when not open */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full animate-ping bg-green-500/30 duration-1000"></span>
          )}
        </motion.button>
      </motion.div>
    </>
  );
};

export default VoiceAssistant;