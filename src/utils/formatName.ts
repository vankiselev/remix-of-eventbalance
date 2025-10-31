// Helper function to format full name from profile parts
export const formatFullName = (profile: {
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
