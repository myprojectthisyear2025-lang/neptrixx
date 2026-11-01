/** A quiet two-note arrival tone, unlocked by interaction and scoped to the focused tab. */
import { useCallback, useEffect, useRef, useState } from 'react';
export function useMessageSound() {
  const [soundEnabled, setEnabled] = useState(() => { try { return localStorage.getItem('neptrixx-message-sound') !== 'off'; } catch { return true; } });
  const context = useRef(null); const last = useRef(0); const enabled = useRef(soundEnabled); enabled.current = soundEnabled;
  const unlock = useCallback(() => {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return; context.current ||= new Audio();
      if (context.current.state === 'suspended') context.current.resume().catch(() => {});
    } catch { /* Audio can be unavailable in restricted browser modes. */ }
  }, []);
  useEffect(() => {
    document.addEventListener('pointerdown', unlock); document.addEventListener('keydown', unlock);
    return () => { document.removeEventListener('pointerdown', unlock); document.removeEventListener('keydown', unlock); context.current?.close().catch(() => {}); context.current = null; };
  }, [unlock]);
  const playMessageTone = useCallback((test = false) => {
    const audio = context.current;
    if (!audio || audio.state !== 'running' || !test && (!enabled.current || document.hidden || !document.hasFocus() || Date.now() - last.current < 1000)) return;
    last.current = Date.now();
    [660, 880].forEach((frequency, i) => {
      const start = audio.currentTime + i * 0.12; const oscillator = audio.createOscillator(); const gain = audio.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(0.06, start + 0.012); gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(start); oscillator.stop(start + 0.22);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }, []);
  function setSoundEnabled(value) { setEnabled(value); try { localStorage.setItem('neptrixx-message-sound', value ? 'on' : 'off'); } catch { /* optional preference */ } unlock(); }
  async function testSound() { unlock(); try { await context.current?.resume(); playMessageTone(true); } catch { /* browser controls sound */ } }
  return { soundEnabled, setSoundEnabled, playMessageTone, testSound };
}
