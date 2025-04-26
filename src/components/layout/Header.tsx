import React, { useState, useEffect } from 'react';
import { Bell, Globe, User, ChevronDown, LogOut, LogIn } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { getUserProfile } from '@/lib/firestore';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const Header = () => {
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const { t } = useTranslation();
  const [userName, setUserName] = useState('User');
  const [userImage, setUserImage] = useState('');
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (currentUser) {
        try {
          // Immediately update with basic info from Firebase Auth
          if (currentUser.displayName) {
            setUserName(currentUser.displayName);
          } else if (currentUser.email) {
            const emailName = currentUser.email.split('@')[0] || 'User';
            setUserName(emailName);
          }
          
          if (currentUser.photoURL) {
            setUserImage(currentUser.photoURL);
          }
          
          // Then fetch complete profile from Firestore
          const profile = await getUserProfile(currentUser.uid);
          
          if (profile?.displayName) {
            setUserName(profile.displayName);
          }
          
          if (profile?.photoURL) {
            setUserImage(profile.photoURL);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserName('User');
        setUserImage('');
      }
    };
    
    fetchUserProfile();
  }, [currentUser, lastUpdate]);
  
  const handleLogout = async () => {
    try {
      await logout();
      setUserName('User');
      setUserImage('');
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };
  
  const handleProfileClick = () => {
    navigate('/profile');
  };
  
  const refreshUserData = () => {
    setLastUpdate(Date.now());
  };
  
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 md:px-6">
      <div className="flex-1"></div>
      <div className="flex items-center space-x-4">
        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center text-gray-600 hover:text-agri-green transition-colors">
            <Globe className="h-5 w-5 mr-1" />
            <span className="hidden md:inline-block text-sm">{currentLanguage.name}</span>
            <ChevronDown className="h-4 w-4 ml-1" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('selectLanguage')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {languages.map((lang) => (
              <DropdownMenuItem 
                key={lang.code}
                className="cursor-pointer"
                onClick={() => {
                  // Force a complete refresh with cache clearing to ensure all translations are applied
                  changeLanguage(lang);
                  // Add a small delay before reloading to ensure language is saved
                  setTimeout(() => {
                    // Clear any cached translations
                    localStorage.removeItem('i18nextLng_cache');
                    // Force a hard reload to ensure all components are refreshed
                    window.location.href = window.location.href.split('?')[0] + '?lang=' + lang.code + '&t=' + new Date().getTime();
                  }, 100);
                }}
              >
                {lang.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications - Only show when logged in */}
        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger className="relative text-gray-600 hover:text-agri-green transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                3
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('notifications')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <div className="text-sm">
                  <p className="font-medium">{t('weatherForecast')}</p>
                  <p className="text-xs text-gray-500">{t('rainExpected')}</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <div className="text-sm">
                  <p className="font-medium">{t('marketPrices')}</p>
                  <p className="text-xs text-gray-500">{t('priceIncrease')}</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <div className="text-sm">
                  <p className="font-medium">{t('diseaseDetection')}</p>
                  <p className="text-xs text-gray-500">{t('fungalInfection')}</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* User Profile or Sign In Button */}
        {currentUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center text-gray-600 hover:text-agri-green transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userImage} alt={userName} />
                <AvatarFallback className="bg-agri-green/10">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline-block ml-2 text-sm font-medium">{userName}</span>
              <ChevronDown className="h-4 w-4 ml-1" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('myAccount')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={handleProfileClick}>
                <User className="h-4 w-4 mr-2" />
                {t('profile')}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">{t('settings')}</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">{t('farmDetails')}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-500" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button 
            variant="outline" 
            className="flex items-center text-agri-green border-agri-green hover:bg-agri-green/10"
            onClick={() => navigate('/login')}
          >
            <LogIn className="h-4 w-4 mr-2" />
            {t('login')}
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
