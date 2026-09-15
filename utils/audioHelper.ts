/**
 * Audio and Voice Synthesis Helper for VMA & Luc Léger Test
 */

/**
 * Standard shuttle beep (1000Hz)
 */
export const playBeep = (audioContext: AudioContext | null) => {
  if (!audioContext) return;
  
  try {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
    oscillator.type = 'sine';

    const now = audioContext.currentTime;
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  } catch (err) {
    console.warn("AudioContext playBeep error:", err);
  }
};

/**
 * High-clarity, distinct level-change chime (Ascending 3-tone chime: D5 -> A5 -> D6)
 */
export const playLevelUpChime = (audioContext: AudioContext | null) => {
  if (!audioContext) return;

  try {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const now = audioContext.currentTime;
    const notes = [
      { freq: 587.33, start: 0.0, dur: 0.15 }, // D5
      { freq: 880.00, start: 0.15, dur: 0.18 }, // A5
      { freq: 1174.66, start: 0.33, dur: 0.35 } // D6
    ];

    notes.forEach(n => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, now + n.start);

      gain.gain.setValueAtTime(0.35, now + n.start);
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
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
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
export const announcePalier = (palierNumber: number, language: 'ar' | 'fr' = 'ar') => {
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
    window.speechSynthesis.cancel();

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

    // Delay to allow audio chime and cancel to settle
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Speech speak error:", e);
      }
    }, 120);
  } catch (err) {
    console.warn("Speech synthesis error:", err);
  }
};


