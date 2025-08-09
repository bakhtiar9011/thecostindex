export default async function handler(req, res) {
    // Allowed Chrome extension IDs
    const allowedExtensions = [
      "fiiakcafdaphhghjbeilcfmhdfgjhpgm",
      "gbjmjiljlpjaanhbpfecpiaalmndgcle",
      "kmknhjdnalbnbahlffgmbigngpkgpcpa",
      "pcllecleobolcjlfjebinmddmmndokcf"
    ];
  
    // Get the Origin header
    const origin = req.headers.origin || "";
  
    // Check if origin matches one of the allowed extensions
    const isAllowed = allowedExtensions.some(
      id => origin === `chrome-extension://${id}`
    );
  
    if (!isAllowed) {
      return res.status(403).json({ error: "Forbidden" });
    }
  
    // Set CORS for allowed extension
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
    // Handle preflight request
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
  
    // Only allow POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
  
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing `text` field" });
    }
  
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: text }],
          max_tokens: 100
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
  