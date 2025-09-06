import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Send, 
  X, 
  Volume2, 
  VolumeX, 
  MessageSquare,
  Bot,
  User,
  Copy,
  Share,
  Globe,
  ChevronDown,
  Sparkles,
  Languages,
  Navigation,
  Heart,
  Camera,
  Shield,
  Home,
  Brain,
  Activity,
  Droplet,
  Scan,
  Play,
  Pause,
  Move
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { toast } from 'sonner';
import { generateTextResponse } from '../../services/geminiService';
import { setupGeminiClient } from '../../config/geminiConfig';

// Speech Recognition type
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Utility function for class names
const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  language: string;
  audioUrl?: string;
}

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' }
];

const AGRICULTURE_TOPICS = {
  en: {
    crop_management: "Crop Management",
    soil_health: "Soil Health", 
    pest_control: "Pest Control",
    irrigation: "Irrigation Systems",
    weather: "Weather Information",
    market_prices: "Market Prices"
  },
  hi: {
    crop_management: "फसल प्रबंधन",
    soil_health: "मिट्टी का स्वास्थ्य",
    pest_control: "कीट नियंत्रण",
    irrigation: "सिंचाई प्रणाली",
    weather: "मौसम की जानकारी",
    market_prices: "बाजार मूल्य"
  }
};

