import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AI_DATA_DESCRIPTION, registerAIConsentPrompt } from '@/lib/ai-consent';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

export default function AIConsentDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [adult, setAdult] = useState(false);
  const resolve = useRef<((allowed: boolean) => void) | null>(null);

  const finish = (allowed: boolean) => {
    const complete = resolve.current;
    resolve.current = null;
    setOpen(false);
    complete?.(allowed);
  };

  useEffect(() => {
    const unregister = registerAIConsentPrompt((userId) => {
      if (!user || user.id !== userId) return Promise.resolve(false);
      return new Promise<boolean>((complete) => {
        resolve.current = complete;
        setAdult(false);
        setOpen(true);
      });
    }, user?.id);
    return () => {
      unregister();
      const complete = resolve.current;
      resolve.current = null;
      complete?.(false);
      setOpen(false);
    };
  }, [user?.id]);

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) finish(false); }}>
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Allow Google Gemini to process your data?</AlertDialogTitle>
          <AlertDialogDescription>
            Gemini is a third-party AI service provided by Google. Stylst will send data to it only after you allow processing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 text-sm">
          <p><strong>Data sent:</strong> {AI_DATA_DESCRIPTION}.</p>
          <p><strong>Purpose:</strong> identify clothing, clean up item images, match your wardrobe to inspirations, and generate outfit and styling suggestions.</p>
          <p className="text-muted-foreground">Permission applies to this account on this device. You can continue without AI and withdraw permission in Settings. Withdrawal stops new requests; it cannot recall data already sent to Google.</p>
          <Link to="/privacy" className="underline" onClick={() => finish(false)}>Read the Privacy Policy</Link>
          <div className="flex items-center gap-2 pt-2">
            <Checkbox id="ai-adult" checked={adult} onCheckedChange={(checked) => setAdult(checked === true)} />
            <Label htmlFor="ai-adult">I am 18 or older</Label>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => finish(false)}>Not now</AlertDialogCancel>
          <AlertDialogAction disabled={!adult} onClick={() => finish(true)}>Allow AI processing</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
