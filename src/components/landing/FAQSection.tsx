import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Как получить доступ к системе?",
    answer: "Для получения доступа свяжитесь с нашей командой или запросите приглашение у администратора вашей организации. После регистрации вы сразу сможете начать работу с системой.",
  },
  {
    question: "Для каких мероприятий подходит EventBalance?",
    answer: "EventBalance подходит для любых типов мероприятий: детские праздники, корпоративы, свадьбы, концерты, выставки, конференции и многое другое. Система гибко настраивается под ваши потребности.",
  },
  {
    question: "Как обеспечивается безопасность данных?",
    answer: "Все данные хранятся на защищённых серверах с шифрованием. Мы используем современные протоколы безопасности и регулярно проводим аудит системы. Доступ к данным имеют только авторизованные пользователи.",
  },
  {
    question: "Можно ли работать с системой с мобильного?",
    answer: "Да, EventBalance полностью адаптирован для работы на мобильных устройствах. Вы можете управлять мероприятиями, просматривать финансы и общаться с командой с любого смартфона или планшета.",
  },
  {
    question: "Есть ли интеграция с другими сервисами?",
    answer: "Мы постоянно расширяем список интеграций. Сейчас доступна интеграция с календарями (Google Calendar, iCal) и системами оплаты. Если вам нужна специфическая интеграция, свяжитесь с нами.",
  },
  {
    question: "Как происходит обучение сотрудников?",
    answer: "Мы предоставляем подробную документацию и видео-инструкции. Для корпоративных клиентов доступно персональное обучение команды. Интерфейс интуитивно понятен, большинство пользователей осваивают систему за несколько часов.",
  },
  {
    question: "Можно ли перенести данные из другой системы?",
    answer: "Да, мы помогаем с миграцией данных из Excel, Google Sheets и других CRM-систем. Наша команда поддержки проведёт вас через весь процесс переноса данных.",
  },
  {
    question: "Что будет с данными, если я откажусь от подписки?",
    answer: "Ваши данные сохраняются в течение 30 дней после окончания подписки. За это время вы можете возобновить подписку или экспортировать все данные. Мы никогда не удаляем данные без предупреждения.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-24">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Часто задаваемые вопросы
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ответы на популярные вопросы о системе
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/30"
              >
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="text-foreground font-medium pr-4">
                    {faq.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
