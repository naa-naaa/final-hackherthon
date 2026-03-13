import React, { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Loader2, X, Image as ImageIcon, FileText, Mic, Square } from 'lucide-react';
import './ChatInput.css';

interface ChatInputProps {
  onSend: (text: string, fileUrl?: string, fileName?: string) => void;
  onSendVoice: (blob: Blob, duration: number) => void;
  onSendImage: (file: File) => void;
  disabled: boolean;
  cooldown: number;
  analyzing: boolean;
  editText?: string;
}

export default function ChatInput({
  onSend,
  onSendVoice,
  onSendImage,
  disabled,
  cooldown,
  analyzing,
  editText,
}: ChatInputProps) {
  const [text, setText] = useState(editText || '');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Sync text with editText prop (e.g. when editing a flagged message)
  React.useEffect(() => {
    if (editText !== undefined) {
      setText(editText);
    }
  }, [editText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if ((!trimmed && !fileDataUrl) || disabled || analyzing) return;
    onSend(trimmed || (fileName ?? 'Shared a file'), fileDataUrl ?? undefined, fileName ?? undefined);
    setText('');
    clearFile();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearFile = () => {
    setFileName(null);
    setFileDataUrl(null);
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 5MB for BroadcastChannel
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be under 5 MB');
      return;
    }

    setFileName(file.name);
    setFileType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      setFileDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Images should be analyzed immediately, not attached like files
    if (file.type.startsWith('image/')) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be under 10 MB');
        return;
      }
      onSendImage(file);
      if (imageInputRef.current) imageInputRef.current.value = '';
    } else {
      alert('Please select an image file');
    }
  };

  // ── Voice recording ──
  const startRecording = useCallback(async () => {
    if (disabled || analyzing || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        if (blob.size > 0 && duration >= 1) {
          onSendVoice(blob, duration);
        }
        chunksRef.current = [];
      };

      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = Date.now();
      mediaRecorder.start(250); // collect chunks every 250ms
      setRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 500);
    } catch {
      console.error('Microphone access denied');
    }
  }, [disabled, analyzing, recording, onSendVoice]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setRecording(false);
      setRecordingTime(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [recording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    chunksRef.current = [];
    setRecording(false);
    setRecordingTime(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const isImage = fileType?.startsWith('image/');

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      {disabled && cooldown > 0 && (
        <div className="cooldown-bar">
          <span className="cooldown-text font-mono">
            Input disabled · Cooldown: {String(Math.floor(cooldown / 60)).padStart(2, '0')}:{String(cooldown % 60).padStart(2, '0')}
          </span>
        </div>
      )}

      {fileDataUrl && (
        <div className="file-preview">
          <button type="button" className="file-preview-close" onClick={clearFile}>
            <X size={16} />
          </button>
          {isImage ? (
            <img src={fileDataUrl} alt={fileName || 'Preview'} className="file-preview-image" />
          ) : (
            <div className="file-preview-doc">
              <FileText size={24} />
              <span className="file-preview-name">{fileName}</span>
            </div>
          )}
        </div>
      )}
      
      <div className={`input-row ${disabled ? 'input-disabled' : ''}`}>
        {recording ? (
          /* ── Recording UI ── */
          <>
            <button
              type="button"
              className="voice-cancel-btn"
              onClick={cancelRecording}
              aria-label="Cancel recording"
            >
              <X size={18} />
            </button>
            <div className="recording-indicator">
              <span className="recording-dot" />
              <span className="recording-time font-mono">{formatTime(recordingTime)}</span>
              <span className="recording-label">Recording...</span>
            </div>
            <button
              type="button"
              className="voice-stop-btn"
              onClick={stopRecording}
              aria-label="Stop and send"
            >
              <Square size={14} fill="currentColor" />
            </button>
          </>
        ) : (
          /* ── Normal input UI ── */
          <>
            <button
              type="button"
              className="attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              aria-label="Attach file"
            >
              {fileDataUrl ? <ImageIcon size={18} /> : <Paperclip size={18} />}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,.pdf,.doc,.docx,.txt,.mp4,.webm"
            />
            
            <button
              type="button"
              className="attach-btn"
              onClick={() => imageInputRef.current?.click()}
              disabled={disabled || analyzing}
              aria-label="Send image"
              title="Send image for analysis"
            >
              <ImageIcon size={18} />
            </button>
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageSelect}
              style={{ display: 'none' }}
              accept="image/*"
            />
            
            <input
              type="text"
              className="message-input"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? 'Input disabled during cooldown...' : fileDataUrl ? 'Add a caption...' : 'Type a message...'}
              disabled={disabled}
              autoFocus
            />

            <button
              type="button"
              className="voice-btn"
              onClick={startRecording}
              disabled={disabled || analyzing}
              aria-label="Record voice message"
            >
              <Mic size={18} />
            </button>
            
            <button
              type="submit"
              className="send-btn"
              disabled={disabled || (!text.trim() && !fileDataUrl) || analyzing}
              aria-label="Send message"
            >
              {analyzing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span className="send-label">Analyzing...</span>
                </>
              ) : (
                <Send size={18} />
              )}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
