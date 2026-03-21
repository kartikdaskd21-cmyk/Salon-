export const playRoyalSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Sine wave for a very smooth, gentle chime
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      // Envelope: quick attack, slow decay
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.05); // slightly louder attack
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // A gentle, elegant ascending arpeggio (A major chord)
    playNote(440.00, now, 1.5);       // A4
    playNote(554.37, now + 0.08, 1.5); // C#5
    playNote(659.25, now + 0.16, 1.5); // E5
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};
