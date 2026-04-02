import React from 'react';
import { Zap, Sparkles, TrendingUp, Target, Camera } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const WhyUs = () => {
  const features = [
    {
      icon: <Target className="w-6 h-6 text-cyan-400" />,
      title: "Platform-Specific Optimization",
      description: "ChatGPT gives generic text. We optimize for TikTok, Instagram, and more, ensuring your captions fit the platform's unique culture."
    },
    {
      icon: <Zap className="w-6 h-6 text-violet-400" />,
      title: "Built-in Creative Tools",
      description: "No complex prompting needed. Use our tone selectors, hashtag generators, and style tools to get the perfect result in one click."
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-pink-400" />,
      title: "Daily Viral Trends",
      description: "We don't just generate text; we keep you updated with daily trending captions and viral vibes tailored to your niche."
    },
    {
      icon: <Camera className="w-6 h-6 text-emerald-400" />,
      title: "Visual-First Understanding",
      description: "Our AI is trained to understand the mood and context of your images and videos, not just the text description."
    }
  ];

  return (
    <section className="py-16 px-6 bg-white/5 border-t border-white/10 mt-16">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-display font-black text-white text-center mb-12">
          Why not just use ChatGPT?
        </h2>
        <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">
          ChatGPT is a generalist. We are your <span className="text-cyan-400 font-bold">specialized social media creative studio</span>, built to save you time and maximize engagement.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-black/20 border border-white/5 rounded-3xl p-8 hover:border-white/20 transition-all"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
