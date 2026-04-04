import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageSquare, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const ChatInterface: React.FC<{ onClose: () => void, initialContext?: string }> = ({ onClose, initialContext }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    chatRef.current = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `You are a helpful social media caption assistant. ${initialContext ? `Context: ${initialContext}` : ''}`,
      },
    });
    
    if (initialContext) {
      setMessages([{ role: 'model', text: "I've analyzed your caption. How would you like to refine it?" }]);
    } else {
      setMessages([{ role: 'model', text: "Hello! I can help you brainstorm caption ideas or refine existing ones. What are you working on?" }]);
    }
  }, [initialContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userMessage });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "I'm sorry, I couldn't generate a response." }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] h-[500px] bg-[#1A1A2E] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
    >
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0F1115]">
        <h3 className="font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
          Caption Assistant
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[80%] p-3 rounded-2xl text-sm", msg.role === 'user' ? "bg-cyan-500 text-white rounded-br-none" : "bg-white/10 text-gray-200 rounded-bl-none")}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 p-3 rounded-2xl text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/10 bg-[#0F1115]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask for ideas or refinements..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
          />
          <button onClick={handleSend} className="bg-cyan-500 text-white p-2 rounded-xl hover:bg-cyan-600 transition-colors">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
