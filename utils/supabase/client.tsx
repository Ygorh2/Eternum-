import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Singleton instance - criado apenas uma vez
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);
