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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Users, FileText, CheckCircle, BarChart3, Search, Ban, Eye, Phone, MessageSquare, Globe, Calendar, User, MapPin, Tag, Package, DollarSign, BarChart2, Trash2, Archive, Pencil, Save, X } from 'lucide-react';
import { CATEGORY_TREE } from '@/lib/constants';

export default function Admin() {
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [userSearch, setUserSearch] = useState('');
  const [listingSearch, setListingSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [editingListing, setEditingListing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrice, setEditPrice] = useState('');

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

  const filteredProfiles = profiles?.filter((p: any) =>
    !userSearch || p.display_name?.toLowerCase().includes(userSearch.toLowerCase())
  ) || [];

  const filteredListings = allListings?.filter((l: any) => {
    const matchesSearch = !listingSearch || l.title_original?.toLowerCase().includes(listingSearch.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  // Get user listings count
  const getUserListings = (userId: string) => allListings?.filter((l: any) => l.seller_id === userId) || [];
  const getUserReports = (userId: string) => reports?.filter((r: any) => r.listings?.seller_id === userId) || [];

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
    if (selectedUser?.id === userId) {
      setSelectedUser((prev: any) => prev ? { ...prev, is_banned: ban } : null);
    }
    toast({ title: ban ? t('admin.banUser') : t('admin.unbanUser') });
  };

  // User detail dialog content
  const UserDetailDialog = () => {
    if (!selectedUser) return null;
    const userListings = getUserListings(selectedUser.id);
    const userReports = getUserReports(selectedUser.id);
    const userActiveListings = userListings.filter((l: any) => l.status === 'active');
    const userSoldListings = userListings.filter((l: any) => l.status === 'sold');
    const userArchivedListings = userListings.filter((l: any) => l.status === 'archived');

    return (
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p>{selectedUser.display_name || t('adminLabels.unknown')}</p>
                <p className="text-sm font-normal text-muted-foreground">ID: {selectedUser.id.slice(0, 8)}...</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Status badge */}
          <div className="flex gap-2">
            {selectedUser.is_banned ? (
              <Badge variant="destructive">{t('admin.banned')}</Badge>
            ) : (
              <Badge variant="secondary">{t('admin.activeStat')}</Badge>
            )}
            <Badge variant="outline">{t(`profile.${selectedUser.user_type}`)}</Badge>
          </div>

          <Separator />

          {/* User info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('admin.userInfo')}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">{t('admin.colDate')}</p>
                  <p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">{t('profile.preferredLang')}</p>
                  <p className="font-medium">{selectedUser.preferred_lang?.toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">{t('profile.phone')}</p>
                  <p className="font-medium">{selectedUser.phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">{t('profile.whatsapp')}</p>
                  <p className="font-medium">{selectedUser.whatsapp || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Listings stats */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('admin.userListings')}</h4>
            <div className="grid grid-cols-4 gap-2">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{userListings.length}</p>
                  <p className="text-[10px] text-muted-foreground">{t('admin.totalListings')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{userActiveListings.length}</p>
                  <p className="text-[10px] text-muted-foreground">{t('myListings.active')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{userSoldListings.length}</p>
                  <p className="text-[10px] text-muted-foreground">{t('myListings.sold')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{userArchivedListings.length}</p>
                  <p className="text-[10px] text-muted-foreground">{t('myListings.archived')}</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent listings */}
            {userListings.length > 0 && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {userListings.slice(0, 5).map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between p-2 rounded-md border text-sm cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setSelectedUser(null); setSelectedListing(l); }}>
                    <div className="flex-1 truncate mr-2">
                      <p className="font-medium truncate">{l.title_original}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.price > 0 ? `${l.currency} ${l.price.toLocaleString()}` : t('common.free')}
                      </p>
                    </div>
                    <Badge variant={l.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                      {t(`myListings.${l.status}`)}
                    </Badge>
                  </div>
                ))}
                {userListings.length > 5 && (
                  <p className="text-xs text-center text-muted-foreground">
                    +{userListings.length - 5} {t('admin.moreListings')}
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Reports against this user */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('admin.userReports')} ({userReports.length})
            </h4>
            {userReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('admin.noUserReports')}</p>
            ) : (
              <div className="space-y-1">
                {userReports.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm p-2 rounded-md border">
                    <Badge variant="destructive" className="text-[10px]">{t(`report.${r.reason}`)}</Badge>
                    <span className="truncate flex-1 text-muted-foreground">{r.listings?.title_original}</span>
                    {r.resolved ? (
                      <Badge variant="secondary" className="text-[10px]">{t('admin.resolved')}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">{t('admin.pending')}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Admin actions */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant={selectedUser.is_banned ? 'default' : 'destructive'}
              onClick={() => banUser(selectedUser.id, !selectedUser.is_banned)}
            >
              <Ban className="h-4 w-4 mr-1" />
              {selectedUser.is_banned ? t('admin.unbanUser') : t('admin.banUser')}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setSelectedUser(null); navigate(`/browse?seller=${selectedUser.id}`); }}
            >
              <Eye className="h-4 w-4 mr-1" /> {t('admin.viewListings')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };


  const startEditListing = () => {
    if (!selectedListing) return;
    setEditTitle(selectedListing.title_original);
    setEditDescription(selectedListing.description_original);
    setEditCategory(selectedListing.category);
    setEditPrice(String(selectedListing.price));
    setEditingListing(true);
  };

  const saveListingEdits = async () => {
    if (!selectedListing) return;
    const trimmedTitle = editTitle.trim();
    const trimmedDesc = editDescription.trim();
    if (!trimmedTitle || !trimmedDesc) return;
    const priceNum = Math.max(0, Number(editPrice) || 0);

    await supabase.from('listings').update({
      title_original: trimmedTitle,
      description_original: trimmedDesc,
      category: editCategory as any,
      price: priceNum,
    }).eq('id', selectedListing.id);

    setSelectedListing((prev: any) => prev ? {
      ...prev,
      title_original: trimmedTitle,
      description_original: trimmedDesc,
      category: editCategory,
      price: priceNum,
    } : null);
    qc.invalidateQueries({ queryKey: ['admin-listings'] });
    setEditingListing(false);
    toast({ title: t('admin.listingSaved') });
  };

  const categories: string[] = Object.keys(CATEGORY_TREE);

  const ListingDetailDialog = () => {
    if (!selectedListing) return null;
    const seller = profiles?.find((p: any) => p.id === selectedListing.seller_id);
    const listingReports = reports?.filter((r: any) => r.listing_id === selectedListing.id) || [];

    return (
      <Dialog open={!!selectedListing} onOpenChange={(open) => { if (!open) { setSelectedListing(null); setEditingListing(false); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate">{selectedListing.title_original}</p>
                <p className="text-sm font-normal text-muted-foreground">ID: {selectedListing.id.slice(0, 8)}...</p>
              </div>
              {!editingListing && (
                <Button variant="ghost" size="icon" onClick={startEditListing} className="shrink-0">
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Status & Category */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={selectedListing.status === 'active' ? 'default' : 'secondary'}>
              {t(`myListings.${selectedListing.status}`)}
            </Badge>
            <Badge variant="outline">{t(`categories.${selectedListing.category}`)}</Badge>
            <Badge variant="outline">{t(`condition.${selectedListing.condition}`)}</Badge>
          </div>

          <Separator />

          {editingListing ? (
            /* Edit mode */
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('admin.colTitle')}</label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('admin.colCategory')}</label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('admin.colPrice')} ({selectedListing.currency})</label>
                <Input type="number" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('admin.description')}</label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[120px] resize-y"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  maxLength={5000}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveListingEdits} disabled={!editTitle.trim() || !editDescription.trim()}>
                  <Save className="h-4 w-4 mr-1" /> {t('common.save')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingListing(false)}>
                  <X className="h-4 w-4 mr-1" /> {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            /* View mode */
            <>
              {/* Listing details */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('admin.listingDetails')}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">{t('admin.colPrice')}</p>
                      <p className="font-medium">{selectedListing.price > 0 ? `${selectedListing.currency} ${selectedListing.price.toLocaleString()}` : t('common.free')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">{t('createListing.locationArea')}</p>
                      <p className="font-medium">{selectedListing.location_area}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">{t('admin.views')}</p>
                      <p className="font-medium">{selectedListing.views_count}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">{t('admin.colDate')}</p>
                      <p className="font-medium">{new Date(selectedListing.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">{t('admin.language')}</p>
                      <p className="font-medium">{selectedListing.lang_original?.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">{t('admin.lastUpdated')}</p>
                      <p className="font-medium">{new Date(selectedListing.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('admin.description')}</h4>
                <p className="text-sm whitespace-pre-wrap max-h-[150px] overflow-y-auto border rounded-md p-3 bg-muted/30">
                  {selectedListing.description_original}
                </p>
              </div>

              <Separator />

              {/* Seller info */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('admin.colSeller')}</h4>
                {seller ? (
                  <div
                    className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => { setSelectedListing(null); setSelectedUser(seller); }}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{seller.display_name || t('adminLabels.unknown')}</p>
                      <p className="text-xs text-muted-foreground">{t(`profile.${seller.user_type}`)}</p>
                    </div>
                    {seller.is_banned && <Badge variant="destructive" className="text-[10px]">{t('admin.banned')}</Badge>}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('adminLabels.unknown')}</p>
                )}
              </div>

              {/* Reports on this listing */}
              {listingReports.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('admin.reports')} ({listingReports.length})
                    </h4>
                    <div className="space-y-1">
                      {listingReports.map((r: any) => (
                        <div key={r.id} className="flex items-center gap-2 text-sm p-2 rounded-md border">
                          <Badge variant="destructive" className="text-[10px]">{t(`report.${r.reason}`)}</Badge>
                          <span className="truncate flex-1 text-muted-foreground">{r.details || '—'}</span>
                          {r.resolved ? (
                            <Badge variant="secondary" className="text-[10px]">{t('admin.resolved')}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">{t('admin.pending')}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Admin actions */}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={startEditListing}>
                  <Pencil className="h-4 w-4 mr-1" /> {t('common.edit')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSelectedListing(null); navigate(`/listing/${selectedListing.id}`); }}
                >
                  <Eye className="h-4 w-4 mr-1" /> {t('admin.viewListing')}
                </Button>
                {selectedListing.status !== 'archived' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { archiveListing(selectedListing.id); setSelectedListing((prev: any) => prev ? { ...prev, status: 'archived' } : null); }}
                  >
                    <Archive className="h-4 w-4 mr-1" /> {t('admin.archiveListing')}
                  </Button>
                )}
                {selectedListing.status !== 'active' && selectedListing.status !== 'sold' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await supabase.from('listings').update({ status: 'active' as any }).eq('id', selectedListing.id);
                      qc.invalidateQueries({ queryKey: ['admin-listings'] });
                      setSelectedListing((prev: any) => prev ? { ...prev, status: 'active' } : null);
                      toast({ title: t('admin.listingReactivated') });
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> {t('admin.reactivate')}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { deleteListing(selectedListing.id); setSelectedListing(null); }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> {t('common.delete')}
                </Button>
                {seller && !seller.is_banned && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => banUser(selectedListing.seller_id, true)}
                  >
                    <Ban className="h-4 w-4 mr-1" /> {t('admin.banUser')}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Shield className="h-7 w-7" /> {t('admin.title')}
      </h1>

      <UserDetailDialog />
      <ListingDetailDialog />

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
            <Card><CardContent className="p-4 text-center"><Users className="h-6 w-6 text-primary mx-auto mb-1" /><p className="text-2xl font-bold">{profiles?.length || 0}</p><p className="text-xs text-muted-foreground">{t('admin.totalUsers')}</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><FileText className="h-6 w-6 text-primary mx-auto mb-1" /><p className="text-2xl font-bold">{activeListings.length}</p><p className="text-xs text-muted-foreground">{t('admin.activeListings')}</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><AlertTriangle className="h-6 w-6 text-accent mx-auto mb-1" /><p className="text-2xl font-bold">{pendingReports.length}</p><p className="text-xs text-muted-foreground">{t('admin.openReports')}</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><Ban className="h-6 w-6 text-destructive mx-auto mb-1" /><p className="text-2xl font-bold">{bannedUsers.length}</p><p className="text-xs text-muted-foreground">{t('admin.bannedUsers')}</p></CardContent></Card>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{allListings?.length || 0}</p><p className="text-xs text-muted-foreground">{t('admin.totalListings')}</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{archivedListings.length}</p><p className="text-xs text-muted-foreground">{t('admin.archivedListings')}</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><CheckCircle className="h-6 w-6 text-primary mx-auto mb-1" /><p className="text-2xl font-bold">{resolvedReports.length}</p><p className="text-xs text-muted-foreground">{t('admin.resolvedReports')}</p></CardContent></Card>
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
            <Input placeholder={t('admin.searchUsers')} value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="max-w-sm" />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.colName')}</TableHead>
                  <TableHead>{t('admin.colType')}</TableHead>
                  <TableHead>{t('admin.colDate')}</TableHead>
                  <TableHead>{t('admin.colStatus')}</TableHead>
                  <TableHead>{t('admin.listings')}</TableHead>
                  <TableHead>{t('admin.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('common.noResults')}</TableCell></TableRow>
                ) : filteredProfiles.map((p: any) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedUser(p)}>
                    <TableCell className="font-medium">{p.display_name || t('adminLabels.unknown')}</TableCell>
                    <TableCell><Badge variant="outline">{t(`profile.${p.user_type}`)}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {p.is_banned ? <Badge variant="destructive">{t('admin.banned')}</Badge> : <Badge variant="secondary">{t('admin.activeStat')}</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{getUserListings(p.id).length}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedUser(p); }}>
                        <Eye className="h-3 w-3" />
                      </Button>
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
            <Input placeholder={t('admin.searchListings')} value={listingSearch} onChange={(e) => setListingSearch(e.target.value)} className="max-w-sm" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
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
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('common.noResults')}</TableCell></TableRow>
                ) : filteredListings.map((l: any) => (
                  <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedListing(l)}>
                    <TableCell className="font-medium max-w-[200px] truncate">{l.title_original}</TableCell>
                    <TableCell className="text-sm">{(l.profiles as any)?.display_name || t('adminLabels.unknown')}</TableCell>
                    <TableCell><Badge variant="outline">{t(`categories.${l.category}`)}</Badge></TableCell>
                    <TableCell className="text-sm">{l.price > 0 ? `${l.currency} ${l.price.toLocaleString()}` : t('common.free')}</TableCell>
                    <TableCell><Badge variant={l.status === 'active' ? 'default' : 'secondary'}>{t(`myListings.${l.status}`)}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedListing(l); }}>
                        <Eye className="h-3 w-3" />
                      </Button>
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
