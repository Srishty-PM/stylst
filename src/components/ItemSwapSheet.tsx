import { useState, useMemo } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ArrowLeftRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ClosetItem } from '@/hooks/useClosetItems';

interface ItemSwapSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The item currently in the slot */
  currentItem: { id: string; name: string; category: string; image_url: string } | null;
  /** All closet items to pick from */
  closetItems: ClosetItem[];
  /** IDs already used in other slots (to dim them) */
  usedItemIds: string[];
  onSwap: (newItemId: string) => void;
}

const ItemSwapSheet = ({
  open, onOpenChange, currentItem, closetItems, usedItemIds, onSwap,
}: ItemSwapSheetProps) => {
  const category = currentItem?.category || '';

  const alternatives = useMemo(() => {
    if (!category) return closetItems.filter(i => i.status === 'ready');
    // Show same-category items first, then others
    const sameCat = closetItems.filter(
      i => i.category.toLowerCase() === category.toLowerCase() && i.status === 'ready'
    );
    const otherCat = closetItems.filter(
      i => i.category.toLowerCase() !== category.toLowerCase() && i.status === 'ready'
    );
    return [...sameCat, ...otherCat];
  }, [closetItems, category]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl px-4 pb-6">
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            Swap {category || 'Item'}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Tap an item to replace <span className="font-medium text-foreground">{currentItem?.name}</span>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-full pr-1">
          <div className="grid grid-cols-3 gap-3 pb-8">
            {alternatives.map((item, i) => {
              const isCurrent = item.id === currentItem?.id;
              const isUsed = usedItemIds.includes(item.id) && !isCurrent;

              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={`relative text-left rounded-xl overflow-hidden border-2 transition-colors ${
                    isCurrent
                      ? 'border-primary ring-2 ring-primary/20'
                      : isUsed
                        ? 'border-muted opacity-40 cursor-not-allowed'
                        : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => {
                    if (!isUsed && !isCurrent) {
                      onSwap(item.id);
                    }
                  }}
                  disabled={isUsed}
                >
                  <div className="aspect-square">
                    <img
                      src={item.image_url_cleaned || item.image_url}
                      alt={item.name}
                      className="w-full h-full object-contain bg-muted"
                      style={{ imageOrientation: 'from-image' }}
                      loading="lazy"
                    />
                  </div>
                  {isCurrent && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 pt-5">
                    <p className="text-[10px] text-white font-medium truncate">{item.name}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ItemSwapSheet;
