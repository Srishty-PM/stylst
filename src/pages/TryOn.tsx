import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Camera, Check, Loader2, Save, Shirt, Trash2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useClosetItems } from '@/hooks/useClosetItems';
import { useShopCatalogue } from '@/hooks/useShopCatalogue';
import { useTryOn, useTryOnAvailability } from '@/hooks/useTryOn';
import { canRenderTryOn, NEXT_RELEASE_ENABLED } from '@/lib/next-release';
import { DEFAULT_AVATAR_SETTINGS, TRY_ON_CONSENT_VERSION, avatarSettingsSchema, imageDataUrl, prepareGarmentPhoto, prepareTryOnPhoto, type AvatarSettings, type TryOnImage } from '@/lib/try-on';
import { loadAvatar, saveAvatar, deleteAvatar } from '@/lib/avatar-store';
import { normalizeShopCategory } from '@/lib/shop-catalogue';
import TryOnConsent from '@/components/try-on/TryOnConsent';

const CLOTHING = ['tops', 'bottoms', 'dresses', 'outerwear'];
type Piece = { id: string; name: string; category: string; imageUrl: string; source: 'closet' | 'shop' };

export default function TryOn() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const userId = user?.id;
  const { data: closet = [], isLoading: closetLoading, isError: closetError } = useClosetItems();
  const { data: catalogue, isLoading: shopLoading, isError: shopError } = useShopCatalogue();
  const render = useTryOn();
  const availability = useTryOnAvailability();
  const renderingEnabled = canRenderTryOn(NEXT_RELEASE_ENABLED, availability.data);
  const [sourcePhoto, setSourcePhoto] = useState<TryOnImage | null>(null);
  const [avatar, setAvatar] = useState<TryOnImage | null>(null);
  const [result, setResult] = useState<TryOnImage | null>(null);
  const [avatarSettings, setAvatarSettings] = useState<AvatarSettings>(DEFAULT_AVATAR_SETTINGS);
  const [settings, setSettings] = useState<AvatarSettings>(DEFAULT_AVATAR_SETTINGS);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [consent, setConsent] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [source, setSource] = useState<'closet' | 'shop'>('closet');
  const [busy, setBusy] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const generation = useRef(0);
  const allowed = useRef(false);
  const active = useRef(true);
  const uploadRef = useRef<HTMLInputElement>(null);
  const pieces: Piece[] = [
    ...closet.map(item => ({ id: `closet:${item.id}`, name: item.name, category: normalizeShopCategory(item.category) ?? '', imageUrl: item.image_url_cleaned || item.image_url || '', source: 'closet' as const })),
    ...(catalogue?.products ?? []).map(item => ({ id: `shop:${item.id}`, name: item.name, category: item.category, imageUrl: item.imageUrl ?? '', source: 'shop' as const })),
  ].filter(item => CLOTHING.includes(item.category) && item.imageUrl);
  const picked = selectedIds.map(id => pieces.find(piece => piece.id === id)).filter((piece): piece is Piece => Boolean(piece));
  const working = busy || render.isPending;

  useEffect(() => {
    active.current = true;
    if (!userId) return;
    const requestId = generation.current;
    loadAvatar(userId).then(record => {
      if (!active.current || generation.current !== requestId || !record) return;
      setAvatar(record.image); setAvatarSettings(record.settings); setSettings(record.settings); setHeight(record.settings.heightCm?.toString() ?? ''); setWeight(record.settings.weightKg?.toString() ?? ''); setSaved(true);
    }).catch(() => { if (active.current) setNotice('Device storage is unavailable. You can still preview during this visit.'); })
      .finally(() => { if (active.current) setLoadingAvatar(false); });
    return () => { active.current = false; generation.current += 1; };
  }, [userId]);

  useEffect(() => {
    const item = params.get('product'), lookItems = params.get('items');
    if (item) { setSource('shop'); setSelectedIds([`shop:${item}`]); }
    else if (lookItems) { setSource('closet'); setSelectedIds(lookItems.split(',').filter(Boolean).slice(0, 4).map(id => `closet:${id}`)); }
  }, [params]);

  const changeConsent = (value: boolean) => {
    allowed.current = value; setConsent(value);
    if (!value) { generation.current += 1; setResult(null); setNotice('Photo processing paused. Any image already sent may still finish processing at Google.'); }
  };
  const choosePhoto = async (file?: File) => {
    if (!file) return;
    const requestId = ++generation.current;
    setError(''); setNotice(''); setBusy(true);
    try {
      const photo = await prepareTryOnPhoto(file);
      if (active.current && requestId === generation.current) { setSourcePhoto(photo); setResult(null); }
    } catch (error) { if (active.current) setError(error instanceof Error ? error.message : 'This photo could not be read.'); }
    finally { if (active.current) setBusy(false); }
  };
  const run = async (action: 'avatar' | 'try-on') => {
    if (!user || !allowed.current || !renderingEnabled) return;
    const person = action === 'avatar' ? sourcePhoto : avatar;
    if (!person) return;
    const requestId = ++generation.current;
    setError(''); setNotice(''); setResult(null); setBusy(true);
    try {
      const validated = avatarSettingsSchema.parse({ ...settings, heightCm: height.trim() ? Number(height) : undefined, weightKg: weight.trim() ? Number(weight) : undefined });
      const garments = action === 'avatar' ? [] : await Promise.all(picked.map(async piece => ({ name: piece.name.slice(0, 100), category: piece.category, image: await prepareGarmentPhoto(piece.imageUrl) })));
      if (!active.current || !allowed.current || requestId !== generation.current) return;
      const response = await render.mutateAsync({ action, person, settings: validated, garments, consent: { version: TRY_ON_CONSENT_VERSION, allowed: true, adultAndOwnPhoto: true } });
      if (!active.current || !allowed.current || requestId !== generation.current) return;
      if (action === 'avatar') { setAvatar(response.image); setAvatarSettings(validated); setSaved(false); setSettings(validated); setSourcePhoto(null); if (uploadRef.current) uploadRef.current.value = ''; }
      else setResult(response.image);
    } catch (error) { if (active.current && requestId === generation.current) setError(error instanceof Error ? error.message : 'Your preview could not be created.'); }
    finally { if (active.current) setBusy(false); }
  };
  const persist = async () => {
    if (!user || !avatar) return;
    setBusy(true); setError('');
    try { await saveAvatar({ userId: user.id, image: avatar, settings: avatarSettings }); setSaved(true); setNotice('Avatar saved on this device.'); }
    catch { setError('Your avatar could not be saved on this device.'); }
    finally { setBusy(false); }
  };
  const clear = async () => {
    if (!user) return;
    generation.current += 1; setBusy(true); setError('');
    try { await deleteAvatar(user.id); setAvatar(null); setResult(null); setSourcePhoto(null); setSaved(false); setSettings(DEFAULT_AVATAR_SETTINGS); setHeight(''); setWeight(''); setSelectedIds([]); changeConsent(false); if (uploadRef.current) uploadRef.current.value = ''; setNotice('Your avatar and photos have been removed from this device. This does not delete processing records held by Google.'); }
    catch { setError('The saved avatar could not be removed. Please try again.'); }
    finally { setBusy(false); }
  };
  const toggle = (piece: Piece) => {
    setResult(null);
    setSelectedIds(previous => previous.includes(piece.id) ? previous.filter(id => id !== piece.id) : [...previous.filter(id => pieces.find(item => item.id === id)?.category !== piece.category && (piece.category !== 'dresses' || !['tops', 'bottoms'].includes(pieces.find(item => item.id === id)?.category ?? '')) && (!['tops', 'bottoms'].includes(piece.category) || pieces.find(item => item.id === id)?.category !== 'dresses')), piece.id].slice(-4));
  };

  return <div className="space-y-6">
    <header><p className="text-xs uppercase tracking-[0.2em] text-primary">Made for your imagination</p><h1 className="text-4xl md:text-5xl mt-2">Your fitting room</h1><p className="text-sm text-muted-foreground mt-3 max-w-xl">Create your photo-realistic avatar once. Try your closet pieces and new finds together. AI previews show a styling idea; they cannot predict size, fit or exact fabric drape.</p></header>
    {availability.isLoading ? <p role="status" className="text-sm">Checking the fitting room…</p> : availability.isError ? <div role="alert" className="rounded-xl bg-secondary/50 p-4 text-sm">The fitting room could not be reached. <Button variant="link" onClick={() => availability.refetch()}>Try again</Button></div> : !availability.data?.enabled ? <p role="status" className="rounded-xl bg-secondary/50 p-4 text-sm">Avatar generation is temporarily unavailable. No photos will be sent while generation is unavailable.</p> : <p role="status" className="rounded-xl bg-secondary/30 p-4 text-sm">{availability.data.globalAvailable === false ? 'Today’s fitting-room previews have been used. Please try again tomorrow.' : `${availability.data.remaining ?? 0} of ${availability.data.dailyLimit ?? 3} previews left today. Resets at midnight UTC.`}</p>}
    <div className="grid md:grid-cols-[1fr_1.1fr] gap-6 items-start">
      <section className="md:sticky md:top-6 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="aspect-[3/4] bg-secondary/20 flex items-center justify-center relative">
          {loadingAvatar ? <Loader2 className="w-6 h-6 animate-spin" aria-label="Loading saved avatar" /> : result || avatar || sourcePhoto ? <img src={imageDataUrl((result || avatar || sourcePhoto)!)} alt={result ? 'AI outfit preview on your avatar' : avatar ? 'Your generated avatar' : 'Your selected source photo; not yet generated'} className="w-full h-full object-contain" /> : <div className="text-center p-8 space-y-4"><UserRound className="w-16 h-16 text-primary/60 mx-auto" strokeWidth={1} /><h2 className="text-3xl">A little more you.</h2><p className="text-sm text-muted-foreground">Your avatar will appear here after you create it.</p></div>}
          {working && <div role="status" className="absolute inset-0 bg-background/85 flex flex-col items-center justify-center gap-3"><Loader2 className="w-7 h-7 animate-spin" /><p className="text-sm">Preparing your preview…</p></div>}
        </div>
        <div className="p-4 space-y-3"><p className="text-xs text-muted-foreground">{result ? 'AI-generated outfit preview' : avatar ? 'AI-generated base avatar' : sourcePhoto ? 'Source photo · visible only on this device' : 'Photo-realistic avatar preview'}</p>{avatar && <div className="flex gap-2"><Button variant="outline" className="flex-1 gap-2" disabled={working || saved} onClick={persist}>{saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}{saved ? 'Avatar saved' : 'Save avatar'}</Button><Button variant="ghost" className="gap-2" onClick={clear} disabled={working}><Trash2 className="w-4 h-4" />Delete</Button></div>}{result && <Button variant="ghost" onClick={() => setResult(null)} className="w-full">Back to my avatar</Button>}</div>
      </section>
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4"><div><p className="text-xs uppercase tracking-wider text-primary">01 · Create your likeness</p><h2 className="text-2xl mt-1">Meet your avatar</h2></div><p className="text-sm text-muted-foreground">Choose a clear, full-length photo of yourself in everyday clothing, facing the camera. Use a photo with one person and a plain background. JPG, PNG or WebP, up to 8 MB.</p>
          <Label htmlFor="avatar-photo" className="flex items-center gap-2"><Camera className="w-4 h-4" />Your reference photo</Label><Input ref={uploadRef} id="avatar-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={!renderingEnabled || working || loadingAvatar} onChange={event => void choosePhoto(event.target.files?.[0])} />
          {sourcePhoto && <Button variant="ghost" disabled={working} onClick={() => { generation.current += 1; setSourcePhoto(null); if (uploadRef.current) uploadRef.current.value = ''; }}>Remove reference photo</Button>}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="avatar-height">Height (cm)</Label><Input id="avatar-height" type="number" inputMode="numeric" min="120" max="220" step="1" placeholder="e.g. 163" value={height} disabled={working} onChange={event => setHeight(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="avatar-weight">Weight (kg)</Label><Input id="avatar-weight" type="number" inputMode="numeric" min="30" max="300" step="1" placeholder="e.g. 65" value={weight} disabled={working} onChange={event => setWeight(event.target.value)} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="avatar-build">Build</Label><select id="avatar-build" className="w-full border rounded bg-background p-2 min-h-11 text-sm" value={settings.build} disabled={working} onChange={event => setSettings({ ...settings, build: event.target.value as AvatarSettings['build'] })}>{[['as-photographed', 'Keep as photographed'], ['slender', 'Slender'], ['athletic', 'Athletic'], ['curvy', 'Curvy'], ['broad', 'Broad']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="space-y-2"><Label htmlFor="avatar-hair">Hair</Label><select id="avatar-hair" className="w-full border rounded bg-background p-2 min-h-11 text-sm" value={settings.hair} disabled={working} onChange={event => setSettings({ ...settings, hair: event.target.value as AvatarSettings['hair'] })}>{[['as-photographed', 'Keep as photographed'], ['short', 'Short'], ['shoulder-length', 'Shoulder length'], ['long', 'Long'], ['tied-back', 'Tied back']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div><p className="text-xs text-muted-foreground">Height and weight are optional proportion references. Your photo remains the main reference, and your face and skin tone are preserved.</p>
          <Button className="w-full gap-2" disabled={!renderingEnabled || !sourcePhoto || !consent || working || loadingAvatar} onClick={() => run('avatar')}><UserRound className="w-4 h-4" />{avatar ? 'Create a new avatar' : 'Create my avatar'}</Button>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4"><div><p className="text-xs uppercase tracking-wider text-primary">02 · Put a look together</p><h2 className="text-2xl mt-1">What would you like to try?</h2></div><div className="flex gap-2"><Button variant={source === 'closet' ? 'default' : 'outline'} aria-pressed={source === 'closet'} disabled={working} onClick={() => setSource('closet')}>My closet</Button><Button variant={source === 'shop' ? 'default' : 'outline'} aria-pressed={source === 'shop'} disabled={working} onClick={() => setSource('shop')}>Shop finds</Button></div>
          <p className="text-xs text-muted-foreground">Try tops, bottoms, dresses and outerwear. Select one per category; dresses replace a top-and-bottom combination.</p>
          {(source === 'closet' ? closetLoading : shopLoading) ? <p role="status" className="text-sm">Loading pieces…</p> : (source === 'closet' ? closetError : shopError) ? <p role="alert" className="text-sm">We couldn’t load these pieces. Check your connection and reload the page.</p> : pieces.filter(piece => piece.source === source).length ? <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">{pieces.filter(piece => piece.source === source).map(piece => <button key={piece.id} type="button" disabled={working} onClick={() => toggle(piece)} aria-pressed={selectedIds.includes(piece.id)} className={`rounded-lg border p-2 text-left ${selectedIds.includes(piece.id) ? 'border-primary ring-1 ring-primary' : 'border-border'}`}><img src={piece.imageUrl} alt="" className="w-full aspect-square object-contain bg-secondary/20 rounded" referrerPolicy="no-referrer" /><span className="text-xs line-clamp-2 mt-2">{piece.name}</span>{selectedIds.includes(piece.id) && <span className="text-[10px] text-primary">Selected</span>}</button>)}</div> : <div className="border border-dashed rounded-lg p-5 text-sm text-center text-muted-foreground"><Shirt className="w-7 h-7 mx-auto mb-2" />{source === 'closet' ? 'Add a clothing photo to your closet to try it here.' : 'Shop pieces will appear when an approved retailer feed is connected.'}<Link to={source === 'closet' ? '/closet/add' : '/shop'} className="block underline mt-3">{source === 'closet' ? 'Add a closet piece' : 'Browse shop'}</Link></div>}
          {picked.length > 0 && <div className="space-y-2"><p className="text-sm font-medium">Your selection ({picked.length}/4)</p>{picked.map(piece => <div key={piece.id} className="flex items-center gap-2 text-sm"><span className="flex-1 truncate">{piece.name}</span><Button size="sm" variant="ghost" aria-label={`Remove ${piece.name}`} disabled={working} onClick={() => toggle(piece)}>Remove</Button></div>)}</div>}
          <Button className="w-full gap-2" disabled={!renderingEnabled || !avatar || !picked.length || !consent || working} onClick={() => run('try-on')}><Shirt className="w-4 h-4" />Try this on my avatar</Button>
        </section>
        <TryOnConsent allowed={consent} onChange={changeConsent} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      </div>
    </div>
  </div>;
}
