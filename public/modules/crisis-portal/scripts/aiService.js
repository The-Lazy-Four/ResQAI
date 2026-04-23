// ============================================
// ResQAI Crisis Portal - AI Service
// ============================================

const AI_ENDPOINT = '/api/chat';

/**
 * Send a message to the AI and get a response
 * @param {string} message
 * @param {string} context - extra context injected into message
 * @returns {Promise<string>}
 */
export async function askAI(message, context = '') {
  const fullMessage = context ? `${context}\n\nUser: ${message}` : message;

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: fullMessage, language: 'en' }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.response || 'AI response unavailable.';
  } catch (err) {
    console.error('[aiService] Error:', err);
    return getFallbackResponse(message);
  }
}

/**
 * Get AI guidance for a specific SOS emergency type
 * @param {string} emergencyType - fire, medical, flood, etc.
 * @returns {Promise<string>}
 */
export async function getSOSGuidance(emergencyType) {
  const prompts = {
    fire: 'There is a FIRE emergency. Give me immediate step-by-step survival instructions. Be concise, urgent, numbered.',
    medical: 'There is a MEDICAL emergency. Give immediate first aid steps. Be concise, urgent, numbered.',
    safety: 'There is a WOMEN SAFETY emergency. Give immediate safety steps and who to call. Be concise.',
    child: 'There is a CHILD SAFETY emergency. Give immediate protective steps. Be concise.',
    quake: 'There is an EARTHQUAKE. Give immediate survival steps (drop cover hold, etc). Be concise, numbered.',
    flood: 'There is a FLOOD emergency. Give immediate steps to stay safe and evacuate. Be concise, numbered.',
    theft: 'There is a THEFT / CRIME emergency. Give immediate safety steps. Be concise.',
    other: 'There is a general EMERGENCY. Give immediate safety and survival steps. Be concise.',
    sos: 'CRITICAL SOS TRIGGERED. Give immediate survival checklist: stay safe, contact emergency services, and await help. Be very concise and reassuring.',
  };
  const prompt = prompts[emergencyType] || prompts.other;
  return askAI(prompt);
}

/**
 * Local fallback when API is unavailable
 */
function getFallbackResponse(message) {
  const msg = message.toLowerCase();
  if (msg.includes('fire'))
    return '🔥 FIRE: Evacuate immediately. Stay low. Use stairs. Pull fire alarm. Call 101.';
  if (msg.includes('medical') || msg.includes('ambulance'))
    return '🚑 MEDICAL: Call 108. Keep the person calm. Do not move them unless danger. Perform CPR if trained.';
  if (msg.includes('flood'))
    return '🌊 FLOOD: Move to higher ground immediately. Avoid walking in moving water. Call 112.';
  if (msg.includes('earthquake') || msg.includes('quake'))
    return '🌍 EARTHQUAKE: DROP, COVER, HOLD. Get under a table. Stay away from windows. After shaking stops, evacuate.';
  if (msg.includes('sos') || msg.includes('help'))
    return '🚨 EMERGENCY: Stay calm. Call 112. Broadcast your location. Help is on the way.';
  return '⚡ ResQAI: I\'m here to help. For immediate emergencies call 112. What do you need assistance with?';
}
