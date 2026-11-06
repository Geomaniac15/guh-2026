import Anthropic from '@anthropic-ai/sdk'

// Server-only. Reads ANTHROPIC_API_KEY from the environment.
const client = new Anthropic()

export async function ask(prompt: string, system?: string) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = msg.content[0]
  return block?.type === 'text' ? block.text : ''
}
