import type { Metadata } from 'next';
import { Source_Serif_4, DM_Sans } from 'next/font/google';
import './globals.css';

const display = Source_Serif_4({
  variable: '--font-display',
  subsets: ['latin'],
});

const sans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Mapkeeper — Keep your business on the map',
  description: 'Claim and monitor your business on OpenStreetMap. Compliance as a service.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} font-[family-name:var(--font-sans)] antialiased`}>
        {children}
      </body>
    </html>
  );
}
