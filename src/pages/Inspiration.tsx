import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Sparkles, ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const MOCK_INSPO = [
  { id: 'i1', image_url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=600&fit=crop', source: 'pinterest' },
  { id: 'i2', image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=500&fit=crop', source: 'manual' },
  { id: 'i3', image_url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&h=550&fit=crop', source: 'pinterest' },
  { id: 'i4', image_url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&h=650&fit=crop', source: 'manual' },
  { id: 'i5', image_url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=500&fit=crop', source: 'pinterest' },
  { id: 'i6', image_url: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400&h=600&fit=crop', source: 'manual' },
];

const Inspiration = () => {
  const [tab, setTab] = useState('all');

  const filtered = tab === 'all' ? MOCK_INSPO :
    tab === 'pinterest' ? MOCK_INSPO.filter(i => i.source === 'pinterest') :
    MOCK_INSPO.filter(i => i.source === 'manual');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Inspiration</h1>
        <Link to="/inspiration/add">
          <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </Link>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
          <TabsTrigger value="pinterest" className="flex-1">Pinterest</TabsTrigger>
          <TabsTrigger value="manual" className="flex-1">Uploads</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">No inspiration yet</p>
          <p className="text-muted-foreground mb-4">Upload photos or connect Pinterest to get started.</p>
          <Link to="/inspiration/add"><Button>Add Inspiration</Button></Link>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 gap-3 space-y-3">
          {filtered.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/match/${item.id}`}>
                <div className="relative rounded-xl overflow-hidden group break-inside-avoid">
                  <img src={item.image_url} alt="Fashion inspiration" className="w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-between p-3 opacity-0 group-hover:opacity-100">
                    <Badge variant="secondary" className="text-[10px]">{item.source === 'pinterest' ? 'Pinterest' : 'Upload'}</Badge>
                    <Button size="sm" variant="secondary">Match</Button>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Inspiration;
