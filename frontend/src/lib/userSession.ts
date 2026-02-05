// User session management for multi-tenant isolation
// Each visitor gets a unique session ID stored in localStorage

const SESSION_KEY = 'leadspilot_session_id';

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get the current session ID from localStorage
 * Returns null if no session exists
 */
export function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

/**
 * Create a new session and store it in localStorage
 * Returns the new session ID
 */
export function createSession(): string {
  const sessionId = generateUUID();
  localStorage.setItem(SESSION_KEY, sessionId);
  return sessionId;
}

/**
 * Get existing session or create a new one
 */
export function getOrCreateSession(): string {
  const existing = getSessionId();
  if (existing) return existing;
  return createSession();
}

/**
 * Clear the current session (logout)
 */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Check if a session exists
 */
export function hasSession(): boolean {
  return getSessionId() !== null;
}
