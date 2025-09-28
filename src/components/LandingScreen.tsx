'use client'
import { useWorldVerification } from '@/hooks/useWorldVerification'
import Image from 'next/image'
export function LandingScreen() {
  const { isInstalled, verify, loading, message } = useWorldVerification()
  const MOCK = process.env.NEXT_PUBLIC_WORLDCOIN_VERIFY_MOCK === 'true'
  return (
    <div className="min-h-screen flex flex-col p-8">
      <main className="flex-1 max-w-3xl mx-auto w-full flex flex-col">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-4">Whole World Catalog</h1>
          <p className="text-white text-md">
            A community-maintained index of information for living, gated by
            proof of personhood. Enabled by World ID, directed by you.
          </p>
          <div className="flex justify-center pt-14">
            <Image src="/assets/icon.png" alt="Whole World Catalog icon" width={260} height={260} />
          </div>
        </div>

        <div className="mt-8 p-4 border rounded-lg mb-24 flex flex-col items-center">
          {!isInstalled && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              <p className="font-medium">MiniKit not detected</p>
              <p>``
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
            className="px-6 py-4 rounded bg-white/5 text-white text-lg disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in with World ID'}
          </button>
          {message && (
            <p className="mt-2 text-sm text-gray-700">{message}</p>
          )}
        </div>
      </main>
    </div>
  )
}
