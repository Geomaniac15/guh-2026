// Server-only ElevenLabs text-to-speech. Returns MP3 bytes.
// Default voice is 'Rachel'; swap the ID for any voice from your ElevenLabs library.
export async function speak(text: string, voiceId = '21m00Tcm4TlvDq8mAY4w') {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
  })
  if (!res.ok) throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`)
  return res.arrayBuffer()
}
