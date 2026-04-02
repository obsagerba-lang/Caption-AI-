import React from 'react';
import { motion } from 'motion/react';
import { Crown, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface PaywallProps {
  onClose: () => void;
  onUpgrade: () => void;
  onWatchAd: () => void;
  reason: string;
}

export const Paywall: React.FC<PaywallProps> = ({ onClose, onUpgrade, onWatchAd, reason }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1A1A2E] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
        
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-full mx-auto flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white">Upgrade to Pro 🚀</h2>
          <p className="text-gray-400">{reason}</p>
          
          <ul className="text-left text-sm text-gray-300 space-y-2 py-4">
            <li className="flex items-center gap-2">✔ Unlimited captions</li>
            <li className="flex items-center gap-2">✔ No ads</li>
            <li className="flex items-center gap-2">✔ Bigger uploads</li>
            <li className="flex items-center gap-2">✔ Faster results</li>
          </ul>

          <button 
            onClick={onWatchAd}
            className="w-full py-4 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-all mb-2"
          >
            Watch Ad → Get 3 more captions
          </button>

          <button 
            onClick={onUpgrade}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-violet-500 text-white rounded-2xl font-bold hover:opacity-90 transition-all"
          >
            Start for just $2.99/month
          </button>
        </div>
      </motion.div>
    </div>
  );
};
