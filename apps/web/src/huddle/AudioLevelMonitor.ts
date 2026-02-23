const SPEAKING_THRESHOLD = 0.015;
const SILENCE_DELAY_MS = 300;

type SpeakingCallback = (userId: string, isSpeaking: boolean) => void;

interface MonitoredStream {
  analyser: AnalyserNode;
  dataArray: Float32Array<ArrayBuffer>;
  wasSpeaking: boolean;
  silenceTimer: ReturnType<typeof setTimeout> | null;
}

export class AudioLevelMonitor {
  private audioContext: AudioContext;
  private streams = new Map<string, MonitoredStream>();
  private animationFrameId: number | null = null;
  private callback: SpeakingCallback;
  private destroyed = false;

  constructor(callback: SpeakingCallback) {
    this.audioContext = new AudioContext();
    this.callback = callback;
    this.startPolling();
  }

  addStream(userId: string, stream: MediaStream): void {
    this.removeStream(userId);

    const source = this.audioContext.createMediaStreamSource(stream);
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>;

    this.streams.set(userId, {
      analyser,
      dataArray,
      wasSpeaking: false,
      silenceTimer: null,
    });
  }

  removeStream(userId: string): void {
    const entry = this.streams.get(userId);
    if (entry?.silenceTimer) {
      clearTimeout(entry.silenceTimer);
    }
    this.streams.delete(userId);
  }

  private startPolling(): void {
    const poll = () => {
      if (this.destroyed) return;

      for (const [userId, entry] of this.streams) {
        entry.analyser.getFloatTimeDomainData(entry.dataArray);

        let sum = 0;
        for (let i = 0; i < entry.dataArray.length; i++) {
          sum += entry.dataArray[i]! * entry.dataArray[i]!;
        }
        const rms = Math.sqrt(sum / entry.dataArray.length);
        const isSpeaking = rms > SPEAKING_THRESHOLD;

        if (isSpeaking && !entry.wasSpeaking) {
          if (entry.silenceTimer) {
            clearTimeout(entry.silenceTimer);
            entry.silenceTimer = null;
          }
          entry.wasSpeaking = true;
          this.callback(userId, true);
        } else if (!isSpeaking && entry.wasSpeaking) {
          if (!entry.silenceTimer) {
            entry.silenceTimer = setTimeout(() => {
              entry.wasSpeaking = false;
              entry.silenceTimer = null;
              this.callback(userId, false);
            }, SILENCE_DELAY_MS);
          }
        }
      }

      this.animationFrameId = requestAnimationFrame(poll);
    };

    this.animationFrameId = requestAnimationFrame(poll);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    for (const [, entry] of this.streams) {
      if (entry.silenceTimer) {
        clearTimeout(entry.silenceTimer);
      }
    }
    this.streams.clear();
    void this.audioContext.close();
  }
}