const NAVIGATION_RESPONSES = {
  en: {
    home: "I'll take you to the home dashboard where you can see all farming features.",
    soilLab: "Opening Soil Laboratory for soil analysis and testing.",
    cropAdvisor: "Starting Crop Advisor for personalized crop recommendations.",
    agroLab: "Opening AgroLab for disease detection and plant analysis.",
    market: "Accessing Market Prices for latest commodity rates.",
    weather: "Opening Weather section for agricultural forecasts.",
    agroVision: "Starting AgroVision for satellite crop monitoring.",
    profile: "Opening your farmer profile and settings.",
    founders: "Taking you to meet our founders page."
  },
  hi: {
    home: "मैं आपको होम डैशबोर्ड पर ले जाऊंगा जहां आप सभी कृषि सुविधाएं देख सकते हैं।",
    soilLab: "मिट्टी विश्लेषण और परीक्षण के लिए मिट्टी प्रयोगशाला खोल रहा हूं।",
    cropAdvisor: "व्यक्तिगत फसल सिफारिशों के लिए फसल सलाहकार शुरू कर रहा हूं।",
    agroLab: "रोग का पता लगाने और पौधे के विश्लेषण के लिए एग्रो लैब खोल रहा हूं।",
    market: "नवीनतम कमोडिटी दरों के लिए बाजार मूल्य तक पहुंच रहा हूं।",
    weather: "कृषि पूर्वानुमान के लिए मौसम अनुभाग खोल रहा हूं।",
    agroVision: "उपग्रह फसल निगरानी के लिए एग्रो विजन शुरू कर रहा हूं।",
    profile: "आपकी किसान प्रोफाइल और सेटिंग्स खोल रहा हूं।",
    founders: "आपको हमारे संस्थापकों से मिलने के पृष्ठ पर ले जा रहा हूं।"
  },
  or: {
    home: "ମୁଁ ଆପଣଙ୍କୁ ହୋମ ଡ୍ୟାସବୋର୍ଡକୁ ନେଇଯିବି ଯେଉଁଠାରେ ଆପଣ ସମସ୍ତ କୃଷି ସୁବିଧା ଦେଖିପାରିବେ।",
    soilLab: "ମାଟି ବିଶ୍ଳେଷଣ ଏବଂ ପରୀକ୍ଷା ପାଇଁ ମାଟି ଲାବୋରେଟୋରୀ ଖୋଲୁଛି।",
    cropAdvisor: "ବ୍ୟକ୍ତିଗତ ଫସଲ ସୁପାରିଶ ପାଇଁ ଫସଲ ପରାମର୍ଶଦାତା ଆରମ୍ଭ କରୁଛି।",
    agroLab: "ରୋଗ ଚିହ୍ନଟ ଏବଂ ଉଦ୍ଭିଦ ବିଶ୍ଳେଷଣ ପାଇଁ ଆଗ୍ରୋ ଲାବ ଖୋଲୁଛି।",
    market: "ସର୍ବଶେଷ ଦ୍ରବ୍ୟ ମୂଲ୍ୟ ପାଇଁ ବଜାର ମୂଲ୍ୟ ଆକ୍ସେସ କରୁଛି।",
    weather: "କୃଷି ପୂର୍ବାନୁମାନ ପାଇଁ ପାଣିପାଗ ବିଭାଗ ଖୋଲୁଛି।",
    agroVision: "ଉପଗ୍ରହ ଫସଲ ନିରୀକ୍ଷଣ ପାଇଁ ଆଗ୍ରୋ ଭିଜନ ଆରମ୍ଭ କରୁଛି।",
    profile: "ଆପଣଙ୍କ କୃଷକ ପ୍ରୋଫାଇଲ ଏବଂ ସେଟିଂସ ଖୋଲୁଛି।",
    founders: "ଆପଣଙ୍କୁ ଆମର ପ୍ରତିଷ୍ଠାତାମାନଙ୍କ ସହିତ ସାକ୍ଷାତ ପୃଷ୍ଠାକୁ ନେଇଯାଉଛି।"
  },
  bn: {
    home: "আমি আপনাকে হোম ড্যাশবোর্ডে নিয়ে যাব যেখানে আপনি সমস্ত কৃষি বৈশিষ্ট্য দেখতে পাবেন।",
    soilLab: "মাটি বিশ্লেষণ এবং পরীক্ষার জন্য মাটি ল্যাবরেটরি খুলছি।",
    cropAdvisor: "ব্যক্তিগত ফসল সুপারিশের জন্য ফসল পরামর্শদাতা শুরু করছি।",
    agroLab: "রোগ সনাক্তকরণ এবং উদ্ভিদ বিশ্লেষণের জন্য অ্যাগ্রো ল্যাব খুলছি।",
    market: "সর্বশেষ পণ্যের হারের জন্য বাজার মূল্য অ্যাক্সেস করছি।",
    weather: "কৃষি পূর্বাভাসের জন্য আবহাওয়া বিভাগ খুলছি।",
    agroVision: "স্যাটেলাইট ফসল পর্যবেক্ষণের জন্য অ্যাগ্রো ভিশন শুরু করছি।",
    profile: "আপনার কৃষক প্রোফাইল এবং সেটিংস খুলছি।",
    founders: "আপনাকে আমাদের প্রতিষ্ঠাতাদের সাথে দেখা করার পৃষ্ঠায় নিয়ে যাচ্ছি।"
  },
  te: {
    home: "నేను మిమ్మల్ని హోম్ డ్యాష్‌బోర్డ్‌కు తీసుకెళ్తాను అక్కడ మీరు అన్ని వ్యవసాయ లక్షణాలను చూడవచ్చు।",
    soilLab: "మట్టి విశ్లేషణ మరియు పరీక్ష కోసం మట్టి ప్రయోగశాలను తెరుస్తున్నాను।",
    cropAdvisor: "వ్యక్తిగత పంట సిఫార్సుల కోసం పంట సలహాదారుని ప్రారంభిస్తున్నాను।",
    agroLab: "వ్యాధి గుర్తింపు మరియు మొక్కల విశ్లేషణ కోసం అగ్రో ల్యాబ్‌ను తెరుస్తున్నాను।",
    market: "తాజా వస్తువుల రేట్ల కోసం మార్కెట్ ధరలను యాక్సెస్ చేస్తున్నాను।",
    weather: "వ్యవసాయ అంచనాల కోసం వాతావరణ విభాగాన్ని తెరుస్తున్నాను।",
    agroVision: "ఉపగ్రహ పంట పర్యవేక్షణ కోసం అగ్రో విజన్‌ను ప్రారంభిస్తున్నాను।",
    profile: "మీ రైతు ప్రొఫైల్ మరియు సెట్టింగ్‌లను తెరుస్తున్నాను।",
    founders: "మిమ్మల్ని మా వ్యవస్థాపకులను కలవడానికి పేజీకి తీసుకెళ్తున్నాను।"
  },
  ta: {
    home: "நான் உங்களை ஹோம் டாஷ்போர்டுக்கு அழைத்துச் செல்வேன், அங்கு நீங்கள் அனைத்து விவசாய அம்சங்களையும் காணலாம்.",
    soilLab: "மண் பகுப்பாய்வு மற்றும் சோதனைக்காக மண் ஆய்வகத்தைத் திறக்கிறேன்.",
    cropAdvisor: "தனிப்பட்ட பயிர் பரிந்துரைகளுக்காக பயிர் ஆலோசகரைத் தொடங்குகிறேன்.",
    agroLab: "நோய் கண்டறிதல் மற்றும் தாவர பகுப்பாய்வுக்காக அக்ரோ லேபைத் திறக்கிறேன்.",
    market: "சமீபத்திய பொருட்களின் விலைகளுக்காக சந்தை விலைகளை அணுகுகிறேன்.",
    weather: "விவசாய முன்னறிவிப்புகளுக்காக வானிலை பிரிவைத் திறக்கிறேன்.",
    agroVision: "செயற்கைக்கோள் பயிர் கண்காணிப்புக்காக அக்ரோ விஷனைத் தொடங்குகிறேன்.",
    profile: "உங்கள் விவசாயி சுயவிவரம் மற்றும் அமைப்புகளைத் திறக்கிறேன்.",
    founders: "எங்கள் நிறுவனர்களைச் சந்திக்கும் பக்கத்திற்கு உங்களை அழைத்துச் செல்கிறேன்."
  },
  mr: {
    home: "मी तुम्हाला होम डॅशबोर्डवर घेऊन जाईन जिथे तुम्ही सर्व शेती वैशिष्ट्ये पाहू शकता.",
    soilLab: "माती विश्लेषण आणि चाचणीसाठी माती प्रयोगशाळा उघडत आहे.",
    cropAdvisor: "वैयक्तिक पीक शिफारशींसाठी पीक सल्लागार सुरू करत आहे.",
    agroLab: "रोग ओळख आणि वनस्पती विश्लेषणासाठी अॅग्रो लॅब उघडत आहे.",
    market: "नवीनतम वस्तूंच्या दरांसाठी बाजार किमती मिळवत आहे.",
    weather: "कृषी हवामान अंदाजासाठी हवामान विभाग उघडत आहे.",
    agroVision: "उपग्रह पीक निरीक्षणासाठी अॅग्रो व्हिजन सुरू करत आहे.",
    profile: "तुमची शेतकरी प्रोफाइल आणि सेटिंग्ज उघडत आहे.",
    founders: "तुम्हाला आमच्या संस्थापकांना भेटण्याच्या पानावर घेऊन जात आहे."
  },
  gu: {
    home: "હું તમને હોમ ડેશબોર્ડ પર લઈ જઈશ જ્યાં તમે બધી ખેતી સુવિધાઓ જોઈ શકો છો.",
    soilLab: "માટી વિશ્લેષણ અને પરીક્ષણ માટે માટી પ્રયોગશાળા ખોલી રહ્યો છું.",
    cropAdvisor: "વ્યક્તિગત પાક ભલામણો માટે પાક સલાહકાર શરૂ કરી રહ્યો છું.",
    agroLab: "રોગ ઓળખ અને છોડ વિશ્લેષણ માટે એગ્રો લેબ ખોલી રહ્યો છું.",
    market: "નવીનતમ કોમોડિટી દરો માટે બજાર કિંમતો એક્સેસ કરી રહ્યો છું.",
    weather: "કૃષિ આગાહી માટે હવામાન વિભાગ ખોલી રહ્યો છું.",
    agroVision: "સેટેલાઇટ પાક મોનિટરિંગ માટે એગ્રો વિઝન શરૂ કરી રહ્યો છું.",
    profile: "તમારી ખેડૂત પ્રોફાઇલ અને સેટિંગ્સ ખોલી રહ્યો છું.",
    founders: "તમને અમારા સ્થાપકોને મળવાના પેજ પર લઈ જઈ રહ્યો છું."
  }
};

