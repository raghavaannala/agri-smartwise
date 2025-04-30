import React from 'react';
import { Youtube, Instagram, MessageSquare } from 'lucide-react';
import Logo from '../common/Logo';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const Footer = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <footer className={`bg-white border-t border-gray-200 ${isMobile ? 'py-3' : 'py-6'}`}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Logo size="sm" />
            <p className="text-xs md:text-sm text-gray-500 mt-2">
              {isMobile ? 'AI-powered agriculture solutions' : 'Empowering farmers with AI-powered agriculture solutions'}
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 md:gap-10">
            <a href="#" className="text-xs md:text-sm text-gray-600 hover:text-agri-green transition-colors">
              About
            </a>
            <a href="#" className="text-xs md:text-sm text-gray-600 hover:text-agri-green transition-colors">
              Contact
            </a>
            <a href="#" className="text-xs md:text-sm text-gray-600 hover:text-agri-green transition-colors">
              Terms
            </a>
            <a href="#" className="text-xs md:text-sm text-gray-600 hover:text-agri-green transition-colors">
              Feedback
            </a>
          </div>
          
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <a href="#" className="text-gray-500 hover:text-red-500 transition-colors">
              <Youtube size={isMobile ? 16 : 20} />
            </a>
            <a href="#" className="text-gray-500 hover:text-green-600 transition-colors">
              <MessageSquare size={isMobile ? 16 : 20} />
            </a>
            <a href="#" className="text-gray-500 hover:text-purple-600 transition-colors">
              <Instagram size={isMobile ? 16 : 20} />
            </a>
          </div>
        </div>
        
        <div className="mt-3 md:mt-6 text-center text-xs text-gray-400">
          © 2025 SmartAgroX. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
