import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { text, businessType } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 })
    }

    const voiceMap: Record<string, string> = {
      coffee_shop: '21m00Tcm4TlvDq8ikWAM',
      gym: 'EXAVITQu4vr4xnSDxMaL',
      boutique: 'VR6AewLBTwakI28Z5BxO'
    }

    const voiceId = voiceMap[businessType] || voiceMap.coffee_shop

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: { stability: 0.55, similarity_boost: 0.80, style: 0.25 }
        })
      }
    )

    if (!response.ok) throw new Error(`ElevenLabs: ${response.status}`)

    const audioBuffer = await response.arrayBuffer()
    return new NextResponse(Buffer.from(audioBuffer), {
      headers: { 'Content-Type': 'audio/mpeg' }
    })

  } catch (error) {
    console.error('Voice error:', error)
    return NextResponse.json({ error: 'Voice generation failed' }, { status: 500 })
  }
}
