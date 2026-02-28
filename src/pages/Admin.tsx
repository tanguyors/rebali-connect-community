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
import { Shield, AlertTriangle, Users, FileText, CheckCircle, BarChart3, Search, Ban, Eye, Phone, MessageSquare, Globe, Calendar, User, MapPin, Tag, Package, DollarSign, BarChart2, Trash2, Archive, Pencil, Save, X, Fingerprint, Wifi, WifiOff, ShieldCheck, ShieldAlert, FileCheck, MessageCircle, Coins, TrendingUp, Clock } from 'lucide-react';
import { CATEGORY_TREE } from '@/lib/constants';
import SearchAnalytics from '@/components/admin/SearchAnalytics';

function VerificationCard({ verification, profileName, onApprove, onReject }: {
  verification: any;
  profileName: string;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const [showImages, setShowImages] = useState(false);

  const loadDecryptedImages = async () => {
    setLoadingImages(true);
    try {
      const [docRes, selfieRes] = await Promise.all([
        supabase.functions.invoke('decrypt-document', {
          body: { storage_path: verification.document_path },
        }),
        supabase.functions.invoke('decrypt-document', {
          body: { storage_path: verification.selfie_path },
        }),
      ]);

      if (docRes.data instanceof Blob) {
        setDocUrl(URL.createObjectURL(docRes.data));
      }
      if (selfieRes.data instanceof Blob) {
        setSelfieUrl(URL.createObjectURL(selfieRes.data));
      }
    } catch (err) {
      console.error('Failed to decrypt images:', err);
    }
    setLoadingImages(false);
    setShowImages(true);
  };

  return (
    <div className="p-3 rounded-md border space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{profileName}</p>
          <p className="text-xs text-muted-foreground">{verification.document_type} — {new Date(verification.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          {!showImages && (
            <Button size="sm" variant="outline" onClick={loadDecryptedImages} disabled={loadingImages}>
              <Eye className="h-3 w-3 mr-1" /> {loadingImages ? '...' : t('admin.viewDocuments') || 'View'}
            </Button>
          )}
          <Button size="sm" onClick={onApprove}>
            <CheckCircle className="h-3 w-3 mr-1" /> {t('security.approve')}
          </Button>
          <Button size="sm" variant="destructive" onClick={onReject}>
            <X className="h-3 w-3 mr-1" /> {t('security.reject')}
          </Button>
        </div>
      </div>
      {showImages && (
        <div className="grid grid-cols-2 gap-3">
          {docUrl && <img src={docUrl} alt="Document" className="rounded-md border max-h-48 object-contain w-full" />}
          {selfieUrl && <img src={selfieUrl} alt="Selfie" className="rounded-md border max-h-48 object-contain w-full" />}
          {!docUrl && !selfieUrl && <p className="text-sm text-muted-foreground col-span-2 text-center">{t('common.noResults')}</p>}
        </div>
      )}
    </div>
  );
}
function WARelayTab() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: relayConversations } = useQuery({
    queryKey: ['admin-relay-conversations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('conversations')
        .select('*, listings!conversations_listing_id_fkey(title_original), buyer:profiles!conversations_buyer_id_fkey(display_name), seller:profiles!conversations_seller_id_fkey(display_name)')
        .gt('total_msg_count', 0)
        .order('updated_at', { ascending: false });
      return data || [];
    },
  });

  const { data: riskEvents } = useQuery({
    queryKey: ['admin-risk-events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('risk_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const toggleBlock = async (convId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    await supabase.from('conversations').update({ relay_status: newStatus }).eq('id', convId);
    qc.invalidateQueries({ queryKey: ['admin-relay-conversations'] });
    toast({ title: newStatus === 'blocked' ? t('admin.blockConversation') : t('admin.unblockConversation') });
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <h3 className="font-bold mb-3">{t('admin.relayConversations')}</h3>
          {relayConversations && relayConversations.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.colTitle')}</TableHead>
                    <TableHead>{t('admin.buyer')}</TableHead>
                    <TableHead>{t('admin.sellerLabel')}</TableHead>
                    <TableHead>{t('admin.msgCount')}</TableHead>
                    <TableHead>{t('admin.colStatus')}</TableHead>
                    <TableHead>{t('admin.colActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relayConversations.map((conv: any) => (
                    <TableRow key={conv.id}>
                      <TableCell className="text-sm truncate max-w-[150px]">{conv.listings?.title_original || '—'}</TableCell>
                      <TableCell className="text-sm">{conv.buyer?.display_name || '—'}</TableCell>
                      <TableCell className="text-sm">{conv.seller?.display_name || '—'}</TableCell>
                      <TableCell className="text-sm">{conv.total_msg_count} ({conv.buyer_msg_count}B / {conv.seller_msg_count}S)</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant={conv.unlocked ? 'default' : 'secondary'} className="text-[10px]">
                            {conv.unlocked ? t('admin.unlocked') : t('admin.locked')}
                          </Badge>
                          <Badge variant={conv.relay_status === 'blocked' ? 'destructive' : 'outline'} className="text-[10px]">
                            {conv.relay_status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant={conv.relay_status === 'blocked' ? 'default' : 'destructive'} onClick={() => toggleBlock(conv.id, conv.relay_status)}>
                          {conv.relay_status === 'blocked' ? t('admin.unblockConversation') : t('admin.blockConversation')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">{t('admin.noConversations')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-bold mb-3">{t('admin.riskEvents')}</h3>
          {riskEvents && riskEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riskEvents.map((ev: any) => (
                    <TableRow key={ev.id}>
                      <TableCell className="font-mono text-xs">{ev.phone || '—'}</TableCell>
                      <TableCell><Badge variant="destructive" className="text-[10px]">{ev.event_type}</Badge></TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{JSON.stringify(ev.details)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">{t('admin.noRiskEvents')}</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

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
  const [editingUser, setEditingUser] = useState(false);
  const [editUserLang, setEditUserLang] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserWhatsapp, setEditUserWhatsapp] = useState('');
  const [editUserDisplayName, setEditUserDisplayName] = useState('');
  const [editUserPoints, setEditUserPoints] = useState('');

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

  // Trust scores query
  const { data: trustScores } = useQuery({
    queryKey: ['admin-trust-scores'],
    queryFn: async () => {
      const { data } = await supabase
        .from('trust_scores')
        .select('*')
        .order('score', { ascending: true });
      return data || [];
    },
    enabled: isAdmin,
  });

  // User devices query
  const { data: allDevices } = useQuery({
    queryKey: ['admin-devices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_devices')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
  });

  // ID verifications query
  const { data: idVerifications, refetch: refetchVerifications } = useQuery({
    queryKey: ['admin-id-verifications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('id_verifications')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
  });

  // User points query
  const { data: allUserPoints } = useQuery({
    queryKey: ['admin-user-points'],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('manage-points', {
        body: { action: 'admin_get_all_points' },
      });
      return data?.points || [];
    },
    enabled: isAdmin,
  });

  // Banned devices query
  const { data: bannedDevices, refetch: refetchBannedDevices } = useQuery({
    queryKey: ['admin-banned-devices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('banned_devices')
        .select('*')
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

  const startEditUser = () => {
    if (!selectedUser) return;
    setEditUserDisplayName(selectedUser.display_name || '');
    setEditUserLang(selectedUser.preferred_lang || 'en');
    setEditUserPhone(selectedUser.phone || '');
    setEditUserWhatsapp(selectedUser.whatsapp || '');
    const userPts = allUserPoints?.find((p: any) => p.user_id === selectedUser.id);
    setEditUserPoints(String(userPts?.balance || 0));
    setEditingUser(true);
  };

  const saveUserEdits = async () => {
    if (!selectedUser) return;
    await supabase.from('profiles').update({
      display_name: editUserDisplayName.trim() || null,
      preferred_lang: editUserLang,
      phone: editUserPhone.trim() || null,
      whatsapp: editUserWhatsapp.trim() || null,
    }).eq('id', selectedUser.id);

    // Update points if changed
    const currentPts = allUserPoints?.find((p: any) => p.user_id === selectedUser.id);
    const newBalance = Math.max(0, parseInt(editUserPoints) || 0);
    if (newBalance !== (currentPts?.balance || 0)) {
      await supabase.functions.invoke('manage-points', {
        body: { action: 'admin_set_balance', target_user_id: selectedUser.id, new_balance: newBalance },
      });
      qc.invalidateQueries({ queryKey: ['admin-user-points'] });
    }

    setSelectedUser((prev: any) => prev ? {
      ...prev,
      display_name: editUserDisplayName.trim() || null,
      preferred_lang: editUserLang,
      phone: editUserPhone.trim() || null,
      whatsapp: editUserWhatsapp.trim() || null,
    } : null);
    qc.invalidateQueries({ queryKey: ['admin-profiles'] });
    setEditingUser(false);
    toast({ title: t('admin.profileSaved') || 'Profile saved' });
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
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('admin.userInfo')}</h4>
              {!editingUser ? (
                <Button size="sm" variant="ghost" onClick={startEditUser}>
                  <Pencil className="h-3 w-3 mr-1" /> {t('admin.editListing') || 'Edit'}
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button size="sm" onClick={saveUserEdits}>
                    <Save className="h-3 w-3 mr-1" /> {t('admin.saveListing') || 'Save'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingUser(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            {editingUser ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">{t('profile.displayName') || 'Display Name'}</label>
                  <Input value={editUserDisplayName} onChange={e => setEditUserDisplayName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t('profile.preferredLang')}</label>
                  <Select value={editUserLang} onValueChange={setEditUserLang}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['en','id','fr','es','zh','de','nl','ru','tr','ar','hi','ja'].map(l => (
                        <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t('profile.phone')}</label>
                  <Input value={editUserPhone} onChange={e => setEditUserPhone(e.target.value)} placeholder="+62..." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t('profile.whatsapp')}</label>
                  <Input value={editUserWhatsapp} onChange={e => setEditUserWhatsapp(e.target.value)} placeholder="+62..." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t('admin.shopPoints') || 'Points Shop'}</label>
                  <Input type="number" min="0" value={editUserPoints} onChange={e => setEditUserPoints(e.target.value)} />
                </div>
              </div>
            ) : (
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
                <div className="flex items-center gap-2 text-sm">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">{t('admin.shopPoints') || 'Points Shop'}</p>
                    <p className="font-medium">{allUserPoints?.find((p: any) => p.user_id === selectedUser.id)?.balance || 0} pts</p>
                  </div>
                </div>
              </div>
            )}
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

          {/* ID Verification Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> {t('security.becomeVerified')}
            </h4>
            {(() => {
              const userVerification = idVerifications?.filter((v: any) => v.user_id === selectedUser.id) || [];
              const latestVerification = userVerification.length > 0 ? userVerification[0] : null;

              if (selectedUser.is_verified_seller) {
                return (
                  <div className="flex items-center gap-3 p-3 rounded-md bg-green-500/10 border border-green-500/20">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-700">{t('security.verifiedSeller')}</p>
                      <p className="text-xs text-muted-foreground">{t('security.verifiedSellerDesc')}</p>
                    </div>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <ShieldCheck className="h-3 w-3 mr-1" /> {t('security.verifiedSeller')}
                    </Badge>
                  </div>
                );
              }

              if (latestVerification?.status === 'pending') {
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-700">{t('security.verificationPending')}</p>
                        <p className="text-xs text-muted-foreground">
                          {latestVerification.document_type.toUpperCase()} — {new Date(latestVerification.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <VerificationCard
                      verification={latestVerification}
                      profileName={selectedUser.display_name || selectedUser.id.slice(0, 8)}
                      onApprove={async () => {
                        await supabase.from('id_verifications').update({ status: 'approved' as any, reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq('id', latestVerification.id);
                        await supabase.from('profiles').update({ is_verified_seller: true }).eq('id', selectedUser.id);
                        // Recalculate trust score
                        await supabase.functions.invoke('calculate-trust-score', { body: { user_id: selectedUser.id } });
                        refetchVerifications();
                        qc.invalidateQueries({ queryKey: ['admin-profiles'] });
                        setSelectedUser((prev: any) => prev ? { ...prev, is_verified_seller: true } : null);
                        toast({ title: t('security.approve') });
                      }}
                      onReject={async () => {
                        await supabase.from('id_verifications').update({ status: 'rejected' as any, reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq('id', latestVerification.id);
                        refetchVerifications();
                        toast({ title: t('security.reject') });
                      }}
                    />
                  </div>
                );
              }

              if (latestVerification?.status === 'rejected') {
                return (
                  <div className="flex items-center gap-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                    <X className="h-5 w-5 text-destructive" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">{t('security.verificationRejected')}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(latestVerification.reviewed_at || latestVerification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <p className="text-sm text-muted-foreground p-3 rounded-md border border-dashed text-center">
                  {t('admin.noVerificationRequest')}
                </p>
              );
            })()}
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="stats" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" /> <span className="hidden sm:inline">{t('admin.statistics')}</span>
          </TabsTrigger>
          <TabsTrigger value="search-analytics" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" /> <span className="hidden sm:inline">Recherches</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" /> <span className="hidden sm:inline">{t('admin.reports')}</span> ({pendingReports.length})
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1">
            <Users className="h-4 w-4" /> <span className="hidden sm:inline">{t('admin.users')}</span>
          </TabsTrigger>
          <TabsTrigger value="listings" className="flex items-center gap-1">
            <FileText className="h-4 w-4" /> <span className="hidden sm:inline">{t('admin.listings')}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1">
            <Fingerprint className="h-4 w-4" /> <span className="hidden sm:inline">{t('security.securityTab')}</span>
          </TabsTrigger>
          <TabsTrigger value="warelay" className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">{t('admin.waRelay')}</span>
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

        {/* Search Analytics Tab */}
        <TabsContent value="search-analytics" className="mt-4">
          <SearchAnalytics />
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
                      <div className="flex gap-1">
                        {p.is_banned ? <Badge variant="destructive">{t('admin.banned')}</Badge> : <Badge variant="secondary">{t('admin.activeStat')}</Badge>}
                        {p.is_verified_seller && <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]"><ShieldCheck className="h-3 w-3 mr-0.5" />{t('security.verifiedSeller')}</Badge>}
                        {!p.is_verified_seller && idVerifications?.some((v: any) => v.user_id === p.id && v.status === 'pending') && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"><Clock className="h-3 w-3 mr-0.5" />{t('admin.pending')}</Badge>
                        )}
                      </div>
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

        {/* Security Tab */}
        <TabsContent value="security" className="mt-4 space-y-6">
          {/* Security Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center">
              <ShieldAlert className="h-6 w-6 text-destructive mx-auto mb-1" />
              <p className="text-2xl font-bold">{profiles?.filter((p: any) => p.risk_level === 'high').length || 0}</p>
              <p className="text-xs text-muted-foreground">High Risk</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <AlertTriangle className="h-6 w-6 text-accent mx-auto mb-1" />
              <p className="text-2xl font-bold">{profiles?.filter((p: any) => p.risk_level === 'medium').length || 0}</p>
              <p className="text-xs text-muted-foreground">Medium Risk</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <ShieldCheck className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{profiles?.filter((p: any) => p.phone_verified).length || 0}</p>
              <p className="text-xs text-muted-foreground">{t('security.whatsappVerified')}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <FileCheck className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{idVerifications?.filter((v: any) => v.status === 'pending').length || 0}</p>
              <p className="text-xs text-muted-foreground">{t('security.pendingVerifications')}</p>
            </CardContent></Card>
          </div>

          {/* Trust Scores Table */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Fingerprint className="h-5 w-5" /> {t('security.trustScore')} — {t('admin.users')}</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.colName')}</TableHead>
                      <TableHead>{t('security.trustScore')}</TableHead>
                      <TableHead>{t('security.riskLevel')}</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Verified Seller</TableHead>
                      <TableHead>{t('admin.colActions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(profiles || [])
                      .sort((a: any, b: any) => (a.trust_score ?? 50) - (b.trust_score ?? 50))
                      .slice(0, 50)
                      .map((p: any) => (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedUser(p)}>
                        <TableCell className="font-medium">{p.display_name || '?'}</TableCell>
                        <TableCell>
                          <span className={`font-bold ${p.trust_score < 30 ? 'text-destructive' : p.trust_score < 60 ? 'text-accent' : 'text-primary'}`}>
                            {p.trust_score ?? 50}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.risk_level === 'high' ? 'destructive' : p.risk_level === 'medium' ? 'outline' : 'secondary'}>
                            {p.risk_level}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.phone_verified ? '✅' : '—'}</TableCell>
                        <TableCell>{p.is_verified_seller ? '✅' : '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedUser(p); }}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            {!p.is_banned && (
                              <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); banUser(p.id, true); }}>
                                <Ban className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* ID Verifications Pending */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2"><FileCheck className="h-5 w-5" /> {t('security.pendingVerifications')}</h3>
              {(!idVerifications || idVerifications.filter((v: any) => v.status === 'pending').length === 0) ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t('common.noResults')}</p>
              ) : (
                <div className="space-y-3">
                  {idVerifications.filter((v: any) => v.status === 'pending').map((v: any) => {
                    const vProfile = profiles?.find((p: any) => p.id === v.user_id);
                    return (
                      <VerificationCard
                        key={v.id}
                        verification={v}
                        profileName={vProfile?.display_name || v.user_id.slice(0, 8)}
                        onApprove={async () => {
                          await supabase.from('id_verifications').update({ status: 'approved' as any, reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq('id', v.id);
                          await supabase.from('profiles').update({ is_verified_seller: true }).eq('id', v.user_id);
                          await supabase.functions.invoke('calculate-trust-score', { body: { user_id: v.user_id } });
                          refetchVerifications();
                          qc.invalidateQueries({ queryKey: ['admin-profiles'] });
                          toast({ title: t('security.approve') });
                        }}
                        onReject={async () => {
                          await supabase.from('id_verifications').update({ status: 'rejected' as any, reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq('id', v.id);
                          refetchVerifications();
                          toast({ title: t('security.reject') });
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device History & Linked Accounts */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Wifi className="h-5 w-5" /> {t('security.deviceHistory')} / {t('security.linkedAccounts')}</h3>
              {(() => {
                // Find device hashes shared by multiple users
                const hashToUsers: Record<string, Set<string>> = {};
                (allDevices || []).forEach((d: any) => {
                  if (!hashToUsers[d.device_hash]) hashToUsers[d.device_hash] = new Set();
                  hashToUsers[d.device_hash].add(d.user_id);
                });
                const sharedHashes = Object.entries(hashToUsers).filter(([, users]) => users.size > 1);

                if (sharedHashes.length === 0) {
                  return <p className="text-sm text-muted-foreground py-4 text-center">{t('common.noResults')}</p>;
                }

                return (
                  <div className="space-y-3">
                    {sharedHashes.map(([hash, userIds]) => (
                      <div key={hash} className="p-3 rounded-md border border-destructive/30 bg-destructive/5">
                        <p className="text-xs font-mono text-muted-foreground mb-2">Device: {hash.slice(0, 16)}...</p>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(userIds).map(uid => {
                            const p = profiles?.find((pr: any) => pr.id === uid);
                            return (
                              <Badge key={uid} variant="outline" className="cursor-pointer" onClick={() => setSelectedUser(p)}>
                                {p?.display_name || uid.slice(0, 8)}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Banned Devices */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Ban className="h-5 w-5" /> {t('security.banDevice')} / {t('security.banPhone')}</h3>
              {(!bannedDevices || bannedDevices.length === 0) ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t('common.noResults')}</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bannedDevices.map((bd: any) => (
                        <TableRow key={bd.id}>
                          <TableCell>{bd.device_hash ? 'Device' : 'Phone'}</TableCell>
                          <TableCell className="font-mono text-xs">{bd.device_hash?.slice(0, 16) || bd.phone_number || '—'}...</TableCell>
                          <TableCell className="text-sm">{bd.reason}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(bd.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Relay Tab */}
        <TabsContent value="warelay" className="mt-4 space-y-6">
          <WARelayTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
