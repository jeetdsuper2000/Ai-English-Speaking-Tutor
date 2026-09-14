const OFFLINE_MAP = {
  'software': 'ux_designer', 'developer': 'ux_designer', 'coder': 'ux_designer', 'engineer': 'ux_designer',
  'data': 'product_manager', 'product': 'product_manager',
  'doctor': 'physiotherapist', 'nurse': 'hospital_counsellor',
  'teacher': 'art_teacher', 'professor': 'researcher',
  'hr': 'recruiter', 'recruit': 'recruiter',
  'sales': 'marketing_manager', 'marketing': 'marketing_manager',
  'ca': 'financial_writer', 'accountant': 'financial_writer',
  'lawyer': 'paralegal', 'chef': 'food_blogger',
  'student': 'student', 'business': 'freelance_consultant',
  'designer': 'illustrator', 'photographer': 'content_creator',
  'architect': 'interior_designer'
};

export function offlineDetectRole(profession) {
  const lower = String(profession || '').toLowerCase();
  for (const [k, role] of Object.entries(OFFLINE_MAP)) {
    if (lower.includes(k)) return role;
  }
  return 'freelance_writer';
}

export async function detectRole(profession, userId) {
  const lower = String(profession || '').toLowerCase().trim();
  const cacheKey = `fluentai.role.${userId}`;

  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const data = JSON.parse(cached);
    if (data.profession === lower) return data.role;
  }

  let role = offlineDetectRole(profession);

  // Try online LLM if configured
  try {
    const res = await fetch('/api/ai/detect-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profession })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.role) role = data.role;
    }
  } catch {}

  localStorage.setItem(cacheKey, JSON.stringify({ profession: lower, role, detectedAt: Date.now() }));
  return role;
}