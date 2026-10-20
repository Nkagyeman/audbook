export interface SpeechVoiceInfo {
  voiceURI: string;
  name: string;
  lang: string;
  isDefault: boolean;
  isNatural: boolean;
}

export type BoundaryCallback = (event: {
  charIndex: number;
  charLength?: number;
  name: string;
}) => void;

export class BrowserSpeechController {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private fullText: string = '';
  private currentOffset: number = 0;
  private isPaused: boolean = false;
  private isSpeaking: boolean = false;
  private keepAliveTimer: any = null;

  private onBoundaryCallback: BoundaryCallback | null = null;
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((err: any) => void) | null = null;

  private voiceURI: string | null = null;
  private rate: number = 1.0;
  private pitch: number = 1.0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public getVoices(): SpeechVoiceInfo[] {
    if (!this.synth) return [];
    const rawVoices = this.synth.getVoices();
    return rawVoices.map((v) => ({
      voiceURI: v.voiceURI,
      name: v.name,
      lang: v.lang,
      isDefault: v.default,
      isNatural:
        v.name.includes('Natural') ||
        v.name.includes('Neural') ||
        v.name.includes('Online') ||
        v.name.includes('Siri') ||
        v.name.includes('Google') ||
        v.name.includes('Daniel') ||
        v.name.includes('Samantha'),
    }));
  }

  public setVoice(voiceURI: string) {
    this.voiceURI = voiceURI;
  }

  public setRate(rate: number) {
    this.rate = Math.max(0.5, Math.min(2.5, rate));
    if (this.isSpeaking && !this.isPaused) {
      // Re-trigger from current offset to apply speed immediately
      this.seekTo(this.currentOffset);
    }
  }

  public setPitch(pitch: number) {
    this.pitch = Math.max(0.5, Math.min(1.5, pitch));
  }

  public play(
    text: string,
    startCharOffset: number = 0,
    callbacks?: {
      onBoundary?: BoundaryCallback;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ) {
    if (!this.synth) {
      callbacks?.onError?.(new Error('SpeechSynthesis not supported'));
      return;
    }

    this.fullText = text;
    this.currentOffset = startCharOffset;

    if (callbacks?.onBoundary) this.onBoundaryCallback = callbacks.onBoundary;
    if (callbacks?.onEnd) this.onEndCallback = callbacks.onEnd;
    if (callbacks?.onError) this.onErrorCallback = callbacks.onError;

    this.speakFromOffset(startCharOffset);
  }

  private speakFromOffset(offset: number) {
    if (!this.synth) return;

    this.stopKeepAlive();
    this.synth.cancel();

    const textToSpeak = this.fullText.slice(offset);
    if (!textToSpeak.trim()) {
      this.isSpeaking = false;
      this.isPaused = false;
      this.onEndCallback?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    // Apply voice
    if (this.voiceURI) {
      const allVoices = this.synth.getVoices();
      const matched = allVoices.find((v) => v.voiceURI === this.voiceURI);
      if (matched) utterance.voice = matched;
    }

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const globalCharIndex = offset + event.charIndex;
        this.currentOffset = globalCharIndex;
        this.onBoundaryCallback?.({
          charIndex: globalCharIndex,
          charLength: event.charLength || 1,
          name: event.name,
        });
      }
    };

    utterance.onend = () => {
      this.stopKeepAlive();
      this.isSpeaking = false;
      this.isPaused = false;
      this.onEndCallback?.();
    };

    utterance.onerror = (event) => {
      this.stopKeepAlive();
      // Ignore 'interrupted' or 'canceled' errors as they are normal during user pauses/seeks
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        console.warn('SpeechSynthesis error:', event.error);
        this.onErrorCallback?.(event);
      }
      this.isSpeaking = false;
    };

    this.currentUtterance = utterance;
    this.isSpeaking = true;
    this.isPaused = false;

    this.synth.speak(utterance);
    this.startKeepAlive();
  }

  public pause() {
    if (!this.synth) return;
    this.stopKeepAlive();
    this.synth.pause();
    this.isPaused = true;
  }

  public resume() {
    if (!this.synth) return;
    if (this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
      this.startKeepAlive();
    } else if (!this.isSpeaking) {
      this.speakFromOffset(this.currentOffset);
    }
  }

  public stop() {
    if (!this.synth) return;
    this.stopKeepAlive();
    this.synth.cancel();
    this.isSpeaking = false;
    this.isPaused = false;
    this.currentUtterance = null;
  }

  public seekTo(charOffset: number) {
    this.currentOffset = Math.max(0, Math.min(this.fullText.length - 1, charOffset));
    if (this.isSpeaking || this.isPaused) {
      this.speakFromOffset(this.currentOffset);
    }
  }

  public getCurrentOffset(): number {
    return this.currentOffset;
  }

  public getIsPlaying(): boolean {
    return this.isSpeaking && !this.isPaused;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  // Workaround for Chrome/WebKit bug where long speech utterances pause silently
  private startKeepAlive() {
    this.stopKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (this.synth && this.isSpeaking && !this.isPaused) {
        this.synth.pause();
        this.synth.resume();
      }
    }, 12000);
  }

  private stopKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }
}
