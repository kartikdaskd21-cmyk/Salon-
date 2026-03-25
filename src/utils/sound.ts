const getAudioContext = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return null;
    return new AudioContext();
  } catch (e) {
    return null;
  }
};

const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, vol: number = 0.08) => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = type;
  osc.frequency.value = freq;
  
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + duration * 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(startTime);
  osc.stop(startTime + duration);
  return ctx;
};

export const playClickSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  playTone(600, 'sine', ctx.currentTime, 0.1, 0.03);
};

export const playCartSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone(523.25, 'sine', now, 0.3, 0.04); // C5
  playTone(659.25, 'sine', now + 0.1, 0.4, 0.05); // E5
};

export const playSuccessSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone(440.00, 'sine', now, 1.0, 0.06);       // A4
  playTone(554.37, 'sine', now + 0.08, 1.0, 0.06); // C#5
  playTone(659.25, 'sine', now + 0.16, 1.5, 0.08); // E5
};

export const playOpenSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone(300, 'sine', now, 0.2, 0.03);
  playTone(400, 'sine', now + 0.05, 0.3, 0.03);
};

export const playCloseSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone(400, 'sine', now, 0.2, 0.03);
  playTone(300, 'sine', now + 0.05, 0.3, 0.03);
};
