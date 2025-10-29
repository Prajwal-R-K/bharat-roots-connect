import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import FamilyTreeVisualization from '@/components/FamilyTreeVisualization1';
import { User } from '@/types';
import { useNavigate } from 'react-router-dom';
import {
  getFamilyMembers,
  getRelationshipTypes,
  getOppositeRelationship,
  createInterconnectRequest,
  getIncomingInterconnectRequests,
  getOutgoingInterconnectRequests,
  acceptInterconnectRequest,
  rejectInterconnectRequest,
  markInterconnectRequestRead,
} from '@/lib/neo4j';
import { Link2, Search, Send, Check, X, RefreshCw } from 'lucide-react';
import type { InterconnectRequest } from '@/lib/neo4j/relationships';

type MinimalMember = { userId: string; name?: string; email?: string; gender?: string };
type RawMember = { userId: string; name?: string; email?: string; gender?: string };

const InterconnectPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [otherTreeId, setOtherTreeId] = useState('');
  const [otherMembers, setOtherMembers] = useState<MinimalMember[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [targetIdentifierType, setTargetIdentifierType] = useState<'email' | 'userId'>('email');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedRel, setSelectedRel] = useState<string>('father');

  const [incoming, setIncoming] = useState<InterconnectRequest[]>([]);
  const [outgoing, setOutgoing] = useState<InterconnectRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Load logged in user
  useEffect(() => {
    const stored = localStorage.getItem('userData');
    if (!stored) {
      navigate('/auth');
      return;
    }
    setCurrentUser(JSON.parse(stored));
  }, [navigate]);

  const relationshipOptions = useMemo(() => getRelationshipTypes(), []);

  const previewUser: User | null = useMemo(() => {
    if (!currentUser || !otherTreeId) return null;
    return {
      userId: currentUser.userId,
      name: currentUser.name,
      email: currentUser.email,
      status: currentUser.status,
      familyTreeId: otherTreeId,
      createdBy: currentUser.createdBy,
    } as User;
  }, [currentUser, otherTreeId]);

  const searchOtherTree = async () => {
    if (!otherTreeId.trim()) {
      toast({ title: 'Enter Family Tree ID', description: 'Please enter a valid familyTreeId to search.', variant: 'destructive' });
      return;
    }
    setIsSearching(true);
    try {
      const members = await getFamilyMembers(otherTreeId.trim());
      const list: MinimalMember[] = ((members || []) as RawMember[]).map((m) => ({
        userId: m.userId,
        name: m.name,
        email: m.email,
        gender: m.gender,
      }));
      setOtherMembers(list);
      if (members.length === 0) {
        toast({ title: 'No members found', description: 'Could not find any members for the provided Family Tree ID.' });
      }
    } catch (e) {
      toast({ title: 'Search failed', description: 'Unable to fetch the other family tree. Please try again.', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const loadRequests = useCallback(async () => {
    if (!currentUser) return;
    setLoadingRequests(true);
    try {
      const [inc, out] = await Promise.all([
        getIncomingInterconnectRequests(currentUser.userId),
        getOutgoingInterconnectRequests(currentUser.userId),
      ]);
      setIncoming(inc);
      setOutgoing(out);
      // Mark unread incoming as read so header count updates
      const unread = inc.filter(r => r.status === 'pending' && !r.readByTarget);
      if (unread.length > 0) {
        await Promise.all(unread.map(r => markInterconnectRequestRead(r.id)));
        window.dispatchEvent(new Event('interconnect:refresh'));
      }
    } catch (e) {
      // ignore
    } finally {
      setLoadingRequests(false);
    }
  }, [currentUser]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const submitRequest = async () => {
    if (!currentUser) return;
    if (!otherTreeId || otherMembers.length === 0) {
      toast({ title: 'Search first', description: 'Search and select a target tree/member before sending.', variant: 'destructive' });
      return;
    }
    const target = otherMembers.find((m) => m.userId === selectedTargetId || m.email === selectedTargetId);
    if (!target) {
      toast({ title: 'Select target', description: 'Please select a valid target member in the other tree.', variant: 'destructive' });
      return;
    }

    const derivedOpposite = getOppositeRelationship(selectedRel, target.gender || undefined);

    const loading = toast({ title: 'Sending request...', description: 'Please wait.' });
    try {
      const created = await createInterconnectRequest(
        currentUser.userId,
        target.userId,
        currentUser.familyTreeId,
        otherTreeId,
        selectedRel,
        derivedOpposite,
      );
      if (created) {
        toast({ title: 'Request sent', description: 'The other family will see your request in their notifications.' });
        setSelectedTargetId('');
        await loadRequests();
      } else {
        toast({ title: 'Failed', description: 'Could not create the interconnect request.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Failed', description: 'An error occurred while sending the request.', variant: 'destructive' });
    } finally {
      loading.dismiss();
    }
  };

  const handleAccept = async (id: string) => {
    const ok = await acceptInterconnectRequest(id);
    if (ok) {
      toast({ title: 'Connection accepted', description: 'Family trees connected.' });
      window.dispatchEvent(new Event('interconnect:refresh'));
      loadRequests();
    } else {
      toast({ title: 'Accept failed', description: 'Could not accept this request.', variant: 'destructive' });
    }
  };

  const handleReject = async (id: string) => {
    const ok = await rejectInterconnectRequest(id);
    if (ok) {
      toast({ title: 'Request rejected' });
      window.dispatchEvent(new Event('interconnect:refresh'));
      loadRequests();
    } else {
      toast({ title: 'Reject failed', description: 'Could not reject this request.', variant: 'destructive' });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2"><Link2 className="w-6 h-6" /> Interconnect Family Trees</h1>
          <Button variant="outline" onClick={() => navigate('/family-tree')}>Go to Family Tree</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Other Family Tree</CardTitle>
            <CardDescription>Enter the Family Tree ID of the other side and preview their tree.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
              <div className="flex-1">
                <label className="text-sm font-medium">Other Family Tree ID</label>
                <Input value={otherTreeId} onChange={(e) => setOtherTreeId(e.target.value)} placeholder="e.g. FT7910" />
              </div>
              <Button onClick={searchOtherTree} disabled={isSearching} className="inline-flex items-center gap-2">
                <Search className="w-4 h-4" /> Search
              </Button>
            </div>

            <div className="mt-4 border rounded-lg min-h-[320px]">
              {previewUser && (
                <FamilyTreeVisualization user={previewUser} familyMembers={otherMembers} viewMode="all" minHeight="300px" showControls={true} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Interconnection</CardTitle>
            <CardDescription>Select a member from the other tree and specify your relationship.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Select Identifier Type</label>
                <Select value={targetIdentifierType} onValueChange={(v: 'email' | 'userId') => setTargetIdentifierType(v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="userId">User ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Select Target Member</label>
                <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                  <SelectTrigger><SelectValue placeholder={`Select ${targetIdentifierType}`} /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {otherMembers.map((m) => (
                      <SelectItem key={m.userId} value={targetIdentifierType === 'email' ? (m.email || m.userId) : m.userId}>
                        {m.name} <span className="text-xs text-gray-500">({targetIdentifierType === 'email' ? (m.email || 'no-email') : m.userId})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Your Relationship to Target</label>
                <Select value={selectedRel} onValueChange={setSelectedRel}>
                  <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                  <SelectContent>
                    {relationshipOptions.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={submitRequest} className="inline-flex items-center gap-2">
                <Send className="w-4 h-4" /> Send Request
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Incoming Requests</CardTitle>
                <CardDescription>Requests sent to you</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={loadRequests} className="inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {incoming.length === 0 && <div className="text-sm text-gray-500">No incoming requests.</div>}
                {incoming.map((req) => (
                  <div key={req.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div className="space-y-1">
                      <div className="text-sm">From <Badge variant="secondary">{req.sourceFamilyTreeId}</Badge> → <Badge variant="secondary">{req.targetFamilyTreeId}</Badge></div>
                      <div className="text-sm">Relationship: <span className="font-medium">{req.sourceRel}</span> (you as <span className="font-medium">{req.targetRel}</span>)</div>
                      <div className="text-xs text-gray-500">Status: {req.status}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.status === 'pending' ? (
                        <>
                          <Button size="sm" variant="default" onClick={() => handleAccept(req.id)} className="inline-flex items-center gap-1"><Check className="w-4 h-4" /> Accept</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)} className="inline-flex items-center gap-1"><X className="w-4 h-4" /> Reject</Button>
                        </>
                      ) : (
                        <Badge variant={req.status === 'accepted' ? 'default' : 'secondary'}>{req.status}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Outgoing Requests</CardTitle>
              <CardDescription>Requests you have sent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {outgoing.length === 0 && <div className="text-sm text-gray-500">No outgoing requests.</div>}
                {outgoing.map((req) => (
                  <div key={req.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div className="space-y-1">
                      <div className="text-sm">From <Badge variant="secondary">{req.sourceFamilyTreeId}</Badge> → <Badge variant="secondary">{req.targetFamilyTreeId}</Badge></div>
                      <div className="text-sm">Relationship: <span className="font-medium">{req.sourceRel}</span> (target as <span className="font-medium">{req.targetRel}</span>)</div>
                      <div className="text-xs text-gray-500">Status: {req.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default InterconnectPage;
