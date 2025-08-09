export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  const { prompt, data } = req.body;
  if (!prompt || !data) {
    return res.status(400).json({ error: "Missing prompt or data" });
  }

  try {
    // Create a short, text-only context
    const { profile, experience, education, skills, additional } = data;
    const safeProfile = { ...profile };
    delete safeProfile.profileImage; // remove big base64

    const context = `
      Name: ${safeProfile.firstName || ''} ${safeProfile.lastName || ''}
      Job Title: ${safeProfile.jobTitle || ''}
      Email: ${safeProfile.email || ''}, Phone: ${safeProfile.phone || ''}
      Experience: ${Array.isArray(experience) ? experience.map(e => `${e.role} at ${e.company}`).join('; ') : ''}
      Education: ${Array.isArray(education) ? education.map(e => `${e.degree} in ${e.field}`).join('; ') : ''}
      Skills: ${Array.isArray(skills) ? skills.join(', ') : ''}
      Additional: ${additional ? Object.entries(additional).map(([cat, items]) =>
          `${cat}: ${items.map(i => `${i.key}=${i.value}`).join(', ')}`
        ).join('; ') : ''}
      `;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a helpful assistant that answers based on provided personal information." },
          { role: "user", content: `${context}\nQuestion: ${prompt}` }
        ],
        temperature: 0.7,
        max_tokens: 300
      }),
    });

    const dataRes = await openaiRes.json();
    console.log("OpenAI raw response:", JSON.stringify(dataRes, null, 2));

    const reply = dataRes?.choices?.[0]?.message?.content?.trim() || "No content returned";
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("OpenAI API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
