export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Only POST allowed" });
  
    const { prompt } = req.body;
  
    try {
      const response = await fetch('https://gemini-api3.p.rapidapi.com/generate', {
        method: 'POST',
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': 'gemini-api3.p.rapidapi.com',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
  
      const data = await response.json();
      const description = data?.text || data?.output || null;
      return res.status(200).json({ description });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  