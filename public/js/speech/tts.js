import { Repo } from '../storage.js';

export const TTS = (() => {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  let voices = [];
  function refresh() { if (supported) voices = window.speechSynthesis.getVoices() || []; }
  if (supported) { refresh(); window.speechSynthesis.onvoiceschanged = refresh; }

  function bestVoice(prefURI, gender = 'female') {
    const s = Repo.getSettings();
    const uri = prefURI || s.voiceURI;
    if (uri) { const v = voices.find(v => v.voiceURI === uri); if (v) return v; }
    const prefer = ['en-IN', 'en-GB', 'en-US', 'en-AU', 'en'];
    const hints = gender === 'female'
      ? /female|zira|samantha|neerja|heera|google uk english female|google us english/i
      : /male|david|mark|ravi|google uk english male/i;
    for (const p of prefer) {
      const v = voices.find(v => v.lang?.replace('_', '-').toLowerCase().startsWith(p.toLowerCase()) && hints.test(v.name));
      if (v) return v;
    }
    for (const p of prefer) {
      const v = voices.find(v => v.lang?.replace('_', '-').toLowerCase().startsWith(p.toLowerCase()));
      if (v) return v;
    }
    return voices[0] || null;
  }

  function speak(text, { rate, voiceURI, gender = 'female', onEnd, onStart } = {}) {
    if (!supported || !text) { onEnd?.(); return; }
    cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = bestVoice(voiceURI, gender);
    if (v) u.voice = v;
    u.lang = v?.lang || 'en-US';
    u.rate = rate ?? Repo.getSettings().rate ?? 0.95;
    u.pitch = 1; u.volume = 1;
    u.onstart = () => onStart?.();
    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();
    window.speechSynthesis.speak(u);
  }

  function cancel() { if (supported) { try { window.speechSynthesis.cancel(); } catch {} } }

  return { supported, speak, cancel, getVoices: () => voices, refresh };
})();