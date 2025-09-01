import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreatePost } from '@/components/CreatePost';
import { FamilyPostComponent } from '@/components/FamilyPost';
import { getFamilyPosts, FamilyPost } from '@/lib/posts-api';
import { User } from '@/types';
import { toast } from '@/hooks/use-toast';
import webrtcService from '@/services/webrtc-service';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

interface PostsPageProps {
  user: User;
}

export const PostsPage: React.FC<PostsPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FamilyPost[]>([]);
  const [loading, setLoading] = useState(true);
  // const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');

  const loadPosts = async () => {
    try {
      setLoading(true);

      const familyPosts = await getFamilyPosts(user.familyTreeId);
      setPosts(familyPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply theme like chat section
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.className = theme;
  }, [theme]);

  useEffect(() => {
    if (!user.familyTreeId || !user.userId) return;

    // Ensure a single shared socket connection and join family rooms
    webrtcService
      .initialize(user.userId, user.familyTreeId, user.name)
      .then(() => {
        loadPosts();

        // Real-time handlers
        const onNewPost = (newPost: FamilyPost) => {
          setPosts(prev => {
            // avoid duplicates if already present
            if (prev.some(p => p.id === newPost.id)) return prev;
            return [newPost, ...prev];
          });
        };

        const onPostLiked = (payload: { postId: string; likes: FamilyPost['likes'] }) => {
          setPosts(prev => prev.map(p => (p.id === payload.postId ? { ...p, likes: payload.likes } : p)));
        };

        const onPostCommented = (payload: { postId: string; comment: any; totalComments?: number }) => {
          setPosts(prev => prev.map(p => (p.id === payload.postId ? { ...p, comments: [...p.comments, payload.comment] } : p)));
        };

        // Subscribe to server events sent to the family room
        webrtcService.on('new-post', onNewPost as any);
        webrtcService.on('post-liked', onPostLiked as any);
        webrtcService.on('post-commented', onPostCommented as any);

        // Cleanup subscriptions on unmount
        return () => {
          webrtcService.off('new-post', onNewPost as any);
          webrtcService.off('post-liked', onPostLiked as any);
          webrtcService.off('post-commented', onPostCommented as any);
        };
      })
      .catch((err) => {
        console.error('Socket init failed:', err);
      });
  }, [user.familyTreeId, user.userId, user.name]);

  const handlePostCreated = (newPost: FamilyPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  // Removed manual refresh in favor of real-time updates

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500/30 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading family posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold text-black dark:text-white">Family Posts</h1>
            </div>
            {/* Dark mode switch */}
            <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span className="text-sm">Dark Mode</span>
              <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto px-2 sm:px-4">
        {/* Posts Feed */}
        <div className="space-y-6 py-4">
          {posts.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-16">No posts yet. Be the first to share a memory!</div>
          ) : (
            posts.map((post) => (
              <FamilyPostComponent
                key={post.id}
                post={post}
                currentUser={{ userId: user.userId, userName: user.name }}
              />
            ))
          )}
        </div>

        {/* Load More Button (for future pagination) */}
        {posts.length > 0 && posts.length >= 20 && (
          <div className="text-center py-6">
            <Button
              variant="outline"
              onClick={() => {
                // Future: Implement pagination
                toast({
                  title: "Coming Soon",
                  description: "Load more functionality will be added soon.",
                });
              }}
            >
              Load More Posts
            </Button>
          </div>
        )}
      </div>

      {/* Floating Action Button for creating a post */}
      <div className="fixed bottom-6 right-6 z-20">
        <Button
          onClick={() => setCreateOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
          title="Add Post"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </div>

      {/* Full-screen dialog for CreatePost */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] md:w-[80vw] h-[90vh] p-0 overflow-hidden bg-white dark:bg-gray-900">
          <DialogHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create a Post</DialogTitle>
          </DialogHeader>
          <div className="h-full overflow-auto px-4 py-4">
            <CreatePost
              familyId={user.familyTreeId}
              userId={user.userId}
              userName={user.name}
              onPostCreated={(p) => {
                handlePostCreated(p);
                setCreateOpen(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
