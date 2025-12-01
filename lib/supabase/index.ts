// Re-export Supabase client utilities for easier imports
export { createClient as createBrowserClient } from './client';
export { createClient as createServerClient } from './server';
export { updateSession } from './middleware';
export {
  getCurrentUserProfile,
  getCurrentUserId,
  isAdmin,
  hasRole,
} from './utils';
