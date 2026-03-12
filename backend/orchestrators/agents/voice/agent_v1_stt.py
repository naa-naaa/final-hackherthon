import whisper
import tempfile
import subprocess
import os


def _to_wav(audio_bytes: bytes) -> str:
    """Convert any audio format (webm/opus/etc.) to 16kHz mono WAV via ffmpeg."""
    in_path = tempfile.mktemp(suffix=".webm")
    out_path = tempfile.mktemp(suffix=".wav")
    try:
        with open(in_path, "wb") as f:
            f.write(audio_bytes)
        subprocess.run(
            ["ffmpeg", "-y", "-i", in_path, "-ar", "16000", "-ac", "1", out_path],
            capture_output=True, timeout=15,
        )
    finally:
        if os.path.exists(in_path):
            os.unlink(in_path)
    return out_path


class AgentV1STT:
    """Speech to Text using OpenAI Whisper"""

    def __init__(self):
        print("[V1] Loading Whisper model...")
        self.model = whisper.load_model("base")
        print("[V1] Whisper loaded")

    async def analyze(self, audio_bytes: bytes) -> dict:
        tmp_path = None
        try:
            tmp_path = _to_wav(audio_bytes)
            result = self.model.transcribe(tmp_path, language="en")
            return {
                "agent": "V1_stt",
                "transcript": result["text"].strip(),
                "language": result.get("language", "en"),
                "confidence": 0.90,
            }
        except Exception as e:
            print(f"[V1] STT error: {e}")
            return {"agent": "V1_stt", "transcript": "", "language": "en", "confidence": 0.0, "error": str(e)}
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
