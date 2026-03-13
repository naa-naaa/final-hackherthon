import { ImageAnalyzeResponse } from './types';

const IMAGE_TIMEOUT_MS = 60000; // 60 seconds for image analysis

export async function analyzeImage(imageFile: File, sender: string, receiver: string, threadId: string): Promise<ImageAnalyzeResponse | null> {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('sender', sender);
    formData.append('receiver', receiver);
    formData.append('thread_id', threadId);
    formData.append('platform', 'SafeChat');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

    const response = await fetch('/api/analyze/image', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Image analysis failed: ${response.status}`);
      return null;
    }

    const result: ImageAnalyzeResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Image analysis error:', error);
    return null;
  }
}
