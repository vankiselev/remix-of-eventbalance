import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
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
import WarehousePage from "./pages/WarehousePage";
import { notificationSound } from "@/utils/notificationSound";
import { supabase } from "@/integrations/supabase/client";

// Optimized React Query configuration for better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes - data is considered fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache retention (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Only 1 retry instead of default 3
    },
  },
});

const RealtimeSync = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Централизованные realtime подписки для автоматической инвалидации кэша
    const channel = supabase
      .channel('global-changes')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'events' }, () => {
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'financial_transactions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['company-cash-summary'] });
        queryClient.invalidateQueries({ queryKey: ['user-cash-summary'] });
        queryClient.invalidateQueries({ queryKey: ['all-users-cash-totals'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['pending-transactions-count'] });
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'vacations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['vacations'] });
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['profiles'] });
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        queryClient.invalidateQueries({ queryKey: ['all-users-cash-totals'] });
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'animators' }, () => {
        queryClient.invalidateQueries({ queryKey: ['animators'] });
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'clients' }, () => {
        queryClient.invalidateQueries({ queryKey: ['clients'] });
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'contractors' }, () => {
        queryClient.invalidateQueries({ queryKey: ['contractors'] });
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'venues' }, () => {
        queryClient.invalidateQueries({ queryKey: ['venues'] });
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'category_icons' }, () => {
        queryClient.invalidateQueries({ queryKey: ['category-icons'] });
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'warehouse_items' }, () => {
        queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'warehouse_stock' }, () => {
        queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'warehouse_categories' }, () => {
        queryClient.invalidateQueries({ queryKey: ['warehouse-categories'] });
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'warehouse_locations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['warehouse-locations'] });
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'warehouse_tasks' }, () => {
        queryClient.invalidateQueries({ queryKey: ['warehouse-tasks'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return null;
};

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
      <BrowserRouter>
        <AuthProvider>
          <FinancesActionsProvider>
            <ImportProgressProvider>
              <TooltipProvider>
                <RealtimeSync />
                <Toaster />
                <Sonner />
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
            <Route path="/warehouse" element={<ProtectedRoute><WarehousePage /></ProtectedRoute>} />
            
            {/* Admin-only routes */}
            <Route path="/administration" element={<ProtectedRoute><AdminRoute><AdministrationPage /></AdminRoute></ProtectedRoute>} />
            <Route path="/invitations" element={<ProtectedRoute><AdminRoute><InvitationsPage /></AdminRoute></ProtectedRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </ImportProgressProvider>
          </FinancesActionsProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;