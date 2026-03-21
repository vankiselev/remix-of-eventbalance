// Convert raw "Фамилия Имя Отчество" string to "Имя Фамилия"
export const formatDisplayName = (fullName?: string | null): string => {
  if (!fullName) return 'Пользователь';
  const parts = fullName.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    // "Фамилия Имя [Отчество]" → "Имя Фамилия"
    return `${parts[1]} ${parts[0]}`;
  }
  return fullName;
};

// Helper function to format display name (First Name + Last Name) for UI
export const formatFullName = (profile: {
  last_name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  full_name?: string | null;
}): string => {
  // Show "First Name Last Name" for display in UI
  if (profile.first_name || profile.last_name) {
    return [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(' ') || 'Пользователь';
  }
  
  // Fallback to full_name via formatDisplayName
  return formatDisplayName(profile.full_name);
};

// Helper function to format full official name (Last Name + First Name + Middle Name) for profile
export const formatOfficialFullName = (profile: {
  last_name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  full_name?: string | null;
}): string => {
  // If we have structured name fields, use them
  if (profile.last_name || profile.first_name) {
    return [profile.last_name, profile.first_name, profile.middle_name]
      .filter(Boolean)
      .join(' ') || 'Пользователь';
  }
  
  // Fallback to full_name
  return profile.full_name || 'Пользователь';
};

// Get initials from profile
export const getInitials = (profile: {
  last_name?: string | null;
  first_name?: string | null;
  full_name?: string | null;
}): string => {
  const name = formatFullName(profile);
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
