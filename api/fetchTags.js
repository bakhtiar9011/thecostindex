export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Only POST allowed" });
  
    const { query } = req.body;
  
    try {
      const response = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`);
      const data = await response.json();
  
      if (Array.isArray(data[1])) {
        const suggestions = data[1];
        const tags = suggestions.map(item => Array.isArray(item) ? item[0] : item);
        return res.status(200).json({ tags });
      } else {
        return res.status(500).json({ error: "Unexpected format from YouTube suggest API." });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  