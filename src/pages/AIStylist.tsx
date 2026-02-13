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

const SUGGESTIONS = [
  "Create a casual weekend outfit",
  "What should I wear to a winter date night?",
  "Build me a smart-casual office look",
  "Style an outfit around my leather jacket",
];

const AIStylist = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: activeInfluencers } = useActiveInfluencerStyles();
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = async (input?: string) => {
    const text = input || prompt;
    if (!text.trim()) return;

    setIsLoading(true);
    setResponse('');
    abortRef.current = new AbortController();

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-stylist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt: text }),
          signal: abortRef.current.signal,
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              full += content;
              setResponse(full);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
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
      {!response && !isLoading && (
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
      {(response || isLoading) && (
        <Card>
          <CardContent className="p-5">
            {isLoading && !response && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Analyzing your closet...</span>
              </div>
            )}
            {response && (
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                {response}
              </div>
            )}
            {isLoading && response && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mt-2" />
            )}
          </CardContent>
        </Card>
      )}

      {/* Input */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
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
