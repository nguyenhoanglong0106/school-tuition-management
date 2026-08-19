// Single source of truth for "where does this role land after login".
export function getHomePathForRole(role) {
  if (role === 'STUDENT') return '/app';
  if (role === 'ADMIN' || role === 'TEACHER') return '/admin';
  return '/login';
}
