import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
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
            <Input defaultValue={profile?.full_name || ''} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email} disabled />
          </div>
          <Button variant="outline" size="sm">Change Password</Button>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Subscription</CardTitle>
            <Badge variant="secondary" className="capitalize">{profile?.subscription_tier || 'free'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile?.subscription_tier === 'free' ? (
            <>
              <p className="text-sm text-muted-foreground">Upgrade to unlock AI Stylist, unlimited items, and Pinterest sync.</p>
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-accent/30">
                  <CardContent className="p-4 text-center">
                    <p className="font-semibold text-foreground">Premium</p>
                    <p className="text-2xl font-bold text-foreground mt-1">£9.99<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                    <Button size="sm" className="mt-3 w-full">Upgrade</Button>
                  </CardContent>
                </Card>
                <Card className="border-accent">
                  <CardContent className="p-4 text-center">
                    <p className="font-semibold text-foreground">Premium+</p>
                    <p className="text-2xl font-bold text-foreground mt-1">£14.99<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                    <Button size="sm" className="mt-3 w-full">Upgrade</Button>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Button variant="outline" size="sm">Manage Subscription</Button>
          )}
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
            <Badge variant={profile?.pinterest_connected ? 'default' : 'secondary'}>
              {profile?.pinterest_connected ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Instagram</p>
              <p className="text-xs text-muted-foreground">Import from saved posts</p>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
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

      <p className="text-xs text-center text-muted-foreground">Stylst v1.0.0 · Terms · Privacy</p>
    </div>
  );
};

export default Settings;
