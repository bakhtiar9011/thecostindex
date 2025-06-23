import { supabase } from './supabaseClient';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*'); // or specific origin
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // if (req.method === 'OPTIONS') {
    //     res.status(200).end(); // CORS preflight
    //     return;
    // }

    // const { email, password } = req.body;

    // const { data, error } = await supabase.auth.signInWithPassword({
    //     email,
    //     password
    // });

    // if (error) return res.status(401).json({ error: error.message });

    return res.status(200).json({ status: "success" });
}
