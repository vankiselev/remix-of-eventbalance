import { useState } from "react";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";
import Events from "@/components/Events";
import CalendarPage from "@/components/CalendarPage";
import Finances from "@/components/Finances";
import Staff from "@/components/Staff";
import Birthdays from "@/components/Birthdays";
import VacationSchedule from "@/components/VacationSchedule";
import { TransactionFormPage } from "@/components/TransactionFormPage";
import { InvitationsManagement } from "@/components/admin/InvitationsManagement";
import Contacts from "@/components/Contacts";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "events":
        return <Events />;
      case "calendar":
        return <CalendarPage />;
      case "transaction":
        return <TransactionFormPage onNavigateToFinances={() => setActiveTab("finances")} />;
      case "finances":
        return <Finances />;
      case "staff":
        return <Staff />;
      case "birthdays":
        return <Birthdays />;
      case "vacations":
        return <VacationSchedule />;
      case "invitations":
        return <InvitationsManagement />;
      case "contacts":
        return <Contacts />;
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