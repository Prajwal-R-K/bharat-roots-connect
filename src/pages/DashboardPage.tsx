
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Dashboard from "@/components/Dashboard";
import { User } from "@/types";
import { getUserByEmailOrId } from "@/lib/neo4j";
import { toast } from "@/hooks/use-toast";

const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('userData', JSON.stringify(updatedUser));
    console.log("DashboardPage: User state and localStorage have been updated.");
  };
  
  useEffect(() => {
    console.log("DashboardPage: useEffect triggered.");
    // Try to get user data from location state first
    const userDataFromState = location.state?.user;
    
    if (userDataFromState) {
      console.log("DashboardPage: User data found in location state", userDataFromState.userId);
      setUser(userDataFromState);
      // Also update localStorage to be consistent
      localStorage.setItem('userData', JSON.stringify(userDataFromState));
      setIsLoading(false);
    } else {
      // If no user data in location state, this is a refresh or direct navigation.
      // Always prioritize fetching from the database for freshness.
      console.log("DashboardPage: No user data in location state, checking localStorage for userId.");
      const storedUserId = localStorage.getItem('userId');
      
      if (storedUserId) {
        console.log("DashboardPage: Found stored user ID, fetching from database:", storedUserId);
        
        getUserByEmailOrId(storedUserId)
          .then(fetchedUser => {
            if (fetchedUser) {
              console.log("DashboardPage: Successfully fetched fresh user data from database", fetchedUser.userId);
              // Set the user state and update localStorage with the definitive fresh data.
              handleUserUpdate(fetchedUser);
            } else {
              console.error("DashboardPage: User not found in database with stored ID. Clearing session.");
              localStorage.removeItem('userId');
              localStorage.removeItem('userData');
              toast({
                title: "Session Expired",
                description: "Your session is invalid. Please login again.",
                variant: "destructive",
              });
              navigate('/auth');
            }
          })
          .catch(error => {
            console.error("DashboardPage: Error fetching user data:", error);
            toast({
              title: "Connection Error",
              description: "Could not connect to the database. Please try again later.",
              variant: "destructive",
            });
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        // If no stored user ID, redirect to login.
        console.log("DashboardPage: No stored user ID found, redirecting to login.");
        toast({
          title: "Authentication Required",
          description: "Please login to access the dashboard.",
        });
        navigate('/auth');
        setIsLoading(false);
      }
    }
  }, [navigate, location.state]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-500/30 rounded-full mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>User not found. Please <button 
          className="text-blue-500 hover:underline" 
          onClick={() => navigate('/auth')}
        >
          login
        </button>.</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen w-full bg-slate-50">
      <Dashboard user={user} onUserUpdate={handleUserUpdate} />
    </div>
  );
};

export default DashboardPage;
