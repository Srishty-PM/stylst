import { Upload, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

const AddInspiration = () => {
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
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">Tap to upload</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, WebP · Max 5MB</p>
            </div>
            <input type="file" accept="image/*" className="hidden" />
          </label>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input placeholder="e.g. Minimalist autumn look" />
          </div>
          <Button className="w-full">Save Inspiration</Button>
        </CardContent>
      </Card>

      {/* Pinterest */}
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

      {/* Instagram link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paste Instagram Link</CardTitle>
          <CardDescription>Import a look from an Instagram post.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="https://instagram.com/p/..." className="flex-1" />
            <Button variant="outline"><Link2 className="w-4 h-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground">For MVP, download the image and upload it above.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddInspiration;
