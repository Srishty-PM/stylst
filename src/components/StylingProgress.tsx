import { useState, useEffect } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const MESSAGES = [
  'Analyzing the outfit head to toe',
  'Matching pieces from your closet',
  'Checking colours and styles',
  'Almost there, finishing your look',
];

const StylingProgress = ({ title }: { title: string }) => {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI(v => (v + 1) % MESSAGES.length), 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
      <div className="relative mx-auto w-16 h-16">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
        <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div>
        <p className="font-display text-xl font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-2 min-h-[20px]">{MESSAGES[i]}</p>
      </div>
    </motion.div>
  );
};

export default StylingProgress;