const AGRICULTURE_EDUCATION_CONTENT = {
  en: {
    soil_health: "Healthy soil is the foundation of productive farming. Test soil pH regularly, add organic matter like compost, and practice crop rotation to maintain soil fertility.",
    pest_control: "Integrated Pest Management (IPM) combines biological, cultural, and chemical methods. Use beneficial insects, crop rotation, and targeted pesticides only when necessary.",
    irrigation: "Efficient irrigation saves water and improves yields. Consider drip irrigation, mulching, and soil moisture monitoring to optimize water usage.",
    crop_rotation: "Rotating crops breaks pest cycles, improves soil health, and increases biodiversity. Plan rotations based on plant families and nutrient requirements.",
    organic_farming: "Organic farming uses natural methods to grow crops. Focus on composting, biological pest control, and avoiding synthetic chemicals."
  },
  hi: {
    soil_health: "स्वस्थ मिट्टी उत्पादक खेती की नींव है। नियमित रूप से मिट्टी का पीएच परीक्षण करें, कंपोस्ट जैसे जैविक पदार्थ जोड़ें, और मिट्टी की उर्वरता बनाए रखने के लिए फसल चक्र का अभ्यास करें।",
    pest_control: "एकीकृत कीट प्रबंधन (आईपीएम) जैविक, सांस्कृतिक और रासायनिक तरीकों को जोड़ता है। लाभकारी कीड़ों का उपयोग करें, फसल चक्र करें, और केवल आवश्यक होने पर लक्षित कीटनाशकों का उपयोग करें।",
    irrigation: "कुशल सिंचाई पानी की बचत करती है और उत्पादन में सुधार करती है। पानी के उपयोग को अनुकूलित करने के लिए ड्रिप सिंचाई, मल्चिंग और मिट्टी की नमी की निगरानी पर विचार करें।",
    crop_rotation: "फसल चक्र कीट चक्र को तोड़ता है, मिट्टी के स्वास्थ्य में सुधार करता है, और जैव विविधता बढ़ाता है। पौधों के परिवार और पोषक तत्वों की आवश्यकताओं के आधार पर चक्र की योजना बनाएं।",
    organic_farming: "जैविक खेती फसल उगाने के लिए प्राकृतिक तरीकों का उपयोग करती है। कंपोस्टिंग, जैविक कीट नियंत्रण, और सिंथेटिक रसायनों से बचने पर ध्यान दें।"
  }
};

