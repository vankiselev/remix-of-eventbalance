import { 
  Calendar, 
  DollarSign, 
  Users, 
  UserCheck, 
  BarChart3, 
  Package,
  Clock,
  Shield,
  Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Calendar,
    title: "Мероприятия и календарь",
    description: "Планируйте события, отслеживайте расписание и никогда не упускайте важные даты. Удобный календарь с фильтрами и поиском.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: DollarSign,
    title: "Финансовый учёт",
    description: "Контролируйте доходы и расходы, отслеживайте дебиторку и кредиторку. Автоматический расчёт прибыли по каждому мероприятию.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Users,
    title: "Управление командой",
    description: "Ведите базу сотрудников, аниматоров и подрядчиков. Назначайте на мероприятия и отслеживайте занятость.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: UserCheck,
    title: "База контактов",
    description: "Храните информацию о клиентах, площадках и партнёрах. История взаимодействий и быстрый поиск.",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: BarChart3,
    title: "Отчёты и аналитика",
    description: "Наглядные графики и отчёты по финансам, загруженности команды и эффективности работы.",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  {
    icon: Package,
    title: "Склад",
    description: "Учёт реквизита, костюмов и оборудования. Отслеживание наличия и резервирование под мероприятия.",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    badge: "Скоро",
  },
];

const additionalFeatures = [
  {
    icon: Clock,
    title: "Realtime синхронизация",
    description: "Мгновенные обновления для всей команды",
  },
  {
    icon: Shield,
    title: "Безопасность данных",
    description: "Надёжное шифрование и контроль доступа",
  },
  {
    icon: Smartphone,
    title: "Мобильная версия",
    description: "Работайте с любого устройства",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Всё для управления мероприятиями
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Полный набор инструментов для event-агентств любого размера
          </p>
        </div>

        {/* Main features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              {feature.badge && (
                <span className="absolute top-4 right-4 px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                  {feature.badge}
                </span>
              )}
              
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                feature.bgColor
              )}>
                <feature.icon className={cn("h-6 w-6", feature.color)} />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Additional features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {additionalFeatures.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border/50"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  {feature.title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
