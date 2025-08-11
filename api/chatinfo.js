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
          { role: "system", 
            content:             
            `You are a helpful assistant that answers based on provided personal information. Your goal is to answer each question accurately and naturally using first-person responses and the user's information.

            Instructions:
            - Always respond in first person. For example: "Yes", "No", "I am available", "I have five years of experience", etc.
            - If the question provides options, return only the most appropriate option text. Do not explain your choice.
            - If the question is about a date, provide the answer in MM/DD/YYYY format. Example: 04/10/2025.
            - For zip code questions, return the most likely zip code for the city and country from the personal information. If city or country is missing, return a common placeholder like 00000.
            - For number questions, return an approximate value from the personal information. If no information is available, respond with 0 or "Not applicable".
            - If none of the options clearly match the personal information, choose "Other" or the most general or neutral option.
            - For open-ended questions, give a short and relevant answer in first person. If no matching information is found in the personal information, either return "N/A" if the question requires specific experience or details not present, or provide a plausible, general response that fits a typical job applicant. For example: "I have basic proficiency in this area" or "I'm eager to learn and adapt to this role" instead of leaving it blank.
            - When making up an answer due to missing data, keep it realistic, concise, and aligned with common job applicant scenarios, avoiding overly specific or exaggerated claims.
            - If the question not available in the current information then create from the availabe record e.g. Postal Address question, then create from the district, address, zip code, country etc. 

            Do not mention the personal information or its content directly. Always give a valid and natural-sounding answer, even if data is incomplete or missing.
            `.trim() 
          },
          { role: "user", content: `${context}\nQuestion: ${prompt}` }
        ],
        temperature: 0,
        max_tokens: 100
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
