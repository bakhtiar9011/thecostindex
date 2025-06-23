import { supabase } from './supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

  const { fullname, email, password } = req.body;

  // Create user
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) return res.status(400).json({ error: error.message });

  // Check if user is in waitlist
  const { data: existing, error: fetchErr } = await supabase
    .from('waitlist')
    .select('name, email')
    .eq('name', fullname)
    .eq('email', email);

  if (fetchErr) return res.status(400).json({ error: fetchErr.message });

  if (existing && existing.length > 0) {
    return res.status(200).json({ message: 'User already in waitlist' });
  }

  // Insert into waitlist
  const { error: insertErr } = await supabase.from('waitlist').insert([
    {
      name: fullname,
      email: email,
      provider: 'Email Provider',
      sub_status: true
    }
  ]);

  if (insertErr) return res.status(500).json({ error: insertErr.message });

  return res.status(201).json({ message: 'Account created successfully' });
}
