/**
 * Склонение русских имен и фамилий в дательный падеж (кому?)
 */

const MALE_NAMES_EXCEPTIONS: Record<string, string> = {
  'Илья': 'Илье',
  'Лука': 'Луке',
  'Савва': 'Савве',
  'Фома': 'Фоме',
  'Кузьма': 'Кузьме',
  'Никита': 'Никите',
};

const FEMALE_NAMES_EXCEPTIONS: Record<string, string> = {
  'Любовь': 'Любови',
  'Юдифь': 'Юдифи',
};

/**
 * Склоняет имя в дательный падеж
 */
function declineFirstName(name: string): string {
  const trimmedName = name.trim();
  
  // Проверяем исключения
  if (MALE_NAMES_EXCEPTIONS[trimmedName]) {
    return MALE_NAMES_EXCEPTIONS[trimmedName];
  }
  if (FEMALE_NAMES_EXCEPTIONS[trimmedName]) {
    return FEMALE_NAMES_EXCEPTIONS[trimmedName];
  }
  
  // Женские имена на -а/-я
  if (trimmedName.endsWith('а')) {
    return trimmedName.slice(0, -1) + 'е';
  }
  if (trimmedName.endsWith('я')) {
    return trimmedName.slice(0, -1) + 'е';
  }
  
  // Имена на -ия
  if (trimmedName.endsWith('ия')) {
    return trimmedName.slice(0, -1) + 'и';
  }
  
  // Имена на мягкий знак (обычно женские)
  if (trimmedName.endsWith('ь')) {
    return trimmedName.slice(0, -1) + 'и';
  }
  
  // Мужские имена на согласную
  return trimmedName + 'у';
}

/**
 * Склоняет фамилию в дательный падеж
 */
function declineLastName(lastName: string): string {
  const trimmedLastName = lastName.trim();
  
  // Фамилии на -ов/-ев/-ёв
  if (trimmedLastName.endsWith('ов') || trimmedLastName.endsWith('ев') || trimmedLastName.endsWith('ёв')) {
    return trimmedLastName + 'у';
  }
  
  // Фамилии на -ин/-ын
  if (trimmedLastName.endsWith('ин') || trimmedLastName.endsWith('ын')) {
    return trimmedLastName + 'у';
  }
  
  // Фамилии на -ский/-ской/-цкий/-цкой
  if (trimmedLastName.endsWith('ский') || trimmedLastName.endsWith('ской')) {
    return trimmedLastName.slice(0, -2) + 'ому';
  }
  if (trimmedLastName.endsWith('цкий') || trimmedLastName.endsWith('цкой')) {
    return trimmedLastName.slice(0, -2) + 'ому';
  }
  
  // Фамилии на -а/-я (склоняемые)
  if (trimmedLastName.endsWith('а')) {
    return trimmedLastName.slice(0, -1) + 'е';
  }
  if (trimmedLastName.endsWith('я')) {
    return trimmedLastName.slice(0, -1) + 'е';
  }
  
  // Фамилии на -ая/-яя (женские формы прилагательных)
  if (trimmedLastName.endsWith('ая')) {
    return trimmedLastName.slice(0, -2) + 'ой';
  }
  if (trimmedLastName.endsWith('яя')) {
    return trimmedLastName.slice(0, -2) + 'ей';
  }
  
  // Несклоняемые фамилии (на -о, -е, -и, -у, -ю) или иностранные
  if (
    trimmedLastName.endsWith('о') ||
    trimmedLastName.endsWith('е') ||
    trimmedLastName.endsWith('и') ||
    trimmedLastName.endsWith('у') ||
    trimmedLastName.endsWith('ю') ||
    trimmedLastName.endsWith('ых') ||
    trimmedLastName.endsWith('их')
  ) {
    return trimmedLastName;
  }
  
  // Остальные фамилии на согласную
  return trimmedLastName + 'у';
}

/**
 * Склоняет полное имя (Имя Фамилия или Имя Отчество Фамилия) в дательный падеж
 */
export function declineFullNameToDative(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 0) {
    return fullName;
  }
  
  if (parts.length === 1) {
    // Только имя
    return declineFirstName(parts[0]);
  }
  
  if (parts.length === 2) {
    // Имя Фамилия
    return `${declineFirstName(parts[0])} ${declineLastName(parts[1])}`;
  }
  
  // Имя Отчество Фамилия
  const firstName = declineFirstName(parts[0]);
  const middleName = declineFirstName(parts[1]); // Отчества склоняются как имена
  const lastName = declineLastName(parts[2]);
  
  return `${firstName} ${middleName} ${lastName}`;
}
