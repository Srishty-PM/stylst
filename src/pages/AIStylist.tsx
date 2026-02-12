import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Lock } from 'lucide-react';
import { useState } from 'react';

const AIStylist = () => {
  const { profile } = useAuth();
  const [prompt, setPrompt] = useState('');
  const isPremium = profile?.subscription_tier !== 'free';

  if (!isPremium) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">AI Stylist</h1>
        <Card className="border-accent/30">
          <CardContent className="p-8 text-center space-y-4">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="font-display text-xl font-semibold text-foreground">Premium Feature</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Let AI create personalized outfits from your closet. Upgrade to Premium for 10 requests/month.
            </p>
            <Button>Upgrade to Premium — £9.99/mo</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">AI Stylist</h1>
        <Badge variant="secondary">3 of 10 used</Badge>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Tell me what you need... e.g. 'Create a winter office outfit with my black coat'"
            className="min-h-[100px]"
          />
          <Button className="w-full" disabled={!prompt.trim()}>
            <Sparkles className="w-4 h-4 mr-2" /> Generate Outfits
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">AI outfit generation requires backend integration. This is a UI preview.</p>
    </div>
  );
};

export default AIStylist;
