import { uid, pick } from '../utils.js';
import { AI } from '../ai/provider.js';
import { UserMemory, TutorMemory, elaborateTutorStory } from '../ai/memory.js';
import { ConversationBrain, detectMeta, WILDCARD_QUESTIONS, extractDetails, detectTopics } from '../ai/brain.js';
import { Mood } from '../ai/mood.js';
import { Mastery, buildIndirectPrompt } from '../ai/mastery.js';
import { Agenda, extractSideTopics } from '../ai/agenda.js';
import { LifeStore } from '../ai/lifeStore.js';
import { Repo } from '../storage.js';
import { TTS } from '../speech/tts.js';
import { STT } from '../speech/stt.js';
import { CONFIG } from '../config.js';

const esc = (s) => String(s || '').replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;');

const setState = (state, text, hint) => {
  const mic = document.getElementById('micBtn');
  const stage = document.getElementById('stage');
  const status = document.getElementById('status');
  const hintEl = document.getElementById('micHint');
  const icon = document.getElementById('micIcon');
  if (!mic) return;
  mic.dataset.state = state;
  if (stage) stage.dataset.state = state;
  if (status && text) { status.textContent = text; status.dataset.s = state; }
  if (hintEl && hint) hintEl.textContent = hint;
  const icons = { idle: '🎤', listening: '⏹', processing: '⏳', speaking: '🔊', correcting: '✋' };
  if (icon) icon.textContent = icons[state] || '🎤';
};

