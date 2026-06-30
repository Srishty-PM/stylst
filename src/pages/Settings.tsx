import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePinterestConnect } from '@/hooks/usePinterest';
import { toast } from '@/hooks/use-toast';

const Settings = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const { connect, loading: pinterestLoading } = usePinterestConnect();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleConnectPinterest = async () => {
    try {
      await connect();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
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
            <Input defaultValue={profile?.full_name || ''} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email} disabled />
          </div>
          <Button variant="outline" size="sm">Change Password</Button>
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
            <Select defaultValue="gbp">
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
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <Label>Push notifications</Label>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Account actions */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Log Out
          </Button>
          <Button variant="ghost" className="w-full text-destructive">Delete Account</Button>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        Stylst v1.0.0 · Terms · <a href="/privacy" className="underline hover:text-foreground">Privacy</a>
      </p>
    </div>
  );
};

export default Settings;
