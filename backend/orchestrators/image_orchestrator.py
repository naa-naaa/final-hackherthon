import asyncio
import numpy as np
from typing import Optional

from orchestrators.agents.image.agent_i1_ocr import AgentI1OCR
from orchestrators.agents.image.agent_i2_visual import AgentI2Visual
from orchestrators.agents.image.agent_i3_nsfw import AgentI3NSFW
from orchestrators.text_orchestrator import TextOrchestrator


class ImageOrchestrator:
    """
    Image Orchestrator.
    Receives image bytes and runs I1/I2/I3 agents in parallel.
    I1 extracts text → fed to TextOrchestrator for harm detection
    I2 analyzes visual content → harm score
    I3 detects NSFW/explicit content → severity score
    Fuses all scores into final action.
    """

    def __init__(self, text_orchestrator: TextOrchestrator):
        print("[Image Orchestrator] Initializing image agents...")
        self.i1 = AgentI1OCR()
        self.i2 = AgentI2Visual()
        self.i3 = AgentI3NSFW()
        self.text_orchestrator = text_orchestrator
        print("[Image Orchestrator] All image agents ready")

        # Score weights
        self.W_I1_TEXT = 0.35   # OCR text harm (fed to text orchestrator)
        self.W_I2_VISUAL = 0.30  # Visual harm detection
        self.W_I3_NSFW = 0.35    # NSFW/explicit severity
        
        # Action thresholds
        self.THRESHOLD_ALLOW = 0.35  # Lower threshold to catch more harmful content
        self.THRESHOLD_BLOCK = 0.75   # More aggressive blocking threshold

    def _fuse_scores(self, i1_harm: float, i2_score: float, i3_score: float) -> float:
        """
        Fuse scores from all three agents.
        i1_harm comes from text analysis of extracted OCR text.
        i2_score is visual harm detection confidence.
        i3_score is NSFW severity.
        """
        fused = (
            self.W_I1_TEXT * i1_harm +
            self.W_I2_VISUAL * i2_score +
            self.W_I3_NSFW * i3_score
        )
        return float(np.clip(fused, 0.0, 1.0))

    def _determine_action(self, score: float) -> str:
        """Determine action based on fused score."""
        if score < self.THRESHOLD_ALLOW:
            return "allow"
        elif score < self.THRESHOLD_BLOCK:
            return "alert"
        return "block"

    async def analyze(
        self,
        image_bytes: bytes,
        sender: str = "",
        receiver: str = "",
        thread_id: str = "default",
        timestamp: str = "",
        strike_count: int = 0,
    ) -> dict:
        """
        Analyze image through all three agents.
        
        Args:
            image_bytes: Raw image bytes
            sender: Sender user ID
            receiver: Receiver user ID
            thread_id: Conversation thread ID
            timestamp: ISO timestamp
            strike_count: User's current strike count
            
        Returns:
            {
                "harm_score": float,
                "action": "allow" | "alert" | "block",
                "category": str,
                "severity": "none" | "low" | "medium" | "high",
                "explanation": str,
                "detected_text": str,
                "visual_flags": {
                    "has_violence": bool,
                    "has_weapons": bool,
                    "has_hate_content": bool,
                    "has_bullying": bool,
                },
                "nsfw_flags": {
                    "is_explicit": bool,
                    "severity": float,
                    "body_parts": [str],
                },
                "agent_scores": {
                    "i1_text_harm": float,
                    "i2_visual_harm": float,
                    "i3_nsfw_severity": float,
                },
                "agent_details": {
                    "i1": dict,
                    "i2": dict,
                    "i3": dict,
                },
            }
        """
        
        # Run all three image agents in parallel
        i1_result, i2_result, i3_result = await asyncio.gather(
            self.i1.analyze(image_bytes),
            self.i2.analyze(image_bytes),
            self.i3.analyze(image_bytes),
        )

        # ── Agent I1: OCR text extraction → Text Orchestrator ──
        extracted_text = i1_result.get("extracted_text", "")
        i1_harm_score = 0.0
        
        if extracted_text and len(extracted_text) > 3:
            # Feed extracted text to TextOrchestrator for harm detection
            text_analysis = await self.text_orchestrator.analyze(
                text=extracted_text,
                thread_history=[],
                sender=sender,
                strike_count=0,  # Don't use strike_count for image OCR
            )
            i1_harm_score = text_analysis.get("harm_score", 0.0)
            print(f"[Image Orchestrator] OCR text harm: {i1_harm_score:.2f} (text: '{extracted_text[:40]}...')")
        else:
            print(f"[Image Orchestrator] No meaningful OCR text found")

        # ── Agent I2: Visual harm detection ──
        i2_score = i2_result.get("score", 0.0)
        i2_categories = i2_result.get("categories", [])
        
        visual_flags = {
            "has_violence": "violence" in i2_categories,
            "has_weapons": "weapons" in i2_categories,
            "has_hate_content": "hate" in i2_categories,
            "has_bullying": ("bullying" in i2_categories or "mockery" in i2_categories),
        }

        # ── Agent I3: NSFW/explicit content ──
        i3_score = i3_result.get("score", 0.0)
        i3_is_explicit = i3_result.get("is_explicit", False)
        i3_detections = i3_result.get("detections", [])
        
        nsfw_flags = {
            "is_explicit": i3_is_explicit,
            "severity": i3_score,
            "body_parts": [d.get("class", "unknown") for d in i3_detections],
        }

        # Dampen NSFW score when NudeNet marks not explicit to reduce false positives on normal photos.
        i3_effective_score = i3_score if i3_is_explicit else min(i3_score, 0.12)

        # ── Fuse scores ──
        fused_score = self._fuse_scores(i1_harm_score, i2_score, i3_effective_score)
        action = self._determine_action(fused_score)

        # Guardrail: if visual harm is confident, never keep action at allow.
        if any(visual_flags.values()) and i2_score >= 0.48 and action == "allow":
            action = "alert"
            fused_score = max(fused_score, self.THRESHOLD_ALLOW + 0.01)
        
        # Log detailed scores
        print(f"[Image Orchestrator] Scores - I1(text):{i1_harm_score:.3f} I2(visual):{i2_score:.3f} I3(nsfw):{i3_score:.3f} I3(effective):{i3_effective_score:.3f} => Fused:{fused_score:.3f} Action:{action}")

        # ── Determine category ──
        if i3_is_explicit:
            category = "explicit_content"
        elif any(visual_flags.values()):
            category = "visual_harm"
        elif i1_harm_score > 0.5:
            category = "text_in_image"
        else:
            category = "safe"

        # ── Determine severity ──
        if fused_score < 0.40:
            severity = "none"
        elif fused_score < 0.65:
            severity = "low"
        elif fused_score < 0.80:
            severity = "medium"
        else:
            severity = "high"

        # ── Build explanation ──
        explanation_parts = []
        if extracted_text and i1_harm_score > 0.5:
            explanation_parts.append(f"harmful text in image ({i1_harm_score:.0%})")
        if i2_score > 0.4:
            explanation_parts.append(f"visual harm detected ({i2_score:.0%})")
        if i3_is_explicit:
            explanation_parts.append(f"explicit content ({i3_score:.0%})")
        
        explanation = "; ".join(explanation_parts) if explanation_parts else "Image analyzed"

        return {
            "harm_score": fused_score,
            "action": action,
            "category": category,
            "severity": severity,
            "explanation": explanation,
            "detected_text": extracted_text[:200] if extracted_text else None,
            "visual_flags": visual_flags,
            "nsfw_flags": nsfw_flags,
            "agent_scores": {
                "i1_text_harm": i1_harm_score,
                "i2_visual_harm": i2_score,
                "i3_nsfw_severity": i3_score,
            },
            "agent_details": {
                "i1": i1_result,
                "i2": i2_result,
                "i3": i3_result,
            },
        }
