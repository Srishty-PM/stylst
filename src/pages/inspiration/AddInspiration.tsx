import { Upload, Link2, Loader2, CheckCircle2, Camera as CameraIcon, Image as ImageIcon } from 'lucide-react';
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
      await addInspo.mutateAsync({
        user_id: user.id,
        image_url: imageUrl,
        description: description || null,
      });
      toast({ title: 'Saved!', description: 'Inspiration added to your board.' });
      navigate('/inspiration');
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
      await addInspo.mutateAsync({
        user_id: user.id,
        image_url: sourceUrl.trim(),
        source_url: sourceUrl.trim(),
        description: description || null,
      });
      toast({ title: 'Saved!', description: 'Inspiration added from link.' });
      navigate('/inspiration');
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
      toast({
        title: 'Board Synced!',
        description: `Imported ${result.synced} new pins from "${boardName}".`,
      });
    } catch (err: any) {
      toast({ title: 'Sync Failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Add Inspiration</h1>
        <Link to="/inspiration" className="text-sm text-muted-foreground hover:text-foreground">Cancel</Link>
      </div>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload Photo</CardTitle>
          <CardDescription>Add any fashion photo as inspiration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isNativePicker() ? (
            <div className="space-y-3">
              {preview && (
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                  <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-cover" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" className="h-20 flex-col gap-1.5" onClick={handleTakePhoto}>
                  <CameraIcon className="w-6 h-6 text-accent" />
                  <span className="text-sm">Take Photo</span>
                </Button>
                <Button type="button" variant="outline" className="h-20 flex-col gap-1.5" onClick={handlePickLibrary}>
                  <ImageIcon className="w-6 h-6 text-accent" />
                  <span className="text-sm">Photo Library</span>
                </Button>
              </div>
            </div>
          ) : (
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/50 transition-colors">
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-cover" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-foreground font-medium">Tap to upload</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, WebP · Max 5MB</p>
                  </>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          )}
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Minimalist autumn look"
            />
          </div>
          <Button className="w-full" disabled={!file || saving} onClick={handleSaveUpload}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Save Inspiration'}
          </Button>
        </CardContent>
      </Card>

      {/* URL paste */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paste Image URL</CardTitle>
          <CardDescription>Save an image directly from a link.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1"
            />
            <Button
              variant="outline"
              disabled={!sourceUrl.trim() || saving}
              onClick={handleSaveUrl}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pinterest */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Pinterest</CardTitle>
            {pinterestConnected ? (
              <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Connected</Badge>
            ) : (
              <Badge variant="secondary">Not Connected</Badge>
            )}
          </div>
          <CardDescription>
            {pinterestConnected
              ? 'Select a board below to sync pins as inspiration.'
              : 'Connect your Pinterest account to import fashion boards.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!pinterestConnected || reauthRequired ? (
            <Button
              variant="outline"
              className="w-full"
              disabled={connectLoading}
              onClick={handleConnectPinterest}
            >
              {connectLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {reauthRequired ? 'Reconnect Pinterest (session expired)' : 'Connect Pinterest'}
            </Button>
          ) : boardsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : boards && boards.length > 0 ? (
            <div className="space-y-2">
              {boards.map((board) => (
                <div
                  key={board.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {board.image_url && (
                      <img
                        src={board.image_url}
                        alt={board.name}
                        className="w-10 h-10 rounded-md object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{board.name}</p>
                      <p className="text-xs text-muted-foreground">{board.pin_count} pins</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={syncing}
                    onClick={() => handleSyncBoard(board.id, board.name)}
                  >
                    {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sync'}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">No boards found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AddInspiration;
