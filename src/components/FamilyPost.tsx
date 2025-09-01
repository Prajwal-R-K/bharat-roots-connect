import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal, ChevronLeft, ChevronRight, Bookmark, Send, Smile, Paperclip } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { FamilyPost, togglePostLike, addPostComment, getPostImageUrl } from '@/lib/posts-api';
import { toast } from '@/hooks/use-toast';

interface FamilyPostProps {
  post: FamilyPost;
  currentUser: { userId: string; userName: string };
  onPostUpdate?: (updatedPost: FamilyPost) => void;
}

const formatTextWithHashtags = (text: string) => {
  const parts = text.split(/(\#\w+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('#')) {
      return (
        <span key={index} className="text-blue-600 font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
};

export const FamilyPostComponent: React.FC<FamilyPostProps> = ({ post, currentUser }) => {
  const [localPost, setLocalPost] = useState<FamilyPost>(post);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);

  const hasImages = localPost.images && localPost.images.length > 0;
  const isLikedByUser = localPost.likes.some(like => like.userId === currentUser.userId);

  // Keep local state in sync when parent updates the post (e.g., via real-time socket events)
  useEffect(() => {
    setLocalPost(post);
  }, [post]);

  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      const result = await togglePostLike(localPost.id, currentUser.userId, currentUser.userName);
      if (result.success) {
        const updatedPost = { ...localPost, likes: result.likes };
        setLocalPost(updatedPost);
        // onPostUpdate?.(updatedPost);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if (!newComment.trim() || isCommenting) return;

    setIsCommenting(true);
    try {
      const result = await addPostComment(localPost.id, currentUser.userId, currentUser.userName, newComment.trim());
      if (result.success) {
        const updatedPost = {
          ...localPost,
          comments: [...localPost.comments, result.comment]
        };
        setLocalPost(updatedPost);
        // onPostUpdate?.(updatedPost);
        setNewComment('');
        setShowComments(true);
        setShowCommentInput(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCommenting(false);
    }
  };

  const nextImage = () => {
    if (hasImages) {
      setCurrentImageIndex((prev) => (prev + 1) % localPost.images.length);
    }
  };

  const prevImage = () => {
    if (hasImages) {
      setCurrentImageIndex((prev) => (prev - 1 + localPost.images.length) % localPost.images.length);
    }
  };

  const formatTimeAgo = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return format(date, 'MMM dd, yyyy');
    }
  };

  const formatTextWithHashtags = (text: string) => {
    const parts = text.split(/(\#\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span key={index} className="text-blue-600 font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <Card className="w-full bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 dark:from-gray-800 dark:via-gray-800/90 dark:to-gray-900/80 border border-gray-100/60 dark:border-gray-700/50 rounded-2xl shadow-lg shadow-blue-100/40 dark:shadow-2xl dark:shadow-black/25 hover:shadow-xl hover:shadow-blue-200/50 dark:hover:shadow-black/40 hover:border-blue-200/60 dark:hover:border-gray-600/60 transition-all duration-300 overflow-hidden backdrop-blur-sm">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4 pb-3 bg-gradient-to-r from-transparent via-white/40 to-transparent dark:from-transparent dark:via-gray-800/40 dark:to-transparent">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10 ring-2 ring-gray-100 dark:ring-gray-700">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${localPost.userName}`} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
              {localPost.userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{localPost.userName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{formatDistanceToNow(new Date(localPost.createdAt), { addSuffix: true })}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
          <MoreHorizontal className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </Button>
      </div>

      {/* Post Images */}
      {hasImages && (
        <div className="relative bg-gray-100 dark:bg-gray-900">
          <div className="w-full flex items-center justify-center overflow-hidden" style={{ maxHeight: '70vh' }}>
            <img
              src={getPostImageUrl(localPost.images[currentImageIndex].imageUrl)}
              alt={localPost.images[currentImageIndex].originalName}
              className="max-h-[70vh] w-auto object-contain"
              loading="lazy"
            />
          </div>
          
          {/* Navigation arrows for multiple images */}
          {localPost.images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={prevImage}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextImage}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              {/* Image indicators */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {localPost.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100/70 dark:border-gray-700/60 bg-gradient-to-r from-gray-50/30 via-white/60 to-gray-50/30 dark:from-gray-800/30 dark:via-gray-900/60 dark:to-gray-800/30">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={isLiking}
              className={`p-2 hover:bg-gradient-to-br hover:from-red-50 hover:to-pink-50 dark:hover:from-red-900/20 dark:hover:to-pink-900/20 rounded-full transition-all duration-200 ${isLikedByUser ? 'text-red-500 hover:text-red-600 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20' : 'text-gray-600 dark:text-gray-400 hover:text-red-500'}`}
            >
              <Heart className={`h-5 w-5 ${isLikedByUser ? 'fill-current' : ''} transition-all duration-200`} />
            </Button>
            {localPost.likes.length > 0 && (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {localPost.likes.length}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 text-gray-600 dark:text-gray-400 hover:text-blue-500 rounded-full transition-all duration-200"
              onClick={() => {
                setShowComments(true);
                setShowCommentInput(true);
              }}
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            {localPost.comments.length > 0 && (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {localPost.comments.length}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" className="p-2 hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 text-gray-600 dark:text-gray-400 hover:text-green-500 rounded-full transition-all duration-200">
            <Share className="h-5 w-5" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="p-2 hover:bg-gradient-to-br hover:from-yellow-50 hover:to-amber-50 dark:hover:from-yellow-900/20 dark:hover:to-amber-900/20 text-gray-600 dark:text-gray-400 hover:text-yellow-500 rounded-full transition-all duration-200">
          <Bookmark className="h-5 w-5" />
        </Button>
      </div>


      {/* Post Content */}
      {localPost.description && (
        <div className="px-4 pb-3 bg-gradient-to-b from-transparent to-gray-50/20 dark:to-gray-900/20">
          <p className="text-gray-800 dark:text-gray-200 text-base leading-relaxed font-normal tracking-wide">
            {formatTextWithHashtags(localPost.description)}
          </p>
        </div>
      )}

      {/* Comments Section */}
      {localPost.comments.length > 0 && (
        <div className="px-4 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="p-0 h-auto text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium"
          >
            View all {localPost.comments.length} comments
          </Button>
          
          {showComments && (
            <div className="mt-4 space-y-3">
              {localPost.comments.map((comment, index) => (
                <div key={index} className="flex space-x-3">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userName}`} />
                    <AvatarFallback className="bg-gradient-to-br from-green-400 to-blue-500 text-white text-xs font-semibold">
                      {comment.userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-700 dark:via-gray-700/90 dark:to-gray-800/80 rounded-2xl px-3 py-2 border border-gray-100/50 dark:border-gray-600/30 shadow-sm">
                    <p className="text-sm">
                      <span className="font-semibold text-gray-900 dark:text-white">{comment.userName}</span>
                      <span className="ml-2 text-gray-800 dark:text-gray-200">{comment.comment}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Comment (only when user opts to comment) */}
      {showCommentInput && (
        <div className="px-4 pb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.userName}`} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-semibold">
                {currentUser.userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex items-center space-x-2">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleComment(e);
                  }
                }}
                className="flex-1 border-0 bg-gradient-to-r from-gray-50 via-white to-blue-50/30 dark:from-gray-700 dark:via-gray-700/90 dark:to-gray-800/80 rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-gradient-to-r focus:from-white focus:to-blue-50 dark:focus:from-gray-600 dark:focus:to-gray-700 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-white font-medium border border-gray-100/50 dark:border-gray-600/30 shadow-sm"
                disabled={isCommenting}
              />
              <Button
                onClick={handleComment}
                disabled={!newComment.trim() || isCommenting}
                size="sm"
                className="rounded-full p-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
