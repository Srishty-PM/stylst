import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, UserCircle, Trash2, ArrowLeft, Sparkles } from 'lucide-react';
import { useUserInfluencerPreferences, useToggleInfluencerActive, useDeleteInfluencerPreference, type StyleProfile } from '@/hooks/useInfluencerStyles';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import UpgradeModal from '@/components/UpgradeModal';

const TIER_LIMITS: Record<string, number> = { free: 1, premium: 3, premium_plus: Infinity };

const InfluencerStyles = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: preferences, isLoading } = useUserInfluencerPreferences();
  const toggleActive = useToggleInfluencerActive();
  const deletePreference = useDeleteInfluencerPreference();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const tier = profile?.subscription_tier || 'free';
  const limit = TIER_LIMITS[tier] ?? 1;
  const count = preferences?.length ?? 0;
  const canAdd = count < limit;

  const handleAdd = () => {
    if (!canAdd) {
      setUpgradeOpen(true);
      return;
    }
    navigate('/settings/influencer-styles/add');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">Your Style Influencers</h1>
          <p className="text-sm text-muted-foreground">AI learns from your favorite influencers to personalize your outfits</p>
        </div>
        <Button size="sm" onClick={handleAdd} disabled={!canAdd && tier !== 'free'}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {/* Tier info */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="text-xs">FREE: 1</Badge>
        <Badge variant="secondary" className="text-xs">PREMIUM: 3</Badge>
        <Badge variant="secondary" className="text-xs">PREMIUM+: Unlimited</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : !preferences?.length ? (
        /* Empty state */
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-4">
            <UserCircle className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-display text-lg font-semibold text-foreground">No Influencers Added Yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add your favorite fashion influencers and AI will style you in their aesthetic!</p>
            </div>
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p>Examples:</p>
              <p>• Matilda Djerf</p>
              <p>• Emma Chamberlain</p>
              <p>• Jeanne Damas</p>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" /> Add Your First Influencer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {preferences.map(pref => {
            const style = pref.influencer_styles as any as import('@/hooks/useInfluencerStyles').InfluencerStyle | undefined;
            if (!style) return null;
            const sp = style.style_profile as StyleProfile;

            return (
              <Card key={pref.id} className="overflow-hidden">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display text-lg font-bold text-foreground">{style.influencer_name}</p>
                      {style.instagram_handle && (
                        <p className="text-xs text-muted-foreground">@{style.instagram_handle}</p>
                      )}
                    </div>
                    <Badge variant={pref.is_active ? 'default' : 'secondary'}>
                      {pref.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground"><span className="font-medium text-foreground">Style:</span> {sp.aesthetic}</p>
                    <div className="flex flex-wrap gap-1">
                      {sp.colors?.slice(0, 5).map(c => (
                        <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Key Pieces:</span>{' '}
                      {sp.keyPieces?.slice(0, 3).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Sparkles className="w-3 h-3" />
                    {sp.generatedBy === 'user_photos'
                      ? `Based on ${style.user_uploaded_photos?.length || 0} uploaded photos`
                      : 'AI Generated'}
                  </div>

                  <p className="text-xs text-muted-foreground">Used in {style.times_used} outfits</p>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/settings/influencer-styles/${pref.id}`)}>
                        View Details
                      </Button>
                      <Switch
                        checked={pref.is_active}
                        onCheckedChange={(checked) => {
                          toggleActive.mutate({ id: pref.id, is_active: checked });
                        }}
                      />
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove {style.influencer_name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {style.influencer_name} from your styles. AI will stop using their aesthetic.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => {
                            deletePreference.mutate(pref.id);
                            toast({ title: `${style.influencer_name} removed` });
                          }}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason="Upgrade to add more influencer styles" />
    </div>
  );
};

export default InfluencerStyles;
