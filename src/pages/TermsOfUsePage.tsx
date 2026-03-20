import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const TermsOfUsePage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Условия использования
        </h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">
            Дата последнего обновления: {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Общие положения</h2>
            <p>
              Настоящие Условия использования (далее — Условия) регулируют отношения между ИП Киселёв Иван Павлович (ИНН 773365251443, ОГРНИП 321774600221968), именуемым в дальнейшем «Правообладатель», и физическим или юридическим лицом, именуемым в дальнейшем «Пользователь», по использованию сервиса EventBalance (далее — Сервис).
            </p>
            <p>
              Регистрация в Сервисе и его использование означают полное и безоговорочное принятие настоящих Условий.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Предмет соглашения</h2>
            <p>
              Правообладатель предоставляет Пользователю право использования Сервиса для управления мероприятиями, включая:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Планирование и учёт мероприятий</li>
              <li>Ведение финансового учёта</li>
              <li>Управление командой и контактами</li>
              <li>Формирование отчётов и аналитики</li>
              <li>Иные функции, доступные в рамках выбранного тарифного плана</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Регистрация и учётная запись</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Для использования Сервиса необходима регистрация по приглашению администратора организации</li>
              <li>Пользователь обязуется предоставить достоверные данные при регистрации</li>
              <li>Пользователь несёт ответственность за сохранность своих учётных данных</li>
              <li>Запрещается передавать доступ к учётной записи третьим лицам</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Права и обязанности Пользователя</h2>
            <p><strong>Пользователь имеет право:</strong></p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Использовать функции Сервиса согласно выбранному тарифному плану</li>
              <li>Получать техническую поддержку</li>
              <li>Экспортировать свои данные</li>
              <li>Удалить учётную запись в любое время</li>
            </ul>
            
            <p className="mt-4"><strong>Пользователь обязуется:</strong></p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Соблюдать настоящие Условия</li>
              <li>Не использовать Сервис для незаконной деятельности</li>
              <li>Не предпринимать попыток несанкционированного доступа к Сервису</li>
              <li>Не распространять вредоносное ПО</li>
              <li>Своевременно оплачивать услуги (при использовании платных тарифов)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Права и обязанности Правообладателя</h2>
            <p><strong>Правообладатель обязуется:</strong></p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Обеспечивать работоспособность Сервиса</li>
              <li>Обеспечивать сохранность данных Пользователя</li>
              <li>Предоставлять техническую поддержку</li>
              <li>Уведомлять о существенных изменениях в работе Сервиса</li>
            </ul>
            
            <p className="mt-4"><strong>Правообладатель имеет право:</strong></p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Вносить изменения в функциональность Сервиса</li>
              <li>Приостанавливать работу Сервиса для технического обслуживания</li>
              <li>Блокировать доступ при нарушении Условий</li>
              <li>Изменять тарифные планы с предварительным уведомлением</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Тарифы и оплата</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Стоимость услуг определяется действующими тарифными планами</li>
              <li>Оплата производится в соответствии с выбранным периодом (месяц/год)</li>
              <li>При неоплате доступ к платным функциям может быть ограничен</li>
              <li>Возврат средств осуществляется в соответствии с законодательством РФ</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Интеллектуальная собственность</h2>
            <p>
              Все права на Сервис, включая программный код, дизайн, товарные знаки и контент, принадлежат Правообладателю. Пользователю предоставляется ограниченная лицензия на использование Сервиса. Копирование, модификация или распространение элементов Сервиса запрещены.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Ограничение ответственности</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Сервис предоставляется «как есть» (as is)</li>
              <li>Правообладатель не несёт ответственности за косвенные убытки</li>
              <li>Правообладатель не гарантирует бесперебойную работу Сервиса</li>
              <li>Пользователь несёт ответственность за достоверность вводимых данных</li>
              <li>Максимальная ответственность Правообладателя ограничена суммой оплаченных услуг за последние 12 месяцев</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Прекращение использования</h2>
            <p>
              Пользователь может прекратить использование Сервиса в любое время, удалив учётную запись. После удаления данные хранятся 30 дней, затем удаляются безвозвратно.
            </p>
            <p>
              Правообладатель может прекратить предоставление услуг при систематическом нарушении Условий с предварительным уведомлением.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">10. Разрешение споров</h2>
            <p>
              Все споры разрешаются путём переговоров. При невозможности достичь соглашения споры рассматриваются в суде по месту нахождения Правообладателя в соответствии с законодательством Российской Федерации.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">11. Изменение Условий</h2>
            <p>
              Правообладатель вправе изменять настоящие Условия. О существенных изменениях Пользователи уведомляются по электронной почте не менее чем за 14 дней. Продолжение использования Сервиса после вступления изменений в силу означает согласие с новой редакцией.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">12. Контактная информация</h2>
            <p>
              По всем вопросам обращайтесь:
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
              <p><strong>ИП Киселёв Иван Павлович</strong></p>
              <p>ИНН: 773365251443</p>
              <p>ОГРНИП: 321774600221968</p>
              <p>Адрес: г. Москва, Новокуркинское шоссе д.47</p>
              <p>Email: support@eventbalance.ru</p>
              <p>Телефон: +7 (915) 290-33-77</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUsePage;
