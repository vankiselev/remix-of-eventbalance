-- Удаляем все записи
DELETE FROM public.category_icons;

-- Добавляем только нужные категории с полными названиями
INSERT INTO public.category_icons (category_name, icon_type, icon_value, bg_color, icon_color) VALUES
-- Расходы
('Агентская комиссия', 'lucide', 'Handshake', 'bg-purple-500/10', 'text-purple-600 dark:text-purple-400'),
('Аниматоры / Шоу программа (мастер-классы, попвата, интерактивы, пиньята)', 'lucide', 'Drama', 'bg-pink-500/10', 'text-pink-600 dark:text-pink-400'),
('Аренда (оборудование, костюмы, мебель, декор, аттракционы, шатры)', 'lucide', 'Package', 'bg-purple-500/10', 'text-purple-600 dark:text-purple-400'),
('Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)', 'lucide', 'DollarSign', 'bg-blue-500/10', 'text-blue-600 dark:text-blue-400'),
('Выступление артистов (диджеи, селебрити, кавер-группы)', 'lucide', 'Music', 'bg-indigo-500/10', 'text-indigo-600 dark:text-indigo-400'),
('Дизайн / Оформление (флористика, шарики, фотозона, услуги дизайнера)', 'lucide', 'Palette', 'bg-rose-500/10', 'text-rose-600 dark:text-rose-400'),
('Доставка / Трансфер / Парковка / Вывоз мусора', 'lucide', 'Truck', 'bg-slate-500/10', 'text-slate-600 dark:text-slate-400'),
('Еда / Напитки (сладкий стол, торт, кейтеринг)', 'lucide', 'UtensilsCrossed', 'bg-amber-500/10', 'text-amber-600 dark:text-amber-400'),
('Закупки / Оплаты (ФИН, офис, склад, компания)', 'lucide', 'ShoppingCart', 'bg-orange-500/10', 'text-orange-600 dark:text-orange-400'),
('Залог (внесли/вернули)', 'lucide', 'Shield', 'bg-cyan-500/10', 'text-cyan-600 dark:text-cyan-400'),
('Комиссия за перевод', 'lucide', 'CreditCard', 'bg-violet-500/10', 'text-violet-600 dark:text-violet-400'),
('Монтаж / Демонтаж', 'lucide', 'Wrench', 'bg-gray-500/10', 'text-gray-600 dark:text-gray-400'),
('Накладные расходы (райдер, траты вне сметы)', 'lucide', 'ReceiptText', 'bg-red-500/10', 'text-red-600 dark:text-red-400'),
('Передано или получено от Леры/Насти/Вани', 'lucide', 'Users', 'bg-teal-500/10', 'text-teal-600 dark:text-teal-400'),
('Передано или получено от сотрудника', 'lucide', 'UserCircle', 'bg-emerald-500/10', 'text-emerald-600 dark:text-emerald-400'),
('Печать (баннеры, меню, карточки)', 'lucide', 'Printer', 'bg-sky-500/10', 'text-sky-600 dark:text-sky-400'),
('Площадка (депозит, аренда, доп. услуги)', 'lucide', 'MapPin', 'bg-lime-500/10', 'text-lime-600 dark:text-lime-400'),
('Получено/Возвращено клиенту', 'lucide', 'ArrowLeftRight', 'bg-green-500/10', 'text-green-600 dark:text-green-400'),
('Производство (декорации, костюмы)', 'lucide', 'Factory', 'bg-yellow-500/10', 'text-yellow-600 dark:text-yellow-400'),
('Прочие специалисты', 'lucide', 'Briefcase', 'bg-fuchsia-500/10', 'text-fuchsia-600 dark:text-fuchsia-400'),
('Фотограф / Видеограф', 'lucide', 'Camera', 'bg-pink-500/10', 'text-pink-600 dark:text-pink-400'),
('Налог / УСН', 'lucide', 'FileText', 'bg-red-500/10', 'text-red-600 dark:text-red-400'),
('Депозит (не выбирать)', 'lucide', 'Ban', 'bg-gray-500/10', 'text-gray-600 dark:text-gray-400'),

-- Доходы
('От клиентов', 'lucide', 'Wallet', 'bg-green-500/10', 'text-green-600 dark:text-green-400'),
('Аванс', 'lucide', 'Coins', 'bg-emerald-500/10', 'text-emerald-600 dark:text-emerald-400'),
('Другое', 'lucide', 'Plus', 'bg-teal-500/10', 'text-teal-600 dark:text-teal-400');