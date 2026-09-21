import { supabase } from '../lib/supabase';
import { FullAppData } from '../types';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface DatabaseSyncState {
  status: 'connecting' | 'connected' | 'syncing' | 'synced' | 'error' | 'offline';
  lastSyncedAt: string | null;
  errorMessage: string | null;
  isAnonymous: boolean;
  /** Firebase Auth user — kept for UI components that display user info (email, displayName, uid) */
  currentUser?: {
    uid: string;
    email: string | null;
    displayName: string | null;
    isAnonymous: boolean;
  } | null;
}

// ──────────────────────────────────────────────
// Real-time subscription
// ──────────────────────────────────────────────

/**
 * Subscribes to real-time changes for a user's app data in Supabase.
 * Returns an unsubscribe function.
 */
export function subscribeToUserData(
  userId: string,
  onUpdate: (data: FullAppData) => void,
  onStatusChange: (state: DatabaseSyncState) => void
): () => void {
  if (!userId) return () => {};

  onStatusChange({ status: 'connecting', lastSyncedAt: null, errorMessage: null, isAnonymous: false });

  const channel = supabase
    .channel(`app_data:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_data',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as { data: FullAppData } | undefined;
        if (row?.data) {
          onUpdate(row.data);
          onStatusChange({
            status: 'synced',
            lastSyncedAt: new Date().toLocaleTimeString(),
            errorMessage: null,
            isAnonymous: false,
          });
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        onStatusChange({ status: 'connected', lastSyncedAt: null, errorMessage: null, isAnonymous: false });
      } else if (status === 'CHANNEL_ERROR') {
        onStatusChange({
          status: 'error',
          lastSyncedAt: null,
          errorMessage: 'Supabase Realtime connection error',
          isAnonymous: false,
        });
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

// ──────────────────────────────────────────────
// Save & Load user data
// ──────────────────────────────────────────────

/**
 * Saves the full application data to Supabase under `app_data` table.
 */
export async function saveUserData(
  userId: string,
  appData: FullAppData
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'No user ID provided' };

  const { error } = await supabase
    .from('app_data')
    .upsert(
      { user_id: userId, data: appData, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[Supabase] saveUserData failed:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Loads the user data once from Supabase.
 */
export async function loadUserData(userId: string): Promise<FullAppData | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('app_data')
    .select('data')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No row found — not an error
    console.error('[Supabase] loadUserData failed:', error.message);
    return null;
  }

  return (data?.data as FullAppData) ?? null;
}

// ──────────────────────────────────────────────
// Study Room sync (shared code between devices)
// ──────────────────────────────────────────────

/**
 * Saves a cloud study room to Supabase by room code.
 */
export async function saveStudyRoom(
  roomCode: string,
  appData: FullAppData,
  userId: string
): Promise<{ success: boolean; message: string }> {
  const code = roomCode.trim().toUpperCase();
  if (!code) return { success: false, message: 'Le code ne peut pas être vide' };

  const { error } = await supabase
    .from('study_rooms')
    .upsert(
      {
        room_code: code,
        data: appData,
        owner_id: userId || 'anonymous',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'room_code' }
    );

  if (error) {
    console.error('[Supabase] saveStudyRoom failed:', error.message);
    return { success: false, message: `Erreur Supabase: ${error.message}` };
  }

  return {
    success: true,
    message: `Données sauvegardées dans la salle Cloud [${code}] sur Supabase avec succès !`,
  };
}

/**
 * Loads a cloud study room from Supabase by room code.
 */
export async function loadStudyRoom(
  roomCode: string
): Promise<{ success: boolean; data?: FullAppData; message: string }> {
  const code = roomCode.trim().toUpperCase();
  if (!code) return { success: false, message: 'Le code ne peut pas être vide' };

  const { data, error } = await supabase
    .from('study_rooms')
    .select('data')
    .eq('room_code', code)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return {
        success: false,
        message: `Aucune salle trouvée avec le code [${code}] dans la base de données.`,
      };
    }
    console.error('[Supabase] loadStudyRoom failed:', error.message);
    return { success: false, message: `Erreur de connexion Supabase: ${error.message}` };
  }

  return {
    success: true,
    data: data?.data as FullAppData,
    message: `Données restaurées depuis la base Supabase [${code}] !`,
  };
}
