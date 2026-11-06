'use client'

import { useState } from 'react'

// Test widget: sends a prompt to /api/test and shows Claude's reply
export default function AskClaude() {
  const [prompt, setPrompt] = useState('Say hello in five words')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)

  async function send() {
    setLoading(true)
    setReply('')
    const res = await fetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    const json = await res.json()
    setReply(json.reply ?? json.error)
    setLoading(false)
  }

  return (
    <div className='space-y-3 rounded-xl border p-4'>
      <textarea
        className='w-full rounded-md border px-3 py-2'
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button
        className='rounded-md bg-black px-4 py-2 text-white disabled:opacity-50'
        disabled={loading}
        onClick={send}
      >
        {loading ? 'Thinking...' : 'Ask Claude'}
      </button>
      {reply && <p className='whitespace-pre-wrap rounded-md bg-zinc-100 p-3'>{reply}</p>}
    </div>
  )
}
