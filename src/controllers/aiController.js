const Groq = require('groq-sdk');
const Member = require('../models/Member');
const resolveGym = require('../utils/resolveGym');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a certified fitness and nutrition coach working inside a gym management system. Given a member's profile, generate a practical, personalised diet and exercise plan.

Return ONLY valid JSON in exactly this structure:
{
  "diet": {
    "title": "short plan title",
    "notes": "overall guidance: calorie target, meal timing, hydration",
    "items": [
      "Breakfast (7 AM): example meal",
      "Mid-morning (10 AM): example snack"
    ]
  },
  "exercise": {
    "title": "short plan title",
    "notes": "frequency, session length, rest days, progression note",
    "routine": [
      { "name": "Exercise name", "detail": "3×10 or 20 min" }
    ]
  }
}

Rules:
- Diet: 5–6 meals/snacks. Strictly respect the member's diet type and any listed allergies.
- Exercise: 6–10 exercises with concrete sets/reps or duration.
- Never recommend anything contraindicated by listed medical conditions or injuries.
- Use plain, practical language a gym trainer can explain directly.`;

// POST /api/ai/members/:id/suggest
exports.generatePrograms = async (req, res) => {
  const gym = await resolveGym(req, res);
  if (!gym) return;

  const member = await Member.findOne({ _id: req.params.id, gym: gym._id })
    .populate('user', 'firstName lastName dateOfBirth');

  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }

  const u = member.user;
  const p = member.physique || {};
  const d = member.diet    || {};
  const g = member.goal    || {};
  const h = member.health  || {};

  const ageYears = u.dateOfBirth
    ? Math.floor((Date.now() - new Date(u.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const bmi = p.height && p.weight
    ? (p.weight / ((p.height / 100) ** 2)).toFixed(1)
    : null;

  const profile = [
    `Name: ${u.firstName} ${u.lastName}`,
    ageYears              ? `Age: ${ageYears} years`                        : null,
    p.height              ? `Height: ${p.height} cm`                        : null,
    p.weight              ? `Weight: ${p.weight} kg`                        : null,
    bmi                   ? `BMI: ${bmi}`                                   : null,
    p.bodyType            ? `Body type: ${p.bodyType}`                      : null,
    d.type                ? `Diet preference: ${d.type}`                    : null,
    d.allergies?.length   ? `Allergies: ${d.allergies.join(', ')}`          : null,
    d.supplements         ? `Supplements: ${d.supplements}`                 : null,
    g.primary             ? `Goal: ${g.primary.replace(/-/g, ' ')}`         : null,
    g.targetWeight        ? `Target weight: ${g.targetWeight} kg`           : null,
    g.notes               ? `Goal notes: ${g.notes}`                        : null,
    h.medicalConditions   ? `Medical conditions: ${h.medicalConditions}`    : null,
    h.injuries            ? `Past injuries: ${h.injuries}`                  : null,
    h.notes               ? `Health notes: ${h.notes}`                      : null,
  ].filter(Boolean).join('\n');

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 2048,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: `Generate a personalised plan for this gym member:\n\n${profile}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? '';

  let programs;
  try {
    programs = JSON.parse(raw);
  } catch {
    return res.status(500).json({ success: false, message: 'AI returned an unexpected response. Please try again.' });
  }

  res.status(200).json({ success: true, data: programs });
};
