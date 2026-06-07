import React from 'react';
import LoginClient from './LoginClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - Glacier Drive',
  description: 'Log in to your Glacier Drive storage vault to manage archived archives, monitor cost optimizer settings, and initiate glacier retrievals.',
  openGraph: {
    title: 'Sign In - Glacier Drive',
    description: 'Log in to your Glacier Drive storage vault to manage archived archives, monitor cost optimizer settings, and initiate glacier retrievals.',
    type: 'website',
  }
};

export default function LoginPage() {
  return <LoginClient />;
}
