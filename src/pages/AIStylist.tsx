import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Send, UserCircle, ArrowRight } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useActiveInfluencerStyles } from '@/hooks/useInfluencerStyles';
import { useAddLook } from '@/hooks/useLooks';
import { useClosetItems } from '@/hooks/useClosetItems';
import { supabase } from '@/integrations/supabase/client';
import { ensureAIConsent, runAIRequest } from '@/lib/ai-consent';
import { legacyStylistTextToResult, stylistResultSchema, type StylistOutfit, type StylistResult } from '@/lib/ai-stylist';
import VisualOutfitCard from '@/components/stylist/VisualOutfitCard';

const SUGGESTIONS = [
  "Create a casual weekend outfit",
  "What should I wear to a winter date night?",
  "Build me a smart-casual office look",
  "Style an outfit around my leather jacket",
];

const AIStylist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: activeInfluencers } = useActiveInfluencerStyles();
  const { data: closetItems = [] } = useClosetItems();
  const addLook = useAddLook();
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<StylistResult | null>(null);
  const [savedLooks, setSavedLooks] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = async (input?: string) => {
    const text = input || prompt;
    if (!text.trim()) return;
    if (!user || !await ensureAIConsent(user.id)) return;

    setIsLoading(true);
    setResult(null);
    setSavedLooks({});
    abortRef.current = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await runAIRequest(user.id, () => fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-stylist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt: text }),
          signal: abortRef.current.signal,
        }
      ));

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if ((resp.headers.get('content-type') || '').includes('application/json')) {
        const parsed = stylistResultSchema.safeParse(await resp.json());
        if (!parsed.success) throw new Error('The stylist returned an incomplete look. Please try again.');
        setResult(parsed.data);
      } else {
        if (!resp.body) throw new Error('The stylist returned no outfit suggestions.');
        const reader = resp.body.getReader(), decoder = new TextDecoder();
        let buffer = '', full = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newline = buffer.indexOf('\n');
          while (newline !== -1) {
            const line = buffer.slice(0, newline).replace(/\r$/, '');
            buffer = buffer.slice(newline + 1);
            if (line.startsWith('data: ')) {
              const payload = line.slice(6).trim();
              if (payload !== '[DONE]') {
                try { full += JSON.parse(payload).choices?.[0]?.delta?.content || ''; } catch { /* wait for the next complete event */ }
              }
            }
            newline = buffer.indexOf('\n');
          }
        }
        setResult(legacyStylistTextToResult(full, closetItems, text));
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        toast({ title: 'AI Error', description: error instanceof Error ? error.message : 'Your outfits could not be created.', variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (outfit: StylistOutfit, index: number) => {
    if (!user || savedLooks[index]) return;
    try {
      const saved = await addLook.mutateAsync({
        user_id: user.id,
        name: outfit.name,
        closet_item_ids: outfit.itemIds,
        occasion: outfit.occasion,
        season: outfit.season,
        notes: outfit.whyItWorks,
        created_by_ai: true,
      });
      setSavedLooks(current => ({ ...current, [index]: saved.id }));
      toast({ title: 'Look saved', description: `${outfit.name} is now in My Looks.` });
    } catch (error) {
      toast({ title: 'Couldn’t save look', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">AI Stylist</h1>
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="w-3 h-3" /> Powered by AI
        </Badge>
      </div>

      {/* Active influencer styles */}
      {activeInfluencers && activeInfluencers.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Your Style Influences:</p>
            <div className="flex items-center gap-2 flex-wrap">
              {activeInfluencers.map(inf => (
                <Badge key={inf.id} variant="outline" className="gap-1">
                  <UserCircle className="w-3 h-3" /> {inf.influencer_name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">AI will create outfits inspired by their aesthetic using your closet.</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => navigate('/settings/influencer-styles')}
            >
              Manage Influencers <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick suggestions */}
      {!result && !isLoading && (
        <div className="grid grid-cols-2 gap-2">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => { setPrompt(s); handleGenerate(s); }}
              className="text-left p-3 rounded-lg border border-border bg-card text-sm text-foreground hover:border-accent/50 hover:bg-accent/5 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Response */}
      {isLoading && <Card><CardContent className="p-8 flex flex-col items-center justify-center gap-3 text-center min-h-40">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <div><p className="font-medium">Building your outfit boards…</p><p className="text-sm text-muted-foreground mt-1">Matching pieces and photos from your closet</p></div>
      </CardContent></Card>}

      {result && <section className="space-y-4" aria-label="Your visual outfit suggestions">
        <p className="text-sm leading-relaxed text-muted-foreground">{result.intro}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {result.outfits.map((outfit, index) => <VisualOutfitCard
            key={`${outfit.name}-${index}`}
            outfit={outfit}
            saved={Boolean(savedLooks[index])}
            saving={addLook.isPending}
            onSave={() => void handleSave(outfit, index)}
          />)}
        </div>
      </section>}

      {/* Input */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            maxLength={800}
            placeholder={activeInfluencers?.length ? `e.g., "Winter office outfit in ${activeInfluencers[0].influencer_name} style"` : "Tell me what you need... e.g. 'Create a winter office outfit with my black coat'"}
            className="min-h-[80px]"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <Button
            className="w-full"
            disabled={!prompt.trim() || isLoading}
            onClick={() => handleGenerate()}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isLoading ? 'Generating...' : 'Generate Outfits'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIStylist;
