import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, 
  LayoutDashboard, 
  FlaskConical, 
  Leaf, 
  Scan, 
  BarChart2, 
  CloudSun, 
  Bot, 
  ChevronLeft, 
  ChevronRight,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import './sidebar.css';
import Logo from '../common/Logo';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type SidebarItem = {
  name: string;
  icon: React.ElementType;
  href: string;
  color: string;
  translationKey?: string;
};

const sidebarItems: SidebarItem[] = [
  { 
    name: 'Home', 
    icon: Home, 
    href: '/',
    color: 'bg-agri-blue/10 text-agri-blue',
    translationKey: 'common.home'
  },
  { 
    name: 'Dashboard', 
    icon: LayoutDashboard, 
    href: '/dashboard',
    color: 'bg-agri-green/10 text-agri-green',
    translationKey: 'common.dashboard'
  },
  { 
    name: 'Farm', 
    icon: MapPin, 
    href: '/farm',
    color: 'bg-agri-green/10 text-agri-green',
    translationKey: 'common.farm'
  },
  { 
    name: 'Soil Lab', 
    icon: FlaskConical, 
    href: '/soil-lab',
    color: 'bg-agri-soil/10 text-agri-soil',
    translationKey: 'common.soilLab'
  },
  { 
    name: 'Crop Advisor', 
    icon: Leaf, 
    href: '/crop-advisor',
    color: 'bg-agri-freshGreen/10 text-agri-freshGreen',
    translationKey: 'common.cropAdvisor'
  },
  { 
    name: 'Disease Scan', 
    icon: Scan, 
    href: '/disease-scan',
    color: 'bg-agri-tomato/10 text-agri-tomato',
    translationKey: 'common.diseaseScan'
  },
  { 
    name: 'Market', 
    icon: BarChart2, 
    href: '/market',
    color: 'bg-agri-amber/10 text-agri-amber',
    translationKey: 'common.market'
  },
  { 
    name: 'Weather', 
    icon: CloudSun, 
    href: '/weather',
    color: 'bg-agri-lightBlue/10 text-agri-lightBlue',
    translationKey: 'common.weather'
  },
  { 
    name: 'AgriBot', 
    icon: Bot, 
    href: '/agribot',
    color: 'bg-agri-teal/10 text-agri-teal',
    translationKey: 'common.agriBot'
  },
  { 
    name: 'Founders', 
    icon: Users, 
    href: '/founders',
    color: 'bg-agri-clay/10 text-agri-clay',
    translationKey: 'common.founders'
  },
];

const Sidebar = () => {
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState('Dashboard');
  const location = useLocation();
  // Add a state variable to force re-renders when language changes
  const [currentLang, setCurrentLang] = useState(i18n.language);
  
  // Update when language changes
  useEffect(() => {
    const handleLanguageChanged = () => {
      console.log('Language changed in Sidebar to:', i18n.language);
      setCurrentLang(i18n.language);
    };
    
    // Listen for language changes
    i18n.on('languageChanged', handleLanguageChanged);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  // Create translated sidebar items with proper display names
  // Use currentLang as a dependency to ensure this runs when language changes
  const translatedSidebarItems = useMemo(() => {
    console.log('Rebuilding sidebar items with language:', currentLang);
    return sidebarItems.map(item => ({
      ...item,
      displayName: item.translationKey ? t(item.translationKey) : item.name
    }));
  }, [t, currentLang]);

  // Set active item based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    const currentItem = translatedSidebarItems.find(item => 
      currentPath === item.href || 
      (item.href !== '/' && currentPath.startsWith(item.href))
    );
    
    if (currentItem) {
      setActiveItem(currentItem.name);
    } else if (currentPath === '/' || currentPath === '') {
      setActiveItem('Home');
    }
  }, [location.pathname]);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const handleNavigation = (href: string, name: string) => {
    setActiveItem(name);
  };

  return (
    <div 
      className={cn(
        "flex flex-col h-screen bg-gradient-to-b from-agri-darkGreen to-agri-green/90 border-r border-agri-lime/20 transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex flex-col p-4 border-b border-agri-lime/30">
        <div className={cn("flex items-center", collapsed ? "justify-center w-full" : "justify-between w-full")}>
          <Logo size={collapsed ? 'sm' : 'md'} />
          {!collapsed && <span className="ml-2 text-xl font-semibold text-white"></span>}
        </div>
        
        {/* Toggle button below the title */}
        <div className="flex justify-center mt-3">
          <button 
            onClick={toggleSidebar}
            className={cn(
              "flex items-center justify-center p-2 rounded-lg transition-all duration-300",
              "bg-agri-lime/20 hover:bg-agri-lime/30 text-white hover:scale-105",
              "focus:outline-none focus:ring-2 focus:ring-agri-lime/50",
              collapsed ? "w-10" : "w-full"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        <ul className="space-y-2 px-2">
          {translatedSidebarItems.map((item, index) => (
            <li key={item.name}>
              <Link
                to={item.href}
                className={cn(
                  'flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all w-full',
                  activeItem === item.name 
                    ? `${item.color} shadow-md` 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                )}
                onClick={() => handleNavigation(item.href, item.name)}
              >
                <div className={cn(
                  'flex items-center justify-center p-2 rounded-lg',
                  activeItem === item.name ? 'bg-white/20' : 'bg-transparent'
                )}>
                  <item.icon className={cn('h-5 w-5', collapsed ? 'mx-auto' : 'mr-0')} />
                </div>
                {!collapsed && <span className="ml-3">{item.displayName}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* No floating toggle button or footer toggle button */}
    </div>
  );
};

export default Sidebar;
