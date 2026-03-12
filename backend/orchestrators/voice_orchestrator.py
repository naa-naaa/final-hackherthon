import asyncio
import numpy as np
from typing import Optional

from orchestrators.agents.voice.agent_v1_stt import AgentV1STT
from orchestrators.agents.voice.agent_v2_acoustic import AgentV2Acoustic
from orchestrators.agents.voice.agent_v3_emotion import AgentV3VoiceEmotion
from orchestrators.text_orchestrator import TextOrchestrator


class VoiceOrchestrator:
    """
    Voice Orchestrator.
    Receives audio → dispatches V1 (STT), V2 (Acoustic), V3 (Emotion) in parallel
    → runs transcript through Text Orchestrator → fuses all scores.
    """

    def __init__(self, text_orchestrator: TextOrchestrator):
        print("[VoiceOrch] Initializing voice agents...")
        self.text_orchestrator = text_orchestrator
        self.v1 = AgentV1STT()
        self.v2 = AgentV2Acoustic()
        self.v3 = AgentV3VoiceEmotion()
        print("[VoiceOrch] All voice agents ready")

        # Fusion weights
        self.W_TEXT = 0.40
        self.W_ACOUSTIC = 0.30
        self.W_EMOTION = 0.30

        self.THRESHOLD_ALLOW = 0.40
        self.THRESHOLD_BLOCK = 0.80

    async def analyze(
        self,
        audio_bytes: bytes,
        sender: str = "",
        receiver: str = "",
        strike_count: int = 0,
    ) -> dict:
        # Dispatch V1 (STT), V2 (Acoustic), V3 (Emotion) in parallel
        v1_result, v2_result, v3_result = await asyncio.gather(
            self.v1.analyze(audio_bytes),
            self.v2.analyze(audio_bytes),
            self.v3.analyze(audio_bytes),
        )

        transcript = v1_result.get("transcript", "")

        # Run transcript through text orchestrator for toxicity analysis
        text_result = {
            "harm_score": 0.0, "category": "safe", "severity": "none",
            "action": "allow", "agent_scores": {"toxicity": 0.0, "context": 0.0, "emotion": 0.0},
            "explanation": "", "women_risk_flag": False, "victim_distress_flag": False,
        }
        if transcript.strip():
            text_result = await self.text_orchestrator.analyze(
                text=transcript, sender=sender, strike_count=strike_count,
            )

        # Fuse scores
        text_score = text_result["harm_score"]
        acoustic_score = v2_result.get("score", 0.0)
        emotion_score = v3_result.get("distress_score", v3_result.get("score", 0.0))

        fused = (
            self.W_TEXT * text_score
            + self.W_ACOUSTIC * acoustic_score
            + self.W_EMOTION * emotion_score
        )

        # Boost for high anger + toxic transcript
        anger = v3_result.get("anger_probability", 0.0)
        if anger > 0.6 and text_score > 0.5:
            fused += 0.10

        # Boost for volume spikes + toxic content
        vol_spike = v2_result.get("volume_spike", 1.0)
        if vol_spike > 3.0 and text_score > 0.4:
            fused += 0.05

        fused = float(np.clip(fused, 0.0, 1.0))

        # Determine action
        if strike_count >= 3:
            action = "block"
        elif fused < self.THRESHOLD_ALLOW:
            action = "allow"
        elif fused < self.THRESHOLD_BLOCK:
            action = "alert"
        else:
            action = "block"

        # Severity
        if fused < 0.40:
            severity = "none"
        elif fused < 0.65:
            severity = "low"
        elif fused < 0.80:
            severity = "medium"
        else:
            severity = "high"

        category = text_result.get("category", "safe")
        if fused < self.THRESHOLD_ALLOW:
            category = "safe"

        # Build explanation
        parts = []
        if text_score > 0.5:
            parts.append(f"Transcript toxicity: {text_score:.0%}")
        if acoustic_score > 0.4:
            parts.append(f"Acoustic aggression: {acoustic_score:.0%}")
        if emotion_score > 0.3:
            dominant = v3_result.get("emotion", "unknown")
            parts.append(f"Voice emotion: {dominant} ({emotion_score:.0%})")
        if anger > 0.5:
            parts.append(f"Anger detected: {anger:.0%}")
        explanation = "; ".join(parts) if parts else "Voice message analyzed"

        return {
            "harm_score": fused,
            "action": action,
            "category": category,
            "severity": severity,
            "transcript": transcript,
            "explanation": explanation,
            "women_risk_flag": text_result.get("women_risk_flag", False),
            "victim_distress_flag": text_result.get("victim_distress_flag", False) or v3_result.get("fear_probability", 0.0) > 0.5,
            "agent_scores": {
                "v1_stt_confidence": v1_result.get("confidence", 0.0),
                "v2_acoustic": acoustic_score,
                "v3_emotion": emotion_score,
                "text_toxicity": text_result.get("agent_scores", {}).get("toxicity", 0.0),
                "text_context": text_result.get("agent_scores", {}).get("context", 0.0),
                "text_emotion": text_result.get("agent_scores", {}).get("emotion", 0.0),
            },
            "acoustic_flags": {
                "avg_pitch": v2_result.get("avg_pitch", 0.0),
                "volume_spike": vol_spike,
                "speech_rate": v2_result.get("speech_rate", 0.0),
                "aggression_score": acoustic_score,
            },
            "voice_emotion": {
                "dominant": v3_result.get("emotion", "unknown"),
                "anger": anger,
                "fear": v3_result.get("fear_probability", 0.0),
                "distress": emotion_score,
            },
        }
