"use client";
import { LandingScreen } from "@/components/LandingScreen";
import { useWorldVerification } from "@/hooks/useWorldVerification";
import { SwipeShell } from "@/components/SwipeShell";

export default function Home() {
  const { verified } = useWorldVerification();

  if (verified === null) {
    return (
      <div className="min-h-screen p-8">
        <main className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Whole World Catalog</h1>
          <div className="p-4 border rounded-lg text-sm text-gray-600">Loading…</div>
        </main>
      </div>
    );
  }

  if (!verified) {
    return (<LandingScreen />);
  }

  // Post-verify: Snapchat-style swipe shell with Channels (default) and Filters (left)
  return (<SwipeShell />);
}
