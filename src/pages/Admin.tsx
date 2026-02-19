import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Users, FileText, CheckCircle, BarChart3, Search, Ban, Eye } from 'lucide-react';

export default function Admin() {
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [userSearch, setUserSearch] = useState('');
  const [listingSearch, setListingSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Reports query
  const { data: reports } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const { data } = await supabase
        .from('reports')
        .select('*, listings(id, title_original, seller_id, status), profiles:reporter_id(display_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
  });

  // Profiles query
  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
  });

  // Listings query
  const { data: allListings } = useQuery({
    queryKey: ['admin-listings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, profiles:seller_id(display_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
  });

  if (!user) { navigate('/auth'); return null; }
  if (!isAdmin) return (
    <div className="container mx-auto px-4 py-20 text-center">
      <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-lg text-muted-foreground">{t('adminLabels.accessDenied')}</p>
    </div>
  );

  const pendingReports = reports?.filter((r: any) => !r.resolved) || [];
  const resolvedReports = reports?.filter((r: any) => r.resolved) || [];
  const bannedUsers = profiles?.filter((p: any) => p.is_banned) || [];
  const activeListings = allListings?.filter((l: any) => l.status === 'active') || [];
  const archivedListings = allListings?.filter((l: any) => l.status === 'archived') || [];

  // Filtered data
  const filteredProfiles = profiles?.filter((p: any) =>
    !userSearch || p.display_name?.toLowerCase().includes(userSearch.toLowerCase())
  ) || [];

  const filteredListings = allListings?.filter((l: any) => {
    const matchesSearch = !listingSearch || l.title_original?.toLowerCase().includes(listingSearch.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  // Actions
  const resolveReport = async (id: string) => {
    await supabase.from('reports').update({ resolved: true }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-reports'] });
    toast({ title: t('admin.resolve') });
  };

  const archiveListing = async (id: string) => {
    await supabase.from('listings').update({ status: 'archived' as any }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-reports'] });
    qc.invalidateQueries({ queryKey: ['admin-listings'] });
    toast({ title: t('admin.archiveListing') });
  };

  const deleteListing = async (id: string) => {
    await supabase.from('listings').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-listings'] });
    toast({ title: t('admin.deleteListing') });
  };

  const banUser = async (userId: string, ban: boolean) => {
    await supabase.from('profiles').update({ is_banned: ban }).eq('id', userId);
    qc.invalidateQueries({ queryKey: ['admin-profiles'] });
    toast({ title: ban ? t('admin.banUser') : t('admin.unbanUser') });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Shield className="h-7 w-7" /> {t('admin.title')}
      </h1>

      <Tabs defaultValue="stats">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stats" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" /> {t('admin.statistics')}
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" /> {t('admin.reports')} ({pendingReports.length})
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1">
            <Users className="h-4 w-4" /> {t('admin.users')}
          </TabsTrigger>
          <TabsTrigger value="listings" className="flex items-center gap-1">
            <FileText className="h-4 w-4" /> {t('admin.listings')}
          </TabsTrigger>
        </TabsList>

        {/* Stats Tab */}
        <TabsContent value="stats" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">{profiles?.length || 0}</p>
                <p className="text-xs text-muted-foreground">{t('admin.totalUsers')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="h-6 w-6 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">{activeListings.length}</p>
                <p className="text-xs text-muted-foreground">{t('admin.activeListings')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-6 w-6 text-accent mx-auto mb-1" />
                <p className="text-2xl font-bold">{pendingReports.length}</p>
                <p className="text-xs text-muted-foreground">{t('admin.openReports')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Ban className="h-6 w-6 text-destructive mx-auto mb-1" />
                <p className="text-2xl font-bold">{bannedUsers.length}</p>
                <p className="text-xs text-muted-foreground">{t('admin.bannedUsers')}</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{allListings?.length || 0}</p>
                <p className="text-xs text-muted-foreground">{t('admin.totalListings')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{archivedListings.length}</p>
                <p className="text-xs text-muted-foreground">{t('admin.archivedListings')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-6 w-6 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">{resolvedReports.length}</p>
                <p className="text-xs text-muted-foreground">{t('admin.resolvedReports')}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4">
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">{t('admin.pending')} ({pendingReports.length})</TabsTrigger>
              <TabsTrigger value="resolved">{t('admin.resolved')} ({resolvedReports.length})</TabsTrigger>
            </TabsList>
            {[{ key: 'pending', items: pendingReports }, { key: 'resolved', items: resolvedReports }].map(({ key, items }) => (
              <TabsContent key={key} value={key} className="space-y-3 mt-4">
                {items.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">{t('admin.noReports')}</p>
                ) : items.map((report: any) => (
                  <Card key={report.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="destructive">{t(`report.${report.reason}`)}</Badge>
                            {report.resolved && <Badge variant="secondary">{t('admin.resolved')}</Badge>}
                          </div>
                          <p className="text-sm font-medium mb-1">
                            {t('adminLabels.listing')}: {report.listings?.title_original || t('adminLabels.deleted')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t('adminLabels.reporter')}: {(report.profiles as any)?.display_name || t('adminLabels.unknown')}
                          </p>
                          {report.details && <p className="text-sm mt-2 text-muted-foreground">{report.details}</p>}
                          <p className="text-xs text-muted-foreground mt-1">{new Date(report.created_at).toLocaleDateString()}</p>
                        </div>
                        {!report.resolved && (
                          <div className="flex flex-col gap-1">
                            <Button size="sm" onClick={() => resolveReport(report.id)}>{t('admin.resolve')}</Button>
                            {report.listings && (
                              <Button size="sm" variant="destructive" onClick={() => archiveListing(report.listings.id)}>
                                {t('admin.archiveListing')}
                              </Button>
                            )}
                            {report.listings?.seller_id && (
                              <Button size="sm" variant="outline" onClick={() => banUser(report.listings.seller_id, true)}>
                                {t('admin.banUser')}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.searchUsers')}
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.colName')}</TableHead>
                  <TableHead>{t('admin.colType')}</TableHead>
                  <TableHead>{t('admin.colDate')}</TableHead>
                  <TableHead>{t('admin.colStatus')}</TableHead>
                  <TableHead>{t('admin.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {t('common.noResults')}
                    </TableCell>
                  </TableRow>
                ) : filteredProfiles.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.display_name || t('adminLabels.unknown')}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(`profile.${p.user_type}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {p.is_banned ? (
                        <Badge variant="destructive">{t('admin.banned')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('admin.activeStat')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={p.is_banned ? 'default' : 'destructive'}
                          onClick={() => banUser(p.id, !p.is_banned)}
                        >
                          {p.is_banned ? t('admin.unbanUser') : t('admin.banUser')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/browse?seller=${p.id}`)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Listings Tab */}
        <TabsContent value="listings" className="mt-4">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.searchListings')}
              value={listingSearch}
              onChange={(e) => setListingSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
                <SelectItem value="active">{t('myListings.active')}</SelectItem>
                <SelectItem value="sold">{t('myListings.sold')}</SelectItem>
                <SelectItem value="archived">{t('myListings.archived')}</SelectItem>
                <SelectItem value="draft">{t('myListings.draft')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.colTitle')}</TableHead>
                  <TableHead>{t('admin.colSeller')}</TableHead>
                  <TableHead>{t('admin.colCategory')}</TableHead>
                  <TableHead>{t('admin.colPrice')}</TableHead>
                  <TableHead>{t('admin.colStatus')}</TableHead>
                  <TableHead>{t('admin.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('common.noResults')}
                    </TableCell>
                  </TableRow>
                ) : filteredListings.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {l.title_original}
                    </TableCell>
                    <TableCell className="text-sm">
                      {(l.profiles as any)?.display_name || t('adminLabels.unknown')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(`categories.${l.category}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {l.price > 0 ? `${l.currency} ${l.price.toLocaleString()}` : t('common.free')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.status === 'active' ? 'default' : 'secondary'}>
                        {t(`myListings.${l.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {l.status !== 'archived' && (
                          <Button size="sm" variant="outline" onClick={() => archiveListing(l.id)}>
                            {t('admin.archiveListing')}
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => deleteListing(l.id)}>
                          {t('common.delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
