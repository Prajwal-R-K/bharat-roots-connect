import * as React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { GlobalCallProvider } from "@/components/GlobalCallProvider";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import FamilyTreeViewPage from "@/pages/FamilyTreeViewPage";
import InterconnectPage from "@/pages/InterconnectPage";
import AddFamilyMemberPage from "@/pages/AddFamilyMemberPage";
import InviteMembersPage from "@/pages/InviteMembersPage";
import EditProfilePage from "@/pages/EditProfilePage";
import ChatPage from "@/pages/ChatPage";
import GroupViewPage from "@/pages/GroupViewPage";
import EventsPage from "@/pages/events";
import PostsPageWrapper from "@/pages/PostsPageWrapper";
import "./styles/animations.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalCallProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/family-tree" element={<FamilyTreeViewPage />} />
              <Route path="/add-member" element={<AddFamilyMemberPage />} />
              <Route path="/invite" element={<InviteMembersPage />} />
              <Route path="/profile" element={<EditProfilePage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/groups" element={<GroupViewPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/interconnect" element={<InterconnectPage />} />
              <Route path="/posts" element={<PostsPageWrapper />} />
              <Route path="/" element={<Navigate to="/auth" replace />} />
              <Route path="*" element={<Navigate to="/auth" replace />} />
            </Routes>
            <Toaster />
          </div>
        </Router>
      </GlobalCallProvider>
    </QueryClientProvider>
  );
}

export default App;
