import { supabase } from './supabaseClient.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { data, error } = await supabase
      .from('waitlist')  // Replace with any existing table
      .select('*')
      .limit(1); // just one row to test

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Connected to Supabase!', data });
  } catch (err) {
    console.error('Catch error:', err);
    return res.status(500).json({ error: err.message });
  }
}
