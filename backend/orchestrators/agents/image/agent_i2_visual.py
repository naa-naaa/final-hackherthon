import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import io
import numpy as np


class AgentI2Visual:
    """
    Visual Harm Detection using CLIP.
    Compares image embeddings against harm category prompts.
    """

    HARM_PROMPTS = [
        "a photo showing violence or physical harm",
        "a photo showing threatening gestures or weapons",
        "a photo showing bullying or harassment",
        "a photo showing hate symbols or offensive content",
        "a photo showing humiliation or mockery",
    ]

    SAFE_PROMPTS = [
        "a normal everyday photo",
        "a friendly social media photo",
        "a nature or landscape photo",
    ]

    def __init__(self):
        print("[I2] Loading CLIP model...")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(self.device)
        self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        self.model.eval()
        print("[I2] CLIP loaded")

    async def analyze(self, image_bytes: bytes) -> dict:
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            all_prompts = self.HARM_PROMPTS + self.SAFE_PROMPTS

            inputs = self.processor(
                text=all_prompts,
                images=image,
                return_tensors="pt",
                padding=True
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits_per_image[0]
                probs = torch.softmax(logits, dim=0).cpu().numpy()

            harm_probs = probs[:len(self.HARM_PROMPTS)]
            safe_probs = probs[len(self.HARM_PROMPTS):]

            top_harm_idx = int(np.argmax(harm_probs))
            top_harm_prob = float(harm_probs[top_harm_idx])
            top_safe_idx = int(np.argmax(safe_probs))
            top_safe_prob = float(safe_probs[top_safe_idx])

            # Calibrated visual score: compare strongest harm cue against strongest safe cue.
            # Mean-over-prompts was too conservative and let bullying images pass as "allow".
            harm_vs_safe = top_harm_prob / max(top_harm_prob + top_safe_prob, 1e-6)
            safe_global_idx = len(self.HARM_PROMPTS) + top_safe_idx
            logit_margin = float(logits[top_harm_idx] - logits[safe_global_idx])
            margin_score = float(1.0 / (1.0 + np.exp(-logit_margin)))

            harm_score = float(np.clip(0.65 * harm_vs_safe + 0.35 * margin_score, 0.0, 1.0))
            safe_score = float(1.0 - harm_score)

            top_category = self.HARM_PROMPTS[top_harm_idx]

            # Detect specific harm categories using a relative threshold from top harm prompt.
            detected_categories = []
            category_scores = {}
            for idx, prompt in enumerate(self.HARM_PROMPTS):
                score = float(harm_probs[idx])
                if score >= max(0.12, top_harm_prob * 0.75):
                    # Extract category from prompt
                    if "violence" in prompt:
                        detected_categories.append("violence")
                        category_scores["violence"] = score
                    elif "weapon" in prompt:
                        detected_categories.append("weapons")
                        category_scores["weapons"] = score
                    elif "bullying" in prompt:
                        detected_categories.append("bullying")
                        category_scores["bullying"] = score
                    elif "hate" in prompt:
                        detected_categories.append("hate")
                        category_scores["hate"] = score
                    elif "humiliation" in prompt:
                        detected_categories.append("mockery")
                        category_scores["mockery"] = score
            
            return {
                "agent": "I2_visual",
                "score": harm_score,
                "visual_harm_score": harm_score,
                "safe_score": safe_score,
                "top_category": top_category,
                "categories": detected_categories,
                "category_scores": category_scores,
                "explanation": f"Visual harm probability: {harm_score:.2f}",
            }
        except Exception as e:
            return {"agent": "I2_visual", "score": 0.0, "visual_harm_score": 0.0, "error": str(e)}
