import { useState } from "react";
import LandingPage from "@/components/LandingPage";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const [activeTab, setActiveTab] = useState('landing');

  if (activeTab === 'dashboard') {
    return <Dashboard />;
  }

  return <LandingPage setActiveTab={setActiveTab} />;
};

export default Index;
