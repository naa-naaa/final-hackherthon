class TanglishNormalizer:
    """
    Tanglish → Tamil Script (IndicXlit) → English (IndicTrans2).
    No LLM. No Gemma. Pure transliteration pipeline.
    Falls back to manual word mapping when IndicXlit unavailable.
    """

    # Common Tanglish → English mappings for abusive/slang terms
    TANGLISH_FALLBACK_MAP = {
        # Insults
        "loosu": "stupid",
        "loose": "stupid",
        "poda": "screw off",
        "podi": "screw off",
        "mokka": "bad",
        "naaye": "dog",
        "naayi": "dog",
        "naai": "dog",
        "kazhuthai": "donkey",
        "kazhutha": "donkey",
        "otha": "screw",
        "oothu": "screw",
        "thevdiya": "whore",
        "thevdia": "whore",
        "thevidiya": "whore",
        "pottai": "prostitute",
        "sunni": "dick",
        "pundai": "pussy",
        "punda": "pussy",
        "punde": "pussy",
        "koothi": "whore",
        "saava": "death",
        "saavkaari": "death threat",
        "saavakaari": "death threat",
        "poolai": "pussy",
        "poolu": "pussy",
        # Additional abuses commonly missed
        "thayoli": "son of a whore",
        "thayiru": "bastard",  # colloquial insult usage
        "mayiru": "pubic hair",   # vulgar insult
        "oombu": "suck it",       # vulgar
        "oomba": "suck it",
        "sappi": "suck it",
        "kundi": "ass",
        "soothu": "ass",
        "lavadai": "bastard",
        "lavada": "bastard",
        "ottai": "bastard",
        "ootai": "bastard",
        "puluthi": "groin insult",
        # Threats
        "adikiren": "will beat",
        "adichu": "beat",
        "adikuven": "will beat",
        "kolluven": "will kill",
        "kollu": "kill",
        "kill": "kill",
        "vettuven": "will slash",
        "vetti": "slash",
        "kuthiven": "will stab",
        "kuthi": "stab",
        "jalra": "thrash",
        # Blackmail / extortion cues
        "expose": "expose",
        "padam": "photos",
        "video": "video",
        "leak": "leak",
        "share": "share",
    }

    def __init__(self):
        self.engines = {}
        self.has_xlit = False
        print("[Tanglish] Loading IndicXlit engines...")
        try:
            from ai4bharat.transliteration import XlitEngine
            for lang_code in ["ta", "hi", "te", "kn", "ml"]:
                try:
                    self.engines[lang_code] = XlitEngine(lang_code)
                    print(f"[Tanglish] IndicXlit loaded for {lang_code}")
                    self.has_xlit = True
                except Exception as e:
                    print(f"[Tanglish] Could not load {lang_code}: {e}")
        except ImportError:
            print("[Tanglish] IndicXlit not installed. Using fallback word mapping.")
            self.has_xlit = False

    def romanized_to_script(self, text: str, lang_code: str = "ta") -> str:
        """
        Convert romanized Indian language words to native script.
        'saptiya' → 'சாப்பிட்டியா'
        Falls back to manual mapping if IndicXlit unavailable.
        """
        # If IndicXlit is available, use it
        if self.has_xlit and lang_code in self.engines:
            engine = self.engines[lang_code]
            words = text.split()
            converted = []
            for word in words:
                try:
                    result = engine.translit_word(word, topk=1)
                    if result and result[0]:
                        converted.append(result[0])
                    else:
                        converted.append(word)
                except Exception:
                    converted.append(word)
            return " ".join(converted)
        
        # Fallback: apply manual word mapping
        return self.apply_fallback_map(text)

    def apply_fallback_map(self, text: str) -> str:
        """
        Replace known Tanglish abusive/threat words with their English equivalents.
        Safe to call on already-translated text as a safety-net pass.
        Words not in the map are left unchanged.
        """
        words = text.split()
        converted = []
        for word in words:
            # Strip punctuation for lookup, preserve original casing for non-matches
            clean_word = ''.join(c for c in word.lower() if c.isalnum())
            if clean_word in self.TANGLISH_FALLBACK_MAP:
                converted.append(self.TANGLISH_FALLBACK_MAP[clean_word])
            else:
                converted.append(word)
        return " ".join(converted)
