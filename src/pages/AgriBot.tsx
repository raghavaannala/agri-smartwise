import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, MessageSquare } from 'lucide-react';
import AgribotChat from '@/components/dashboard/AgribotChat';

const AgriBot = () => {
  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold text-agri-darkGreen mb-6">AgriBot AI Assistant</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader className="bg-agri-teal/10">
                <CardTitle className="text-agri-darkGreen flex items-center">
                  <Bot className="mr-2 h-5 w-5" />
                  Chat with AgriBot
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                  <Bot className="h-16 w-16 text-agri-green mb-4" />
                  <h3 className="text-xl font-medium text-gray-800 mb-2">AI Farming Assistant</h3>
                  <p className="text-gray-600 mb-6">
                    Our AI-powered farming assistant is here to help with all your agricultural questions.
                    Use the chat button in the bottom right corner to start a conversation.
                  </p>
                  <div className="flex items-center justify-center bg-agri-green/10 p-3 rounded-lg text-agri-darkGreen text-sm">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Click the chat icon to ask questions about farming, crops, soil, weather, and more!
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="bg-agri-green/10">
                <CardTitle className="text-agri-darkGreen text-base">
                  What AgriBot Can Help With
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ul className="space-y-2">
                  {[
                    "Crop recommendations based on soil type",
                    "Disease identification and treatment advice",
                    "Weather-based farming suggestions",
                    "Pest control strategies",
                    "Irrigation scheduling",
                    "Fertilizer recommendations",
                    "Harvest timing advice",
                    "Market price information",
                    "Sustainable farming practices"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <div className="bg-agri-green/20 rounded-full p-1 mr-2 mt-0.5">
                        <Bot className="h-3 w-3 text-agri-darkGreen" />
                      </div>
                      <span className="text-sm text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* The AgribotChat component is already floating in the bottom right */}
      <AgribotChat />
    </MainLayout>
  );
};

export default AgriBot;
