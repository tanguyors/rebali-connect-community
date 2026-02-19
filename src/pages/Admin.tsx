import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Users, FileText, CheckCircle } from 'lucide-react';

export default function Admin() {
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

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

  if (!user) { navigate('/auth'); return null; }
  if (!isAdmin) return (
    <div className="container mx-auto px-4 py-20 text-center">
      <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-lg text-muted-foreground">{t('adminLabels.accessDenied')}</p>
    </div>
  );

  const pendingReports = reports?.filter((r: any) => !r.resolved) || [];
  const resolvedReports = reports?.filter((r: any) => r.resolved) || [];

  const resolveReport = async (id: string) => {
    await supabase.from('reports').update({ resolved: true }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-reports'] });
    toast({ title: t('admin.resolve') });
  };

  const archiveListing = async (id: string) => {
    await supabase.from('listings').update({ status: 'archived' as any }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-reports'] });
    toast({ title: t('admin.archiveListing') });
  };

  const banUser = async (userId: string, ban: boolean) => {
    await supabase.from('profiles').update({ is_banned: ban }).eq('id', userId);
    toast({ title: ban ? t('admin.banUser') : t('admin.unbanUser') });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Shield className="h-7 w-7" /> {t('admin.title')}
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-accent mx-auto mb-1" />
            <p className="text-2xl font-bold">{pendingReports.length}</p>
            <p className="text-xs text-muted-foreground">{t('admin.openReports')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{(reports?.length || 0)}</p>
            <p className="text-xs text-muted-foreground">{t('admin.reports')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{resolvedReports.length}</p>
            <p className="text-xs text-muted-foreground">{t('admin.resolved')}</p>
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
