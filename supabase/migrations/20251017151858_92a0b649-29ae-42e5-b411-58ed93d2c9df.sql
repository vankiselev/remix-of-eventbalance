-- Обновляем все категории с подходящими иконками
UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'Handshake',
  bg_color = 'bg-purple-500/10',
  icon_color = 'text-purple-600 dark:text-purple-400'
WHERE category_name = 'Агентская комиссия';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'PartyPopper',
  bg_color = 'bg-pink-500/10',
  icon_color = 'text-pink-600 dark:text-pink-400'
WHERE category_name = 'Аниматоры / Шоу программа (мастер-классы, попвата, интерактивы, пиньята)';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'Box',
  bg_color = 'bg-indigo-500/10',
  icon_color = 'text-indigo-600 dark:text-indigo-400'
WHERE category_name = 'Аренда (оборудование, костюмы, мебель, декор, аттракционы, шатры)';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'Banknote',
  bg_color = 'bg-blue-500/10',
  icon_color = 'text-blue-600 dark:text-blue-400'
WHERE category_name = 'Выплаты (зарплата, оклад, процент, бонус, чаевые, стажеры/хелперы)';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'Mic2',
  bg_color = 'bg-violet-500/10',
  icon_color = 'text-violet-600 dark:text-violet-400'
WHERE category_name = 'Выступление артистов (диджеи, селебрити, кавер-группы)';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'Paintbrush',
  bg_color = 'bg-rose-500/10',
  icon_color = 'text-rose-600 dark:text-rose-400'
WHERE category_name = 'Дизайн / Оформление (флористика, шарики, фотозона, услуги дизайнера)';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'Truck',
  bg_color = 'bg-slate-500/10',
  icon_color = 'text-slate-600 dark:text-slate-400'
WHERE category_name = 'Доставка / Трансфер / Парковка / Вывоз мусора';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'Cake',
  bg_color = 'bg-amber-500/10',
  icon_color = 'text-amber-600 dark:text-amber-400'
WHERE category_name = 'Еда / Напитки (сладкий стол, торт, кейтеринг)';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'ShoppingBag',
  bg_color = 'bg-orange-500/10',
  icon_color = 'text-orange-600 dark:text-orange-400'
WHERE category_name = 'Закупки / Оплаты (ФИН, офис, склад, компания)';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'ShieldCheck',
  bg_color = 'bg-cyan-500/10',
  icon_color = 'text-cyan-600 dark:text-cyan-400'
WHERE category_name = 'Залог (внесли/вернули)';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'ArrowRightLeft',
  bg_color = 'bg-fuchsia-500/10',
  icon_color = 'text-fuchsia-600 dark:text-fuchsia-400'
WHERE category_name = 'Комиссия за перевод';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'HardHat',
  bg_color = 'bg-yellow-500/10',
  icon_color = 'text-yellow-600 dark:text-yellow-400'
WHERE category_name = 'Монтаж / Демонтаж';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'FileWarning',
  bg_color = 'bg-red-500/10',
  icon_color = 'text-red-600 dark:text-red-400'
WHERE category_name = 'Накладные расходы (райдер, траты вне сметы)';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'UsersRound',
  bg_color = 'bg-teal-500/10',
  icon_color = 'text-teal-600 dark:text-teal-400'
WHERE category_name = 'Передано или получено от Леры/Насти/Вани';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'User',
  bg_color = 'bg-emerald-500/10',
  icon_color = 'text-emerald-600 dark:text-emerald-400'
WHERE category_name = 'Передано или получено от сотрудника';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'Printer',
  bg_color = 'bg-sky-500/10',
  icon_color = 'text-sky-600 dark:text-sky-400'
WHERE category_name = 'Печать (баннеры, меню, карточки)';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'Building2',
  bg_color = 'bg-lime-500/10',
  icon_color = 'text-lime-600 dark:text-lime-400'
WHERE category_name = 'Площадка (депозит, аренда, доп. услуги)';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'RefreshCw',
  bg_color = 'bg-green-500/10',
  icon_color = 'text-green-600 dark:text-green-400'
WHERE category_name = 'Получено/Возвращено клиенту';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'Cog',
  bg_color = 'bg-zinc-500/10',
  icon_color = 'text-zinc-600 dark:text-zinc-400'
WHERE category_name = 'Производство (декорации, костюмы)';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'UserCog',
  bg_color = 'bg-purple-500/10',
  icon_color = 'text-purple-600 dark:text-purple-400'
WHERE category_name = 'Прочие специалисты';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'Video',
  bg_color = 'bg-pink-500/10',
  icon_color = 'text-pink-600 dark:text-pink-400'
WHERE category_name = 'Фотограф / Видеограф';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'Calculator',
  bg_color = 'bg-red-500/10',
  icon_color = 'text-red-600 dark:text-red-400'
WHERE category_name = 'Налог / УСН';

UPDATE public.category_icons SET 
  icon_type = 'lucide',
  icon_value = 'XCircle',
  bg_color = 'bg-gray-500/10',
  icon_color = 'text-gray-600 dark:text-gray-400'
WHERE category_name = 'Депозит (не выбирать)';