import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Shield, Clock, Users, Target, Sparkles } from "lucide-react";

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              На главную
            </Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">О компании</h1>
        <p className="text-muted-foreground mb-10">EventBalance — платформа для управления мероприятиями и финансами</p>

        <div className="space-y-10 text-muted-foreground">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Наша миссия</h2>
            </div>
            <p>
              EventBalance создан для event-агентств и организаторов мероприятий, которым нужен удобный инструмент
              для управления проектами, командой и финансами в одном месте. Мы помогаем навести порядок в бизнес-процессах,
              чтобы вы могли сосредоточиться на создании незабываемых событий.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Что мы предлагаем</h2>
            </div>
            <ul className="space-y-2 list-disc list-inside">
              <li>Календарь мероприятий с полной информацией о каждом событии</li>
              <li>Управление командой: менеджеры, аниматоры, подрядчики</li>
              <li>Финансовый учёт: доходы, расходы, кассы, переводы</li>
              <li>CRM-функции: клиенты, контакты, площадки</li>
              <li>Отчёты по мероприятиям и финансовая аналитика</li>
              <li>Склад реквизита и оборудования</li>
            </ul>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Для кого</h2>
            </div>
            <p>
              Наша платформа идеально подходит для event-агентств, праздничных компаний, свадебных организаторов,
              декораторов и всех, кто занимается организацией мероприятий и хочет вести учёт в одной системе.
            </p>
          </section>

          <section className="space-y-3 rounded-lg border bg-muted/30 p-6">
            <div className="flex items-center gap-2 text-foreground">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Реквизиты</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="font-medium text-foreground">Наименование:</span>{" "}
                ИП Киселёв Иван Павлович
              </div>
              <div>
                <span className="font-medium text-foreground">ИНН:</span>{" "}
                773365251443
              </div>
              <div>
                <span className="font-medium text-foreground">ОГРНИП:</span>{" "}
                321774600221968
              </div>
              <div>
                <span className="font-medium text-foreground">Дата регистрации:</span>{" "}
                14.04.2021
              </div>
              <div className="sm:col-span-2">
                <span className="font-medium text-foreground">Адрес:</span>{" "}
                г. Москва
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
