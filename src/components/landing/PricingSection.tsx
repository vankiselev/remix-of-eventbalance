import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Старт",
    description: "Для небольших агентств",
    price: "Бесплатно",
    priceNote: "до 3 пользователей",
    features: [
      "До 50 мероприятий в месяц",
      "Базовый финансовый учёт",
      "Календарь и расписание",
      "База контактов",
      "Email поддержка",
    ],
    highlighted: false,
    cta: "Начать бесплатно",
  },
  {
    name: "Профи",
    description: "Для растущих команд",
    price: "₽2,990",
    priceNote: "в месяц",
    features: [
      "Неограниченные мероприятия",
      "Расширенная аналитика",
      "Управление командой",
      "Интеграция со складом",
      "Приоритетная поддержка",
      "API доступ",
    ],
    highlighted: true,
    cta: "Попробовать 14 дней",
  },
  {
    name: "Корпоративный",
    description: "Для крупных компаний",
    price: "По запросу",
    priceNote: "индивидуально",
    features: [
      "Все функции Профи",
      "Выделенный сервер",
      "Персональный менеджер",
      "Индивидуальные доработки",
      "SLA 99.9%",
      "Обучение команды",
    ],
    highlighted: false,
    cta: "Связаться",
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Простое ценообразование
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Выберите план, который подходит вашей команде. Без скрытых платежей.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={cn(
                "relative rounded-2xl p-8 transition-all duration-300",
                plan.highlighted
                  ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-105 border-2 border-primary"
                  : "bg-card border border-border hover:border-primary/30"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary-foreground text-primary text-sm font-medium">
                  Популярный
                </div>
              )}

              <div className="mb-6">
                <h3 className={cn(
                  "text-xl font-bold mb-2",
                  plan.highlighted ? "text-primary-foreground" : "text-foreground"
                )}>
                  {plan.name}
                </h3>
                <p className={cn(
                  "text-sm",
                  plan.highlighted ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <div className={cn(
                  "text-4xl font-bold",
                  plan.highlighted ? "text-primary-foreground" : "text-foreground"
                )}>
                  {plan.price}
                </div>
                <div className={cn(
                  "text-sm",
                  plan.highlighted ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {plan.priceNote}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className={cn(
                      "h-5 w-5 shrink-0 mt-0.5",
                      plan.highlighted ? "text-primary-foreground" : "text-primary"
                    )} />
                    <span className={cn(
                      "text-sm",
                      plan.highlighted ? "text-primary-foreground/90" : "text-foreground"
                    )}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={cn(
                  "w-full",
                  plan.highlighted
                    ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                    : ""
                )}
                variant={plan.highlighted ? "secondary" : "default"}
              >
                <Link to="/auth">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Нужна помощь в выборе? Мы поможем подобрать оптимальный план
          </p>
          <Button variant="outline" size="lg">
            <MessageCircle className="mr-2 h-5 w-5" />
            Связаться с нами
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
