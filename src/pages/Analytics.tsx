import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, UserPlus, Sparkles, Image, LogIn, Clock, Activity } from 'lucide-react';
import { useIsAdmin, useAnalyticsDashboard } from '@/hooks/useAdminAnalytics';

const PERIODS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

const formatDuration = (seconds: number) => {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
};

const Analytics = () => {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const [days, setDays] = useState('30');
  const { data, isLoading, isError, error } = useAnalyticsDashboard(Number(days));

  if (adminLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const primary = [
    { label: 'Active users', value: data?.unique_visitors, icon: Users },
    { label: 'Signups', value: data?.signups, icon: UserPlus },
    { label: 'Generations', value: data?.outfits_created, icon: Sparkles },
  ];

  const secondary = [
    { label: 'Logins', value: data?.logins, icon: LogIn },
    { label: 'Photos uploaded', value: data?.photos_uploaded, icon: Image },
    { label: 'Sessions', value: data?.total_sessions, icon: Activity },
    { label: 'Avg. session', value: data ? formatDuration(data.avg_session_duration_seconds) : undefined, icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">How people are using Stylst</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <p className="font-medium text-foreground">Couldn't load analytics</p>
            <p className="text-sm text-muted-foreground">{(error as Error)?.message || 'Please try again.'}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {primary.map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-9 w-16" /> : (
                    <p className="font-display text-3xl font-bold text-foreground">{value ?? 0}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {secondary.map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Icon className="w-3 h-3" /> {label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-6 w-12" /> : (
                    <p className="font-display text-xl font-semibold text-foreground">{value ?? 0}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
