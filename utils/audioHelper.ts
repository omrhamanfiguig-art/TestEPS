/**
 * Audio and Voice Synthesis Helper for VMA & Luc Léger Test
 * Optimized for Bluetooth Loudspeakers, Field Noise & High-Volume Playback
 */

let keepAliveOscillator: OscillatorNode | null = null;
let keepAliveGain: GainNode | null = null;
let keepAliveHtmlAudio: HTMLAudioElement | null = null;

/**
 * Creates or retrieves a master volume compressor to maximize loudness on Bluetooth speakers
 * without digital distortion/clipping.
 */
const getMasterNode = (audioContext: AudioContext): AudioNode => {
  try {
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-10, audioContext.currentTime);
    compressor.knee.setValueAtTime(10, audioContext.currentTime);
    compressor.ratio.setValueAtTime(12, audioContext.currentTime);
    compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
    compressor.release.setValueAtTime(0.1, audioContext.currentTime);
    compressor.connect(audioContext.destination);
    return compressor;
  } catch (_) {
    return audioContext.destination;
  }
};

/**
 * Keeps the Bluetooth A2DP audio link continuously active to prevent 
 * Bluetooth speakers from entering standby/sleep mode or muting between shuttle beeps.
 */
export const startBluetoothKeepAlive = (audioContext: AudioContext | null) => {
  if (typeof window === 'undefined') return;

  // 1. WebAudio Sub-Audible Carrier Signal
  if (audioContext) {
    try {
      if (audioContext.state !== 'running') {
        audioContext.resume();
      }
      if (!keepAliveOscillator) {
        keepAliveOscillator = audioContext.createOscillator();
        keepAliveGain = audioContext.createGain();

        // 20Hz ultra-low carrier with gain 0.0002 to maintain active A2DP PCM stream
        keepAliveOscillator.frequency.setValueAtTime(20, audioContext.currentTime);
        keepAliveOscillator.type = 'sine';

        keepAliveGain.gain.setValueAtTime(0.0002, audioContext.currentTime);

        keepAliveOscillator.connect(keepAliveGain);
        keepAliveGain.connect(audioContext.destination);

        keepAliveOscillator.start();
      }
    } catch (e) {
      console.warn("startBluetoothKeepAlive WebAudio error:", e);
    }
  }

  // 2. HTML5 Audio Loop Fallback to hold OS Media Focus
  try {
    if (!keepAliveHtmlAudio) {
      // 1-second silent WAV data URI
      const silentWav = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
      keepAliveHtmlAudio = new Audio(silentWav);
      keepAliveHtmlAudio.loop = true;
      keepAliveHtmlAudio.volume = 0.01;
    }
    keepAliveHtmlAudio.play().catch(() => {
      // User interaction will start it on first touch/click
    });
  } catch (e) {
    console.warn("startBluetoothKeepAlive HTML5 error:", e);
  }
};

/**
 * Stops the Bluetooth keep-alive carrier when the test finishes or resets.
 */
export const stopBluetoothKeepAlive = () => {
  if (keepAliveOscillator) {
    try {
      keepAliveOscillator.stop();
      keepAliveOscillator.disconnect();
    } catch (_) {}
    keepAliveOscillator = null;
  }
  if (keepAliveGain) {
    try {
      keepAliveGain.disconnect();
    } catch (_) {}
    keepAliveGain = null;
  }
  if (keepAliveHtmlAudio) {
    try {
      keepAliveHtmlAudio.pause();
    } catch (_) {}
  }
};

/**
 * High-Volume Shuttle Beep (Piercing 1000Hz + Harmonic Dual-Tone at Full 100% Gain)
 */
