import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FinancesActionsProvider } from "@/contexts/FinancesActionsContext";
import { ImportProgressProvider } from "@/contexts/ImportProgressContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Auth from "./pages/Auth";
import { InvitePage } from "./pages/InvitePage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import DashboardPage from "./pages/DashboardPage";
import FinancesPage from "./pages/FinancesPage";
import EventsPage from "./pages/EventsPage";
import CalendarPageWrapper from "./pages/CalendarPageWrapper";
import TransactionPage from "./pages/TransactionPage";
import StaffPage from "./pages/StaffPage";
import BirthdaysPage from "./pages/BirthdaysPage";
import VacationsPage from "./pages/VacationsPage";
import ContactsPage from "./pages/ContactsPage";
import ReportsPage from "./pages/ReportsPage";
import InvitationsPage from "./pages/InvitationsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import AdministrationPage from "./pages/AdministrationPage";
import TransactionsReviewPage from "./pages/TransactionsReviewPage";
import MessagesPage from "./pages/MessagesPage";
import SiriIntegrationPage from "./pages/SiriIntegrationPage";
import { notificationSound } from "@/utils/notificationSound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Listen for messages from Service Worker to play notification sound
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'PLAY_NOTIFICATION_SOUND') {
          notificationSound.play();
        }
      });
    }
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <FinancesActionsProvider>
        <ImportProgressProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/finances" element={<ProtectedRoute><FinancesPage /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPageWrapper /></ProtectedRoute>} />
            <Route path="/transaction" element={<ProtectedRoute><TransactionPage /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute><StaffPage /></ProtectedRoute>} />
            <Route path="/birthdays" element={<ProtectedRoute><BirthdaysPage /></ProtectedRoute>} />
            <Route path="/vacations" element={<ProtectedRoute><VacationsPage /></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/transactions-review" element={<ProtectedRoute><TransactionsReviewPage /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/siri-integration" element={<ProtectedRoute><SiriIntegrationPage /></ProtectedRoute>} />
            
            {/* Admin-only routes */}
            <Route path="/administration" element={<ProtectedRoute><AdminRoute><AdministrationPage /></AdminRoute></ProtectedRoute>} />
            <Route path="/invitations" element={<ProtectedRoute><AdminRoute><InvitationsPage /></AdminRoute></ProtectedRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </ImportProgressProvider>
      </FinancesActionsProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;