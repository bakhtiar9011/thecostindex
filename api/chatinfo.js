export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  const { text, profile, experience, education, skills, additional } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Missing text" });
  }

  // Build a concise context string
  const context = `
    Profile: ${JSON.stringify(profile || {}, null, 2)}
    Experience: ${JSON.stringify(experience || [], null, 2)}
    Education: ${JSON.stringify(education || [], null, 2)}
    Skills: ${JSON.stringify(skills || [], null, 2)}
    Additional Info: ${JSON.stringify(additional || {}, null, 2)}
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
        messages: [
          { role: "system", content: "You are a helpful assistant that uses provided user data to answer questions." },
          { role: "user", content: `${context}\nQuestion: ${text}` }
        ],
        temperature: 0.7
      }),
    });

    const data = await openaiRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || null;

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("OpenAI API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
