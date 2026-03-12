import { AnalyzeRequest, AnalyzeResponse, VoiceAnalyzeResponse } from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const ANALYZE_URL = `${API_BASE_URL}/analyze`;
const ANALYZE_VOICE_URL = `${API_BASE_URL}/analyze/voice`;
const TIMEOUT_MS = 3000;
const VOICE_TIMEOUT_MS = 30000;

export async function analyzeMessage(request: AnalyzeRequest): Promise<AnalyzeResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ANALYZE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Analyze API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.warn('Analyze API timeout — falling back to allow');
    } else {
      console.error('Analyze API error:', error);
    }
    return null;
  }
}

export async function analyzeVoice(
  audioBlob: Blob,
  sender: string,
  receiver: string,
): Promise<VoiceAnalyzeResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VOICE_TIMEOUT_MS);

  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('sender', sender);
    formData.append('receiver', receiver);

    const response = await fetch(ANALYZE_VOICE_URL, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Voice analyze API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.warn('Voice analyze API timeout');
    } else {
      console.error('Voice analyze API error:', error);
    }
    return null;
  }
}
