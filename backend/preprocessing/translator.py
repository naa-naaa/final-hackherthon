# ISO 639-1 codes for Indian languages supported by Google Translate
_LANG_CODE_MAP = {
    "tamil": "ta",
    "tamil_script": "ta",
    "hindi": "hi",
    "hindi_script": "hi",
    "telugu": "te",
    "telugu_script": "te",
    "kannada": "kn",
    "kannada_script": "kn",
    "malayalam": "ml",
    "malayalam_script": "ml",
    "bengali": "bn",
    "punjabi": "pa",
    "marathi": "mr",
    "tanglish": "auto",
    "auto": "auto",
    "english": "en",
    "en": "en",
    "unknown": "auto",
}


class IndianLanguageTranslator:
    """
    Translates Indian languages (Tamil, Hindi, Tanglish, etc.) to English.
    Uses deep-translator (Google Translate backend) — no API key required.
    """

    def __init__(self):
        print("[Translator] Initializing...")
        try:
            from deep_translator import GoogleTranslator as _GT
            # warm-up call to verify connectivity
            _GT(source="auto", target="en").translate("test")
            self._GT = _GT
            self.available = True
            print("[Translator] Ready (deep_translator / Google Translate)")
        except Exception as e:
            print(f"[Translator] deep_translator unavailable ({e}). Mock mode.")
            self._GT = None
            self.available = False

    def translate(self, text: str, source_lang: str = "auto") -> dict:
        """
        Translate text to English.  source_lang can be a language name or ISO code.
        Returns original text on failure so the pipeline never crashes.
        """
        if not text or not text.strip():
            return {"translated_text": text, "source_lang": source_lang, "target_lang": "english"}

        code = _LANG_CODE_MAP.get(source_lang.lower(), "auto")

        # Already English — skip network call
        if code == "en":
            return {"translated_text": text, "source_lang": source_lang, "target_lang": "english"}

        if not self.available:
            print(f"[Translator] Mock ({source_lang}): {text[:50]}")
            return {"translated_text": text, "source_lang": source_lang, "target_lang": "english"}

        try:
            translated = self._GT(source=code, target="en").translate(text)
            translated = translated or text
            print(f"[Translator] {source_lang} → EN: '{text[:40]}' → '{translated[:40]}'")
            return {"translated_text": translated, "source_lang": source_lang, "target_lang": "english"}
        except Exception as e:
            print(f"[Translator] Translation error ({source_lang}): {e}")
            return {"translated_text": text, "source_lang": source_lang, "target_lang": "english"}
