import React, { useState } from 'react';
import { Star, Send } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export const Feedback = () => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!auth.currentUser) {
      toast.error("✨ Oops! Please sign in to share your feedback with us! 🔒", {
        description: "We'd love to hear from you, but we need to know who's talking! 😊",
        duration: 5000,
      });
      return;
    }

    if (rating === 0) {
      toast.error("Please select a rating! ⭐", {
        description: "Click on the stars to let us know how we're doing.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        rating,
        comment,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        createdAt: new Date()
      });
      setSubmitted(true);
      toast.success("Thank you! 💖 Your feedback helps us grow! ✨", {
        description: "We've received your thoughts and appreciate your support.",
      });
    } catch (error) {
      console.error("Feedback submission error:", error);
      toast.error("Something went wrong... 😔", {
        description: "Please try again in a moment.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white/5 p-8 rounded-3xl border border-white/10 mt-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-green-500 fill-current" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Feedback Received! ✨</h3>
        <p className="text-gray-400">Thank you for helping us make CaptionAI better! 💖</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mt-8 shadow-2xl backdrop-blur-sm">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-400" />
        Rate our app
      </h3>
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className="transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              className={`w-10 h-10 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600 hover:text-gray-400'}`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your thoughts, suggestions, or just say hi! 😊"
        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white placeholder-gray-500 mb-6 focus:ring-2 focus:ring-cyan-500 outline-none transition-all resize-none h-32"
      />
      <button 
        onClick={handleSubmit} 
        disabled={isSubmitting}
        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        {isSubmitting ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            Submit Feedback
          </>
        )}
      </button>
    </div>
  );
};
