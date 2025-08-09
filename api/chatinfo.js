export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  
    const { text, profile, experience, education, skills, additional } = req.body;
  
    if (!text) return res.status(400).json({ error: "Missing `text` field" });
  
    // Build context string from stored data
    const context = `
    User Profile: ${JSON.stringify(profile || {}, null, 2)}
    Experience: ${JSON.stringify(experience || [], null, 2)}
    Education: ${JSON.stringify(education || [], null, 2)}
    Skills: ${JSON.stringify(skills || [], null, 2)}
    Additional Info: ${JSON.stringify(additional || {}, null, 2)}
    `;
  
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful assistant that answers based on the given personal information." },
            { role: "user", content: `${context}\n\nQuestion: ${text}` }
          ],
          max_tokens: 300
        })
      });
  
      const data = await response.json();
  
      if (data.choices?.[0]?.message?.content) {
        return res.status(200).json({ reply: data.choices[0].message.content });
      } else {
        return res.status(500).json({ error: "No response from OpenAI" });
      }
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
  