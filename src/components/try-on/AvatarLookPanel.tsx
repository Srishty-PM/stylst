import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RotateCcw, Shirt, Sparkles, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useTryOn, useTryOnAvailability } from '@/hooks/useTryOn';
import { loadAvatar, type SavedAvatar } from '@/lib/avatar-store';
import { canRenderTryOn, NEXT_RELEASE_ENABLED } from '@/lib/next-release';
import { normalizeShopCategory } from '@/lib/shop-catalogue';
import { imageDataUrl, prepareGarmentPhoto, TRY_ON_CONSENT_VERSION, type TryOnImage } from '@/lib/try-on';
import TryOnConsent from './TryOnConsent';

export interface AvatarGarment {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
}

const SUPPORTED = new Set(['tops', 'bottoms', 'dresses', 'outerwear']);

function compatibleGarments(garments: AvatarGarment[]) {
  const selected: (AvatarGarment & { normalizedCategory: string })[] = [];
  for (const garment of garments) {
    const category = normalizeShopCategory(garment.category) ?? garment.category.toLowerCase();
    if (!SUPPORTED.has(category) || !garment.imageUrl) continue;
    if (category === 'dresses') {
      for (let i = selected.length - 1; i >= 0; i--) {
        if (selected[i].normalizedCategory === 'tops' || selected[i].normalizedCategory === 'bottoms') selected.splice(i, 1);
      }
    } else if ((category === 'tops' || category === 'bottoms') && selected.some(item => item.normalizedCategory === 'dresses')) {
      continue;
    }
    const duplicate = selected.findIndex(item => item.normalizedCategory === category);
    if (duplicate >= 0) selected.splice(duplicate, 1);
    selected.push({ ...garment, normalizedCategory: category });
  }
  return selected.slice(-4);
}

