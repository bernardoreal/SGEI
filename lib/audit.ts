import { supabase } from './supabase';

export async function logAudit(
  userId: string,
  action: string,
  tableName: string,
  recordId: string | null,
  oldData: any = null,
  newData: any = null
) {
  if (!supabase || typeof supabase.from !== 'function') {
    console.warn('Supabase not configured. Audit log skipped:', action);
    return;
  }

  const { error } = await supabase.from('audit_log').insert({
    user_id: userId,
    action,
    table_name: tableName,
    record_id: recordId,
    old_data: oldData,
    new_data: newData,
  });

  if (error) {
    console.error('Error logging audit:', error);
  }
}
