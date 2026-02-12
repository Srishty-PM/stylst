import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const goals = ['Wear what I own more', 'Reduce impulse shopping', 'Save time getting dressed', 'Plan outfits for events'];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const { completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const toggleGoal = (g: string) =>
    setSelectedGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  const finish = () => {
    completeOnboarding();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center gap-2 mb-4">
            {[0, 1, 2].map(i => (
              <div key={i} className={`h-1.5 w-12 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-border'}`} />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center">
                  <CardTitle className="font-display text-2xl mb-2">Welcome to Stylst!</CardTitle>
                  <CardDescription>What's your primary style goal?</CardDescription>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {goals.map(g => (
                    <button
                      key={g}
                      onClick={() => toggleGoal(g)}
                      className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-colors ${
                        selectedGoals.includes(g) ? 'border-accent bg-accent/10 text-foreground' : 'border-border bg-card text-muted-foreground hover:border-accent/50'
                      }`}
                    >
                      <CheckCircle className={`w-5 h-5 flex-shrink-0 ${selectedGoals.includes(g) ? 'text-accent' : 'text-border'}`} />
                      <span className="font-medium text-sm">{g}</span>
                    </button>
                  ))}
                </div>
                <Button className="w-full" onClick={() => setStep(1)}>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center">
                  <CardTitle className="font-display text-2xl mb-2">Connect Pinterest</CardTitle>
                  <CardDescription>Import your saved fashion pins to match with your closet.</CardDescription>
                </div>
                <div className="bg-muted/50 rounded-xl p-8 text-center border border-dashed border-border">
                  <Badge variant="secondary" className="mb-3">Coming Soon</Badge>
                  <p className="text-sm text-muted-foreground">Pinterest sync will be available in a future update.</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Skip for now</Button>
                  <Button className="flex-1" onClick={() => setStep(2)}>
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center">
                  <CardTitle className="font-display text-2xl mb-2">Add Your First Items</CardTitle>
                  <CardDescription>Upload a few photos to get started.</CardDescription>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="aspect-square rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center text-muted-foreground hover:border-accent/50 transition-colors cursor-pointer">
                      <Upload className="w-6 h-6 mb-1" />
                      <span className="text-xs">Item {i}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">Photo upload will work with backend connected. For now, let's explore the app!</p>
                <Button className="w-full" onClick={finish}>Finish Setup</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
