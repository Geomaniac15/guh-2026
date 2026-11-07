'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  clearCredentialId,
  fromBase64Url,
  getCredentialId,
  markUnlocked,
  saveCredentialId,
  toBase64Url,
} from '@/lib/appLock'

const challenge = () => crypto.getRandomValues(new Uint8Array(32))

function message(err: unknown) {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError') return "Face ID was cancelled or didn't match. Try again, or use your passcode."
  if (name === 'InvalidStateError') return 'Face ID is already set up for Odo on this device.'
  if (name === 'SecurityError') return 'Face ID needs a secure (https) connection.'
  return 'Face ID failed. Try again, or use your passcode.'
}

// Face ID app lock using a WebAuthn platform authenticator. Falls back to a plain unlock if unsupported.
export default function FaceIdUnlock({ userId }: { userId: string }) {
  const router = useRouter()
  const [supported, setSupported] = useState<boolean | null>(null)
  const [credId, setCredId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const check = window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.() ?? Promise.resolve(false)
    check
      .catch(() => false)
      .then((ok) => {
        if (!alive) return
        setSupported(ok)
        setCredId(getCredentialId(userId))
      })
    return () => {
      alive = false
    }
  }, [userId])

  function enter() {
    markUnlocked()
    router.replace('/dashboard')
  }

  // Called straight from the click so Safari keeps the user gesture
  async function setUp() {
    setError('')
    setBusy(true)
    try {
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge: challenge(),
          rp: { id: window.location.hostname, name: 'Odo' },
          user: { id: new TextEncoder().encode(userId), name: 'Odo app lock', displayName: 'Odo' },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
          attestation: 'none',
          timeout: 60000,
        },
      })) as PublicKeyCredential | null
      if (!cred) throw new Error('No credential')
      const id = toBase64Url(cred.rawId)
      saveCredentialId(userId, id)
      setCredId(id)
      enter()
    } catch (err) {
      setError(message(err))
    }
    setBusy(false)
  }

  async function unlock() {
    if (!credId) return
    setError('')
    setBusy(true)
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge(),
          rpId: window.location.hostname,
          allowCredentials: [{ type: 'public-key', id: fromBase64Url(credId), transports: ['internal'] }],
          userVerification: 'required',
          timeout: 60000,
        },
      })
      if (!assertion) throw new Error('No assertion')
      enter()
    } catch (err) {
      setError(message(err))
    }
    setBusy(false)
  }

  function reset() {
    clearCredentialId(userId)
    setCredId(null)
    setError('')
  }

  const primary = 'w-full rounded-2xl bg-blue py-4 font-semibold text-[#0B0D12] disabled:opacity-50'

  return (
    <div className='mt-6 flex w-full flex-col items-center'>
      {supported === null ? (
        <button disabled className={primary}>
          Checking Face ID...
        </button>
      ) : !supported ? (
        <>
          <button onClick={enter} className={primary}>
            Unlock
          </button>
          <p className='mt-3 text-sm text-muted'>Face ID isn&apos;t available in this browser.</p>
        </>
      ) : credId ? (
        <button onClick={unlock} disabled={busy} className={primary}>
          {busy ? 'Waiting for Face ID...' : 'Unlock with Face ID'}
        </button>
      ) : (
        <button onClick={setUp} disabled={busy} className={primary}>
          {busy ? 'Waiting for Face ID...' : 'Set up Face ID'}
        </button>
      )}

      {error && (
        <p role='alert' className='mt-3 text-sm text-pink'>
          {error}{' '}
          {credId && (
            <button onClick={reset} className='font-semibold text-blue'>
              Set up again
            </button>
          )}
        </p>
      )}

      <button onClick={enter} className='mt-5 font-semibold'>
        Use passcode
      </button>
    </div>
  )
}
