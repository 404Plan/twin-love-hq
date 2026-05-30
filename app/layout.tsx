import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Twin Love HQ',
  description: 'Private AI project management tool for Twin Love.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
