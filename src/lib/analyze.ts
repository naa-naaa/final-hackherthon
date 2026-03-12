import { AnalyzeRequest, AnalyzeResponse } from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const ANALYZE_URL = `${API_BASE_URL}/analyze`;
const TIMEOUT_MS = 3000;

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
