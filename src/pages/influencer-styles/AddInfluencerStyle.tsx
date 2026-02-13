import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { useGenerateInfluencerStyle, useAddInfluencerPreference, type StyleProfile } from '@/hooks/useInfluencerStyles';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

const schema = z.object({
  influencer_name: z.string().trim().min(1, 'Name is required').max(100),
  instagram_handle: z.string().max(30).optional(),
});

const AddInfluencerStyle = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const generateStyle = useGenerateInfluencerStyle();
  const addPreference = useAddInfluencerPreference();

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [result, setResult] = useState<{ profile: StyleProfile; id?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cleanHandle = (val: string) => val.replace(/.*instagram\.com\//, '').replace(/^@/, '').trim();

  const handleGenerate = async () => {
    const parsed = schema.safeParse({ influencer_name: name, instagram_handle: handle });
    if (!parsed.success) {
      toast({ title: 'Validation Error', description: parsed.error.issues[0].message, variant: 'destructive' });
      return;
    }

    setResult(null);
    setError(null);

    try {
      const data = await generateStyle.mutateAsync({
        influencer_name: parsed.data.influencer_name,
        instagram_handle: cleanHandle(handle),
      });

      if (!data.success) {
        setError(data.message || 'Unknown influencer');
        return;
      }

      setResult({ profile: data.profile, id: data.id });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!result?.id) return;
    try {
      await addPreference.mutateAsync(result.id);
      toast({ title: `✓ ${name} added to your styles!` });
      navigate('/settings/influencer-styles');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings/influencer-styles')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-2xl font-bold text-foreground">Add Influencer Style</h1>
      </div>

      {/* Step 1: Input */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="font-display text-lg font-semibold text-foreground">Whose Style Do You Love?</p>

          <div className="space-y-2">
            <Label htmlFor="influencer-name">Influencer Name *</Label>
            <Input
              id="influencer-name"
              placeholder="e.g., Matilda Djerf"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram-handle">Instagram Handle (optional)</Label>
            <Input
              id="instagram-handle"
              placeholder="@matildadjerf or instagram.com/matildadjerf"
              value={handle}
              onChange={e => setHandle(e.target.value)}
              maxLength={60}
            />
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI will analyze this influencer's known style.
          </p>

          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={!name.trim() || generateStyle.isPending}
          >
            {generateStyle.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing style... (~10s)
              </>
            ) : (
              'Generate Style Profile →'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Unknown influencer error */}
      {error && (
        <Card className="border-destructive/30">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <p className="font-semibold text-foreground">Unknown Influencer</p>
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Try:</p>
              <p>• Check spelling</p>
              <p>• Add Instagram handle</p>
              <p>• Make sure they're a fashion influencer</p>
            </div>
            <Button variant="outline" onClick={() => { setError(null); }}>Try Again</Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Results */}
      {result && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <p className="font-display text-lg font-semibold text-foreground">Style Profile Generated!</p>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Aesthetic</p>
              <p className="text-foreground italic">{result.profile.aesthetic}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Signature Colors</p>
              <div className="flex flex-wrap gap-2">
                {result.profile.colors?.map(c => (
                  <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Common Silhouettes</p>
              <ul className="text-sm text-foreground space-y-0.5">
                {result.profile.silhouettes?.map(s => <li key={s}>• {s}</li>)}
              </ul>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Key Pieces</p>
              <ul className="text-sm text-foreground space-y-0.5">
                {result.profile.keyPieces?.map(p => <li key={p}>• {p}</li>)}
              </ul>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Occasions</p>
              <ul className="text-sm text-foreground space-y-0.5">
                {result.profile.occasions?.map(o => <li key={o}>• {o}</li>)}
              </ul>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Style Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {result.profile.keywords?.map(k => (
                  <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                ))}
              </div>
            </div>

            {result.profile.similarInfluencers?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Similar Influencers</p>
                <p className="text-sm text-muted-foreground">{result.profile.similarInfluencers.join(', ')}</p>
              </div>
            )}

            <Separator />

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={addPreference.isPending}
            >
              {addPreference.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Add This Influencer to My Styles
            </Button>

            <Button variant="ghost" className="w-full" onClick={() => { setResult(null); setName(''); setHandle(''); }}>
              ← Start Over
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AddInfluencerStyle;