export function AvatarLookPanel({ garments, title = 'See it on you', className = '' }: {
  garments: AvatarGarment[];
  title?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const render = useTryOn();
  const availability = useTryOnAvailability();
  const [avatar, setAvatar] = useState<SavedAvatar | null>(null);
  const [loadingAvatar, setLoadingAvatar] = useState(true);
  const [result, setResult] = useState<TryOnImage | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(true);
  const allowed = useRef(false);
  const picked = useMemo(() => compatibleGarments(garments), [garments]);
  const pickedSignature = picked.map(item => item.id).join(':');
  const renderingEnabled = canRenderTryOn(NEXT_RELEASE_ENABLED, availability.data);
  const itemQuery = new URLSearchParams({ items: picked.map(item => item.id).join(',') });

  useEffect(() => {
    active.current = true;
    setResult(null);
    setConsent(false);
    allowed.current = false;
    setError('');
    if (!user?.id) {
      setAvatar(null);
      setLoadingAvatar(false);
      return () => { active.current = false; };
    }
    setLoadingAvatar(true);
    loadAvatar(user.id)
      .then(record => { if (active.current) setAvatar(record ?? null); })
      .catch(() => { if (active.current) setAvatar(null); })
      .finally(() => { if (active.current) setLoadingAvatar(false); });
    return () => { active.current = false; };
  }, [user?.id, pickedSignature]);

  const tryOn = async () => {
    if (!avatar || !allowed.current || !renderingEnabled || !picked.length) return;
    setError('');
    setResult(null);
    try {
      const garmentImages = await Promise.all(picked.map(async garment => ({
        name: garment.name.slice(0, 100),
        category: garment.normalizedCategory,
        image: await prepareGarmentPhoto(garment.imageUrl),
      })));
      const response = await render.mutateAsync({
        action: 'try-on',
        person: avatar.image,
        settings: avatar.settings,
        garments: garmentImages,
        consent: { version: TRY_ON_CONSENT_VERSION, allowed: true, adultAndOwnPhoto: true },
      });
      if (active.current && allowed.current) setResult(response.image);
    } catch (caught) {
      if (active.current) setError(caught instanceof Error ? caught.message : 'Your preview could not be created.');
    }
  };

  return <section className={`rounded-2xl border border-border bg-card overflow-hidden ${className}`} aria-label={title}>
    <div className="p-4 border-b border-border">
      <p className="text-xs uppercase tracking-[0.16em] text-primary">Virtual fitting room</p>
      <h2 className="font-display text-2xl mt-1">{title}</h2>
    </div>
    <div className="aspect-[3/4] bg-secondary/20 relative flex items-center justify-center">
      {loadingAvatar ? <Loader2 className="w-6 h-6 animate-spin" aria-label="Loading avatar" /> : avatar ? (
        <img src={imageDataUrl(result ?? avatar.image)} alt={result ? 'This outfit on your avatar' : 'Your saved avatar'} className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-px bg-border">
          {picked.length ? picked.map((garment, index) => <div key={garment.id} className={`bg-card overflow-hidden ${picked.length === 1 ? 'col-span-2 row-span-2' : picked.length === 2 ? 'row-span-2' : picked.length === 3 && index === 0 ? 'row-span-2' : ''}`}><img src={garment.imageUrl} alt={garment.name} className="w-full h-full object-contain p-2" /></div>) : <div className="col-span-2 row-span-2 flex flex-col items-center justify-center gap-3 text-center p-6"><Shirt className="w-10 h-10 text-muted-foreground" /><p className="text-sm text-muted-foreground">Add clothing to build this look.</p></div>}
        </div>
      )}
      {render.isPending && <div className="absolute inset-0 bg-background/85 flex flex-col items-center justify-center gap-3 text-center p-6"><Loader2 className="w-7 h-7 animate-spin" /><p className="text-sm">Putting this look on your avatar…</p></div>}
    </div>
    <div className="p-4 space-y-4">
      {!avatar ? <>
        <p className="text-sm text-muted-foreground">Your outfit stays visible as a garment grid. Create an avatar once to see this look on you.</p>
        <Button asChild className="w-full gap-2"><Link to={`/try-on?${itemQuery}`}><UserRound className="w-4 h-4" />Create my avatar</Link></Button>
      </> : <>
        <p className="text-sm text-muted-foreground">{result ? 'Your photo-realistic styling preview is ready.' : `${picked.length} supported ${picked.length === 1 ? 'piece' : 'pieces'} ready to try on.`}</p>
        {!result && <TryOnConsent allowed={consent} onChange={value => { allowed.current = value; setConsent(value); if (!value) setResult(null); }} />}
        {result ? <Button variant="outline" className="w-full gap-2" onClick={() => setResult(null)}><RotateCcw className="w-4 h-4" />Back to my avatar</Button> : <Button className="w-full gap-2" disabled={!consent || !picked.length || !renderingEnabled || render.isPending} onClick={() => void tryOn()}><Sparkles className="w-4 h-4" />Try this look on me</Button>}
        {!availability.isLoading && !availability.isError && availability.data?.enabled && <p className="text-xs text-muted-foreground">{availability.data.remaining ?? 0} previews left today.</p>}
        {!availability.isLoading && (!availability.data?.enabled || availability.data?.globalAvailable === false) && <p className="text-xs text-muted-foreground">Avatar previews are unavailable right now. Your garment grid is still saved.</p>}
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  </section>;
}

export function AvatarTryOnDialog({ garments, label = 'Try on' }: { garments: AvatarGarment[]; label?: string }) {
  return <Dialog>
    <DialogTrigger asChild><Button className="gap-2"><UserRound className="w-4 h-4" />{label}</Button></DialogTrigger>
    <DialogContent className="max-w-md max-h-[92dvh] overflow-y-auto p-0">
      <DialogHeader className="sr-only"><DialogTitle>Try this look on your avatar</DialogTitle></DialogHeader>
      <AvatarLookPanel garments={garments} title="Try this look on you" className="border-0 rounded-none" />
    </DialogContent>
  </Dialog>;
}
