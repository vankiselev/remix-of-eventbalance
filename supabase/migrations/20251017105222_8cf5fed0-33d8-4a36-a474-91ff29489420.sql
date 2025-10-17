-- Нормализация значений cash_type в импортированных транзакциях
-- Заменяем короткие значения на полные названия кошельков

UPDATE financial_transactions
SET cash_type = 'Наличка Настя'
WHERE cash_type = 'nastya';

UPDATE financial_transactions
SET cash_type = 'Наличка Лера'
WHERE cash_type = 'lera';

UPDATE financial_transactions
SET cash_type = 'Наличка Ваня'
WHERE cash_type = 'vanya';