const pushTurn = (who, text, name) => {
  const el = document.getElementById('turns');
  if (!el) return;
  const div = document.createElement('div');
  div.className = `turn ${who}`;
  const label = who === 'user' ? 'You' : (name || 'Tutor');
  div.innerHTML = `<div class="bub"><div class="who">${esc(label)}</div><div>${esc(text)}</div></div>`;
  el.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

const showCorrection = (display) => {
  const box = document.getElementById('correctionBox');
  if (!box || !display) return;
  const reasons = display.reasons || [];
  const alts = display.alternatives || {};
  const vocab = display.vocab || [];
  box.innerHTML = `
    <div class="lbl">Quick fix</div>
    <div class="correction-row"><span class="x">✕</span><span class="strike">${esc(display.original)}</span></div>
    <div class="correction-row"><span class="y">✓</span><span>${esc(display.corrected)}</span></div>
    ${reasons.length ? `<div class="why"><div class="why-title">Why</div><ul>${reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}
    ${vocab.length ? `<div class="alts"><div class="alts-title">Nicer words</div>${vocab.map(v => `<div class="alt"><b>${esc(v.from)}</b> → <span class="q">"${esc(v.to)}"</span> — ${esc(v.note)}</div>`).join('')}</div>` : ''}
    ${(alts.native || alts.professional) ? `<div class="alts"><div class="alts-title">You can also say</div>
      ${alts.native ? `<div class="alt"><b>Casual:</b> <span class="q">"${esc(alts.native)}"</span></div>` : ''}
      ${alts.professional ? `<div class="alt"><b>Professional:</b> <span class="q">"${esc(alts.professional)}"</span></div>` : ''}
    </div>` : ''}`;
  box.classList.add('show');
  setState('correcting', 'Correction');
};

const hideCorrection = () => {
  const box = document.getElementById('correctionBox');
  if (box) box.classList.remove('show');
};

export function createEngine({ scenario, level, user, onEnd }) {
  UserMemory.load();
  TutorMemory.load();
  TutorMemory.reset();
  Mastery.load();
  Agenda.load();
  Mood.reset();
  ConversationBrain.init(scenario);

  const state = {
    scenario, level,
    user,
    turnCount: 0,
    correctionsUsed: 0,
    turnsSinceLastCorrection: 99,
    words: [], confidences: [], mistakes: [],
    startedAt: Date.now(),
    endedAt: 0,
    awaitingRepeat: null,
    repeatAttempts: 0,
    continuous: Repo.getSettings().continuousMode,
    speaking: false,
    listening: false,
    lastTurnAt: Date.now(),
    lastTopic: null,
    masteryNotedThisSession: []
  };

  let life = null;
  let seedsThisSession = [];

  function tutorName() { return life?.identity?.name || 'Nancy'; }
  function tutorGender() { return 'female'; }

  function speak(text, kind = 'question', onDone) {
    state.speaking = true;
    setState('speaking', kind === 'correction' ? 'Correction' : 'Tutor speaking');
    const el = document.getElementById('tutorSay');
    if (el) el.textContent = text;
    if (!TTS.supported) {
      state.speaking = false;
      setTimeout(() => { setState('idle', 'Your turn — tap the mic'); onDone?.(); }, 700);
      return;
    }
    TTS.speak(text, {
      gender: tutorGender(),
      onEnd: () => {
        state.speaking = false;
        if (state.continuous && kind !== 'ack') startListening();
        else setState('idle', 'Your turn — tap the mic');
        onDone?.();
      }
    });
  }

  function startListening() {
    if (!STT.supported) { setState('idle', 'Speech recognition not supported'); return; }
    if (state.listening) return;
    state.listening = true;
    setState('listening', 'Listening…', 'Speak now');
    const interimEl = document.getElementById('interim');
    if (interimEl) { interimEl.classList.add('show'); interimEl.innerHTML = '<b>…</b>'; }

    const settings = Repo.getSettings();
    STT.start({
      lang: settings.sttLang || 'en-IN',
      silenceMs: settings.silenceMs || CONFIG.silenceTimeout,
      onInterim: (t) => { if (interimEl) interimEl.innerHTML = `<b>${esc(t)}</b>`; },
      onFinal: (text) => {
        state.listening = false;
        if (interimEl) { interimEl.classList.remove('show'); interimEl.innerHTML = ''; }
        if (text.trim()) handleUtterance(text);
        else setState('idle', 'Your turn');
      },
      onError: (err) => {
        state.listening = false;
        if (interimEl) { interimEl.classList.remove('show'); interimEl.innerHTML = ''; }
        const msgs = { 'not-allowed': 'Microphone access denied.', 'no-speech': "I didn't catch that.", 'audio-capture': 'No microphone.', 'network': 'Speech needs internet.', 'start-failed': 'Microphone failed.' };
        setState('idle', 'Your turn');
        if (msgs[err]) window.__toast?.(msgs[err]);
      },
      onEnd: () => {
        state.listening = false;
        if (document.getElementById('micBtn')?.dataset.state === 'listening') setState('idle', 'Your turn');
      }
    });
  }

  function stopListening() {
    STT.stop();
    state.listening = false;
    const interimEl = document.getElementById('interim');
    if (interimEl) { interimEl.classList.remove('show'); interimEl.innerHTML = ''; }
  }

  async function handleUtterance(text) {
    setState('processing', 'Thinking…');
    hideCorrection();

    const replyMs = Date.now() - state.lastTurnAt;
    state.lastTurnAt = Date.now();

    state.turnCount++;
    state.words.push(...text.split(/\s+/).filter(Boolean));
    pushTurn('user', text);
    Mood.observe(text, { replyMs });
    extractSideTopics(text).forEach(t => Agenda.noteSideTopic('user', t, text.slice(0, 80)));
    Agenda.recordUserTurn();

    const mode = CONFIG.correctionModes[Repo.getSettings().correctionMode] || CONFIG.correctionModes.balanced;

    /* 1. Repeat verify */
    if (state.awaitingRepeat) {
      const sim = similarity(text, state.awaitingRepeat.corrected);
      if (sim >= 0.6) {
        if (state.masteryNotedThisSession.includes(state.awaitingRepeat.corrected)) {
          Mastery.userUsed(state.awaitingRepeat.corrected, state.lastTopic || 'general', false);
        }
        state.awaitingRepeat = null;
        state.repeatAttempts = 0;
        state.turnsSinceLastCorrection = 0;
        speak("Yeah, that's it.", 'ack');
        setTimeout(() => continueConversation(), 1200);
        return;
      }
      state.repeatAttempts++;
      if (state.repeatAttempts < 2) {
        speak(`Not quite. Once more: "${state.awaitingRepeat.corrected}"`, 'correction');
        return;
      }
      state.awaitingRepeat = null;
      state.repeatAttempts = 0;
      speak("No worries, we'll come back to it.", 'ack');
      setTimeout(() => continueConversation(), 1400);
      return;
    }

    /* 2. Reference to tutor's story */
    const ref = TutorMemory.findReferenced(text);
    if (ref) {
      const elab = elaborateTutorStory(ref, text);
      const reply = elab;
      pushTurn('tutor', reply, tutorName());
      speak(reply, 'ack');
      return;
    }

    /* 3. Meta complaint */
    if (detectMeta(text)) {
      const ack = pick(["Ah, fair point — I keep opening with that. It's a habit.", "Yeah, you're right. My bad.", 'Fair enough, let me change it up.']);
      const recall = UserMemory.naturalRecall();
      let reply;
      if (recall) reply = `${ack} Actually — ${recall}`;
      else {
        const fresh = pick(WILDCARD_QUESTIONS.filter(q => !ConversationBrain.recentWildcards.includes(q)));
        ConversationBrain.recentWildcards.push(fresh);
        reply = `${ack} New question: ${fresh}`;
      }
      ConversationBrain.topics.forEach(t => { t.exchanges = 99; });
      pushTurn('tutor', reply, tutorName());
      speak(reply, 'ack');
      return;
    }

    /* 4. Confusion */
    if (/\b(i (didn'?t|don'?t) (get|understand)|can you (explain|say it) (again|simpler)|simpler please)\b/i.test(text)) {
      const last = state.awaitingRepeat;
      if (last) {
        const reply = `Okay, let me say it slower. You said: "${last.original}". Instead: "${last.corrected}". ${last.explanation || ''}`;
        pushTurn('tutor', reply, tutorName());
        speak(reply, 'correction');
        return;
      }
    }

    /* 5. Memory ingest */
    const preDetails = extractDetails(text);
    const preTopics = detectTopics(text, preDetails);
    UserMemory.ingest(text);

    /* 6. Language check */
    const lang = await AI.detectLanguage(text);
    if (lang !== 'english') {
      const assist = await AI.generateHindiAssist(text);
      state.mistakes.push({ id: uid(), category: 'Hindi → English', severity: 'medium', label: 'Said in Hindi', explanation: 'Try in English.', original: text, corrected: assist.display?.corrected || '—' });
      showCorrection(assist.display);
      pushTurn('tutor', assist.speech, tutorName());
      speak(assist.speech, 'correction');
      state.awaitingRepeat = { corrected: assist.display?.corrected || '', original: text, explanation: '' };
      return;
    }

    /* 7. Grammar + vocab */
    const result = await AI.analyzeGrammar(text);
    const vocab = AI.vocabUpgrades(text);
    const significant = result.mistakes.filter(m => mode.interrupt.includes(m.severity));

    state.mistakes.push(...result.mistakes.map(m => ({
      id: uid(), category: m.category, original: m.original, corrected: m.corrected,
      explanation: m.explanation || m.label, severity: m.severity
    })));

    const priority = significant[0]?.severity || (vocab.length ? 'medium' : 'low');
    const canCorrect = Mood.canCorrect(state.correctionsUsed, priority) && state.turnsSinceLastCorrection >= 2 && state.correctionsUsed < 3;

    if ((significant.length || vocab.length) && canCorrect) {
      const corr = await AI.generateCorrection(text, result.corrected, result.mistakes, vocab);
      showCorrection(corr.display);
      pushTurn('tutor', corr.speech.split('Say it once:')[0] + 'Say it once.', tutorName());
      speak(corr.speech, 'correction');
      state.correctionsUsed++;
      state.turnsSinceLastCorrection = 0;
      state.masteryNotedThisSession.push(result.corrected);
      Mastery.introduce(result.corrected, { said: text, type: vocab.length ? 'vocab' : 'phrase' });
      state.awaitingRepeat = { corrected: result.corrected, original: text, explanation: significant[0]?.explanation || '' };
      return;
    }

    if (significant.length) Mastery.note(text, result.corrected, { type: 'phrase' });

    state.turnsSinceLastCorrection++;

    /* 8. Turn-taking — Nancy shares her own seed */
    if (Agenda.shouldTakeTurn()) {
      const seed = Agenda.getNextSeed();
      if (seed) {
        const { details } = ConversationBrain.ingest(text);
        const reaction = generateReactionSafe(text, details);
        const combined = `${reaction} So — ${seed.text}`;
        pushTurn('tutor', seed.text, tutorName());
        speak(combined, 'question');
        Agenda.markSeedTold(seed.index, seed.id);
        Agenda.resetUserTurns();
        return;
      }
    }

    /* 9. Normal continuation */
    const { details } = ConversationBrain.ingest(text);
    const brain = ConversationBrain.respond(text, details);

    let extra = '';
    // Indirect verification
    const dueItems = Mastery.getDueItems(1);
    if (dueItems.length && state.turnCount > 4 && Math.random() < 0.4) {
      extra = ' ' + buildIndirectPrompt();
    }
    // Side topic callback
    const dueSide = Agenda.getDueSideTopics();
    if (dueSide.length && state.turnCount > 6 && Math.random() < 0.2) {
      extra = ` By the way — you mentioned your ${dueSide[0].topic} a while ago. How's that going?`;
    }

    const combined = `${brain.reaction}${extra} ${brain.question}`.replace(/\s+/g, ' ').trim();
    pushTurn('tutor', brain.question, tutorName());
    speak(combined, brain.kind);
    state.lastTopic = brain.topicLabel || state.lastTopic;
  }

  function generateReactionSafe(text, details) {
    const brain = ConversationBrain.respond('', details);
    return brain.reaction;
  }

  function continueConversation() {
    const brain = ConversationBrain.respond('', {});
    const combined = `${brain.reaction ? brain.reaction + ' ' : ''}${brain.question}`;
    pushTurn('tutor', brain.question, tutorName());
    speak(combined, brain.kind);
  }

  function similarity(a, b) {
    const norm = s => String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const A = new Set(norm(a)), B = new Set(norm(b));
    if (!A.size || !B.size) return 0;
    let inter = 0; A.forEach(w => { if (B.has(w)) inter++; });
    return inter / Math.max(A.size, B.size);
  }

  async function start() {
    // Init Nancy's life
    const role = await LifeStore.getRole(user.profession || 'general');
    life = await LifeStore.getLife(role);
    const dailyState = generateDailyForRole(life);

    const greeting = `Hey, I'm ${tutorName()}. I'm a ${life.identity.role.toLowerCase()} in ${life.identity.city}. ${dailySmallTalk(dailyState, life)}`;

    // Session seeds from life
    seedsThisSession = (life.seeds || []).slice(0, 3);
    Agenda.startSession(seedsThisSession);

    const firstQ = scenario.questions[0];
    const opener = `${greeting} So — ${firstQ[0].toLowerCase() + firstQ.slice(1)}`;
    pushTurn('tutor', opener, tutorName());
    setTimeout(() => speak(opener, 'question'), 400);
  }

  function generateDailyForRole(life) {
    const seed = new Date().getFullYear() * 10000 + (new Date().getMonth() + 1) * 100 + new Date().getDate();
    const r = (n) => { const x = Math.sin(seed + n) * 10000; return x - Math.floor(x); };
    const p = (arr, n) => arr[Math.floor(r(n) * arr.length)];
    return {
      mood: p(['good', 'a bit tired', 'fresh', 'lazy', 'energetic', 'a little low'], 1),
      weather: p(['a bit gloomy', 'surprisingly nice', 'very hot', 'raining on and off'], 2)
    };
  }

  function dailySmallTalk(d, life) {
    return pick([
      `It's been ${d.weather} here and I'm feeling ${d.mood}.`,
      `I'm ${d.mood} today.`,
      `Honestly ${d.mood}.`
    ]);
  }

  function toggleMic() {
    if (state.speaking) { TTS.cancel(); state.speaking = false; setState('idle', 'Your turn'); return; }
    if (state.listening) { stopListening(); setState('idle', 'Your turn'); return; }
    startListening();
  }

  function setContinuous(on) {
    state.continuous = on;
    Repo.setSettings({ continuousMode: on });
    if (on && !state.speaking && !state.listening) startListening();
    if (!on) stopListening();
  }

  async function end() {
    stopListening();
    TTS.cancel();
    state.endedAt = Date.now();
    const session = {
      id: uid(),
      userId: user.id,
      scenario: scenario.id,
      scenarioName: scenario.name,
      level: state.level,
      startedAt: state.startedAt,
      endedAt: state.endedAt,
      duration: Math.round((state.endedAt - state.startedAt) / 1000),
      turnCount: state.turnCount,
      wordCount: state.words.length,
      words: state.words,
      confidences: state.confidences,
      mistakes: state.mistakes
    };
    session.scores = await AI.evaluateSpeaking(session);
    Repo.addSession(session);
    Repo.addMistakes(session.mistakes.map(m => ({ ...m, sessionId: session.id, createdAt: Date.now() })));
    Repo.addUsage(session.duration, 1);
    Mastery.save();
    return session;
  }

  return { start, toggleMic, setContinuous, end, state, getLife: () => life };
}
