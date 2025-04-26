
import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import AgribotChat from '../dashboard/AgribotChat';
import VoiceAssistant from '../voice/VoiceAssistant';

type MainLayoutProps = {
  children: React.ReactNode;
};

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
        <Footer />
        <AgribotChat />
        <VoiceAssistant />
      </div>
    </div>
  );
};

export default MainLayout;
