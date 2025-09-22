import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BarChart3, Calendar, CalendarDays, Plus, DollarSign, MoreHorizontal, Users, UserPlus, Briefcase, Cake, Plane } from "lucide-react";
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
    { id: "finances", label: "Финансы", icon: DollarSign },
    { id: "events", label: "Мероприятия", icon: CalendarDays },
  ];

  const moreMenuItems = [
    { id: "calendar", label: "Календарь", icon: Calendar },
    { id: "staff", label: "Сотрудники", icon: Users },
    { id: "birthdays", label: "Дни рождения", icon: Cake },
    { id: "vacations", label: "График отпусков", icon: Plane },
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
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => handleTabChange("dashboard")}
              className={`flex items-center justify-center h-12 w-12 rounded-full transition-all duration-200 active:scale-95 ${
                isActiveTab("dashboard") 
                  ? "border-2 border-primary text-primary bg-primary/5" 
                  : "border-2 border-transparent text-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
              }`}
            >
              <BarChart3 className="h-5 w-5" strokeWidth={2} />
            </button>
            <span className={`text-xs font-medium ${
              isActiveTab("dashboard") ? "text-primary" : "text-foreground"
            }`}>Главная</span>
          </div>

          {/* Finances */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => handleTabChange("finances")}
              className={`flex items-center justify-center h-12 w-12 rounded-full transition-all duration-200 active:scale-95 ${
                isActiveTab("finances") 
                  ? "border-2 border-primary text-primary bg-primary/5" 
                  : "border-2 border-transparent text-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
              }`}
            >
              <DollarSign className="h-5 w-5" strokeWidth={2} />
            </button>
            <span className={`text-xs font-medium ${
              isActiveTab("finances") ? "text-primary" : "text-foreground"
            }`}>Финансы</span>
          </div>

          {/* Add Transaction - Central FAB */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => handleTabChange("transaction")}
              className={`flex items-center justify-center h-12 w-12 rounded-full border-2 transition-all duration-200 active:scale-95 ${
                isActiveTab("transaction") 
                  ? "border-primary text-primary bg-primary/5" 
                  : "border-foreground text-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
              }`}
            >
              <Plus className="h-5 w-5" strokeWidth={2} />
            </button>
            <span className={`text-xs font-medium ${
              isActiveTab("transaction") ? "text-primary" : "text-foreground"
            }`}>Трата/Приход</span>
          </div>

          {/* Events */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={() => handleTabChange("events")}
              className={`flex items-center justify-center h-12 w-12 rounded-full transition-all duration-200 active:scale-95 ${
                isActiveTab("events") 
                  ? "border-2 border-primary text-primary bg-primary/5" 
                  : "border-2 border-transparent text-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
              }`}
            >
              <CalendarDays className="h-5 w-5" strokeWidth={2} />
            </button>
            <span className={`text-xs font-medium ${
              isActiveTab("events") ? "text-primary" : "text-foreground"
            }`}>Мероприятия</span>
          </div>

          {/* More Menu */}
          <Sheet open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
            <SheetTrigger asChild>
              <div className="flex flex-col items-center gap-1.5">
                <button className="flex items-center justify-center h-12 w-12 rounded-full border-2 border-transparent text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200 active:scale-95">
                  <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
                </button>
                <span className="text-xs font-medium text-foreground">Ещё</span>
              </div>
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
                       <Icon className="h-5 w-5" strokeWidth={2} />
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