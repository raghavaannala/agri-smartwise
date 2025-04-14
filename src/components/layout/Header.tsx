
import React, { useState } from 'react';
import { Bell, Globe, User, ChevronDown } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

const languages = [
  { name: 'English', code: 'en' },
  { name: 'Telugu', code: 'te' },
  { name: 'Hindi', code: 'hi' },
];

const Header = () => {
  const [currentLanguage, setCurrentLanguage] = useState(languages[0]);
  
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
            <DropdownMenuLabel>Select Language</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {languages.map((lang) => (
              <DropdownMenuItem 
                key={lang.code}
                className="cursor-pointer"
                onClick={() => setCurrentLanguage(lang)}
              >
                {lang.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative text-gray-600 hover:text-agri-green transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              3
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <div className="text-sm">
                <p className="font-medium">Weather Alert</p>
                <p className="text-xs text-gray-500">Rain expected tomorrow</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <div className="text-sm">
                <p className="font-medium">Market Price Update</p>
                <p className="text-xs text-gray-500">Rice prices increased by 5%</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <div className="text-sm">
                <p className="font-medium">Disease Alert</p>
                <p className="text-xs text-gray-500">Possible fungal infection detected</p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center text-gray-600 hover:text-agri-green transition-colors">
            <div className="bg-agri-green/10 rounded-full p-1">
              <User className="h-5 w-5 text-agri-green" />
            </div>
            <span className="hidden md:inline-block ml-2 text-sm font-medium">Ramesh Kumar</span>
            <ChevronDown className="h-4 w-4 ml-1" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">Settings</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">Farm Details</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
