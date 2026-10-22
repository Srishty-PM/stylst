import { Upload, Link2, Loader2, CheckCircle2, Camera as CameraIcon, Image as ImageIcon, Sparkles } from 'lucide-react';
import { isNativePicker, takePhoto, pickSinglePhoto, MAX_UPLOAD_BYTES } from '@/lib/image-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAddInspiration, uploadInspirationImage } from '@/hooks/useInspirations';
import { usePinterestConnect, usePinterestBoards, useSyncPinterestBoard } from '@/hooks/usePinterest';
import { getPinterestSyncNotice } from '@/lib/pinterest-sync-result';
import { toast } from '@/hooks/use-toast';

const AddInspiration = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const addInspo = useAddInspiration();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [method, setMethod] = useState<'upload' | 'camera' | 'pinterest' | 'link'>('upload');

  const { connect, loading: connectLoading } = usePinterestConnect();
  const pinterestConnected = profile?.pinterest_connected ?? false;
  const { data: boards, isLoading: boardsLoading, error: boardsError } = usePinterestBoards(pinterestConnected);
  const { sync, syncing } = useSyncPinterestBoard();
  const reauthRequired = (boardsError as any)?.code === 'REAUTH_REQUIRED';

  const selectFile = (f: File) => {
    if (f.size > MAX_UPLOAD_BYTES) {
      toast({ title: 'Photo too large', description: 'Please choose an image under 5MB.', variant: 'destructive' });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) selectFile(f);
    e.target.value = '';
  };

  const handleTakePhoto = async () => {
    try {
      const f = await takePhoto();
      if (f) selectFile(f);
    } catch (err: any) {
      if (err?.message && !/cancel/i.test(err.message)) {
        toast({ title: 'Camera error', description: err.message, variant: 'destructive' });
      }
    }
  };

  const handlePickLibrary = async () => {
    try {
      const f = await pickSinglePhoto('library');
      if (f) selectFile(f);
    } catch (err: any) {
      if (err?.message && !/cancel/i.test(err.message)) {
        toast({ title: 'Could not open photo library', description: err.message, variant: 'destructive' });
      }
    }
  };

  const handleSaveUpload = async () => {
    if (!user || !file) return;
    setSaving(true);
    try {
      const imageUrl = await uploadInspirationImage(user.id, file);
      const saved = await addInspo.mutateAsync({
        user_id: user.id,
        image_url: imageUrl,
        description: description || null,
      });
      toast({ title: 'Inspiration saved', description: 'Now recreating it from your closet.' });
      navigate(`/inspiration/${saved.id}?auto=1`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUrl = async () => {
    if (!user || !sourceUrl.trim()) return;
    setSaving(true);
    try {
      const saved = await addInspo.mutateAsync({
        user_id: user.id,
        image_url: sourceUrl.trim(),
        source_url: sourceUrl.trim(),
        description: description || null,
      });
      toast({ title: 'Inspiration saved', description: 'Now recreating it from your closet.' });
      navigate(`/inspiration/${saved.id}?auto=1`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleConnectPinterest = async () => {
    try {
      await connect();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleSyncBoard = async (boardId: string, boardName: string) => {
    try {
      const result = await sync(boardId);
      toast(getPinterestSyncNotice(boardName, result));
      navigate('/inspiration');
    } catch (err: any) {
      toast({ title: 'Sync Failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><p className="text-xs uppercase tracking-[0.18em] text-primary">Step 2 of your style flow</p><h1 className="font-display text-3xl font-bold text-foreground mt-1">Add inspiration</h1></div>
        <Link to="/inspiration" className="text-sm text-muted-foreground hover:text-foreground">Cancel</Link>
      </div>
      <p className="text-sm text-muted-foreground max-w-xl">Choose one source. After you save it, STYLST will immediately recreate the outfit with your closet.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2" aria-label="Inspiration source">
        {[
          { id: 'upload' as const, label: 'Upload image', icon: Upload },
          { id: 'camera' as const, label: 'Take photo', icon: CameraIcon },
          { id: 'pinterest' as const, label: 'Pinterest', icon: ImageIcon },
          { id: 'link' as const, label: 'Paste link', icon: Link2 },
        ].map(option => <button key={option.id} type="button" aria-pressed={method === option.id} onClick={() => setMethod(option.id)} className={`min-h-24 rounded-xl border p-3 text-left transition-colors ${method === option.id ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}><option.icon className="w-5 h-5 text-primary mb-3" /><span className="text-sm font-medium">{option.label}</span></button>)}
      </div>

      {(method === 'upload' || method === 'camera') && <Card>
        <CardHeader><CardTitle className="text-lg">{method === 'camera' ? 'Take an outfit photo' : 'Choose an outfit image'}</CardTitle><CardDescription>{method === 'camera' ? 'Photograph a look from a magazine, shop window or another screen.' : 'Use a screenshot, saved photo or fashion image.'}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {preview ? <div className="rounded-xl bg-muted/30 p-3"><img src={preview} alt="Selected inspiration" className="max-h-80 w-full object-contain rounded-lg" /></div> : isNativePicker() ? <Button type="button" variant="outline" className="w-full h-28 flex-col gap-2" onClick={method === 'camera' ? handleTakePhoto : handlePickLibrary}>{method === 'camera' ? <CameraIcon className="w-7 h-7" /> : <ImageIcon className="w-7 h-7" />}<span>{method === 'camera' ? 'Open camera' : 'Open photo library'}</span></Button> : <label className="block cursor-pointer"><div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary/50 transition-colors">{method === 'camera' ? <CameraIcon className="w-8 h-8 text-primary mx-auto mb-2" /> : <Upload className="w-8 h-8 text-primary mx-auto mb-2" />}<p className="text-sm font-medium">{method === 'camera' ? 'Open camera' : 'Tap to upload'}</p><p className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP · Max 5MB</p></div><input type="file" accept="image/*" capture={method === 'camera' ? 'environment' : undefined} className="hidden" onChange={handleFileChange} /></label>}
          {preview && (isNativePicker() ? <Button variant="ghost" size="sm" onClick={method === 'camera' ? handleTakePhoto : handlePickLibrary}>Choose a different image</Button> : <label className="inline-flex min-h-10 items-center text-sm text-primary cursor-pointer">Choose a different image<input type="file" accept="image/*" capture={method === 'camera' ? 'environment' : undefined} className="hidden" onChange={handleFileChange} /></label>)}
          <div className="space-y-2"><Label htmlFor="inspiration-description">Description (optional)</Label><Input id="inspiration-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Minimalist autumn look" /></div>
          <Button className="w-full gap-2" disabled={!file || saving} onClick={handleSaveUpload}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{saving ? 'Saving…' : 'Save & recreate this look'}</Button>
        </CardContent>
      </Card>}

      {method === 'link' && <Card><CardHeader><CardTitle className="text-lg">Paste an image link</CardTitle><CardDescription>Use the direct HTTPS URL of a fashion image.</CardDescription></CardHeader><CardContent className="space-y-4"><Input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://…" inputMode="url" /><div className="space-y-2"><Label htmlFor="link-description">Description (optional)</Label><Input id="link-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Dinner look" /></div><Button className="w-full gap-2" disabled={!sourceUrl.trim() || saving} onClick={handleSaveUrl}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{saving ? 'Saving…' : 'Save & recreate this look'}</Button></CardContent></Card>}

      {method === 'pinterest' && <Card>
        <CardHeader><div className="flex items-center gap-2"><CardTitle className="text-lg">Pinterest boards</CardTitle>{pinterestConnected ? <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" />Connected</Badge> : <Badge variant="secondary">Not connected</Badge>}</div><CardDescription>{pinterestConnected ? 'Choose one board to sync. Your Pins will appear in Inspiration.' : 'Connect Pinterest once, then choose which fashion board to sync.'}</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {!pinterestConnected || reauthRequired ? <Button variant="outline" className="w-full" disabled={connectLoading} onClick={handleConnectPinterest}>{connectLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{reauthRequired ? 'Reconnect Pinterest' : 'Connect Pinterest'}</Button> : boardsLoading ? <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div> : boards?.length ? <div className="space-y-2">{boards.map(board => <div key={board.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border"><div className="flex items-center gap-3 min-w-0">{board.image_url && <img src={board.image_url} alt="" className="w-11 h-11 rounded-md object-cover shrink-0" />}<div className="min-w-0"><p className="text-sm font-medium truncate">{board.name}</p><p className="text-xs text-muted-foreground">{board.pin_count} pins</p></div></div><Button size="sm" variant="outline" disabled={syncing} onClick={() => handleSyncBoard(board.id, board.name)}>{syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sync'}</Button></div>)}</div> : <p className="text-sm text-muted-foreground text-center py-4">No boards found.</p>}
        </CardContent>
      </Card>}
    </div>
  );
};

export default AddInspiration;
