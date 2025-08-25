import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BarChart3, Calendar, Plus, DollarSign, MoreHorizontal, Users, UserPlus, Briefcase } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const MobileBottomNav = ({ activeTab, onTabChange }: MobileBottomNavProps) => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const { data } = await supabase
          .rpc("get_user_basic_profile")
          .single();
        setUserRole(data?.role || 'employee');
      }
    };
    fetchUserRole();
  }, [user]);

  const mainNavItems = [
    { id: "dashboard", label: "Главная", icon: BarChart3 },
    { id: "calendar", label: "Календарь", icon: Calendar },
    { id: "finances", label: "Финансы", icon: DollarSign },
  ];

  const moreMenuItems = [
    { id: "events", label: "Мероприятия", icon: Calendar },
    { id: "staff", label: "Сотрудники", icon: Users },
    { id: "contacts", label: "Контакты", icon: Briefcase },
    ...(userRole === 'admin' ? [{ id: "invitations", label: "Приглашения", icon: UserPlus }] : []),
  ];

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    setIsMoreMenuOpen(false);
  };

  const isActiveTab = (tabId: string) => activeTab === tabId;

  return (
    <>
      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 border-t border-border/20 backdrop-blur-lg safe-area-inset-bottom">
        <div className="flex items-center justify-around px-4 py-4 max-w-screen-sm mx-auto">
          {/* Dashboard */}
          <button
            onClick={() => handleTabChange("dashboard")}
            className={`flex flex-col items-center gap-1.5 py-2 px-3 rounded-lg transition-all duration-200 active:scale-95 min-w-0 ${
              isActiveTab("dashboard") 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            <BarChart3 className="h-6 w-6" strokeWidth={2} />
            <span className="text-xs font-medium">Главная</span>
          </button>

          {/* Calendar */}
          <button
            onClick={() => handleTabChange("calendar")}
            className={`flex flex-col items-center gap-1.5 py-2 px-3 rounded-lg transition-all duration-200 active:scale-95 min-w-0 ${
              isActiveTab("calendar") 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            <Calendar className="h-6 w-6" strokeWidth={2} />
            <span className="text-xs font-medium">Календарь</span>
          </button>

          {/* Add Transaction - Central FAB */}
          <button
            onClick={() => handleTabChange("transaction")}
            className={`relative h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 ${
              isActiveTab("transaction") ? "ring-2 ring-primary/20 ring-offset-2 shadow-xl" : ""
            }`}
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>

          {/* Finances */}
          <button
            onClick={() => handleTabChange("finances")}
            className={`flex flex-col items-center gap-1.5 py-2 px-3 rounded-lg transition-all duration-200 active:scale-95 min-w-0 ${
              isActiveTab("finances") 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            <DollarSign className="h-6 w-6" strokeWidth={2} />
            <span className="text-xs font-medium">Финансы</span>
          </button>

          {/* More Menu */}
          <Sheet open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-1.5 py-2 px-3 rounded-lg transition-all duration-200 active:scale-95 min-w-0 text-muted-foreground hover:text-foreground hover:bg-accent/50">
                <MoreHorizontal className="h-6 w-6" strokeWidth={2} />
                <span className="text-xs font-medium">Ещё</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl border-t border-border/20">
              <SheetHeader className="pb-4">
                <SheetTitle>Меню</SheetTitle>
              </SheetHeader>
              <div className="grid gap-2 pb-6">
                {moreMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center justify-start gap-3 h-12 px-4 rounded-lg transition-all duration-200 active:scale-98 ${
                        isActiveTab(item.id) 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "hover:bg-accent/50 text-foreground"
                      }`}
                    >
                       <Icon className="h-6 w-6" strokeWidth={2} />
                       <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Bottom padding to prevent content overlap */}
      <div className="h-24 flex-shrink-0" />
    </>
  );
};

export default MobileBottomNav;