export const VoiceAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [isGeminiReady, setIsGeminiReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: window.innerWidth * 0.7 - 40, y: window.innerHeight - 120 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showLabel, setShowLabel] = useState(true);
  
  const navigate = useNavigate();
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Format message with HTML structure for better display
  const formatMessage = (text: string): string => {
    let formatted = text.trim();
    
    // Format section headers with proper HTML structure
    formatted = formatted
      .replace(/🔍 \*\*Assessment:\*\*/g, '<div class="mb-4"><div class="flex items-center gap-2 mb-2 pb-1 border-b border-blue-200"><span class="text-lg">🔍</span><span class="font-semibold text-blue-600">Assessment</span></div><div class="text-gray-700 ml-6">')
      .replace(/💡 \*\*Key Points:\*\*/g, '</div></div><div class="mb-4"><div class="flex items-center gap-2 mb-2 pb-1 border-b border-green-200"><span class="text-lg">💡</span><span class="font-semibold text-green-600">Key Points</span></div><div class="text-gray-700 ml-6">')
      .replace(/🏥 \*\*When to see a doctor:\*\*/g, '</div></div><div class="mb-4"><div class="flex items-center gap-2 mb-2 pb-1 border-b border-orange-200"><span class="text-lg">🏥</span><span class="font-semibold text-orange-600">When to see a doctor</span></div><div class="text-gray-700 ml-6">')
      .replace(/💊 \*\*Prevention:\*\*/g, '</div></div><div class="mb-4"><div class="flex items-center gap-2 mb-2 pb-1 border-b border-purple-200"><span class="text-lg">💊</span><span class="font-semibold text-purple-600">Prevention</span></div><div class="text-gray-700 ml-6">')
      .replace(/⚠️ \*\*Important:\*\*/g, '</div></div><div class="mb-4"><div class="flex items-center gap-2 mb-2 pb-1 border-b border-red-200"><span class="text-lg">⚠️</span><span class="font-semibold text-red-600">Important</span></div><div class="text-gray-700 ml-6">');
    
    // Format bullet points
    formatted = formatted.replace(/• ([^\n]+)/g, '<div class="flex items-start gap-2 mb-2"><span class="text-emerald-500 mt-1 font-bold">•</span><span class="flex-1">$1</span></div>');
    
    // Handle line breaks and paragraphs
    formatted = formatted.replace(/\n\n/g, '</div><div class="mt-3">').replace(/\n/g, '<br>');
    
    // Close any remaining open divs
    if (formatted.includes('<div class="text-gray-700 ml-6">')) {
      formatted += '</div></div>';
    }
    
    // Wrap in container if no sections were found
    if (!formatted.includes('class="mb-4"')) {
      formatted = `<div class="text-gray-700 leading-relaxed">${formatted}</div>`;
    }
    
    return formatted;
  };

  // Get welcome message in current language
  const getWelcomeMessage = () => {
    const welcomeMessages = {
      en: "Hello! I'm your SmartAgroX agriculture assistant. I can help you navigate the app, provide farming advice, and answer questions in your preferred language. How can I help you today?",
      hi: "नमस्ते! मैं आपका स्मार्टएग्रोएक्स कृषि सहायक हूं। मैं आपको ऐप नेविगेट करने, कृषि सलाह प्रदान करने और आपकी पसंदीदा भाषा में प्रश्नों का उत्तर देने में मदद कर सकता हूं। आज मैं आपकी कैसे मदद कर सकता हूं?",
      or: "ନମସ୍କାର! ମୁଁ ଆପଣଙ୍କର ସ୍ମାର୍ଟଆଗ୍ରୋଏକ୍ସ କୃଷି ସହାୟକ। ମୁଁ ଆପଣଙ୍କୁ ଆପ୍ ନେଭିଗେଟ୍ କରିବାରେ, କୃଷି ପରାମର୍ଶ ପ୍ରଦାନ କରିବାରେ ଏବଂ ଆପଣଙ୍କ ପସନ୍ଦର ଭାଷାରେ ପ୍ରଶ୍ନର ଉତ୍ତର ଦେବାରେ ସାହାଯ୍ୟ କରିପାରିବି। ଆଜି ମୁଁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?",
      bn: "নমস্কার! আমি আপনার স্মার্টঅ্যাগ্রোএক্স কৃষি সহায়ক। আমি আপনাকে অ্যাপ নেভিগেট করতে, কৃষি পরামর্শ প্রদান করতে এবং আপনার পছন্দের ভাষায় প্রশ্নের উত্তর দিতে সাহায্য করতে পারি। আজ আমি কীভাবে সাহায্য করতে পারি?",
      te: "నమస్కారం! నేను మీ స్మార్ట్‌అగ్రోఎక్స్ వ్యవసాయ సహాయకుడిని। నేను మీకు యాప్ నావిగేట్ చేయడంలో, వ్యవసాయ సలహా అందించడంలో మరియు మీ ఇష్టమైన భాషలో ప్రశ్నలకు సమాధానం ఇవ్వడంలో సహాయపడగలను. ఈరోజు నేను ఎలా సహాయపడగలను?",
      ta: "வணக்கம்! நான் உங்கள் ஸ்மார்ட்அக்ரோஎக்ஸ் விவசாய உதவியாளர். நான் உங்களுக்கு ஆப்பை நேவிகேட் செய்ய, விவசாய ஆலோசனை வழங்க மற்றும் உங்கள் விருப்பமான மொழியில் கேள்விகளுக்கு பதிலளிக்க உதவ முடியும். இன்று நான் எப்படி உதவ முடியும்?",
      mr: "नमस्कार! मी तुमचा स्मार्टअॅग्रोएक्स कृषी सहाय्यक आहे। मी तुम्हाला अॅप नेव्हिगेट करण्यात, कृषी सल्ला देण्यात आणि तुमच्या आवडत्या भाषेत प्रश्नांची उत्तरे देण्यात मदत करू शकतो. आज मी कशी मदत करू शकतो?",
      gu: "નમસ્કાર! હું તમારો સ્માર્ટએગ્રોએક્સ કૃષિ સહાયક છું. હું તમને એપ્લિકેશન નેવિગેટ કરવામાં, કૃષિ સલાહ આપવામાં અને તમારી પસંદગીની ભાષામાં પ્રશ્નોના જવાબ આપવામાં મદદ કરી શકું છું. આજે હું કેવી રીતે મદદ કરી શકું?"
    };
    return welcomeMessages[currentLanguage.code as keyof typeof welcomeMessages] || welcomeMessages.en;
  };

  // Clean text for speech synthesis
  const cleanTextForSpeech = (text: string): string => {
    return text
      // Remove HTML tags completely
      .replace(/<[^>]*>/g, ' ')
      // Remove all markdown formatting
      .replace(/\*\*\*([^*]+)\*\*\*/g, '$1') // Bold italic
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
      .replace(/\*([^*]+)\*/g, '$1') // Italic
      .replace(/_([^_]+)_/g, '$1') // Underscore italic
      .replace(/`([^`]+)`/g, '$1') // Code
      .replace(/~~([^~]+)~~/g, '$1') // Strikethrough
      // Remove section markers and emojis
      .replace(/🔍\s*Assessment:?\s*/g, 'Assessment: ')
      .replace(/💡\s*Key Points:?\s*/g, 'Key Points: ')
      .replace(/🏥\s*When to see a doctor:?\s*/g, 'When to see a doctor: ')
      .replace(/💊\s*Prevention:?\s*/g, 'Prevention: ')
      .replace(/⚠️\s*Important:?\s*/g, 'Important: ')
      .replace(/🌱\s*/g, '')
      .replace(/🌾\s*/g, '')
      .replace(/🌤️\s*/g, '')
      .replace(/🏠\s*/g, '')
      // Replace bullet points with natural speech
      .replace(/•\s*/g, '. ')
      .replace(/\-\s*/g, '. ')
      .replace(/\+\s*/g, '. ')
      // Clean up headers and formatting
      .replace(/#+\s*/g, '')
      .replace(/>\s*/g, '')
      // Handle line breaks and spacing
      .replace(/\n\n+/g, '. ')
      .replace(/\n/g, '. ')
      .replace(/\s+/g, ' ')
      // Remove extra punctuation
      .replace(/\.+/g, '.')
      .replace(/\.\s*\./g, '.')
      .trim();
  };

  // Get proper language code for speech synthesis
  const getSpeechLanguageCode = (langCode: string): string => {
    const speechLanguageMap: { [key: string]: string } = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'or': 'hi-IN', // Fallback to Hindi as Odia might not be supported
      'bn': 'bn-IN',
      'te': 'te-IN',
      'ta': 'ta-IN',
      'mr': 'mr-IN',
      'gu': 'gu-IN'
    };
    return speechLanguageMap[langCode] || 'en-US';
  };

  // Get proper language code for speech recognition
  const getRecognitionLanguageCode = (langCode: string): string => {
    const recognitionLanguageMap: { [key: string]: string } = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'or': 'hi-IN', // Fallback to Hindi
      'bn': 'bn-IN',
      'te': 'te-IN',
      'ta': 'ta-IN',
      'mr': 'mr-IN',
      'gu': 'gu-IN'
    };
    return recognitionLanguageMap[langCode] || 'en-US';
  };

  // Initialize Gemini AI and speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthesisRef.current = window.speechSynthesis;
    }
    
    // Initialize Gemini client
    const initGemini = async () => {
      try {
        const success = await setupGeminiClient();
        setIsGeminiReady(success);
        if (!success) {
          console.warn('Gemini AI not available, voice assistant will work with limited functionality');
        }
      } catch (error) {
        console.error('Failed to initialize Gemini:', error);
        setIsGeminiReady(false);
      }
    };
    
    initGemini();

    // Add welcome message when opened
    if (isOpen && messages.length === 0) {
      addBotMessage(getWelcomeMessage());
    }

    // Keep label always visible - removed auto-hide timer
  }, [isOpen, currentLanguage]);

  // Handle button drag functionality
  const handleButtonMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - buttonPosition.x,
      y: e.clientY - buttonPosition.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Constrain to viewport (with padding for button size)
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 80;
      
      setButtonPosition({
        x: Math.max(20, Math.min(newX, maxX)),
        y: Math.max(20, Math.min(newY, maxY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      setIsOpen(true);
      // Keep label visible - removed setShowLabel(false)
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  // Add bot message
  const addBotMessage = (text: string) => {
    const message: Message = {
      id: Date.now().toString(),
      text: formatMessage(text),
      isBot: true,
      timestamp: new Date(),
      language: currentLanguage.code
    };
    setMessages(prev => [...prev, message]);
  };

  // Handle language change
  const handleLanguageChange = (language: Language) => {
    setCurrentLanguage(language);
    setShowLanguageSelector(false);
    const changeMessage = {
      en: `Language changed to ${language.nativeName}. How can I help you?`,
      hi: `भाषा ${language.nativeName} में बदल दी गई। मैं आपकी कैसे सहायता कर सकता हूं?`,
      or: `ଭାଷା ${language.nativeName} ରେ ପରିବର୍ତ୍ତନ କରାଗଲା। ମୁଁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?`,
      bn: `ভাষা ${language.nativeName} এ পরিবর্তন করা হয়েছে। আমি কীভাবে সাহায্য করতে পারি?`,
      te: `భాష ${language.nativeName} కు మార్చబడింది. నేను ఎలా సహాయం చేయగలను?`,
      ta: `மொழி ${language.nativeName} க்கு மாற்றப்பட்டது. நான் எப்படி உதவ முடியும்?`,
      mr: `भाषा ${language.nativeName} मध्ये बदलली. मी कशी मदत करू शकतो?`,
      gu: `ભાષા ${language.nativeName} માં બદલાઈ ગઈ. હું કેવી રીતે મદદ કરી શકું?`
    };
    addBotMessage(changeMessage[language.code as keyof typeof changeMessage] || changeMessage.en);
  };

  // Handle navigation commands
  const handleNavigation = useCallback((command: string) => {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('home') || lowerCommand.includes('dashboard')) {
      navigate('/');
      return NAVIGATION_RESPONSES[currentLanguage.code as keyof typeof NAVIGATION_RESPONSES]?.home || NAVIGATION_RESPONSES.en.home;
    }
    if (lowerCommand.includes('soil') || lowerCommand.includes('lab')) {
      navigate('/soil-lab');
      return NAVIGATION_RESPONSES[currentLanguage.code as keyof typeof NAVIGATION_RESPONSES]?.soilLab || NAVIGATION_RESPONSES.en.soilLab;
    }
    if (lowerCommand.includes('crop') || lowerCommand.includes('advisor')) {
      navigate('/crop-advisor');
      return NAVIGATION_RESPONSES[currentLanguage.code as keyof typeof NAVIGATION_RESPONSES]?.cropAdvisor || NAVIGATION_RESPONSES.en.cropAdvisor;
    }
    if (lowerCommand.includes('agro') || lowerCommand.includes('disease')) {
      navigate('/agro-lab');
      return NAVIGATION_RESPONSES[currentLanguage.code as keyof typeof NAVIGATION_RESPONSES]?.agroLab || NAVIGATION_RESPONSES.en.agroLab;
    }
    if (lowerCommand.includes('market') || lowerCommand.includes('price')) {
      navigate('/market');
      return NAVIGATION_RESPONSES[currentLanguage.code as keyof typeof NAVIGATION_RESPONSES]?.market || NAVIGATION_RESPONSES.en.market;
    }
    if (lowerCommand.includes('weather')) {
      navigate('/weather');
      return NAVIGATION_RESPONSES[currentLanguage.code as keyof typeof NAVIGATION_RESPONSES]?.weather || NAVIGATION_RESPONSES.en.weather;
    }
    if (lowerCommand.includes('vision') || lowerCommand.includes('satellite')) {
      navigate('/agro-vision');
      return NAVIGATION_RESPONSES[currentLanguage.code as keyof typeof NAVIGATION_RESPONSES]?.agroVision || NAVIGATION_RESPONSES.en.agroVision;
    }
    if (lowerCommand.includes('profile') || lowerCommand.includes('settings')) {
      navigate('/profile');
      return NAVIGATION_RESPONSES[currentLanguage.code as keyof typeof NAVIGATION_RESPONSES]?.profile || NAVIGATION_RESPONSES.en.profile;
    }
    if (lowerCommand.includes('founder') || lowerCommand.includes('about')) {
      navigate('/founders');
      return NAVIGATION_RESPONSES[currentLanguage.code as keyof typeof NAVIGATION_RESPONSES]?.founders || NAVIGATION_RESPONSES.en.founders;
    }
    
    return null;
  }, [navigate, currentLanguage]);

  // Generate AI response using Gemini
  const generateAIResponse = useCallback(async (userMessage: string) => {
    if (!isGeminiReady) {
      return currentLanguage.code === 'hi' 
        ? 'क्षमा करें, AI सेवा उपलब्ध नहीं है।' 
        : 'Sorry, AI service is not available.';
    }

    try {
      const prompt = `You are an AI assistant for SmartAgroX, an agriculture technology platform. 
      Respond in ${currentLanguage.name} language. 
      User message: "${userMessage}"
      
      Provide helpful, accurate agricultural advice. Keep responses concise and practical.
      Focus on: crop management, soil health, pest control, irrigation, weather, market prices, and sustainable farming practices.`;

      const response = await generateTextResponse(prompt);
      return response;
    } catch (error) {
      console.error('Error generating AI response:', error);
      return currentLanguage.code === 'hi' 
        ? 'क्षमा करें, मैं अभी आपकी मदद नहीं कर सकता।' 
        : 'Sorry, I cannot help you right now.';
    }
  }, [isGeminiReady, currentLanguage]);

  // Process user message
  const processMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      isBot: false,
      timestamp: new Date(),
      language: currentLanguage.code
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Check for navigation command first
      const navResponse = handleNavigation(message);
      let response = navResponse;

      // If no navigation command, generate AI response
      if (!navResponse) {
        response = await generateAIResponse(message);
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response || 'I understand your request.',
        isBot: true,
        timestamp: new Date(),
        language: currentLanguage.code
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Speak the response if speech is enabled
      if (isSpeaking && response) {
        speakText(response);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: currentLanguage.code === 'hi' 
          ? 'क्षमा करें, कुछ गलत हो गया।' 
          : 'Sorry, something went wrong.',
        isBot: true,
        timestamp: new Date(),
        language: currentLanguage.code
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [currentLanguage, handleNavigation, generateAIResponse, isSpeaking]);

  // Speech synthesis
  const speakText = useCallback((text: string) => {
    if (!synthesisRef.current || !text) return;

    // Clean the text before speaking
    const cleanText = cleanTextForSpeech(text);
    if (!cleanText.trim()) return;

    synthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = getSpeechLanguageCode(currentLanguage.code);
    
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthesisRef.current.speak(utterance);
  }, [currentLanguage]);

  // Speech recognition
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = getRecognitionLanguageCode(currentLanguage.code);

    recognitionRef.current.onstart = () => {
      setIsListening(true);
    };

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      processMessage(transcript);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      toast.error('Speech recognition failed');
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
  }, [currentLanguage, processMessage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      processMessage(inputText);
      setInputText('');
    }
  };

  // Copy message to clipboard
  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Message copied to clipboard');
  };

  // Share message
  const shareMessage = (text: string) => {
    if (navigator.share) {
      navigator.share({ text });
    } else {
      copyMessage(text);
    }
  };

  return (
    <>
      {/* Floating Voice Assistant Button */}
      <div className="fixed z-50" style={{ left: buttonPosition.x, top: buttonPosition.y }}>
        {/* Particle Effects Background */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full"
              style={{
                left: `${20 + i * 10}%`,
                top: `${30 + i * 8}%`,
              }}
              animate={{
                y: [0, -20, 0],
                x: [0, Math.sin(i) * 10, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [0.5, 1.2, 0.5],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}
        </div>

        {/* Glow Effect */}
        <motion.div
          className="absolute inset-0 w-24 h-24 -m-2 rounded-full opacity-60 blur-xl"
          style={{
            background: "radial-gradient(circle, rgba(16,185,129,0.4) 0%, rgba(34,197,94,0.3) 30%, rgba(6,182,212,0.2) 60%, transparent 100%)"
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Attractive Label with Glassmorphism */}
        <AnimatePresence>
          {showLabel && !isOpen && (
            <motion.div
              className="absolute -top-16 left-1/2 transform -translate-x-1/2 backdrop-blur-lg bg-gradient-to-r from-emerald-500/90 via-green-500/90 to-cyan-500/90 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-semibold whitespace-nowrap border border-white/20"
              initial={{ opacity: 0, y: 20, scale: 0.7, rotateX: -90 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: 20, scale: 0.7, rotateX: -90 }}
              transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles size={16} className="text-yellow-300" />
                </motion.div>
                <span className="bg-gradient-to-r from-white to-yellow-100 bg-clip-text text-transparent font-bold">
                  SmartAgroX AI Assistant
                </span>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                />
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-8 border-transparent border-t-emerald-500/90"></div>
              
              {/* Label Glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400/20 to-cyan-400/20 blur-sm -z-10"></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Button with Enhanced 3D Effects */}
        <motion.button
          className={cn(
            "relative w-20 h-20 rounded-full shadow-2xl overflow-hidden",
            "bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600",
            "hover:from-emerald-500 hover:via-green-600 hover:to-emerald-700",
            "transition-all duration-500 cursor-pointer border-2 border-white/30",
            "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-br before:from-white/20 before:to-transparent before:z-10",
            "after:absolute after:inset-0 after:rounded-full after:bg-gradient-to-t after:from-black/10 after:to-transparent after:z-10",
            isDragging && "cursor-grabbing scale-110 shadow-3xl",
            !isDragging && "hover:scale-110 hover:shadow-3xl"
          )}
          style={{
            boxShadow: `
              0 20px 40px rgba(16, 185, 129, 0.3),
              0 10px 20px rgba(34, 197, 94, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3),
              inset 0 -1px 0 rgba(0, 0, 0, 0.1)
            `
          }}
          onMouseDown={handleButtonMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={!isDragging ? handleButtonClick : undefined}
          animate={{
            y: [0, -12, 0],
            rotate: [0, 3, -3, 0],
            boxShadow: [
              "0 20px 40px rgba(16, 185, 129, 0.3), 0 10px 20px rgba(34, 197, 94, 0.2)",
              "0 25px 50px rgba(16, 185, 129, 0.4), 0 15px 30px rgba(34, 197, 94, 0.3)",
              "0 20px 40px rgba(16, 185, 129, 0.3), 0 10px 20px rgba(34, 197, 94, 0.2)"
            ]
          }}
          transition={{
            y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 8, repeat: Infinity, ease: "easeInOut" },
            boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }}
          whileHover={{ 
            scale: 1.2, 
            rotate: [0, 8, -8, 0],
            y: -5,
            transition: { 
              rotate: { duration: 0.6, repeat: Infinity },
              scale: { duration: 0.3 },
              y: { duration: 0.3 }
            }
          }}
          whileTap={{ 
            scale: 0.9,
            transition: { duration: 0.1 }
          }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>
          
          {/* Animated Geometric Patterns */}
          <div className="absolute inset-0 overflow-hidden rounded-full">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-full h-full border border-white/20 rounded-full"
                style={{
                  transform: `scale(${0.3 + i * 0.2})`,
                }}
                animate={{
                  rotate: [0, 360],
                  scale: [0.3 + i * 0.2, 0.5 + i * 0.2, 0.3 + i * 0.2],
                }}
                transition={{
                  rotate: { duration: 10 + i * 2, repeat: Infinity, ease: "linear" },
                  scale: { duration: 4 + i, repeat: Infinity, ease: "easeInOut" },
                }}
              />
            ))}
          </div>

          {/* Holographic Overlay */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.1), transparent, rgba(16,185,129,0.1), transparent)"
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Main Icon Container */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Enhanced SmartAgroX Logo Style Icon */}
            <motion.div
              className="relative"
              animate={{
                rotate: isListening ? [0, 360] : [0, 8, -8, 0],
                scale: isListening ? [1, 1.1, 1] : [1, 1.05, 1],
                transition: {
                  rotate: isListening 
                    ? { duration: 2, repeat: Infinity, ease: "linear" }
                    : { duration: 6, repeat: Infinity, ease: "easeInOut" },
                  scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                }
              }}
            >
              <div className="w-10 h-10 relative">
                {/* Glowing Background */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-yellow-300/30 to-green-300/30 rounded-full blur-sm"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                
                {/* Custom Plant Logo with White Inner Part */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="relative w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-inner"
                    animate={{
                      boxShadow: [
                        "inset 0 2px 4px rgba(0,0,0,0.1), 0 0 8px rgba(255,255,255,0.8)",
                        "inset 0 2px 4px rgba(0,0,0,0.05), 0 0 12px rgba(16,185,129,0.6)",
                        "inset 0 2px 4px rgba(0,0,0,0.1), 0 0 8px rgba(255,255,255,0.8)"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {/* Plant Stem */}
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-0.5 h-3 bg-gradient-to-t from-green-600 to-green-500 rounded-full"></div>
                    
                    {/* Left Leaf */}
                    <motion.div
                      className="absolute bottom-2 left-1 w-2 h-1.5 bg-gradient-to-br from-green-400 to-green-600 rounded-full transform -rotate-45 origin-bottom-right"
                      animate={{
                        rotate: [-45, -35, -45],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                    
                    {/* Right Leaf */}
                    <motion.div
                      className="absolute bottom-2 right-1 w-2 h-1.5 bg-gradient-to-bl from-green-400 to-green-600 rounded-full transform rotate-45 origin-bottom-left"
                      animate={{
                        rotate: [45, 35, 45],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    />
                    
                    {/* Top Leaves */}
                    <motion.div
                      className="absolute top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1 bg-gradient-to-t from-green-500 to-green-400 rounded-full"
                      animate={{
                        scale: [1, 1.2, 1],
                        y: [0, -1, 0]
                      }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    />
                    
                    {/* Small Growth Dots */}
                    <div className="absolute top-0.5 left-1/2 transform -translate-x-1/2 w-0.5 h-0.5 bg-green-300 rounded-full opacity-80"></div>
                  </motion.div>
                </div>
                
                {/* Enhanced Leaf Accent with Animation */}
                <motion.div
                  className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-lg"
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                >
                  <motion.div 
                    className="w-2 h-2 bg-gradient-to-br from-green-500 to-green-700 rounded-full shadow-inner"
                    animate={{
                      boxShadow: [
                        "inset 0 1px 2px rgba(0,0,0,0.3)",
                        "inset 0 1px 2px rgba(0,0,0,0.1), 0 0 4px rgba(34,197,94,0.5)",
                        "inset 0 1px 2px rgba(0,0,0,0.3)"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
                
                {/* Orbiting Particles */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"
                    style={{
                      top: "50%",
                      left: "50%",
                      transformOrigin: `${15 + i * 5}px 0px`,
                    }}
                    animate={{
                      rotate: [0, 360],
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                      rotate: { duration: 3 + i, repeat: Infinity, ease: "linear" },
                      opacity: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }
                    }}
                  />
                ))}
              </div>
            </motion.div>
            
          </div>

          {/* Listening Animation Ring */}
          {isListening && (
            <motion.div
              className="absolute inset-0 rounded-full border-3 border-white/60"
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.6, 0.2, 0.6]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            />
          )}

          {/* Pulse Ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-emerald-300/40"
            animate={{ 
              scale: [1, 1.4, 1],
              opacity: [0.4, 0, 0.4]
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity, 
              ease: "easeOut",
              delay: 0.5
            }}
          />

          {/* Drag Indicator */}
          {isDragging && (
            <motion.div
              className="absolute -inset-2 rounded-full border-2 border-dashed border-white/50"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          )}
        </motion.button>

        {/* Status Indicators */}
        <div className="absolute -bottom-2 -right-2 flex flex-col gap-1">
          {/* Speaking Indicator */}
          {isSpeaking && (
            <motion.div
              className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <Volume2 size={12} className="text-white" />
            </motion.div>
          )}
          
          {/* Language Indicator */}
          <motion.div
            className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-lg text-white text-[10px] font-bold"
            whileHover={{ scale: 1.1 }}
          >
            {currentLanguage.code.toUpperCase()}
          </motion.div>
        </div>

        {/* Drag Helper Text */}
        {isDragging && (
          <motion.div
            className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Release to place
          </motion.div>
        )}
      </div>

      {/* Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={cn(
                "w-full max-w-2xl h-[600px] bg-white rounded-2xl shadow-2xl",
                "flex flex-col overflow-hidden"
              )}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                <div className="flex items-center space-x-3">
                  <Bot size={24} />
                  <div>
                    <h3 className="font-semibold">SmartAgroX Assistant</h3>
                    <p className="text-sm opacity-90">Agriculture AI Helper</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Language Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                      className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
                    >
                      <Globe size={16} />
                      <span className="text-sm">{currentLanguage.code.toUpperCase()}</span>
                      <ChevronDown size={14} />
                    </button>
                    
                    {showLanguageSelector && (
                      <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-52 z-20 max-h-64 overflow-y-auto">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                          Select Language / भाषा चुनें
                        </div>
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              handleLanguageChange(lang);
                              toast.success(`Language changed to ${lang.name}`);
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors flex items-center justify-between ${
                              currentLanguage.code === lang.code ? 'bg-emerald-50 text-emerald-600 border-l-4 border-emerald-500' : 'text-gray-700'
                            }`}
                          >
                            <div>
                              <div className="font-medium text-sm">{lang.nativeName}</div>
                              <div className="text-xs opacity-60">{lang.name}</div>
                            </div>
                            <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                              {lang.code.toUpperCase()}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Speech Toggle */}
                  <button
                    onClick={() => setIsSpeaking(!isSpeaking)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      isSpeaking ? "bg-white bg-opacity-20" : "hover:bg-white hover:bg-opacity-10"
                    )}
                  >
                    {isSpeaking ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  </button>

                  {/* Close Button */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <Sparkles className="mx-auto mb-4 text-emerald-500" size={48} />
                    <h4 className="text-lg font-semibold text-gray-700 mb-2">
                      Welcome to SmartAgroX Assistant
                    </h4>
                    <p className="text-gray-500 text-sm">
                      Ask me about farming, crops, weather, or navigate to different sections
                    </p>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.isBot ? "justify-start" : "justify-end"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
                        message.isBot
                          ? "bg-gray-100 text-gray-800"
                          : "bg-gradient-to-r from-emerald-500 to-green-600 text-white"
                      )}
                    >
                      <div className="flex items-start space-x-2">
                        {message.isBot && <Bot size={16} className="mt-1 flex-shrink-0" />}
                        {!message.isBot && <User size={16} className="mt-1 flex-shrink-0" />}
                        <div className="flex-1">
                          {message.isBot ? (
                            <div 
                              className="text-sm leading-relaxed prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: message.text }}
                            />
                          ) : (
                            <p className="text-sm leading-relaxed">{message.text}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => copyMessage(message.text)}
                                className="p-1 rounded hover:bg-black hover:bg-opacity-10 transition-colors"
                              >
                                <Copy size={12} />
                              </button>
                              <button
                                onClick={() => shareMessage(message.text)}
                                className="p-1 rounded hover:bg-black hover:bg-opacity-10 transition-colors"
                              >
                                <Share size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <Bot size={16} />
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={currentLanguage.code === 'hi' ? 'अपना संदेश टाइप करें...' : 'Type your message...'}
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={cn(
                      "p-3 rounded-xl transition-colors",
                      isListening
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white"
                    )}
                  >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className={cn(
                      "p-3 rounded-xl transition-colors",
                      inputText.trim()
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    )}
                  >
                    <Send size={20} />
                  </button>
                </div>
                
                {/* Quick Actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => processMessage(currentLanguage.code === 'hi' ? 'होम पर जाएं' : 'Go to home')}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs hover:bg-gray-50 transition-colors"
                  >
                    🏠 {currentLanguage.code === 'hi' ? 'होम' : 'Home'}
                  </button>
                  <button
                    type="button"
                    onClick={() => processMessage(currentLanguage.code === 'hi' ? 'मिट्टी की जांच' : 'Soil analysis')}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs hover:bg-gray-50 transition-colors"
                  >
                    🌱 {currentLanguage.code === 'hi' ? 'मिट्टी' : 'Soil'}
                  </button>
                  <button
                    type="button"
                    onClick={() => processMessage(currentLanguage.code === 'hi' ? 'फसल की सलाह' : 'Crop advice')}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs hover:bg-gray-50 transition-colors"
                  >
                    🌾 {currentLanguage.code === 'hi' ? 'फसल' : 'Crops'}
                  </button>
                  <button
                    type="button"
                    onClick={() => processMessage(currentLanguage.code === 'hi' ? 'मौसम की जानकारी' : 'Weather info')}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs hover:bg-gray-50 transition-colors"
                  >
                    🌤️ {currentLanguage.code === 'hi' ? 'मौसम' : 'Weather'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceAssistant;
