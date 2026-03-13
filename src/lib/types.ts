export interface Message {
  id: string;
  sender: string;
  receiver: string;
  content: string;
  status: 'sent' | 'flagged' | 'blocked';
  harm_score: number | null;
  category: string | null;
  timestamp: string;
  file_url?: string;
  file_name?: string;
  group_id?: string;
  shadow_banned?: boolean;
  audio_url?: string;
  audio_duration?: number;
}

export interface Group {
  id: string;
  name: string;
  members: string[];
  avatar_color: string;
}

export interface User {
  username: string;
  strike_count: number;
  status: 'active' | 'warned' | 'restricted';
}

export interface Incident {
  id: string;
  sender: string;
  receiver: string;
  content: string;
  action: 'allow' | 'alert' | 'block';
  harm_score: number;
  category: string;
  agent_t1: number | null;
  agent_t2: number | null;
  agent_t3: number | null;
  timestamp: string;
  ip_address?: string;
}

export interface AnalyzeRequest {
  text: string;
  sender: string;
  receiver: string;
  thread_id: string;
  timestamp: string;
  thread_history: string[];
}

export interface AnalyzeResponse {
  action: 'allow' | 'alert' | 'block';
  harm_score: number;
  category: string;
  agent_scores?: {
    t1_toxicity: number;
    t2_context: number;
    t3_emotion: number;
  };
}

export interface VoiceAnalyzeResponse {
  action: 'allow' | 'alert' | 'block';
  harm_score: number;
  category: string;
  severity: string;
  transcript: string;
  explanation: string;
  strike_count: number;
  incident_id: string;
  agent_scores?: Record<string, number>;
  acoustic_flags?: Record<string, number>;
  voice_emotion?: Record<string, unknown>;
  women_risk_flag?: boolean;
}

export interface ImageAnalyzeResponse {
  action: 'allow' | 'alert' | 'block';
  harm_score: number;
  category: string;
  severity: string;
  explanation: string;
  detected_text: string | null;
  visual_flags: {
    has_violence: boolean;
    has_weapons: boolean;
    has_hate_content: boolean;
    has_bullying: boolean;
  };
  nsfw_flags: {
    is_explicit: boolean;
    severity: number;
    body_parts: string[];
  };
  agent_scores: {
    i1_text_harm: number;
    i2_visual_harm: number;
    i3_nsfw_severity: number;
  };
  incident_id: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'flagged' | 'blocked' | 'strike';
  timestamp: string;
  read: boolean;
}

export type AlertLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export type AdminSection = 'feed' | 'predators' | 'victims' | 'women' | 'analytics' | 'evidence' | 'emergency' | 'rehabilitation' | 'cybercrime' | 'health';

export interface ChatTarget {
  type: 'user' | 'group';
  id: string;
  name: string;
}
