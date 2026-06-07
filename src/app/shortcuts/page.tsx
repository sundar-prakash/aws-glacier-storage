import React from 'react';
import ShortcutsClient from './ShortcutsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Keyboard Shortcuts - Glacier Drive',
  description: 'Learn the custom keyboard hotkeys and navigation shortcuts for managing your AWS Glacier storage vaults efficiently.',
  openGraph: {
    title: 'Keyboard Shortcuts - Glacier Drive',
    description: 'Learn the custom keyboard hotkeys and navigation shortcuts for managing your AWS Glacier storage vaults efficiently.',
    type: 'website',
  }
};

export default function ShortcutsPage() {
  return <ShortcutsClient />;
}
