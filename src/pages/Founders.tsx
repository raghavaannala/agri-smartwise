import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Linkedin, Github, Mail, ExternalLink, Users, Award, Star, ChevronRight, Quote, ArrowRight, Briefcase, Code, PenTool, Sparkles, Clock, Leaf, TrendingUp, Check, Database, Cpu, Megaphone, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAllFounders } from '@/services/foundersService';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

const Founders = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedFounder, setSelectedFounder] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('founders');
  const [animatedStats, setAnimatedStats] = useState({ years: 0, projects: 0, solutions: 0 });
  
  // Get founders from our service
  const founders = getAllFounders();

  // Animate stats when they come into view
  useEffect(() => {
    if (activeTab === 'mission') {
      const timer = setTimeout(() => {
        const animateStats = () => {
          let years = 0;
          let projects = 0;
          let solutions = 0;
          
          const interval = setInterval(() => {
            if (years < 4) years += 1;
            if (projects < 12) projects += 1;
            if (solutions < 8) solutions += 1;
            
            setAnimatedStats({ years, projects, solutions });
            
            if (years === 4 && projects === 12 && solutions === 8) {
              clearInterval(interval);
            }
          }, 100);
          
          return interval;
        };
        
        const interval = animateStats();
        return () => clearInterval(interval);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Animation variants for cards
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut'
      }
    }
  };

  // Animated background element
  const AnimatedBg = () => (
    <div className="absolute inset-0 overflow-hidden -z-10">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-green-100 rounded-full opacity-20 blur-3xl"></div>
      <div className="absolute top-1/2 -left-24 w-80 h-80 bg-amber-100 rounded-full opacity-30 blur-3xl"></div>
      <div className="absolute -bottom-32 right-1/4 w-72 h-72 bg-blue-100 rounded-full opacity-20 blur-3xl"></div>
      
      {/* Animated particles */}
      <div className="absolute inset-0 z-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-green-400"
            initial={{ 
              opacity: Math.random() * 0.5 + 0.3,
              x: `${Math.random() * 100}%`, 
              y: `${Math.random() * 100}%` 
            }}
            animate={{ 
              opacity: [Math.random() * 0.5 + 0.3, 0, Math.random() * 0.5 + 0.3],
              scale: [1, 1.5, 1]
            }}
            transition={{ 
              duration: Math.random() * 5 + 10, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            style={{ 
              top: `${Math.random() * 100}%`, 
              left: `${Math.random() * 100}%` 
            }}
          />
        ))}
      </div>
    </div>
  );

  // Founder role icon mapping
  const getRoleIcon = (role: string) => {
    if (role.includes('Developer')) return <Code className="h-4 w-4" />;
    if (role.includes('Designer')) return <PenTool className="h-4 w-4" />;
    return <Briefcase className="h-4 w-4" />;
  };

  // Milestone data
  const milestones = [
    {
      year: "2024",
      title: "Foundation of SmartAgroX",
      description: "Starting with a small team of three passionate developers"
    },
    {
      year: "2024 Q2",
      title: "First Prototype Launch",
      description: "Initial soil analysis and crop recommendation tools"
    },
    {
      year: "2024 Q3",
      title: "Agricultural Data Integration",
      description: "Connected to regional farming datasets and meteorological services"
    },
    {
      year: "2024 Q4",
      title: "ML Algorithm Development",
      description: "Integrating advanced AI for better crop recommendations"
    },
    {
      year: "2025",
      title: "Projected Platform Expansion",
      description: "Planned addition of community features and marketplace integration"
    }
  ];

  // Team members data - now integrated as founders
  const teamMembers = [
    {
      id: 'rajkumar-k',
      name: 'Rajkumar.K',
      role: 'Hardware Developer & Soil Lab Specialist',
      bio: 'Developed innovative hardware components for soil lab analysis system, bringing precision agriculture technology to farmers.',
      image: '/founders/Screenshot 2025-09-20 014434.png', // Placeholder for future image
      linkedin: 'linkedin.com/in/raj-kumar-048688323', // Placeholder for LinkedIn profile
      expertise: ['Hardware Development', 'Soil Analysis', 'IoT Sensors', 'Agricultural Technology'],
      achievements: [
        'Designed soil lab hardware architecture',
        'Integrated sensor systems for real-time analysis',
        'Optimized hardware for field conditions'
      ],
      department: 'Hardware & IoT',
      color: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-800'
    },
    {
      id: 'deekshith',
      name: 'Deekshith.N',
      role: 'Backend Developer & API Architect',
      bio: 'Backend development expert who solved critical API integration issues and built robust server infrastructure for SmartAgroX.',
      image: '/founders/image.png', // Placeholder for future image
      linkedin: 'linkedin.com/in/deekshith-nanaveni-15a785326', // Placeholder for LinkedIn profile
      expertise: ['Backend Development', 'API Design', 'Database Architecture', 'System Integration'],
      achievements: [
        'Resolved critical API integration challenges',
        'Built scalable backend infrastructure',
        'Optimized database performance'
      ],
      department: 'Backend & APIs',
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800'
    },
    {
      id: 'anji',
      name: 'Anji',
      role: 'Database Administrator & Data Architect',
      bio: 'Database management specialist focused on data architecture optimization and ensuring reliable data storage for agricultural insights.',
      image: 'public/founders/WhatsApp Image 2025-09-20 at 4.45.59 PM.jpeg', // Placeholder for future image
      linkedin: '#', // Placeholder for LinkedIn profile
      expertise: ['Database Management', 'Data Architecture', 'Performance Optimization', 'Data Security'],
      achievements: [
        'Designed efficient database schemas',
        'Implemented data backup and recovery systems',
        'Optimized query performance for large datasets'
      ],
      department: 'Data Management',
      color: 'from-green-400 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-800'
    },
    {
      id: 'sushmitha-navashree',
      name: 'Sushmitha & Navashree',
      role: 'Community Evangelists & User Advocates',
      bio: 'Community evangelists driving user adoption and engagement, building bridges between technology and farming communities.',
      image: '/founders/evangelists.jpg', // Placeholder for future image
      linkedin: '#', // Placeholder for LinkedIn profile
      expertise: ['Community Building', 'User Engagement', 'Product Evangelism', 'Farmer Outreach'],
      achievements: [
        'Built strong farming community connections',
        'Increased user adoption and engagement',
        'Gathered valuable farmer feedback for product improvement'
      ],
      department: 'Community & Outreach',
      color: 'from-pink-400 to-pink-600',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-800'
    }
  ];

  // Founder card component
  const FounderCard = ({ founder, isMainFounder = false, index }) => (
    <motion.div 
      variants={itemVariants} 
      className="h-full flex"
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <Card className={`overflow-hidden border-gray-200 hover:shadow-xl transition-all h-full ${
        founder.id === 'raghava-annala' 
          ? 'bg-gradient-to-br from-white via-white to-amber-50 border-amber-200' 
          : 'bg-white'
      }`}>
        {founder.id === 'raghava-annala' && (
          <div className="absolute top-0 right-0 bg-amber-400 text-white px-3 py-1 rounded-bl-lg font-medium text-sm flex items-center z-10">
            <Award className="h-3 w-3 mr-1" />
            Main Founder
          </div>
        )}
        <div className="relative h-64 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30"></div>
          <img 
            src={founder.image} 
            alt={founder.name}
            className="w-full h-full object-cover object-center transition-transform hover:scale-105"
            style={{ objectPosition: 'center' }}
            onError={(e) => {
              // Fallback to initials if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.classList.add('bg-gray-100', 'flex', 'items-center', 'justify-center');
                const initials = document.createElement('span');
                initials.className = 'text-5xl font-bold text-gray-600';
                initials.textContent = founder.name.split(' ').map(n => n[0]).join('');
                parent.appendChild(initials);
              }
            }}
          />
          
          {/* Decorative shapes on the image */}
          <div className="absolute -right-2 -top-2">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-amber-400 opacity-70">
              <path d="M0 20C0 8.954 8.954 0 20 0C31.046 0 40 8.954 40 20C40 31.046 31.046 40 20 40C8.954 40 0 31.046 0 20Z" fill="currentColor"/>
            </svg>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
            <span className="bg-white/90 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded-full flex items-center">
              {getRoleIcon(founder.role)}
              <span className="ml-1">{founder.role.split('&')[0].trim()}</span>
            </span>
            <span className={`backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full ${
              founder.id === 'raghava-annala' ? 'bg-amber-400/90' : 'bg-blue-500/90'
            }`}>
              {founder.id === 'raghava-annala' ? 'Founder' : 'Co-Founder'}
            </span>
          </div>
        </div>

        <CardHeader className="pb-1 pt-4">
          <CardTitle className={`text-xl font-bold ${
            founder.id === 'raghava-annala' ? 'text-amber-800' : 'text-gray-800'
          }`}>
            {founder.name}
            {founder.id === 'raghava-annala' && (
              <Star className="inline-block ml-1 h-4 w-4 text-amber-500" />
            )}
          </CardTitle>
          <CardDescription className="font-medium text-gray-600 flex items-center">
            {founder.role}
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-2">
          <p className="text-gray-600 text-sm mb-4">{founder.bio}</p>
          
          {/* LinkedIn button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center text-blue-600 hover:text-blue-700 border-blue-100 hover:border-blue-200 hover:bg-blue-50 mb-4 w-full justify-center"
            onClick={() => window.open(founder.linkedin, '_blank')}
          >
            <Linkedin className="h-4 w-4 mr-1" />
            Connect on LinkedIn
          </Button>
          
          {/* Achievements section */}
          {founder.achievements && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Achievements</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                {founder.achievements.map((achievement, index) => (
                  <li key={index} className="flex items-start">
                    <Star className="h-3 w-3 text-amber-500 mr-2 mt-1 flex-shrink-0" />
                    <span>{achievement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Expertise tags */}
          {founder.expertise && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Expertise</h4>
              <div className="flex flex-wrap gap-1">
                {founder.expertise.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="bg-green-50 text-green-700 border-green-100">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  // Stats Card Component
  const StatsCard = ({ icon, value, label, color }) => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"
    >
      <div className="flex items-center mb-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-3xl font-bold text-gray-800">{value}</span>
        <span className="text-sm text-gray-500 mt-1">{label}</span>
      </div>
    </motion.div>
  );

  // Mission statement component
  const MissionStatement = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border border-green-200 shadow-sm relative overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-200 rounded-full opacity-30 transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-200 rounded-full opacity-20 transform -translate-x-1/2 translate-y-1/2"></div>
      </div>
      
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center mb-8">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="md:w-2/3 pr-0 md:pr-12 mb-6 md:mb-0"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-green-800 mb-4">Our Mission</h2>
            <p className="text-green-700 text-lg mb-6 max-w-3xl">
              At SmartAgroX, we're dedicated to transforming agriculture through intelligent technology solutions, 
              making farming more efficient, sustainable, and profitable for everyone.
            </p>
            
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2">
                  <Star className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-gray-700 font-medium">Innovation-Driven</span>
              </div>
              
              <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-gray-700 font-medium">Farmer-Focused</span>
              </div>
              
              <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2">
                  <Award className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-gray-700 font-medium">Sustainability-Committed</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:w-1/3 grid grid-cols-1 gap-4"
          >
            <StatsCard 
              icon={<Clock className="h-5 w-5 text-amber-700" />}
              value={animatedStats.years}
              label="Years of innovation"
              color="bg-amber-100 text-amber-700"
            />
            <StatsCard 
              icon={<Code className="h-5 w-5 text-blue-700" />}
              value={animatedStats.projects}
              label="Projects completed"
              color="bg-blue-100 text-blue-700"
            />
            <StatsCard 
              icon={<Leaf className="h-5 w-5 text-green-700" />}
              value={animatedStats.solutions}
              label="Farming solutions"
              color="bg-green-100 text-green-700"
            />
          </motion.div>
        </div>
        
        <Button 
          className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
          onClick={() => window.location.href = 'mailto:annalaraghava0@gmail.com'}
        >
          <Mail className="h-4 w-4 mr-2" />
          Join Our Mission
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
  
  // Timeline component
  const Timeline = () => (
    <div className="mt-12">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Our Journey</h3>
        <p className="text-gray-600">The evolution of SmartAgroX from idea to innovation</p>
      </div>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-green-200 rounded-full"></div>
        
        {/* Timeline events */}
        <div className="relative z-10">
          {milestones.map((milestone, index) => (
            <motion.div
              key={milestone.year}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
              className={`flex items-center mb-12 ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
            >
              <div className={`w-1/2 px-6 ${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-4 rounded-lg shadow-sm ${index % 2 === 0 ? 'bg-green-50' : 'bg-amber-50'}`}>
                  <div className={`text-lg font-bold mb-1 ${index % 2 === 0 ? 'text-green-800' : 'text-amber-800'}`}>
                    {milestone.title}
                  </div>
                  <div className="text-sm text-gray-600">{milestone.description}</div>
                </div>
              </div>
              
              <div className="w-10 h-10 rounded-full bg-white border-4 border-green-300 flex items-center justify-center absolute left-1/2 transform -translate-x-1/2 z-10">
                <span className="text-xs font-bold text-green-800">{milestone.year}</span>
              </div>
              
              <div className="w-1/2"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="relative">
        <AnimatedBg />
        
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-block bg-green-100 text-green-700 px-4 py-1 rounded-full mb-2 font-medium"
            >
              Meet Our Team
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-5xl font-bold text-gray-800 mb-4 bg-gradient-to-r from-green-800 to-green-600 inline-block text-transparent bg-clip-text"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              The Visionaries Behind SmartAgroX
            </motion.h1>
            
            <motion.p 
              className="text-gray-600 max-w-2xl mx-auto text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Our dedicated team combines expertise in technology, agriculture, and design 
              to build solutions that transform farming practices.
            </motion.p>
          </div>

          <Tabs defaultValue="founders" className="mb-16" onValueChange={setActiveTab}>
            <div className="flex justify-center mb-8">
              <TabsList className="bg-green-50 border border-green-100">
                <TabsTrigger value="founders" className="data-[state=active]:bg-white">
                  <Users className="h-4 w-4 mr-2" />
                  Founders
                </TabsTrigger>
                <TabsTrigger value="mission" className="data-[state=active]:bg-white">
                  <Award className="h-4 w-4 mr-2" />
                  Our Mission
                </TabsTrigger>
                <TabsTrigger value="timeline" className="data-[state=active]:bg-white">
                  <Clock className="h-4 w-4 mr-2" />
                  Our Journey
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="founders">
              <div className="text-center mb-8">
                <motion.p 
                  className="text-gray-600 max-w-3xl mx-auto text-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  Meet our complete team of founders and contributors who make SmartAgroX possible
                </motion.p>
              </div>

              {/* Horizontal Scrolling Container */}
              <div className="relative">
                <div 
                  className="flex overflow-x-auto pb-6 gap-3 snap-x snap-mandatory"
                  style={{ 
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#d1d5db #f3f4f6'
                  }}
                >
                  <style jsx>{`
                    div::-webkit-scrollbar {
                      height: 8px;
                    }
                    div::-webkit-scrollbar-track {
                      background: #f3f4f6;
                      border-radius: 4px;
                    }
                    div::-webkit-scrollbar-thumb {
                      background: #d1d5db;
                      border-radius: 4px;
                    }
                    div::-webkit-scrollbar-thumb:hover {
                      background: #9ca3af;
                    }
                  `}</style>
                  
                  {/* Original Founders */}
                  {founders.map((founder, index) => (
                    <motion.div
                      key={founder.id}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="flex-shrink-0 w-80 snap-start"
                    >
                      <Card className={`h-full overflow-hidden border-gray-200 hover:shadow-xl transition-all relative ${
                        founder.id === 'raghava-annala' 
                          ? 'bg-gradient-to-br from-white via-white to-amber-50 border-amber-200' 
                          : 'bg-white'
                      }`}>
                        {founder.id === 'raghava-annala' && (
                          <div className="absolute top-0 right-0 bg-amber-400 text-white px-3 py-1 rounded-bl-lg font-medium text-sm flex items-center z-10">
                            <Award className="h-3 w-3 mr-1" />
                            Main Founder
                          </div>
                        )}
                        
                        <div className="relative h-64 overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30"></div>
                          <img 
                            src={founder.image} 
                            alt={founder.name}
                            className="w-full h-full object-cover object-center transition-transform hover:scale-105"
                            style={{ objectPosition: 'center' }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.classList.add('bg-gray-100', 'flex', 'items-center', 'justify-center');
                                const initials = document.createElement('span');
                                initials.className = 'text-5xl font-bold text-gray-600';
                                initials.textContent = founder.name.split(' ').map(n => n[0]).join('');
                                parent.appendChild(initials);
                              }
                            }}
                          />
                          
                          <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
                            <span className="bg-white/90 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded-full flex items-center">
                              {getRoleIcon(founder.role)}
                              <span className="ml-1">{founder.role.split('&')[0].trim()}</span>
                            </span>
                            <span className={`backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full ${
                              founder.id === 'raghava-annala' ? 'bg-amber-400/90' : 'bg-blue-500/90'
                            }`}>
                              {founder.id === 'raghava-annala' ? 'Founder' : 'Co-Founder'}
                            </span>
                          </div>
                        </div>

                        <CardHeader className="pb-1 pt-4">
                          <CardTitle className={`text-xl font-bold ${
                            founder.id === 'raghava-annala' ? 'text-amber-800' : 'text-gray-800'
                          }`}>
                            {founder.name}
                            {founder.id === 'raghava-annala' && (
                              <Star className="inline-block ml-1 h-4 w-4 text-amber-500" />
                            )}
                          </CardTitle>
                          <CardDescription className="font-medium text-gray-600 text-sm">
                            {founder.role}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="pb-2">
                          <p className="text-gray-600 text-sm mb-4">{founder.bio}</p>
                          
                          {/* LinkedIn button */}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center text-blue-600 hover:text-blue-700 border-blue-100 hover:border-blue-200 hover:bg-blue-50 mb-4 w-full justify-center"
                            onClick={() => window.open(founder.linkedin, '_blank')}
                          >
                            <Linkedin className="h-4 w-4 mr-1" />
                            Connect on LinkedIn
                          </Button>
                          
                          {/* Achievements section */}
                          {founder.achievements && (
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Achievements</h4>
                              <ul className="text-sm text-gray-600 space-y-2">
                                {founder.achievements.map((achievement, index) => (
                                  <li key={index} className="flex items-start">
                                    <Star className="h-3 w-3 text-amber-500 mr-2 mt-1 flex-shrink-0" />
                                    <span>{achievement}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Expertise tags */}
                          {founder.expertise && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Expertise</h4>
                              <div className="flex flex-wrap gap-1">
                                {founder.expertise.map((skill, index) => (
                                  <Badge key={index} variant="secondary" className="bg-green-50 text-green-700 border-green-100">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                  
                  {/* Team Members */}
                  {teamMembers.map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (founders.length + index) * 0.1, duration: 0.5 }}
                      className="flex-shrink-0 w-72 snap-start"
                    >
                      <Card className="h-full overflow-hidden border-gray-200 hover:shadow-xl transition-all bg-white relative">
                        {member.id === 'rajkumar-k' && (
                          <div className="absolute top-0 right-0 bg-purple-400 text-white px-3 py-1 rounded-bl-lg font-medium text-sm flex items-center z-10">
                          </div>
                        )}
                        
                        <div className={`h-2 bg-gradient-to-r ${member.color}`}></div>
                        
                        <div className="relative h-64 overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30"></div>
                          <img 
                            src={member.image} 
                            alt={member.name}
                            className="w-full h-full object-cover object-center transition-transform hover:scale-105"
                            style={{ objectPosition: 'center' }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.classList.add(member.bgColor, 'flex', 'items-center', 'justify-center');
                                const initials = document.createElement('span');
                                initials.className = `text-5xl font-bold ${member.textColor}`;
                                initials.textContent = member.name.split(' ').map(n => n[0]).join('');
                                parent.appendChild(initials);
                              }
                            }}
                          />
                          
                          <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
                            <span className="bg-white/90 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded-full flex items-center">
                              {member.id === 'rajkumar-k' && <Cpu className="h-3 w-3 mr-1" />}
                              {member.id === 'deekshith' && <Code className="h-3 w-3 mr-1" />}
                              {member.id === 'anji' && <Database className="h-3 w-3 mr-1" />}
                              {member.id === 'sushmitha-navashree' && <Megaphone className="h-3 w-3 mr-1" />}
                              <span className="ml-1">{member.department}</span>
                            </span>
                            <Badge variant="outline" className="bg-white/90 text-gray-800 border-white text-xs">
                              Team Member
                            </Badge>
                          </div>
                        </div>

                        <CardHeader className="pb-1 pt-4">
                          <CardTitle className="text-xl font-bold text-gray-800">
                            {member.name}
                          </CardTitle>
                          <CardDescription className="font-medium text-gray-600 text-sm">
                            {member.role}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="pb-2">
                          <p className="text-gray-600 text-sm mb-4">{member.bio}</p>
                          
                          {/* LinkedIn button */}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center text-blue-600 hover:text-blue-700 border-blue-100 hover:border-blue-200 hover:bg-blue-50 mb-4 w-full justify-center"
                            onClick={() => window.open(member.linkedin, '_blank')}
                          >
                            <Linkedin className="h-4 w-4 mr-1" />
                            Connect on LinkedIn
                          </Button>
                          
                          {/* Achievements section */}
                          {member.achievements && (
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Achievements</h4>
                              <ul className="text-sm text-gray-600 space-y-2">
                                {member.achievements.map((achievement, index) => (
                                  <li key={index} className="flex items-start">
                                    <Star className="h-3 w-3 text-amber-500 mr-2 mt-1 flex-shrink-0" />
                                    <span>{achievement}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Expertise tags */}
                          {member.expertise && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Expertise</h4>
                              <div className="flex flex-wrap gap-1">
                                {member.expertise.map((skill, index) => (
                                  <Badge key={index} variant="secondary" className="bg-green-50 text-green-700 border-green-100">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
                
                {/* Scroll Indicators */}
                <div className="flex justify-center mt-4 space-x-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <ChevronRight className="h-4 w-4 mr-1" />
                    Scroll to see all team members
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="mission">
              <MissionStatement />
              
              <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Our Core Values</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    {
                      icon: <Check className="h-5 w-5 text-green-600" />,
                      title: "Innovation",
                      description: "We continuously explore new technologies to solve agricultural challenges."
                    },
                    {
                      icon: <Users className="h-5 w-5 text-amber-600" />,
                      title: "Farmer-First Approach",
                      description: "Every feature and tool is designed with the farmer's needs in mind."
                    },
                    {
                      icon: <Leaf className="h-5 w-5 text-green-600" />,
                      title: "Sustainability",
                      description: "We promote practices that are environmentally responsible and sustainable."
                    },
                    {
                      icon: <TrendingUp className="h-5 w-5 text-amber-600" />,
                      title: "Scalability",
                      description: "Our solutions are designed to grow with the needs of farmers of all sizes."
                    }
                  ].map((value, index) => (
                    <motion.div 
                      key={value.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      viewport={{ once: true }}
                      className="flex items-start"
                    >
                      <div className="mr-4 p-3 rounded-full bg-green-50">
                        {value.icon}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-1">{value.title}</h4>
                        <p className="text-gray-600">{value.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="timeline">
              <Timeline />
              
              <div className="mt-12 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200 p-8">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center mb-6"
                >
                  <h3 className="text-2xl font-bold text-green-800 mb-2">Vision for the Future</h3>
                  <p className="text-green-700">Our planned innovations and growth for SmartAgroX</p>
                </motion.div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  {[
                    { 
                      title: "Regional Expansion", 
                      description: "Expanding to new agricultural regions across India with customized local insights",
                      icon: <TrendingUp className="h-5 w-5" /> 
                    },
                    { 
                      title: "Farmer Community", 
                      description: "Building collaborative features to connect farmers with similar crops and challenges",
                      icon: <Users className="h-5 w-5" /> 
                    },
                    { 
                      title: "Advanced Technology", 
                      description: "Integrating satellite imagery and IoT sensors for comprehensive farm monitoring",
                      icon: <Sparkles className="h-5 w-5" /> 
                    }
                  ].map((item, index) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.2, duration: 0.5 }}
                      className="bg-white rounded-lg p-6 shadow-sm"
                    >
                      <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-800 mb-4">
                        {item.icon}
                      </div>
                      <h4 className="text-lg font-bold text-gray-800 mb-2 text-center">{item.title}</h4>
                      <p className="text-gray-600 text-center">{item.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <motion.div 
            className="bg-white border border-gray-100 rounded-xl p-8 shadow-sm mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="text-2xl font-bold text-gray-800 mb-4 flex items-center"
                >
                  Join Our Journey
                  <Sparkles className="ml-2 h-5 w-5 text-amber-400" />
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="text-gray-600 mb-6"
                >
                  We're always looking for passionate individuals to join our mission of transforming 
                  agriculture through technology. If you're interested in contributing to SmartAgroX, 
                  we'd love to hear from you.
                </motion.p>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => window.location.href = 'mailto:annalaraghava0@gmail.com'}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Us
                </Button>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg border border-green-100">
                <h3 className="text-lg font-semibold text-green-800 mb-4">Join us if you are:</h3>
                <ul className="space-y-3">
                  {[
                    "Passionate about agricultural innovation",
                    "Skilled in modern web or mobile development",
                    "Experienced in UI/UX design for practical applications",
                    "Knowledgeable about machine learning and data analysis",
                    "Committed to creating sustainable technological solutions"
                  ].map((item, index) => (
                    <motion.li 
                      key={index} 
                      className="flex items-start"
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <ChevronRight className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-700">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
          
          {/* Decorative element at bottom */}
          <div className="mt-20 mb-12 flex justify-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="p-0.5 bg-gradient-to-r from-green-500 via-amber-500 to-blue-500 rounded-full"
            >
              <div className="bg-white p-4 rounded-full">
                <Leaf className="h-6 w-6 text-green-600" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Founders;
