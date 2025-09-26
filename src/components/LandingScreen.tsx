'use client'
import { useWorldVerification } from '@/hooks/useWorldVerification'

export function LandingScreen() {
  const { isInstalled, verify, loading, message } = useWorldVerification()
  const MOCK = process.env.NEXT_PUBLIC_WORLDCOIN_VERIFY_MOCK === 'true'
  return (
    <div className="min-h-screen flex flex-col p-8">
      <main className="flex-1 max-w-3xl mx-auto w-full flex flex-col">
        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-4">Whole World Catalog</h1>
          <p className="text-lg text-gray-700 mb-6">
            A community-maintained index of the world’s knowledge, gated by
            proof of personhood. Verify once with World ID to participate.
          </p>
          <div className="space-y-3 text-gray-700">
            <p>• Prevent spam with privacy-preserving World ID verification</p>
            <p>• Claim your World username to personalize your profile</p>
            <p>• Submit posts, curate channels, and earn reputation</p>
          </div>
        </div>

        <div className="mt-8 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Verify with World ID</h3>
          {!isInstalled && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              <p className="font-medium">MiniKit not detected</p>
              <p>
                {MOCK
                  ? 'Dev mock mode is enabled — click Verify to proceed without World App.'
                  : 'Open this site inside World App to continue.'}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={verify}
            disabled={loading || (!isInstalled && !MOCK)}
            className="px-3 py-2 rounded bg-black text-white text-sm disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Verify with World ID'}
          </button>
          {message && (
            <p className="mt-2 text-sm text-gray-700">{message}</p>
          )}
        </div>
      </main>
    </div>
  )
}
