const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

export const STT = (() => {
  const supported = !!SR;
  let rec = null, active = false, silenceTimer = null, onSilenceCb = null;
  let lastInterim = '', accumulatedFinal = '';

  function start({ lang = 'en-IN', onInterim, onFinal, onError, onEnd, onSilence, silenceMs = 1600 } = {}) {
    if (!supported) { onError?.('unsupported'); return false; }
    stop();
    try {
      rec = new SR();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      lastInterim = ''; accumulatedFinal = '';
      onSilenceCb = onSilence;

      rec.onresult = (e) => {
        let interim = '', final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }
        if (interim) {
          lastInterim = interim;
          onInterim?.(interim);
          resetSilence(silenceMs);
        }
        if (final) accumulatedFinal = (accumulatedFinal + ' ' + final).trim();
      };
      rec.onerror = (e) => {
        active = false;
        if (e.error === 'no-speech') return;
        onError?.(e.error || 'error');
      };
      rec.onend = () => {
        active = false;
        if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
        if (accumulatedFinal.trim()) {
          const t = accumulatedFinal.trim();
          accumulatedFinal = '';
          onFinal?.(t, null);
        } else if (lastInterim.trim()) {
          const t = lastInterim.trim();
          lastInterim = '';
          onFinal?.(t, null);
        }
        onEnd?.();
      };
      rec.start();
      active = true;
      resetSilence(silenceMs);
      return true;
    } catch { active = false; onError?.('start-failed'); return false; }
  }

  function resetSilence(ms) {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      if (active) {
        onSilenceCb?.();
        try { rec && rec.stop(); } catch {}
      }
    }, ms);
  }

  function stop() {
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
    if (rec) { try { rec.onend = null; rec.onerror = null; rec.onresult = null; rec.stop(); } catch {} rec = null; }
    active = false; lastInterim = ''; accumulatedFinal = '';
  }

  return { supported, start, stop, isActive: () => active };
})();
