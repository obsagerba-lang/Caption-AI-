import React from 'react';
import { Zap, Sparkles, TrendingUp, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Feedback } from './Feedback';

export const WhyUs = ({ t }: { t: any }) => {
  const features = [
    {
      icon: <Target className="w-6 h-6 text-cyan-400" />,
      title: t.whyUsFeature1Title,
      description: t.whyUsFeature1Desc
    },
    {
      icon: <Zap className="w-6 h-6 text-violet-400" />,
      title: t.whyUsFeature2Title,
      description: t.whyUsFeature2Desc
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-pink-400" />,
      title: t.whyUsFeature3Title,
      description: t.whyUsFeature3Desc
    },
    {
      icon: <Sparkles className="w-6 h-6 text-emerald-400" />,
      title: t.whyUsFeature4Title,
      description: t.whyUsFeature4Desc
    }
  ];

  return (
    <section className="py-16 px-6 bg-white/5 border-t border-white/10 mt-16">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-display font-black text-white text-center mb-12">
          {t.whyUsTitle}
        </h2>
        <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">
          {t.whyUsSubtitle}
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
        
        <div className="mt-16">
          <Feedback />
        </div>
      </div>
    </section>
  );
};
