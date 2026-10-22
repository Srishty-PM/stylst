import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const PinterestCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      toast({ title: 'Pinterest Connected!', description: 'Your account is now linked. Go to Inspiration to sync boards.' });
    } else {
      toast({ title: 'Connection Failed', description: 'Could not connect Pinterest. Please try again.', variant: 'destructive' });
    }
    navigate(profile?.onboarding_completed ? '/inspiration/add' : '/onboarding', { replace: true });
  }, [searchParams, navigate, profile?.onboarding_completed]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
};

export default PinterestCallback;
