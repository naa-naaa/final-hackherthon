import { Message, Incident, Notification, Group } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

// ── localStorage persistence helpers ──
const LS_MESSAGES_KEY = 'cybershield_messages';
const LS_INCIDENTS_KEY = 'cybershield_incidents';
const LS_NOTIFICATIONS_KEY = 'cybershield_notifications';
const LS_STRIKES_KEY = 'cybershield_strikes';
const LS_WARNING_COUNT_KEY = 'cybershield_warnings';

function loadFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveToStorage<T>(key: string, data: T[]) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
}

// ── Local state (used when Supabase not configured) ──
let localMessages: Message[] = loadFromStorage<Message>(LS_MESSAGES_KEY);
let localIncidents: Incident[] = loadFromStorage<Incident>(LS_INCIDENTS_KEY);
const messageListeners: Set<() => void> = new Set();
const incidentListeners: Set<(incident: Incident) => void> = new Set();

function notifyMessageListeners() {
  messageListeners.forEach(fn => fn());
}

// ── Strike / warning persistence ──
export function getPersistedStrikes(user: string): number {
  try {
    const map = JSON.parse(localStorage.getItem(LS_STRIKES_KEY) || '{}');
    return map[user] || 0;
  } catch { return 0; }
}

export function setPersistedStrikes(user: string, count: number) {
  try {
    const map = JSON.parse(localStorage.getItem(LS_STRIKES_KEY) || '{}');
    map[user] = count;
    localStorage.setItem(LS_STRIKES_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

export function getWarningCount(user: string): number {
  try {
    const map = JSON.parse(localStorage.getItem(LS_WARNING_COUNT_KEY) || '{}');
    return map[user] || 0;
  } catch { return 0; }
}

export function setWarningCount(user: string, count: number) {
  try {
    const map = JSON.parse(localStorage.getItem(LS_WARNING_COUNT_KEY) || '{}');
    map[user] = count;
    localStorage.setItem(LS_WARNING_COUNT_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

// ── Notification persistence ──
export function getPersistedNotifications(): Notification[] {
  return loadFromStorage<Notification>(LS_NOTIFICATIONS_KEY);
}

export function persistNotifications(notifications: Notification[]) {
  saveToStorage(LS_NOTIFICATIONS_KEY, notifications);
}

// ── Auth helpers ──
const VALID_USERS: Record<string, string> = {
  arjun: 'arjun',
  priya: 'priya',
  rahul: 'rahul',
  deepa: 'deepa',
  vikram: 'vikram',
  ananya: 'ananya',
  karthik: 'karthik',
  meera: 'meera',
  suresh: 'suresh',
  kavitha: 'kavitha',
  admin: 'admin123',
};

// ── Groups ──
const GROUPS: Group[] = [
  {
    id: 'grp_college_friends',
    name: 'College Friends',
    members: ['arjun', 'priya', 'rahul', 'deepa', 'vikram', 'ananya'],
    avatar_color: '#3B82F6',
  },
  {
    id: 'grp_project_team',
    name: 'Project Team',
    members: ['karthik', 'meera', 'suresh', 'kavitha', 'arjun'],
    avatar_color: '#8B5CF6',
  },
];

export function getGroups(currentUser: string): Group[] {
  return GROUPS.filter(g => g.members.includes(currentUser));
}

export function getGroupById(groupId: string): Group | undefined {
  return GROUPS.find(g => g.id === groupId);
}

export function login(username: string, password: string): boolean {
  if (VALID_USERS[username] && VALID_USERS[username] === password) {
    sessionStorage.setItem('cybershield_user', username);
    return true;
  }
  return false;
}

export function logout() {
  sessionStorage.removeItem('cybershield_user');
}

export function getCurrentUser(): string | null {
  return sessionStorage.getItem('cybershield_user');
}

export function getOtherUsers(currentUser: string): string[] {
  return Object.keys(VALID_USERS).filter(u => u !== currentUser && u !== 'admin');
}

// ── Message Buffer Detection ──
// Detects split-letter harmful messages like "f","u","c","k" sent separately
const MESSAGE_BUFFER_WINDOW_MS = 60_000; // 60 seconds window
const messageBuffers: Map<string, { texts: string[]; timestamps: number[] }> = new Map();

const HARMFUL_PATTERNS: string[] = [
  'fuck', 'fck', 'fuk', 'fuq',
  'shit', 'sht',
  'bitch', 'btch', 'bich',
  'ass', 'a55',
  'dick', 'dik', 'dck',
  'damn', 'dmn',
  'hell',
  'kill', 'kll',
  'die', 'dy',
  'rape',
  'slut', 'slt',
  'whore', 'whor', 'hore',
  'bastard', 'bstrd',
  'idiot', 'idi0t',
  'stupid', 'stpd',
  'hate', 'h8',
  'cunt', 'cnt',
  'nigger', 'n1gger',
  'wtf', 'wth', 'stfu',
  'kys',
  'go to hell', 'gotohe11',
  'motherfucker', 'mf',
];

/**
 * Accumulates single-char / short messages from a sender in a conversation
 * and checks if their concatenation forms a harmful word.
 * Returns the detected harmful phrase or null.
 */
export function detectSplitMessage(
  sender: string, 
  receiver: string, 
  newText: string
): { detected: boolean; phrase: string; category: string } | null {
  const key = `${sender}_${receiver}`;
  const now = Date.now();
  const trimmed = newText.trim().toLowerCase();

  // Only buffer short messages (1-3 characters)
  if (trimmed.length > 3) {
    messageBuffers.delete(key);
    return null;
  }

  let buffer = messageBuffers.get(key);
  if (!buffer) {
    buffer = { texts: [], timestamps: [] };
    messageBuffers.set(key, buffer);
  }

  // Remove messages older than the window
  while (buffer.timestamps.length > 0 && now - buffer.timestamps[0] > MESSAGE_BUFFER_WINDOW_MS) {
    buffer.texts.shift();
    buffer.timestamps.shift();
  }

  buffer.texts.push(trimmed);
  buffer.timestamps.push(now);

  // Check all contiguous subsequences of the buffer
  const combined = buffer.texts.join('');
  for (const pattern of HARMFUL_PATTERNS) {
    if (combined.includes(pattern)) {
      // Found a match — clear buffer and return detection
      messageBuffers.delete(key);
      return {
        detected: true,
        phrase: combined,
        category: 'Split-letter abuse / Evasion attempt',
      };
    }
  }

  // Also check sliding windows within the buffer
  for (let start = 0; start < buffer.texts.length; start++) {
    let sub = '';
    for (let end = start; end < buffer.texts.length; end++) {
      sub += buffer.texts[end];
      for (const pattern of HARMFUL_PATTERNS) {
        if (sub.includes(pattern)) {
          messageBuffers.delete(key);
          return {
            detected: true,
            phrase: sub,
            category: 'Split-letter abuse / Evasion attempt',
          };
        }
      }
    }
  }

  return null;
}

// ── Message helpers ──
function getConversationKey(user1: string, user2: string): string {
  return [user1, user2].sort().join('_');
}

export async function getMessages(user1: string, user2: string): Promise<Message[]> {
  if (isSupabaseConfigured()) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender.eq.${user1},receiver.eq.${user2}),and(sender.eq.${user2},receiver.eq.${user1})`)
      .order('timestamp', { ascending: true });
    return data || [];
  }
  
  return localMessages.filter(
    m => {
      const inConversation = (m.sender === user1 && m.receiver === user2) ||
           (m.sender === user2 && m.receiver === user1);
      if (!inConversation) return false;
      // Shadow ban: hide from receiver, show to sender
      if (m.shadow_banned && m.sender !== user1) return false;
      return true;
    }
  );
}

export async function getGroupMessages(groupId: string): Promise<Message[]> {
  if (isSupabaseConfigured()) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
      .order('timestamp', { ascending: true });
    return data || [];
  }
  
  const currentUser = getCurrentUser();
  return localMessages.filter(m => {
    if (m.group_id !== groupId) return false;
    // Shadow ban: hide from everyone except sender
    if (m.shadow_banned && m.sender !== currentUser) return false;
    return true;
  });
}

export async function sendMessage(message: Omit<Message, 'id'>): Promise<Message> {
  const newMsg: Message = {
    ...message,
    id: crypto.randomUUID(),
  };

  if (isSupabaseConfigured()) {
    const { data } = await supabase
      .from('messages')
      .insert(newMsg)
      .select()
      .single();
    return data || newMsg;
  }

  localMessages.push(newMsg);
  saveToStorage(LS_MESSAGES_KEY, localMessages);
  notifyMessageListeners();
  // Broadcast to other tabs via BroadcastChannel
  try {
    const bc = new BroadcastChannel('cybershield_messages');
    bc.postMessage({ type: 'new_message', message: newMsg });
    bc.close();
  } catch (e) { /* ignore */ }
  return newMsg;
}

export function getLastMessage(user1: string, user2: string): Message | null {
  const msgs = localMessages.filter(
    m => {
      const inConversation = (m.sender === user1 && m.receiver === user2) ||
           (m.sender === user2 && m.receiver === user1);
      if (!inConversation) return false;
      // Shadow ban: hide from receiver's view
      if (m.shadow_banned && m.sender !== user1) return false;
      return true;
    }
  );
  return msgs.length > 0 ? msgs[msgs.length - 1] : null;
}

export function subscribeToMessages(callback: () => void): () => void {
  messageListeners.add(callback);
  
  // Also listen for cross-tab messages
  const bc = new BroadcastChannel('cybershield_messages');
  const handler = (event: MessageEvent) => {
    if (event.data.type === 'new_message') {
      const msg = event.data.message as Message;
      // Only add if not already present
      if (!localMessages.find(m => m.id === msg.id)) {
        localMessages.push(msg);
        saveToStorage(LS_MESSAGES_KEY, localMessages);
        callback();
      }
    }
  };
  bc.addEventListener('message', handler);
  
  return () => {
    messageListeners.delete(callback);
    bc.removeEventListener('message', handler);
    bc.close();
  };
}

// ── Incident helpers ──
export async function createIncident(incident: Omit<Incident, 'id'>): Promise<Incident> {
  const newIncident: Incident = {
    ...incident,
    id: crypto.randomUUID(),
  };

  if (isSupabaseConfigured()) {
    const { data } = await supabase
      .from('incidents')
      .insert(newIncident)
      .select()
      .single();
    return data || newIncident;
  }

  localIncidents.push(newIncident);
  saveToStorage(LS_INCIDENTS_KEY, localIncidents);
  incidentListeners.forEach(fn => fn(newIncident));
  // Broadcast to other tabs
  try {
    const bc = new BroadcastChannel('cybershield_incidents');
    bc.postMessage({ type: 'new_incident', incident: newIncident });
    bc.close();
  } catch (e) { /* ignore */ }
  return newIncident;
}

export function getIncidents(): Incident[] {
  return [...localIncidents].reverse();
}

export function subscribeToIncidents(callback: (incident: Incident) => void): () => void {
  incidentListeners.add(callback);
  
  const bc = new BroadcastChannel('cybershield_incidents');
  const handler = (event: MessageEvent) => {
    if (event.data.type === 'new_incident') {
      const incident = event.data.incident as Incident;
      if (!localIncidents.find(i => i.id === incident.id)) {
        localIncidents.push(incident);
        saveToStorage(LS_INCIDENTS_KEY, localIncidents);
        callback(incident);
      }
    }
  };
  bc.addEventListener('message', handler);
  
  return () => {
    incidentListeners.delete(callback);
    bc.removeEventListener('message', handler);
    bc.close();
  };
}

// ── Notification generation ──
export function generateNotification(
  action: 'alert' | 'block',
  sender: string,
  receiver: string,
  category: string,
  strikeCount: number
): Notification {
  let message = '';
  if (action === 'alert') {
    message = `Your message to ${receiver} was flagged for ${category}`;
  } else {
    message = `Message blocked — Strike ${strikeCount} of 3`;
  }
  return {
    id: crypto.randomUUID(),
    message,
    type: action === 'block' ? 'blocked' : 'flagged',
    timestamp: new Date().toISOString(),
    read: false,
  };
}

// ── Evidence export ──
export function generateEvidenceReport(incident: Incident): string {
  const today = new Date().toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  return `CYBER CRIME COMPLAINT
━━━━━━━━━━━━━━━━━━━━━
Date: ${today}
Case ID: CS-${incident.id.slice(0, 8).toUpperCase()}
Platform: SafeChat Demo
Perpetrator ID: ${incident.sender}
Victim ID: ${incident.receiver}
Incident Type: ${incident.category}
Harm Score: ${incident.harm_score}
Action Taken: ${incident.action.toUpperCase()}

Message Content:
"${incident.content}"

Agent Analysis:
  T1 Toxicity:  ${incident.agent_t1?.toFixed(2) ?? 'N/A'}
  T2 Context:   ${incident.agent_t2?.toFixed(2) ?? 'N/A'}
  T3 Emotion:   ${incident.agent_t3?.toFixed(2) ?? 'N/A'}
  Final Score:  ${incident.harm_score.toFixed(2)}

Timestamp: ${new Date(incident.timestamp).toLocaleString('en-IN')}
━━━━━━━━━━━━━━━━━━━━━
Submit at: cybercrime.gov.in
Helpline: 1930
iCall: 9152987821
Vandrevala Foundation: 1860-2662-345`;
}
