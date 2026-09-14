import { $, esc, toast } from '../utils.js';
import { Repo } from '../storage.js';

const TESTS = [
  { id: 't1', title: 'Basic Grammar', category: 'grammar', level: 'Beginner',
    questions: [
      { q: 'She ___ to the market yesterday.', options: ['go', 'went', 'goes', 'going'], answer: 1 },
      { q: 'I have been working here ___ two years.', options: ['since', 'for', 'from', 'at'], answer: 1 },
      { q: 'He ___ a mistake.', options: ['did', 'made', 'do', 'does'], answer: 1 },
      { q: 'We should ___ about this later.', options: ['discuss about', 'discuss', 'discussing', 'to discuss'], answer: 1 },
      { q: 'I ___ tired after the gym.', options: ['am very', 'very am', 'am much', 'much am'], answer: 0 }
    ]},
  { id: 't2', title: 'Past Tense', category: 'grammar', level: 'Elementary',
    questions: [
      { q: 'Last night I ___ a movie.', options: ['watch', 'watched', 'watching', 'watches'], answer: 1 },
      { q: 'They ___ to Delhi last week.', options: ['go', 'goes', 'went', 'gone'], answer: 2 },
      { q: 'I ___ him at the party.', options: ['meet', 'met', 'meeting', 'meets'], answer: 1 },
      { q: 'She ___ her homework.', options: ['do', 'does', 'did', 'done'], answer: 2 },
      { q: 'We ___ very tired.', options: ['was', 'were', 'are', 'is'], answer: 1 }
    ]},
  { id: 't3', title: 'Office English', category: 'professional', level: 'Intermediate',
    questions: [
      { q: 'How would you politely tell your boss the report is late?', options: [
        'I could not do it.',
        'I apologize — the report is running slightly behind schedule.',
        'Report not ready.',
        'It is late.'
      ], answer: 1 },
      { q: 'Which is more natural for a meeting?', options: [
        'Let us discuss about the plan.',
        'Let us discuss the plan.',
        'Let us discuss on the plan.',
        'Let us discuss to the plan.'
      ], answer: 1 },
      { q: 'How do you ask to revisit a topic?', options: [
        'Come back later.',
        'Could we circle back on this?',
        'Talk later.',
        'Do later.'
      ], answer: 1 },
      { q: 'How do you say you will update someone soon?', options: [
        'I will tell you.',
        'I\'ll keep you posted.',
        'I will call.',
        'Wait.'
      ], answer: 1 },
      { q: 'How do you ask for time politely?', options: [
        'Give me time.',
        'Could you give me some time on this?',
        'I need time.',
        'Time please.'
      ], answer: 1 }
    ]}
];

export function renderTests() {
  $('#app').innerHTML = `
    <div class="wrap" style="max-width:760px;padding:0 16px 60px">
      <div class="page-head"><h1>Tests</h1><p>Verify your progress with quick self-tests.</p></div>
      <div class="grid g2" style="margin-top:20px">
        ${TESTS.map(t => `<div class="panel">
          <h2>${esc(t.title)}</h2>
          <p class="tiny" style="margin-bottom:12px">${esc(t.level)} · ${t.questions.length} questions</p>
          <button class="btn btn-primary btn-sm" data-test="${t.id}">Start test</button>
        </div>`).join('')}
      </div>
    </div>`;

  document.querySelectorAll('[data-test]').forEach(b => {
    b.onclick = () => startTest(TESTS.find(t => t.id === b.dataset.test));
  });
}

function startTest(test) {
  let idx = 0, correct = 0;
  const root = $('#app');

  function render() {
    if (idx >= test.questions.length) {
      const score = Math.round((correct / test.questions.length) * 100);
      const passed = score >= 60;
      root.innerHTML = `
        <div class="wrap" style="max-width:520px;padding:0 16px 60px;text-align:center">
          <div class="panel" style="margin-top:40px">
            <div style="font-size:52px;margin-bottom:10px">${passed ? '🎉' : '💪'}</div>
            <h1 style="margin:0 0 8px">${passed ? 'Well done!' : 'Keep practising'}</h1>
            <p style="font-size:36px;font-weight:800;color:${passed ? 'var(--ok)' : 'var(--warn)'};margin:14px 0">${score}</p>
            <p style="color:var(--muted);margin:0 0 20px">${correct} of ${test.questions.length} correct</p>
            <button class="btn btn-primary" id="backTests">Back to tests</button>
          </div>
        </div>`;
      $('#backTests').onclick = renderTests;
      return;
    }

    const q = test.questions[idx];
    root.innerHTML = `
      <div class="wrap" style="max-width:620px;padding:0 16px 60px">
        <div class="page-head">
          <p style="margin:0 0 4px;font-size:13px;color:var(--dim)">Question ${idx + 1} of ${test.questions.length}</p>
          <h1 style="font-size:20px">${esc(test.title)}</h1>
        </div>
        <div class="panel" style="margin-top:20px">
          <p style="font-size:17px;font-weight:600;margin:0 0 18px">${esc(q.q)}</p>
          <div style="display:grid;gap:10px">
            ${q.options.map((o, i) => `<button class="btn btn-ghost" style="justify-content:flex-start;text-align:left;padding:14px 16px" data-opt="${i}">${esc(o)}</button>`).join('')}
          </div>
        </div>
      </div>`;
    document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => {
      const chosen = parseInt(b.dataset.opt);
      if (chosen === q.answer) correct++;
      idx++;
      render();
    });
  }
  render();
}