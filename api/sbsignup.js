import { supabase } from './supabaseClient.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { fullname, email, password } = req.body;

  if (!fullname || !email || !password) {
    return res.status(400).json({ error: 'Missing fullname, email or password' });
  }

  try {
    // Step 1: Sign up the user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      return res.status(400).json({ error: signUpError.message });
    }

    // Step 2: Check if already in waitlist
    const { data: existingData, error: fetchError } = await supabase
      .from('waitlist')
      .select('email')
      .eq('name', fullname)
      .eq('email', email);

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    if (existingData && existingData.length > 0) {
      return res.status(200).json({ message: 'User already exists in waitlist' });
    }

    // Step 3: Insert into waitlist
    const { error: insertError } = await supabase
      .from('waitlist')
      .insert([
        { name: fullname, email: email, provider: 'Email Provider', sub_status: true },
      ]);

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(201).json({ message: 'Account created successfully and added to waitlist' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}