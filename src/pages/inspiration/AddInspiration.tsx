import { Upload, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAddInspiration, uploadInspirationImage } from '@/hooks/useInspirations';
import { toast } from '@/hooks/use-toast';

const AddInspiration = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const addInspo = useAddInspiration();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
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

      {/* Pinterest placeholder */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Connect Pinterest</CardTitle>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
          <CardDescription>Sync your Pinterest boards automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" disabled>Connect Pinterest</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddInspiration;
