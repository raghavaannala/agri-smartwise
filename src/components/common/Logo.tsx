
import React from 'react';
import { Sprout, Brain } from 'lucide-react';

type LogoProps = {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
};

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const sizeMap = {
    sm: { icons: 16, text: 'text-lg' },
    md: { icons: 20, text: 'text-xl' },
    lg: { icons: 24, text: 'text-2xl' },
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Sprout size={sizeMap[size].icons} className="text-agri-green" />
        <Brain size={sizeMap[size].icons * 0.8} className="text-agri-blue absolute -top-1 -right-1" />
      </div>
      {showText && (
        <span className={`font-bold ${sizeMap[size].text} text-agri-green`}>
          Smart<span className="text-agri-blue">AgroX</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
