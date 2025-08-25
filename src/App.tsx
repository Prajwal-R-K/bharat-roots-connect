import * as React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import FamilyTreeViewPage from "@/pages/FamilyTreeViewPage";
import AddFamilyMemberPage from "@/pages/AddFamilyMemberPage";
import InviteMembersPage from "@/pages/InviteMembersPage";
import EditProfilePage from "@/pages/EditProfilePage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/family-tree" element={<FamilyTreeViewPage />} />
            <Route path="/add-member" element={<AddFamilyMemberPage />} />
            <Route path="/invite" element={<InviteMembersPage />} />
            <Route path="/profile" element={<EditProfilePage />} />
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
