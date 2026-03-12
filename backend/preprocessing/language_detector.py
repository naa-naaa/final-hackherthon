import re
from langdetect import detect, DetectorFactory
from langdetect.lang_detect_exception import LangDetectException

DetectorFactory.seed = 42


class LanguageDetector:
    """
    Detects: tamil_script, hindi_script, telugu_script, tanglish, english, mixed
    """

    TAMIL_PATTERN = re.compile(r"[\u0B80-\u0BFF]")
    HINDI_PATTERN = re.compile(r"[\u0900-\u097F]")
    TELUGU_PATTERN = re.compile(r"[\u0C00-\u0C7F]")
    KANNADA_PATTERN = re.compile(r"[\u0C80-\u0CFF]")
    MALAYALAM_PATTERN = re.compile(r"[\u0D00-\u0D7F]")

    TANGLISH_MARKERS = {
        # Conversational / address
        "machi", "machan", "da", "di", "dei", "daa", "dii",
        "enna", "yenna", "ennada", "ennadi",
        "seri", "po", "va", "vaa", "illa", "illaya",
        "avan", "aval", "nee", "naan", "yaar", "yaaru",
        "sollu", "paru", "paaru",
        # Common verbs
        "saptiya", "sapdiya", "saptu", "vantiya", "vandiya",
        # Insults & abuse triggers
        "loosu", "poda", "podi", "mokka", "vera",
        "naaye", "naayi", "naai",          # dog (offensive)
        "kazhuthai", "kazhutha",            # donkey (insult)
        "otha", "oothu",                    # expletive
        "thevdiya", "thevdia", "thevidiya", # offensive (women)
        "pottai",                           # offensive
        "sunni", "pundai", "koothi",        # vulgar abuses
        "saava", "saavkaari", "saavakaari", # death-threat slang
        "poolai", "poolu",                  # vulgar
        # Threatening verbs
        "adikiren", "adichu", "adikuven",   # will hit/beat
        "kolluven", "kollu",                # will kill
        "mokkai", "mokkapu",
    }

    def detect_script(self, text: str):
        if self.TAMIL_PATTERN.search(text):
            return "tamil_script", "tamil"
        if self.HINDI_PATTERN.search(text):
            return "hindi_script", "hindi"
        if self.TELUGU_PATTERN.search(text):
            return "telugu_script", "telugu"
        if self.KANNADA_PATTERN.search(text):
            return "kannada_script", "kannada"
        if self.MALAYALAM_PATTERN.search(text):
            return "malayalam_script", "malayalam"
        return None, None

    def is_tanglish(self, text: str) -> bool:
        words = re.findall(r"\b\w+\b", text.lower())
        return sum(1 for w in words if w in self.TANGLISH_MARKERS) >= 1

    def detect(self, text: str) -> dict:
        text = text.strip()
        if not text:
            return {"language": "unknown", "script": None, "needs_translation": False, "needs_tanglish_norm": False}

        script, lang = self.detect_script(text)
        if script:
            return {
                "language": lang,
                "script": script,
                "needs_translation": True,
                "needs_tanglish_norm": False,
            }

        if self.is_tanglish(text):
            return {
                "language": "tanglish",
                "script": "latin",
                "needs_translation": False,
                "needs_tanglish_norm": True,
            }

        try:
            detected = detect(text)
        except LangDetectException:
            detected = "en"

        if detected == "ta":
            return {
                "language": "tanglish",
                "script": "latin",
                "needs_translation": False,
                "needs_tanglish_norm": True,
            }

        return {
            "language": detected,
            "script": "latin",
            "needs_translation": detected not in ["en"],
            "needs_tanglish_norm": False,
        }
