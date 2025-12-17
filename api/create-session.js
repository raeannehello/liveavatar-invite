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

    const tokenJson = await tokenRes.json();
    
    if (!tokenRes.ok || !tokenJson.data) {
      return res.status(500).json({ 
        error: 'Token creation failed', 
        details: tokenJson 
      });
    }

    // Token is inside data object
    const { session_id, session_token } = tokenJson.data;

    const startRes = await fetch('https://api.liveavatar.com/v1/sessions/start', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session_token}`,
        'Content-Type': 'application/json'
      }
    });

    const startJson = await startRes.json();

    if (!startRes.ok || !startJson.data) {
      return res.status(500).json({ 
        error: 'Session start failed', 
        details: startJson 
      });
    }

    // Response data is also inside data object
    const data = startJson.data;

    return res.status(200).json({
      session_id,
      session_token,
      livekit_url: data.livekit_url,
      livekit_client_token: data.livekit_client_token,
      room_name: data.room_name || session_id
    });

  } catch (error) {
    return res.status(500).json({ error: 'Unexpected error', details: error.message });
  }
}
