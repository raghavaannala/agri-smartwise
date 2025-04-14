
import React, { useState } from 'react';
import { Bot, X, Send, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
};

const initialMessages: Message[] = [
  {
    id: 1,
    text: "Hello Ramesh! Welcome back to SmartAgroX. Based on your soil report, you can grow groundnuts this season. Want to know more?",
    sender: 'bot',
    timestamp: new Date(),
  }
];

const AgribotChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newUserMessage: Message = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages([...messages, newUserMessage]);
    setInputValue('');

    // Simulate bot response after a delay
    setTimeout(() => {
      const botResponses = [
        "Based on your soil analysis, I recommend using NPK 20-20-0 fertilizer for better groundnut yield.",
        "The current market price for groundnuts is ₹5,200 per quintal in your district.",
        "For pest prevention, consider treating your seeds with Imidacloprid before planting.",
        "The weather forecast shows rainfall next week, which is ideal for groundnut sowing."
      ];
      
      const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
      
      const newBotMessage: Message = {
        id: messages.length + 2,
        text: randomResponse,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, newBotMessage]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div 
          className={cn(
            "bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 ease-in-out",
            "mb-2 border border-gray-200 w-80 md:w-96",
            isMinimized ? "h-14" : "h-96"
          )}
        >
          <div className="bg-agri-green text-white p-3 flex items-center justify-between">
            <div className="flex items-center">
              <Bot className="h-5 w-5 mr-2" />
              <span className="font-medium">AgriBot Assistant</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={toggleMinimize}
                className="text-white/80 hover:text-white transition-colors"
              >
                {isMinimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              <button 
                onClick={toggleOpen}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          
          {!isMinimized && (
            <>
              <div className="p-3 h-72 overflow-y-auto">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={cn(
                      "mb-3 max-w-[80%] rounded-lg p-2.5",
                      message.sender === 'user' 
                        ? "bg-agri-blue/10 text-gray-800 ml-auto" 
                        : "bg-green-50 text-gray-800"
                    )}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-200">
                <div className="flex items-center">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask me anything about farming..."
                    className="flex-1 focus-visible:ring-agri-green"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSendMessage} 
                    className="ml-2 bg-agri-green hover:bg-agri-green/90"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      
      <Button 
        onClick={toggleOpen} 
        className={cn(
          "rounded-full h-14 w-14 shadow-lg bg-agri-green hover:bg-agri-green/90",
          "flex items-center justify-center"
        )}
      >
        <Bot className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default AgribotChat;
