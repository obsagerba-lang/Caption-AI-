import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface EngagementItem {
  title: string;
  caption: string;
  icon: React.ReactNode;
}

export const DailyEngagement = () => {
  const [items, setItems] = useState<EngagementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would fetch from a database or API
    // For now, we'll simulate it or call a service
    const fetchEngagement = async () => {
      setLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setItems([
        { title: '🔥 Today’s Viral Captions', caption: 'Living my best life, one coffee at a time. ☕️ #trending #coffeelover', icon: <TrendingUp className="w-4 h-4 text-cyan-400" /> },
        { title: '🔥 Today’s Viral Captions', caption: 'POV: You just found the secret to happiness. ✨ #viral #happiness', icon: <Sparkles className="w-4 h-4 text-violet-400" /> },
        { title: '🔥 Today’s Viral Captions', caption: 'Don’t mind me, just living in my own world. 🌎 #fyp #tiktok', icon: <Zap className="w-4 h-4 text-pink-400" /> },
      ]);
      setLoading(false);
    };
    fetchEngagement();
  }, []);

  if (loading) {
    return <div className="text-gray-500 text-sm p-4">Loading daily trends...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {items.map((item, index) => (
        <motion.div 
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md"
        >
          <div className="flex items-center gap-2 mb-2">
            {item.icon}
            <h3 className="text-sm font-bold text-gray-300">{item.title}</h3>
          </div>
          <p className="text-xs text-gray-400 italic">"{item.caption}"</p>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(item.caption);
              toast.success("Copied to clipboard!");
            }}
            className="mt-3 text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest"
          >
            Copy
          </button>
        </motion.div>
      ))}
    </div>
  );
};
