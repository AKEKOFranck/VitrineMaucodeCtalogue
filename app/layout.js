import { Plus_Jakarta_Sans } from 'next/font/google';
import client from '../data/client.json';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata = {
  title: `${client.name} | Catalogue en ligne`,
  description: `${client.tagline}. Commandez en quelques clics via WhatsApp.`,
  robots: { index: true, follow: true },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: client.theme.primary,
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}