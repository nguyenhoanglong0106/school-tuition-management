import { describe, it, expect } from 'vitest';
import { getHomePathForRole } from '@/utils/permissions';

describe('getHomePathForRole', () => {
  it('sends students to the PWA app area', () => {
    expect(getHomePathForRole('STUDENT')).toBe('/app');
  });

  it('sends admins and teachers to the admin console', () => {
    expect(getHomePathForRole('ADMIN')).toBe('/admin');
    expect(getHomePathForRole('TEACHER')).toBe('/admin');
  });

  it('falls back to login for an unknown or missing role', () => {
    expect(getHomePathForRole(undefined)).toBe('/login');
    expect(getHomePathForRole('SOMETHING_ELSE')).toBe('/login');
  });
});
