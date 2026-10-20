import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId, apiKey: clientApiKey } = await req.json();

    const apiKey = clientApiKey || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing ElevenLabs API Key. Please provide one in Reader Settings.' },
        { status: 400 }
      );
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required for TTS generation.' }, { status: 400 });
    }

    const selectedVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel default

    // Call ElevenLabs with timestamps
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}/with-timestamps`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text.slice(0, 4500), // Safety margin for chunk limit
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      audioBase64: data.audio_base64,
      alignment: data.alignment,
    });
  } catch (err: any) {
    console.error('ElevenLabs TTS error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate audio via ElevenLabs.' },
      { status: 500 }
    );
  }
}
