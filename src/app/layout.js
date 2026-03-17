import './globals.css';

export const metadata = {
  title: '10AMPRO Growth Intelligence',
  description: 'Track follower growth, revenue streams, and monetization efficiency across all 10AMPRO channels.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
