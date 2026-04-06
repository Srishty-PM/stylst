import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Generate a stable device ID (persisted in localStorage)
function getDeviceId(): string {
  const key = 'stylst_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

// Generate a session ID (persisted in sessionStorage)
function getSessionId(): string {
  const key = 'stylst_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

type EventType =
  | 'page_view'
  | 'session_start'
  | 'session_end'
  | 'signup'
  | 'login'
  | 'outfit_created'
  | 'photo_uploaded'
  | 'step_completed'
  | 'match_started'
  | 'look_saved';

const deviceId = getDeviceId();
const sessionId = getSessionId();

// Track session start once per session
const SESSION_START_KEY = 'stylst_session_started';
if (!sessionStorage.getItem(SESSION_START_KEY)) {
  sessionStorage.setItem(SESSION_START_KEY, '1');
  supabase.from('analytics_events').insert({
    device_id: deviceId,
    session_id: sessionId,
    event_type: 'session_start',
    page_path: window.location.pathname,
  }).then(() => {});
}

// Flush session_end on tab close
const sessionStartTime = Date.now();
window.addEventListener('beforeunload', () => {
  const duration = Math.round((Date.now() - sessionStartTime) / 1000);
  const body = JSON.stringify({
    device_id: deviceId,
    session_id: sessionId,
    event_type: 'session_end',
    event_data: { duration_seconds: duration },
    page_path: window.location.pathname,
  });
  // Use sendBeacon for reliable delivery on page close
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/analytics_events`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    'Prefer': 'return=minimal',
  };
  try {
    navigator.sendBeacon(
      url,
      new Blob([body], { type: 'application/json' })
    );
  } catch {
    // fallback — best effort
    fetch(url, { method: 'POST', headers, body, keepalive: true }).catch(() => {});
  }
});

export function useAnalytics() {
  const { user } = useAuth();

  const track = useCallback(
    (eventType: EventType, eventData?: Record<string, unknown>) => {
      supabase
        .from('analytics_events')
        .insert({
          user_id: user?.id ?? null,
          device_id: deviceId,
          session_id: sessionId,
          event_type: eventType,
          event_data: eventData ?? {},
          page_path: window.location.pathname,
        })
        .then(() => {});
    },
    [user?.id]
  );

  return { track, deviceId, sessionId };
}

// Hook for automatic page view tracking
export function usePageView(pageName: string) {
  const { track } = useAnalytics();
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      track('page_view', { page: pageName });
    }
  }, [pageName, track]);
}
