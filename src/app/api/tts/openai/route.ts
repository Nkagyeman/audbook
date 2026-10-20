import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, voice, apiKey: clientApiKey, speed } = await req.json();

    const apiKey = clientApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing OpenAI API Key. Please provide one in Reader Settings.' },
        { status: 400 }
      );
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required for TTS generation.' }, { status: 400 });
    }

    const selectedVoice = voice || 'alloy';
    const playbackSpeed = typeof speed === 'number' ? Math.max(0.25, Math.min(4.0, speed)) : 1.0;

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        input: text.slice(0, 4096),
        voice: selectedVoice,
        response_format: 'mp3',
        speed: playbackSpeed,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const audioArrayBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioArrayBuffer).toString('base64');

    return NextResponse.json({
      audioBase64: base64Audio,
    });
  } catch (err: any) {
    console.error('OpenAI TTS error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate audio via OpenAI TTS.' },
      { status: 500 }
    );
  }
}
