// api/create-session.js
// Creates a new LiveAvatar session and returns connection details

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate environment variables
  if (!process.env.LIVEAVATAR_API_KEY) {
    return res.status(500).json({ error: 'LIVEAVATAR_API_KEY not configured' });
  }
  if (!process.env.AVATAR_ID) {
    return res.status(500).json({ error: 'AVATAR_ID not configured' });
  }
  if (!process.env.VOICE_ID) {
    return res.status(500).json({ error: 'VOICE_ID not configured' });
  }

  try {
    // Step 1: Create session token
    const tokenPayload = {
      mode: 'FULL',
      avatar_id: process.env.AVATAR_ID,
      avatar_persona: {
        voice_id: process.env.VOICE_ID,
        language: 'en'
      }
    };

    // Add context_id only if provided
    if (process.env.CONTEXT_ID) {
      tokenPayload.avatar_persona.context_id = process.env.CONTEXT_ID;
    }

    const tokenResponse = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.LIVEAVATAR_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tokenPayload)
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Token creation failed:', errText);
      throw new Error(`Failed to create session token: ${tokenResponse.status}`);
    }

    const { session_id, session_token } = await tokenResponse.json();
    console.log('Created session:', session_id);

    // Step 2: Start the session
    const startResponse = await fetch('https://api.liveavatar.com/v1/sessions/start', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!startResponse.ok) {
      const errText = await startResponse.text();
      console.error('Session start failed:', errText);
      throw new Error(`Failed to start session: ${startResponse.status}`);
    }

    const sessionData = await startResponse.json();
    console.log('Session started, LiveKit URL:', sessionData.livekit_url);

    // Return all session info
    return res.status(200).json({
      session_id,
      session_token,
      livekit_url: sessionData.livekit_url,
      livekit_client_token: sessionData.livekit_client_token,
      room_name: sessionData.room_name || session_id
    });

  } catch (error) {
    console.error('Create session error:', error);
    return res.status(500).json({ error: error.message });
  }
}
