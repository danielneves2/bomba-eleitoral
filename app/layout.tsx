import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'BOMBA ELEITORAL — Circo do Caos',
  description:
    'Jogo satírico de bombas em primeira pessoa: arena 3D pixelada, políticos caricatos e caos total.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
