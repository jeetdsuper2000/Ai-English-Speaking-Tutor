import { uid } from '../utils.js';

const CACHE_PREFIX = 'fluentai.life.';

const ROLE_LABELS = {
  ux_designer: 'UX Designer',
  product_manager: 'Product Manager',
  physiotherapist: 'Physiotherapist',
  hospital_counsellor: 'Hospital Counsellor',
  art_teacher: 'Art Teacher',
  researcher: 'Researcher',
  recruiter: 'Recruiter',
  marketing_manager: 'Marketing Manager',
  financial_writer: 'Financial Writer',
  paralegal: 'Paralegal',
  food_blogger: 'Food Blogger',
  student: 'Student',
  freelance_consultant: 'Freelance Consultant',
  illustrator: 'Illustrator',
  content_creator: 'Content Creator',
  interior_designer: 'Interior Designer',
  freelance_writer: 'Freelance Writer'
};

const ROLE_SEEDS = {
  ux_designer: [
    { topic: 'work', text: "Argued with an engineer today about a button size. 4 pixels. He said it doesn't matter. I said it's the whole vibe." },
    { topic: 'work', text: "Client wants 'Apple-style but not Apple.' I've been staring at my screen for an hour." },
    { topic: 'work', text: "Figma crashed and I lost 2 hours of work. I sat there for ten minutes doing nothing." },
    { topic: 'work', text: "Presented designs to the team today. Felt like a teacher explaining things to kids." },
    { topic: 'family', text: "Papa asked me today — 'so you make pictures on computer?' I gave up explaining." },
    { topic: 'family', text: "Riya asked me to redesign her resume. Again. For the 4th time." }
  ],
  physiotherapist: [
    { topic: 'work', text: "Told a patient to do 10 minutes of stretching daily. Came back after a week — didn't do any of it." },
    { topic: 'work', text: "Another 25-year-old with back pain. Every single one says the same thing — 'I sit all day.'" },
    { topic: 'work', text: "One patient cried during a session today. It was happy crying. She could lift her arm again." },
    { topic: 'family', text: "Papa's knee is acting up. I told him to rest, he's gardening anyway." }
  ],
  art_teacher: [
    { topic: 'work', text: "One student painted a whole jungle in 30 minutes. Wild." },
    { topic: 'work', text: "Parent complained her son 'isn't drawing properly.' He's 6." },
    { topic: 'work', text: "Principal asked me to design the annual day poster. Again." },
    { topic: 'family', text: "Papa told his friend 'my daughter teaches drawing.' Close enough." }
  ],
  recruiter: [
    { topic: 'work', text: "Called 20 candidates today. 3 picked up. 1 was interested." },
    { topic: 'work', text: "A candidate said 'I want remote, 30 LPA, and 4-day week.' For a junior role." },
    { topic: 'work', text: "Closed a hiring today after 6 weeks. Felt like winning a small war." }
  ],
  default: [
    { topic: 'work', text: "Long day at work. Client wanted everything changed. Again." },
    { topic: 'work', text: "Finished something today that I'd been avoiding for a week." },
    { topic: 'family', text: "My sister borrowed my favourite kurti. Again. Without asking." },
    { topic: 'family', text: "Papa called and asked 'beta, khana khaya?' instead of asking about my career. That's progress." },
    { topic: 'personal', text: "Took a 2-hour nap and woke up confused about what year it is." },
    { topic: 'personal', text: "Had 4 coffees today. That's a problem, I know." },
    { topic: 'personal', text: "Delhi traffic ate 90 minutes of my life today." }
  ]
};

function buildFallbackLife(role) {
  const roleLabel = ROLE_LABELS[role] || 'Freelance Writer';
  const seeds = ROLE_SEEDS[role] || ROLE_SEEDS.default;
  return {
    role,
    identity: {
      name: 'Nancy',
      age: 28,
      city: 'Delhi',
      role: roleLabel,
      livesWith: 'her younger sister',
      loves: ['filter coffee', 'old Bollywood songs', 'Sunday naps'],
      hates: ['traffic', 'loud neighbours', 'cold weather']
    },
    family: {
      sister: { name: 'Riya', age: 25, trait: 'lives with Nancy, borrows her things' },
      mother: { trait: 'calls every Sunday, proud of her' },
      father: { trait: 'retired banker, doesn\'t fully understand her work' },
      cousin: { name: 'Pooja', trait: 'close friend, getting married soon' }
    },
    work: {
      struggles: ['tight deadlines', 'difficult clients', 'long days'],
      recentProject: 'working on something she\'s excited about'
    },
    seeds: seeds.map(s => ({ id: uid(), ...s })),
    humour: [
      { trigger: /tired|exhausted/i, line: "My sister would say you need a nap. She's not wrong." },
      { trigger: /client|boss|manager/i, line: "Clients. The only people who make 'let me think' sound like a threat." },
      { trigger: /food|hungry|eat/i, line: "My sister once ate my entire dinner and said 'I thought you weren't hungry.'" },
      { trigger: /marriage|shaadi|wedding/i, line: "Every family function, my bua ji asks when I'm getting married. I've started avoiding her." }
    ]
  };
}

export async function generateLife(role, userId) {
  const cacheKey = `${CACHE_PREFIX}${userId}`;

  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const data = JSON.parse(cached);
    if (data.role === role) return data;
  }

  let life = null;

  // Try online generation
  try {
    const res = await fetch('/api/ai/generate-life', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, user_id: userId })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.identity) life = data;
    }
  } catch {}

  if (!life) life = buildFallbackLife(role);

  const payload = { role, ...life, generatedAt: Date.now() };
  try { localStorage.setItem(cacheKey, JSON.stringify(payload)); } catch {}
  return payload;
}

export function getRoleLabel(role) { return ROLE_LABELS[role] || 'Freelance Writer'; }