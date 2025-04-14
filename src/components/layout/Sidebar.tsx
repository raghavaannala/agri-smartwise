
import React, { useState } from 'react';
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
  ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '../common/Logo';

type SidebarItem = {
  name: string;
  icon: React.ElementType;
  href: string;
};

const sidebarItems: SidebarItem[] = [
  { name: 'Home', icon: Home, href: '/' },
  { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'Soil Lab', icon: FlaskConical, href: '/soil-lab' },
  { name: 'Crop Advisor', icon: Leaf, href: '/crop-advisor' },
  { name: 'Disease Scan', icon: Scan, href: '/disease-scan' },
  { name: 'Market', icon: BarChart2, href: '/market' },
  { name: 'Weather', icon: CloudSun, href: '/weather' },
  { name: 'AgriBot', icon: Bot, href: '/agribot' },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState('Dashboard');

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div
      className={cn(
        'bg-sidebar h-screen transition-all duration-300 flex flex-col border-r border-sidebar-border relative',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
        {!collapsed ? (
          <Logo size="md" />
        ) : (
          <div className="mx-auto">
            <Logo size="sm" showText={false} />
          </div>
        )}
        {!collapsed && (
          <button 
            onClick={toggleSidebar}
            className="text-sidebar-foreground hover:text-sidebar-primary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 py-6 overflow-y-auto">
        <ul className="space-y-2 px-2">
          {sidebarItems.map((item) => (
            <li key={item.name}>
              <a
                href={item.href}
                className={cn(
                  'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  activeItem === item.name 
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                    : 'text-sidebar-foreground'
                )}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveItem(item.name);
                }}
              >
                <item.icon className={cn('h-5 w-5', collapsed ? 'mx-auto' : 'mr-3')} />
                {!collapsed && <span>{item.name}</span>}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {collapsed && (
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 bg-sidebar-primary text-sidebar-primary-foreground p-1 rounded-full border border-sidebar-border"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
};

export default Sidebar;
