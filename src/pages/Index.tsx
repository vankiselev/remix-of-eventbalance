import { useState } from "react";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";
import Events from "@/components/Events";
import EventCalendar from "@/components/EventCalendar";
import Finances from "@/components/Finances";
import Staff from "@/components/Staff";
import FinancialTransaction from "@/components/FinancialTransaction";
import CashDashboard from "@/components/CashDashboard";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <CashDashboard />;
      case "events":
        return <Events />;
      case "calendar":
        return <EventCalendar />;
      case "transaction":
        return <FinancialTransaction />;
      case "finances":
        return <Finances />;
      case "staff":
        return <Staff />;
      default:
        return <CashDashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default Index;