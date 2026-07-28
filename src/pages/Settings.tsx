import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut, Loader2, BarChart3, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePinterestConnect } from '@/hooks/usePinterest';
import { useIsAdmin } from '@/hooks/useAdminAnalytics';
import { toast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

const Settings = () => {
  const { user, profile, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { connect, loading: pinterestLoading } = usePinterestConnect();
  const { data: isAdmin } = useIsAdmin();
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
  }, [profile?.full_name]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSaveName = async () => {
    setSavingName(true);
    try {
      await updateProfile({ full_name: fullName.trim() });
      toast({ title: 'Saved', description: 'Your name has been updated.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not save your name.', variant: 'destructive' });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      toast({ title: 'Check your inbox', description: 'We sent you a link to reset your password.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not send reset email.', variant: 'destructive' });
    } finally {
      setSendingReset(false);
    }
  };

  const handleCurrencyChange = async (value: string) => {
    try {
      await updateProfile({ currency: value });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not save currency.', variant: 'destructive' });
    }
  };

  const handleNotificationToggle = (field: 'email_notifications' | 'push_notifications') => async (checked: boolean) => {
    try {
      await updateProfile({ [field]: checked });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not save your preference.', variant: 'destructive' });
    }
  };

  const handleConnectPinterest = async () => {
    try {
      await connect();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
    } catch (err: any) {
      setDeleting(false);
      toast({ title: 'Error', description: err.message || 'Could not delete account.', variant: 'destructive' });
      return;
    }
    await logout().catch(() => {});
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>

      {/* Profile */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ''} disabled />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSaveName}
              disabled={savingName || fullName.trim() === (profile?.full_name ?? '')}
            >
              {savingName ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleChangePassword} disabled={sendingReset}>
              {sendingReset ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Integrations</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Pinterest</p>
              <p className="text-xs text-muted-foreground">Sync your fashion boards</p>
            </div>
            {profile?.pinterest_connected ? (
              <Badge variant="default">Connected</Badge>
            ) : (
              <Button size="sm" variant="outline" disabled={pinterestLoading} onClick={handleConnectPinterest}>
                {pinterestLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                Connect
              </Button>
            )}
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Instagram</p>
              <p className="text-xs text-muted-foreground">Import from saved posts</p>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between cursor-pointer" onClick={() => navigate('/settings/influencer-styles')}>
            <div>
              <p className="text-sm font-medium text-foreground">Influencer Styles</p>
              <p className="text-xs text-muted-foreground">AI learns your favorite influencers' aesthetics</p>
            </div>
            <Badge variant="secondary">New</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={profile?.currency ?? 'gbp'} onValueChange={handleCurrencyChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gbp">£ GBP</SelectItem>
                <SelectItem value="usd">$ USD</SelectItem>
                <SelectItem value="eur">€ EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Email notifications</Label>
            <Switch
              checked={profile?.email_notifications ?? true}
              onCheckedChange={handleNotificationToggle('email_notifications')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Push notifications</Label>
            <Switch
              checked={profile?.push_notifications ?? false}
              onCheckedChange={handleNotificationToggle('push_notifications')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Owner analytics */}
      {isAdmin && (
        <Card>
          <CardContent className="p-4">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => navigate('/analytics')}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">Analytics</p>
                  <p className="text-xs text-muted-foreground">Signups, generations, and active users</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>
      )}

      {/* Account actions */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Log Out
          </Button>
          <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full text-destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes your account and all your data, your closet, inspiration, looks, and schedule. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                  {deleting ? 'Deleting...' : 'Delete Account'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        Stylst v1.0.0 · <a href="/terms" className="underline hover:text-foreground">Terms</a> · <a href="/privacy" className="underline hover:text-foreground">Privacy</a>
      </p>
    </div>
  );
};

export default Settings;
