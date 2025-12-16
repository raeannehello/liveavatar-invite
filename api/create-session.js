export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.LIVEAVATAR_API_KEY;
  const avatarId = process.env.AVATAR_ID;
  const voiceId = process.env.VOICE_ID;
  const contextId = process.env.CONTEXT_ID;

  if (!apiKey || !avatarId || !voiceId) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  try {
    const tokenBody = {
      mode: 'FULL',
      avatar_id: avatarId,
      avatar_persona: {
        voice_id: voiceId,
        language: 'en'
      }
    };
    
    if (contextId) {
      tokenBody.avatar_persona.context_id = contextId;
    }

    const tokenRes = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tokenBody)
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return res.status(500).json({ error: 'Token creation failed', details: err });
    }

    const { session_id, session_token } = await tokenRes.json();

    const startRes = await fetch('https://api.liveavatar.com/v1/sessions/start', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!startRes.ok) {
      const err = await startRes.text();
      return res.status(500).json({ error: 'Session start failed', details: err });
    }

    const data = await startRes.json();

    return res.status(200).json({
      session_id,
      session_token,
      livekit_url: data.livekit_url,
      livekit_client_token: data.livekit_client_token,
      room_name: data.room_name || session_id
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
