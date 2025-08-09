export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  const { text, profile, experience, education, skills, additional } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text" });

  // Build a compact context to save tokens
  const context = `
Name: ${profile?.firstName || ''} ${profile?.lastName || ''}
Job Title: ${profile?.jobTitle || ''}
Email: ${profile?.email || ''}, Phone: ${profile?.phone || ''}
Experience: ${Array.isArray(experience) ? experience.map(e => `${e.role} at ${e.company}`).join('; ') : ''}
Education: ${Array.isArray(education) ? education.map(e => `${e.degree} in ${e.field}`).join('; ') : ''}
Skills: ${Array.isArray(skills) ? skills.join(', ') : ''}
Additional: ${additional ? Object.entries(additional).map(([cat, items]) =>
    `${cat}: ${items.map(i => `${i.key}=${i.value}`).join(', ')}`
  ).join('; ') : ''}
  `;

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messa
