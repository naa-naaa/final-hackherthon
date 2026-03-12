import librosa
import numpy as np
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


class AgentV2Acoustic:
    """Acoustic feature analysis using librosa"""

    def __init__(self):
        print("[V2] Acoustic analyzer ready")

    async def analyze(self, audio_bytes: bytes) -> dict:
        tmp_path = None
        try:
            tmp_path = _to_wav(audio_bytes)
            y, sr = librosa.load(tmp_path, sr=None)

            pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
            pitch_values = pitches[magnitudes > np.median(magnitudes)]
            avg_pitch = float(np.mean(pitch_values)) if len(pitch_values) > 0 else 0.0

            rms = librosa.feature.rms(y=y)[0]
            avg_volume = float(np.mean(rms))
            volume_spike = float(np.max(rms)) / (avg_volume + 1e-8)

            zcr = librosa.feature.zero_crossing_rate(y)[0]
            speech_rate = float(np.mean(zcr))

            aggression_score = 0.0
            if avg_pitch > 250:
                aggression_score += 0.30
            if volume_spike > 3.0:
                aggression_score += 0.35
            if speech_rate > 0.15:
                aggression_score += 0.20
            if avg_volume > 0.05:
                aggression_score += 0.15

            return {
                "agent": "V2_acoustic",
                "score": float(np.clip(aggression_score, 0.0, 1.0)),
                "avg_pitch": avg_pitch,
                "avg_volume": avg_volume,
                "volume_spike": volume_spike,
                "speech_rate": speech_rate,
                "explanation": f"Pitch:{avg_pitch:.0f}Hz, Volume spike:{volume_spike:.1f}x",
            }
        except Exception as e:
            print(f"[V2] Acoustic error: {e}")
            return {"agent": "V2_acoustic", "score": 0.0, "error": str(e)}
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
