import { Upload, Plus, ShirtIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '@/lib/mock-data';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useAddClosetItem, uploadClosetImage } from '@/hooks/useClosetItems';
import { toast } from '@/hooks/use-toast';

const AddClosetItem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const addItem = useAddClosetItem();

  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = e.target.files;
    if (!newFiles) return;
    const arr = Array.from(newFiles);
    setFiles(prev => [...prev, ...arr]);
    setPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))]);
  };

  const handleSave = async () => {
    if (!user || !files.length) return;
    setSaving(true);
    try {
      const imageUrl = await uploadClosetImage(user.id, files[0]);
      await addItem.mutateAsync({
        user_id: user.id,
        name,
        category,
        image_url: imageUrl,
        brand: brand || null,
        purchase_price: price ? parseFloat(price) : null,
      });
      toast({ title: 'Item added!', description: `${name} has been added to your closet.` });
      navigate('/closet');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Add to Closet</h1>
        <Link to="/closet" className="text-sm text-muted-foreground hover:text-foreground">Cancel</Link>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {['Upload', 'Details'].map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-border'}`} />
        ))}
      </div>

      {step === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-accent/50 transition-colors">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Tap to upload or drag photo here</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP · Max 5MB</p>
            </div>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          </label>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {previews.map((url, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden">
                  <img src={url} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          <Button className="w-full" disabled={files.length === 0} onClick={() => setStep(1)}>
            Next
          </Button>
        </motion.div>
      )}

      {step === 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">Item Name *</Label>
            <Input id="item-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Black Leather Jacket" />
          </div>
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Zara" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Purchase Price (£)</Label>
            <Input id="price" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
          </div>
          <Button className="w-full" disabled={!name || !category || saving} onClick={handleSave}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            {saving ? 'Saving...' : 'Add to Closet'}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default AddClosetItem;
