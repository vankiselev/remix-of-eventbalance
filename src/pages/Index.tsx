import { useState } from "react";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";
import Events from "@/components/Events";
import EventCalendar from "@/components/EventCalendar";
import Finances from "@/components/Finances";
import Staff from "@/components/Staff";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "events":
        return <Events />;
      case "calendar":
        return <EventCalendar />;
      case "finances":
        return <Finances />;
      case "staff":
        return <Staff />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default Index;