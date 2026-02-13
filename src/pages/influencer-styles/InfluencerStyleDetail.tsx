import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Sparkles, Trash2 } from 'lucide-react';
import { useUserInfluencerPreferences, useToggleInfluencerActive, useDeleteInfluencerPreference, type StyleProfile, type InfluencerStyle } from '@/hooks/useInfluencerStyles';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const InfluencerStyleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: preferences, isLoading } = useUserInfluencerPreferences();
  const toggleActive = useToggleInfluencerActive();
  const deletePreference = useDeleteInfluencerPreference();

  const pref = preferences?.find(p => p.id === id);
  const style = pref?.influencer_styles as any as InfluencerStyle | undefined;
  const sp = style?.style_profile as StyleProfile | undefined;

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!pref || !style || !sp) return <div className="text-center py-12 text-muted-foreground">Influencer style not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings/influencer-styles')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">{style.influencer_name}</h1>
          {style.instagram_handle && <p className="text-sm text-muted-foreground">@{style.instagram_handle}</p>}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
              <Trash2 className="w-5 h-5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {style.influencer_name}?</AlertDialogTitle>
              <AlertDialogDescription>AI will stop using their aesthetic for your outfits.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                deletePreference.mutate(pref.id);
                toast({ title: `${style.influencer_name} removed` });
                navigate('/settings/influencer-styles');
              }}>Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Active toggle */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Active</Label>
            <p className="text-xs text-muted-foreground">When active, AI will use this style for outfit generation</p>
          </div>
          <Switch
            checked={pref.is_active}
            onCheckedChange={(checked) => toggleActive.mutate({ id: pref.id, is_active: checked })}
          />
        </CardContent>
      </Card>

      {/* Style profile */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Aesthetic</p>
            <p className="text-foreground italic text-lg">{sp.aesthetic}</p>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Signature Colors</p>
            <div className="flex flex-wrap gap-2">
              {sp.colors?.map(c => <Badge key={c} variant="outline">{c}</Badge>)}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Common Silhouettes</p>
            <ul className="text-sm text-foreground space-y-0.5">
              {sp.silhouettes?.map(s => <li key={s}>• {s}</li>)}
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Key Pieces</p>
            <ul className="text-sm text-foreground space-y-0.5">
              {sp.keyPieces?.map(p => <li key={p}>• {p}</li>)}
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Occasions</p>
            <ul className="text-sm text-foreground space-y-0.5">
              {sp.occasions?.map(o => <li key={o}>• {o}</li>)}
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Style Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {sp.keywords?.map(k => <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>)}
            </div>
          </div>

          {sp.similarInfluencers?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Similar Influencers</p>
              <p className="text-sm text-muted-foreground">{sp.similarInfluencers.join(', ')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Sparkles className="w-3 h-3" />
            {sp.generatedBy === 'user_photos'
              ? `Based on ${style.user_uploaded_photos?.length || 0} uploaded photos`
              : 'AI Generated'}
          </div>
          <p className="text-muted-foreground">Used in {style.times_used} outfits</p>
          <p className="text-muted-foreground">Active since {format(new Date(pref.created_at), 'MMM d, yyyy')}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InfluencerStyleDetail;
