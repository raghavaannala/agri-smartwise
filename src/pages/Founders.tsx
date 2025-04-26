import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Linkedin, Github, Mail, ExternalLink, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type FounderProfile = {
  name: string;
  role: string;
  linkedin: string;
  linkedinUsername: string;
  bio: string;
  image: string;
};

const Founders = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const founders: FounderProfile[] = [
    {
      name: 'Raghava Annala',
      role: t('founders.fullStackDev'),
      linkedin: 'https://www.linkedin.com/in/annala-raghava/',
      linkedinUsername: 'annala raghava',
      bio: 'Passionate about creating intuitive user experiences and robust full-stack solutions for agricultural technology. Specializes in modern frontend frameworks and responsive design.',
      image: '/founders/founder1.jpg', 
    },
    {
      name: 'Shivamani Yadav',
      role: t('founders.fullStackDB'),
      linkedin: 'https://www.linkedin.com/in/yadav-shivamani/',
      linkedinUsername: 'Yadav Shivamani',
      bio: 'Expert in database architecture and backend systems with a focus on scalable agricultural solutions. Brings strong analytical skills to complex data challenges.',
      image: '/founders/founder2.jpg', 
    },
    {
      name: 'Preetham Jakkam',
      role: t('founders.cssDesign'),
      linkedin: 'https://www.linkedin.com/in/preetham-jakkam/',
      linkedinUsername: 'preetham jakkam',
      bio: 'Creative designer with an eye for detail and aesthetics. Specializes in creating visually appealing interfaces and graphics that enhance the user experience.',
      image: '/founders/founder3.jpg', 
    },
  ];

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

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="text-center mb-12">
          <motion.h1 
            className="text-3xl font-bold text-agri-darkGreen mb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {t('founders.title')}
          </motion.h1>
          <motion.p 
            className="text-gray-600 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {t('founders.subtitle')}
          </motion.p>
        </div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {founders.map((founder, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="overflow-hidden border-gray-200 hover:shadow-lg transition-shadow duration-300 bg-gradient-to-b from-white to-agri-lime/10">
                <div className="relative h-72 bg-gradient-to-b from-agri-green/10 to-agri-lime/5 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-md">
                    <img 
                      src={founder.image} 
                      alt={founder.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.classList.add('bg-agri-green/20', 'flex', 'items-center', 'justify-center');
                          const initials = document.createElement('span');
                          initials.className = 'text-4xl font-bold text-agri-darkGreen';
                          initials.textContent = founder.name.split(' ').map(n => n[0]).join('');
                          parent.appendChild(initials);
                        }
                      }}
                    />
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-center text-agri-darkGreen">{founder.name}</CardTitle>
                  <CardDescription className="text-center font-medium">{founder.role}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm text-center mb-4">{founder.bio}</p>
                  <div className="flex justify-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center text-agri-blue hover:text-agri-blue/80 border-agri-green/50 hover:border-agri-green"
                      onClick={() => window.open(founder.linkedin, '_blank')}
                    >
                      <Linkedin className="h-4 w-4 mr-2" />
                      {founder.linkedinUsername}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <h2 className="text-xl font-semibold text-agri-darkGreen mb-4">{t('founders.joinMission')}</h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-6">
            {t('founders.missionText')}
          </p>
          <Button 
            className="bg-agri-green hover:bg-agri-green/90 text-white"
            onClick={() => navigate('/contact')}
          >
            <Mail className="h-4 w-4 mr-2" />
            {t('founders.contactUs')}
          </Button>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Founders;
