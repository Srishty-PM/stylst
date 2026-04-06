import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Users, Smartphone, UserPlus, Clock, CheckCircle, Camera, Eye, Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

interface AnalyticsData {
  period_days: number;
  unique_visitors: number;
  unique_devices: number;
  signups: number;
  logins: number;
  outfits_created: number;
  photos_uploaded: number;
  steps_completed: number;
  avg_session_duration_seconds: number;
  page_views: Record<string, number>;
  total_sessions: number;
  daily_visitors: { date: string; count: number }[];
  daily_signups: { date: string; count: number }[];
}

const PERIOD_OPTIONS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

const CHART_COLORS = [
  'hsl(30, 30%, 57%)',   // primary/gold
  'hsl(0, 0%, 4%)',      // obsidian
  'hsl(37, 18%, 68%)',   // muted
  'hsl(132, 37%, 27%)',  // success
  'hsl(30, 53%, 49%)',   // warning
  'hsl(345, 73%, 31%)',  // destructive
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function Analytics() {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  const fetchAnalytics = async (days: number) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('analytics-dashboard', {
        body: null,
        method: 'GET',
      });
      
      // Fallback: fetch via direct URL with query params
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/analytics-dashboard?days=${days}`;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const resp = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      
      if (resp.ok) {
        setData(await resp.json());
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(period);
  }, [period]);

  const pageViewData = data?.page_views
    ? Object.entries(data.page_views)
        .map(([page, count]) => ({ page: page === '/' ? 'Landing' : page.replace('/', ''), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    : [];

  const stats = data ? [
    { label: 'UNIQUE VISITORS', value: data.unique_visitors, icon: Users, color: 'text-primary' },
    { label: 'UNIQUE DEVICES', value: data.unique_devices, icon: Smartphone, color: 'text-foreground' },
    { label: 'SIGNUPS', value: data.signups, icon: UserPlus, color: 'text-primary' },
    { label: 'LOGINS', value: data.logins || 0, icon: Activity, color: 'text-foreground' },
    { label: 'AVG SESSION', value: formatDuration(data.avg_session_duration_seconds), icon: Clock, color: 'text-primary' },
    { label: 'TOTAL SESSIONS', value: data.total_sessions, icon: Eye, color: 'text-foreground' },
    { label: 'STEPS COMPLETED', value: data.steps_completed, icon: CheckCircle, color: 'text-primary' },
    { label: 'PHOTOS UPLOADED', value: data.photos_uploaded, icon: Camera, color: 'text-foreground' },
    { label: 'OUTFITS CREATED', value: data.outfits_created, icon: Activity, color: 'text-primary' },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-serif text-xl font-semibold tracking-tight">Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            {PERIOD_OPTIONS.map(opt => (
              <Button
                key={opt.days}
                variant={period === opt.days ? 'default' : 'outline'}
                size="sm"
                className="text-xs uppercase tracking-wider font-semibold px-3"
                onClick={() => setPeriod(opt.days)}
              >
                {opt.label}
              </Button>
            ))}
            <Button variant="ghost" size="icon" onClick={() => fetchAnalytics(period)} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-3 gap-3">
              {stats.map(s => (
                <Card key={s.label} className="p-4 text-center border-border/50">
                  <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
                  <div className="font-serif text-2xl font-bold tracking-tight">{s.value}</div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mt-1">{s.label}</div>
                </Card>
              ))}
            </div>

            {/* Page Views Chart */}
            {pageViewData.length > 0 && (
              <Card className="p-5 border-border/50">
                <h2 className="font-serif text-lg font-semibold mb-4 tracking-tight">Page Views</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={pageViewData} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(37, 18%, 88%)" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(215, 16%, 47%)' }} />
                    <YAxis
                      type="category"
                      dataKey="page"
                      tick={{ fontSize: 11, fill: 'hsl(0, 0%, 4%)' }}
                      width={75}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(0, 0%, 100%)',
                        border: '1px solid hsl(37, 18%, 88%)',
                        borderRadius: '4px',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(30, 30%, 57%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Funnel Summary */}
            <Card className="p-5 border-border/50">
              <h2 className="font-serif text-lg font-semibold mb-4 tracking-tight">Engagement Funnel</h2>
              <div className="space-y-3">
                {[
                  { label: 'Sessions', value: data.total_sessions },
                  { label: 'Signups', value: data.signups },
                  { label: 'Photos Uploaded', value: data.photos_uploaded },
                  { label: 'Outfits Created', value: data.outfits_created },
                ].map((item, i) => {
                  const max = data.total_sessions || 1;
                  const pct = Math.round((item.value / max) * 100);
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground uppercase text-xs tracking-wider font-semibold">{item.label}</span>
                        <span className="font-semibold">{item.value} <span className="text-muted-foreground text-xs">({pct}%)</span></span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <p className="font-serif text-lg">No analytics data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
