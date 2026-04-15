import { Suspense } from 'react';
import type { Metadata } from 'next';
import SavePageClient from './SavePageClient';

export const metadata: Metadata = {
  title: 'Save Reel — Reel Vault',
  description: 'Saving your Instagram reel to Reel Vault with AI-powered tagging.',
};

export default function SavePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <SavePageClient />
    </Suspense>
  );
}
