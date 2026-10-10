// Web Speech API wrapper for bilingual Hindi and English speech recognition & synthesis

interface SpeechRecognitionEventLike {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

export class SpeechHandler {
  private recognition: any = null;
  private isListening = false;
  private synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
      }

      if (this.synth) {
        // Pre-cache voices and listen for async voiceschanged in Chrome/Edge
        this.loadVoices();
        if (typeof this.synth.onvoiceschanged !== 'undefined') {
          this.synth.onvoiceschanged = () => this.loadVoices();
        }
      }
    }
  }

  private loadVoices(): void {
    if (!this.synth) return;
    try {
      const voices = this.synth.getVoices();
      if (voices && voices.length > 0) {
        this.cachedVoices = voices;
      }
    } catch (_) {}
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }

  // Play a gentle audio chime when AI begins responding or mic starts
  public playChime(freq = 587.33, duration = 0.15): void {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (_) {}
  }

  public startListening(options: {
    lang: 'hi' | 'en';
    onResult: (transcript: string, isFinal: boolean) => void;
    onError?: (error: string) => void;
    onEnd?: () => void;
  }): void {
    if (!this.recognition) {
      options.onError?.('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      this.playChime(659.25, 0.1);
      this.recognition.lang = options.lang === 'hi' ? 'hi-IN' : 'en-IN';

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const result = event.results[0];
        if (result && result[0]) {
          const transcript = result[0].transcript;
          const isFinal = Boolean((result as any).isFinal);
          options.onResult(transcript, isFinal);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        options.onError?.(event.error || 'Speech recognition error');
      };

      this.recognition.onend = () => {
        this.isListening = false;
        options.onEnd?.();
      };

      this.recognition.start();
    } catch (err: any) {
      this.isListening = false;
      options.onError?.(err?.message || 'Could not start microphone');
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('Recognition stop error:', err);
      }
      this.isListening = false;
    }
  }

  public speak(text: string, lang: 'hi' | 'en', onComplete?: () => void): void {
    if (!this.synth) {
      onComplete?.();
      return;
    }

    this.stopSpeaking();

    // In Chrome, resuming speech synthesis un-blocks any paused queue state
    try {
      if (this.synth.paused) {
        this.synth.resume();
      }
    } catch (_) {}

    // Clean text of markdown asterisks and hash marks for natural voice readout
    const cleanedText = text
      .replace(/[#*`_~]/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanedText) {
      onComplete?.();
      return;
    }

    this.playChime(523.25, 0.12);

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = lang === 'hi' ? 0.95 : 1.0;
    utterance.pitch = 1.0;

    // Fix for Chrome/Edge bug: Keep global reference so garbage collector does not silence speech mid-sentence
    (window as any).__kisanCurrentUtterance = utterance;

    // Pick best matching voice if available
    const voices = this.cachedVoices.length > 0 ? this.cachedVoices : this.synth.getVoices();
    const targetLangPrefix = lang === 'hi' ? 'hi' : 'en';
    const matchingVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith(targetLangPrefix) &&
        (v.name.includes('Google') || v.name.includes('Natural') || true)
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    let completed = false;
    const finish = () => {
      if (!completed) {
        completed = true;
        (window as any).__kisanCurrentUtterance = null;
        onComplete?.();
      }
    };

    utterance.onend = () => finish();
    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      finish();
    };

    // Safety timeout in case browser never fires onend
    const wordCount = cleanedText.split(/\s+/).length;
    const estTimeMs = Math.max(3000, (wordCount / 2.5) * 1000 + 1500);
    setTimeout(() => {
      if (!completed && this.synth && !this.synth.speaking) {
        finish();
      }
    }, estTimeMs);

    try {
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis speak failed:', e);
      finish();
    }
  }

  public stopSpeaking(): void {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (_) {}
    }
    (window as any).__kisanCurrentUtterance = null;
  }

  public isSpeaking(): boolean {
    return Boolean(this.synth?.speaking);
  }
}

export const speechHandler = new SpeechHandler();
