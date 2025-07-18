import { supabase } from './supabaseClient.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    try {
        // Minimal query to keep DB alive
        const { data, error } = await supabase
        .from('waitlist')  // <-- use any small table
        .select('id')
        .limit(1);

        if (error) {
        console.error("Supabase ping error:", error.message);
        return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ message: "Supabase is alive", data });
    } catch (err) {
        console.error("Catch error in keepalive:", err.message);
        return res.status(500).json({ error: err.message });
    }
}
