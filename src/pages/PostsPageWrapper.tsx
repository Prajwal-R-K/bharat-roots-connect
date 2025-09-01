import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PostsPage } from './PostsPage';
import { User } from '@/types';
import { getUserByEmailOrId } from '@/lib/neo4j';
import { toast } from '@/hooks/use-toast';

const PostsPageWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to get user data from location state first
    const userDataFromState = location.state?.user;
    
    if (userDataFromState) {
      setUser(userDataFromState);
      setIsLoading(false);
    } else {
      // Check localStorage for user data
      const storedUserId = localStorage.getItem('userId');
      const storedUserData = localStorage.getItem('userData');
      
      if (storedUserData) {
        try {
          const parsedUser = JSON.parse(storedUserData);
          setUser(parsedUser);
          setIsLoading(false);
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          // Fall back to fetching from database
          if (storedUserId) {
            fetchUserFromDatabase(storedUserId);
          } else {
            redirectToAuth();
          }
        }
      } else if (storedUserId) {
        fetchUserFromDatabase(storedUserId);
      } else {
        redirectToAuth();
      }
    }
  }, [navigate, location.state]);

  const fetchUserFromDatabase = async (userId: string) => {
    try {
      const fetchedUser = await getUserByEmailOrId(userId);
      if (fetchedUser) {
        setUser(fetchedUser);
        localStorage.setItem('userData', JSON.stringify(fetchedUser));
      } else {
        redirectToAuth();
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Connection Error",
        description: "Could not connect to the database. Please try again later.",
        variant: "destructive",
      });
      redirectToAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const redirectToAuth = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userData');
    toast({
      title: "Authentication Required",
      description: "Please login to access posts.",
    });
    navigate('/auth');
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500/30 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>User not found. Please <button 
          className="text-blue-500 hover:underline" 
          onClick={() => navigate('/auth')}
        >
          login
        </button>.</p>
      </div>
    );
  }

  return <PostsPage user={user} />;
};

export default PostsPageWrapper;