export const playBeep = (audioContext: AudioContext | null) => {
  if (!audioContext) return;

  try {
    if (audioContext.state !== 'running') {
      audioContext.resume();
    }

    const master = getMasterNode(audioContext);
    const now = audioContext.currentTime;

    // Primary Tone: 1000Hz Square/Sine blend for max loudness outdoor clarity
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(1000, now);

    // Boost volume to 1.0 (Full Digital Scale)
    gain1.gain.setValueAtTime(0.9, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc1.connect(gain1);
    gain1.connect(master);

    // Harmonic Octave Tone: 2000Hz Sine for extra sharpness
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2000, now);

    gain2.gain.setValueAtTime(0.4, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc2.connect(gain2);
    gain2.connect(master);

    osc1.start(now);
    osc1.stop(now + 0.25);

    osc2.start(now);
    osc2.stop(now + 0.22);
  } catch (err) {
    console.warn("AudioContext playBeep error:", err);
  }
};

/**
 * High-clarity, distinct level-change chime (Ascending 3-tone chime: D5 -> A5 -> D6) at MAX volume
 */
export const playLevelUpChime = (audioContext: AudioContext | null) => {
  if (!audioContext) return;

  try {
    if (audioContext.state !== 'running') {
      audioContext.resume();
    }

    const master = getMasterNode(audioContext);
    const now = audioContext.currentTime;

    const notes = [
      { freq: 587.33, start: 0.0, dur: 0.18 }, // D5
      { freq: 880.00, start: 0.18, dur: 0.20 }, // A5
      { freq: 1174.66, start: 0.38, dur: 0.40 } // D6
    ];

    notes.forEach(n => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.connect(gain);
      gain.connect(master);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, now + n.start);

      gain.gain.setValueAtTime(0.95, now + n.start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);

      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur);
    });
  } catch (err) {
    console.warn("AudioContext playLevelUpChime error:", err);
  }
};

const ARABIC_PALIERS: { [key: number]: string } = {
  1: 'المستوى 1',
  2: 'المستوى 2',
  3: 'المستوى 3',
  4: 'المستوى 4',
  5: 'المستوى 5',
  6: 'المستوى 6',
  7: 'المستوى 7',
  8: 'المستوى 8',
  9: 'المستوى 9',
  10: 'المستوى 10',
  11: 'المستوى 11',
  12: 'المستوى 12',
  13: 'المستوى 13',
  14: 'المستوى 14',
  15: 'المستوى 15',
  16: 'المستوى 16',
  17: 'المستوى 17',
  18: 'المستوى 18',
  19: 'المستوى 19',
  20: 'المستوى 20',
  21: 'المستوى 21'
};

/**
 * Preload speech synthesis voices
 */
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  } catch (_) {}
}

let lastSpokenPalier = 0;
let lastSpokenTimestamp = 0;

export const resetPalierAnnouncement = () => {
  lastSpokenPalier = 0;
  lastSpokenTimestamp = 0;
};

/**
 * Voice Announcement for Luc Léger Palier (Level)
 * Supports Arabic ("المستوى 1", "المستوى 2"...) and French ("Palier 1", "Palier 2"...)
 * Emits strictly ONCE per level.
 */
export const announcePalier = (palierNumber: number, language: 'ar' | 'fr' = 'ar', audioContext?: AudioContext | null) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const now = Date.now();
  // Prevent duplicate trigger for the same level within 5 seconds
  if (lastSpokenPalier === palierNumber && now - lastSpokenTimestamp < 5000) {
    return;
  }
  lastSpokenPalier = palierNumber;
  lastSpokenTimestamp = now;

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const isFr = language === 'fr';
    const textToSpeak = isFr 
      ? `Palier ${palierNumber}` 
      : (ARABIC_PALIERS[palierNumber] || `المستوى ${palierNumber}`);

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = isFr ? 'fr-FR' : 'ar-SA';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Pick best available native voice for the selected language
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const targetPrefix = isFr ? 'fr' : 'ar';
      const bestVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetPrefix)) || voices.find(v => v.lang.toLowerCase().includes(targetPrefix));
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
    }

    // When speech ends or errors, re-resume AudioContext to ensure Bluetooth channel remains open
    utterance.onend = () => {
      if (audioContext && audioContext.state !== 'running') {
        audioContext.resume().catch(() => {});
      }
    };
    utterance.onerror = () => {
      if (audioContext && audioContext.state !== 'running') {
        audioContext.resume().catch(() => {});
      }
    };

    // Delay to allow audio chime to settle
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Speech speak error:", e);
      }
    }, 150);
  } catch (err) {
    console.warn("Speech synthesis error:", err);
  }
};

/**
 * Complete Bluetooth Audio Test Sequence for the teacher to verify Bluetooth speaker connection & volume
 */
export const testBluetoothAudio = (audioContext: AudioContext | null, language: 'ar' | 'fr' = 'ar') => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (_) {}
  }

  if (audioContext) {
    if (audioContext.state !== 'running') {
      audioContext.resume();
    }
    startBluetoothKeepAlive(audioContext);
  }

  // 1. Play loud beep
  playBeep(audioContext);

  // 2. Play level chime after 300ms
  setTimeout(() => {
    playLevelUpChime(audioContext);
  }, 350);

  // 3. Play level 1 voice announcement after 1100ms
  setTimeout(() => {
    resetPalierAnnouncement();
    announcePalier(1, language, audioContext);
  }, 1100);
};
