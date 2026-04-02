import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export const AdminDashboard = () => {
  const [feedback, setFeedback] = useState<any[]>([]);

  useEffect(() => {
    const fetchFeedback = async () => {
      const querySnapshot = await getDocs(collection(db, 'feedback'));
      const data = querySnapshot.docs.map(doc => doc.data());
      setFeedback(data);
    };
    fetchFeedback();
  }, []);

  return (
    <div className="p-8 bg-black/20 border border-white/10 rounded-3xl mt-8">
      <h2 className="text-2xl font-bold text-white mb-6">Admin Dashboard - Feedback</h2>
      <div className="space-y-4">
        {feedback.map((f, i) => (
          <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5">
            <p className="text-yellow-400 font-bold">{f.rating} Stars</p>
            <p className="text-white">{f.comment}</p>
            <p className="text-gray-500 text-xs">{f.userId}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
