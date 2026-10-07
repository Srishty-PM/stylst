import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics, usePageView } from '@/hooks/useAnalytics';
import { Checkbox } from '@/components/ui/checkbox';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [eligible, setEligible] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { track } = useAnalytics();
  usePageView('signup');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligible) return;
    setLoading(true);
    const { error } = await signup(email, password, fullName);
    setLoading(false);
    if (error) {
      toast({ title: 'Signup failed', description: error, variant: 'destructive' });
    } else {
      track('signup');
      toast({ title: 'Welcome!', description: 'Your account has been created.' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="font-display text-2xl font-bold text-primary mb-2 block">Stylst</Link>
          <CardTitle className="font-display text-xl">Create your account</CardTitle>
          <CardDescription>Start your personal styling journey</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Your name" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="signup-eligible" checked={eligible} onCheckedChange={(checked) => setEligible(checked === true)} />
              <Label htmlFor="signup-eligible" className="text-xs leading-relaxed">I am 18 or older and agree to the <Link to="/terms" className="underline">Terms of Service</Link>. I have read the <Link to="/privacy" className="underline">Privacy Policy</Link>. AI permission is optional and requested separately.</Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !eligible}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account? <Link to="/auth/login" className="text-accent font-medium hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
