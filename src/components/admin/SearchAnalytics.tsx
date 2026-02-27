import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Search, TrendingUp, Activity, Calendar } from 'lucide-react';

export default function SearchAnalytics() {
  const { t } = useLanguage();

  // Trending searches (top terms last 7 days)
  const { data: trending } = useQuery({
    queryKey: ['admin-trending-searches'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_trending_searches', { max_results: 20 });
      return data || [];
    },
  });

  // Raw search logs for volume analysis
  const { data: searchLogs } = useQuery({
    queryKey: ['admin-search-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('search_logs')
        .select('term, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);
      return data || [];
    },
  });

  // Daily volume for last 14 days
  const dailyVolume = (() => {
    if (!searchLogs?.length) return [];
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = 0;
    }
    searchLogs.forEach((log: any) => {
      const key = log.created_at?.slice(0, 10);
      if (key && key in days) days[key]++;
    });
    return Object.entries(days).map(([date, count]) => ({
      date: date.slice(5), // MM-DD
      searches: count,
    }));
  })();

  // Hourly distribution (today)
  const hourlyDistribution = (() => {
    if (!searchLogs?.length) return [];
    const today = new Date().toISOString().slice(0, 10);
    const hours: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hours[h] = 0;
    searchLogs.forEach((log: any) => {
      if (log.created_at?.startsWith(today)) {
        const hour = new Date(log.created_at).getHours();
        hours[hour]++;
      }
    });
    return Object.entries(hours).map(([h, count]) => ({
      hour: `${h}h`,
      searches: count,
    }));
  })();

  const totalSearches = searchLogs?.length || 0;
  const todaySearches = searchLogs?.filter((l: any) => l.created_at?.startsWith(new Date().toISOString().slice(0, 10))).length || 0;
  const uniqueTerms = new Set(searchLogs?.map((l: any) => l.term?.toLowerCase().trim())).size;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Search className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalSearches}</p>
            <p className="text-xs text-muted-foreground">Recherches (30j)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{todaySearches}</p>
            <p className="text-xs text-muted-foreground">Aujourd'hui</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{trending?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Termes tendance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{uniqueTerms}</p>
            <p className="text-xs text-muted-foreground">Termes uniques</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily volume */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Volume quotidien (14 jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyVolume}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="searches" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hourly distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribution horaire (aujourd'hui)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="hour" className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line type="monotone" dataKey="searches" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trending terms table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Termes populaires (7 derniers jours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trending && trending.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Terme</TableHead>
                    <TableHead className="text-right">Recherches</TableHead>
                    <TableHead className="text-right">Popularité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trending.map((item: any, idx: number) => {
                    const maxCount = trending[0]?.search_count || 1;
                    const pct = Math.round((item.search_count / maxCount) * 100);
                    return (
                      <TableRow key={item.term}>
                        <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{item.term}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{item.search_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée de recherche</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
