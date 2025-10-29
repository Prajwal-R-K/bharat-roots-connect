import React from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { Button } from "@/components/ui/button";
import { User, LogOut, Bell, Link2, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getUnreadInterconnectCount, getIncomingInterconnectRequests, markInterconnectRequestRead, acceptInterconnectRequest, rejectInterconnectRequest, deleteInterconnectRequestForUser } from "@/lib/neo4j";
import { User as UserType } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { InterconnectRequest } from "@/lib/neo4j/relationships";

interface LayoutProps {
  children: React.ReactNode;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, isLoggedIn = false, onLogout }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = React.useState<UserType | null>(null);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [loadingNotifs, setLoadingNotifs] = React.useState(false);
  const [incomingNotifs, setIncomingNotifs] = React.useState<InterconnectRequest[]>([]);

  const effectiveLoggedIn = React.useMemo(() => {
    if (currentUser) return true;
    return isLoggedIn;
  }, [currentUser, isLoggedIn]);

  React.useEffect(() => {
    const raw = localStorage.getItem('userData');
    if (raw) {
      try {
        setCurrentUser(JSON.parse(raw));
      } catch (err) {
        console.error('Failed to parse userData from localStorage', err);
        setCurrentUser(null);
      }
    }
  }, []);

  const fetchUnread = React.useCallback(async () => {
    if (!currentUser) return;
    try {
      const count = await getUnreadInterconnectCount(currentUser.userId);
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch (err) {
      // silent fail
    }
  }, [currentUser]);

  React.useEffect(() => {
    if (!currentUser) return;
    fetchUnread();
    const interval = window.setInterval(fetchUnread, 10000);
    const onImmediateRefresh = () => fetchUnread();
    const onFocus = () => fetchUnread();
    window.addEventListener('interconnect:refresh', onImmediateRefresh);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('interconnect:refresh', onImmediateRefresh);
      window.removeEventListener('focus', onFocus);
    };
  }, [currentUser, fetchUnread]);

  const fetchIncomingList = React.useCallback(async () => {
    if (!currentUser) return;
    setLoadingNotifs(true);
    try {
      const list = await getIncomingInterconnectRequests(currentUser.userId);
      setIncomingNotifs(list);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
    finally {
      setLoadingNotifs(false);
    }
  }, [currentUser]);

  React.useEffect(() => {
    if (notifOpen) {
      fetchIncomingList();
    }
  }, [notifOpen, fetchIncomingList]);

  const handleMarkRead = async (id: string) => {
    await markInterconnectRequestRead(id);
    await fetchUnread();
    await fetchIncomingList();
    window.dispatchEvent(new Event('interconnect:refresh'));
  };
  const handleAccept = async (id: string) => {
    const ok = await acceptInterconnectRequest(id);
    if (ok) toast({ title: 'Accepted', description: 'Family trees connected.' });
    else toast({ title: 'Failed', description: 'Unable to accept request', variant: 'destructive' });
    await fetchUnread();
    await fetchIncomingList();
    window.dispatchEvent(new Event('interconnect:refresh'));
  };
  const handleReject = async (id: string) => {
    const ok = await rejectInterconnectRequest(id);
    if (ok) toast({ title: 'Rejected' });
    else toast({ title: 'Failed', description: 'Unable to reject request', variant: 'destructive' });
    await fetchUnread();
    await fetchIncomingList();
    window.dispatchEvent(new Event('interconnect:refresh'));
  };
  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    const ok = await deleteInterconnectRequestForUser(id, currentUser.userId);
    if (!ok) {
      toast({ title: 'Delete failed', description: 'Unable to delete notification', variant: 'destructive' });
    }
    await fetchUnread();
    await fetchIncomingList();
    window.dispatchEvent(new Event('interconnect:refresh'));
  };

  const handleProfileClick = () => {
    toast({
      title: "Profile",
      description: "Profile management coming soon!",
    });
  };
  const handleLogout = () => {
    if (onLogout) return onLogout();
    localStorage.removeItem('userData');
    localStorage.removeItem('userId');
    navigate('/auth');
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-isn-light pattern-bg">
      <header className="bg-white shadow-md py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link to="/">
            <Logo />
          </Link>
          
          <nav>
            {effectiveLoggedIn ? (
              <div className="flex items-center space-x-4">
                <Link to="/chat">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Chat</span>
                  </Button>
                </Link>
                <Link to="/interconnect">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2"
                  >
                    <Link2 className="h-4 w-4" />
                    <span>Interconnect</span>
                  </Button>
                </Link>
                <Popover open={notifOpen} onOpenChange={setNotifOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="relative"
                      aria-label="Notifications"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-green-500 text-white text-[10px] font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-0" align="end">
                    <div className="p-3 border-b">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">Notifications</div>
                        <Button variant="ghost" size="sm" onClick={fetchIncomingList}>Refresh</Button>
                      </div>
                      <div className="text-xs text-slate-500">Incoming interconnect requests</div>
                    </div>
                    <div className="max-h-80 overflow-auto">
                      {loadingNotifs ? (
                        <div className="p-4 text-sm text-slate-500">Loading...</div>
                      ) : incomingNotifs.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500">No notifications</div>
                      ) : (
                        <div className="divide-y">
                          {incomingNotifs.map((req) => (
                            <div key={req.id} className="p-3 flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="text-sm">From <Badge variant="secondary">{req.sourceFamilyTreeId}</Badge> → <Badge variant="secondary">{req.targetFamilyTreeId}</Badge></div>
                                <div className="text-xs text-slate-600">Rel: <span className="font-medium">{req.sourceRel}</span> • You as <span className="font-medium">{req.targetRel}</span></div>
                                <div className="text-[11px] text-slate-400">{req.status}{!req.readByTarget ? ' • unread' : ''}</div>
                              </div>
                              <div className="flex flex-col gap-1">
                                {req.status === 'pending' && (
                                  <>
                                    <Button size="sm" variant="default" onClick={() => handleAccept(req.id)}>Accept</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)}>Reject</Button>
                                  </>
                                )}
                                {!req.readByTarget && (
                                  <Button size="sm" variant="outline" onClick={() => handleMarkRead(req.id)}>Mark read</Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => handleDelete(req.id)}>Delete</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="p-2 border-t text-right">
                      <Link to="/interconnect">
                        <Button size="sm" variant="outline">View all</Button>
                      </Link>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={handleProfileClick}
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-isn-primary hover:text-isn-primary/80"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                {/* Removed "Create Family Tree" button for not logged in users */}
              </div>
            )}
          </nav>
        </div>
      </header>
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="bg-white shadow-inner py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <Logo size="sm" />
            <p className="text-gray-600 text-sm mt-4 md:mt-0">
              Connecting Indian Families &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
