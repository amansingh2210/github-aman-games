// --- Shared Arcade Settings & Sound Synthesizer ---

class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.isMuted = localStorage.getItem('arcade-muted') === 'true';
    this.initialized = false;
  }

  // Initializing AudioContext on first user interaction due to browser policies
  init() {
    if (this.initialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser:", e);
    }
  }

  toggleMute() {
    this.init();
    this.isMuted = !this.isMuted;
    localStorage.setItem('arcade-muted', this.isMuted);
    
    // Resume audio context if suspended
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    
    this.updateMuteButtons();
    return this.isMuted;
  }

  updateMuteButtons() {
    const buttons = document.querySelectorAll('.sound-toggle-btn');
    buttons.forEach(btn => {
      if (this.isMuted) {
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
        btn.title = "Unmute Sounds";
        btn.classList.add('muted');
      } else {
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
        btn.title = "Mute Sounds";
        btn.classList.remove('muted');
      }
    });
  }

  // --- Synth Sound Presets ---

  playTone(frequency, type, duration, startVol = 0.1, endVol = 0.0001, pitchSweepEnd = null) {
    this.init();
    if (this.isMuted || !this.audioCtx) return;

    // Resume context if browser suspended it
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
    
    if (pitchSweepEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(pitchSweepEnd, this.audioCtx.currentTime + duration);
    }
    
    gainNode.gain.setValueAtTime(startVol, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(endVol, this.audioCtx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  }

  playClick() {
    // Crisp tick sound (high frequency, fast decay, triangle wave for retro warmth)
    this.playTone(800, 'triangle', 0.06, 0.15, 0.001);
  }

  playWhoosh() {
    // Quick downsweep for card flip (sine wave sweeping 900Hz -> 200Hz)
    this.playTone(900, 'sine', 0.15, 0.15, 0.001, 200);
  }

  playSuccess() {
    // Pleasant double beep (C5 then E5)
    const now = this.audioCtx ? this.audioCtx.currentTime : 0;
    this.playTone(523.25, 'triangle', 0.1, 0.1);
    setTimeout(() => {
      this.playTone(659.25, 'triangle', 0.18, 0.1);
    }, 100);
  }

  playFail() {
    // Buzzing fail sound (triangle wave sweeping 250Hz -> 80Hz)
    this.playTone(250, 'sawtooth', 0.35, 0.1, 0.001, 80);
  }

  playWin() {
    // Arcade victory fan-fare: C5 -> E5 -> G5 -> C6
    const tempo = 120; // beats per minute
    const qNote = 60 / tempo; // quarter note duration
    
    setTimeout(() => this.playTone(523.25, 'triangle', qNote * 0.8, 0.12), 0);
    setTimeout(() => this.playTone(659.25, 'triangle', qNote * 0.8, 0.12), qNote * 1000 * 0.5);
    setTimeout(() => this.playTone(783.99, 'triangle', qNote * 0.8, 0.12), qNote * 1000 * 1.0);
    setTimeout(() => this.playTone(1046.50, 'sine', qNote * 2, 0.15), qNote * 1000 * 1.5);
  }

  playTimerBeep() {
    // Quick sharp beep for reaction speed wait trigger
    this.playTone(1200, 'sine', 0.08, 0.15);
  }
}

// Global Sound Instance
const arcadeSounds = new SoundManager();

// Setup UI elements once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Sync mute buttons
  arcadeSounds.updateMuteButtons();
  
  // Set up listeners for mute buttons
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.sound-toggle-btn');
    if (btn) {
      arcadeSounds.toggleMute();
      arcadeSounds.playClick();
    }
  });

  // Enable initial web audio unlocking on any click
  const unlockAudio = () => {
    arcadeSounds.init();
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  };
  document.addEventListener('click', unlockAudio);
  document.addEventListener('keydown', unlockAudio);
  document.addEventListener('touchstart', unlockAudio);
});
