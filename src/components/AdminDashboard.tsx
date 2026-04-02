import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Star, MessageSquare, User, Calendar, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const AdminDashboard = () => {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFeedback(data);
      } catch (error) {
        console.error("Error fetching feedback:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeedback();
  }, []);

  if (isLoading) {
    return (
      <div className="p-12 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        <p className="text-gray-400 font-medium">Loading feedback data...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-cyan-500/20 rounded-2xl flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-cyan-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Admin Dashboard</h2>
            <p className="text-sm text-gray-400">User Feedback & Ratings</p>
          </div>
        </div>
        <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10">
          <span className="text-xs font-black text-gray-500 uppercase tracking-widest block">Total Responses</span>
          <span className="text-xl font-black text-white">{feedback.length}</span>
        </div>
      </div>

      {feedback.length === 0 ? (
        <div className="text-center py-12 bg-black/20 rounded-3xl border border-dashed border-white/10">
          <p className="text-gray-500 italic">No feedback received yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feedback.map((f, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={f.id || i} 
              className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:border-cyan-500/30 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, idx) => (
                    <Star 
                      key={idx} 
                      className={cn(
                        "w-4 h-4", 
                        idx < f.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-700"
                      )} 
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  <Calendar className="w-3 h-3" />
                  {f.createdAt?.toDate ? f.createdAt.toDate().toLocaleDateString() : 'Recent'}
                </div>
              </div>
              
              <p className="text-white font-medium mb-6 leading-relaxed italic">
                "{f.comment}"
              </p>
              
              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">User ID</span>
                  <span className="text-[10px] text-gray-400 font-mono truncate max-w-[150px]">{f.userId}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
