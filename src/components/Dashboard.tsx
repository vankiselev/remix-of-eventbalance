import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useMyEvents } from "@/hooks/useMyEvents";
import { QuickStatsRow } from "@/components/dashboard/QuickStatsRow";
import { CompactInfoCard } from "@/components/dashboard/CompactInfoCard";
import TodayEventsCard from "@/components/dashboard/TodayEventsCard";
import MyEventsCard from "@/components/dashboard/MyEventsCard";
import { EventActionRequestsCard } from "@/components/dashboard/EventActionRequestsCard";

const Dashboard = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserPermissions();
  const { data: myEvents = [] } = useMyEvents();

  const hasMyEvents = myEvents.length > 0;

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Header */}
      <div className="min-w-0">
        <h1 className="text-3xl font-bold truncate">Главная</h1>
        <p className="text-muted-foreground truncate">
          Добро пожаловать в EventBalance
        </p>
      </div>

      {/* Event Action Requests (Admin only) */}
      {isAdmin && (
        <div className="w-full">
          <EventActionRequestsCard />
        </div>
      )}

      {/* Quick Stats Row - Financial metrics */}
      <QuickStatsRow />

      {/* Main Content Grid - 2 columns on desktop */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Events (takes 2 cols) */}
        <div className="lg:col-span-2">
          <TodayEventsCard />
        </div>

        {/* Right Column - Compact Info */}
        <div className="lg:col-span-1">
          <CompactInfoCard />
        </div>
      </div>

      {/* My Events - Only show if user has assigned events */}
      {hasMyEvents && (
        <div className="w-full">
          <MyEventsCard />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
