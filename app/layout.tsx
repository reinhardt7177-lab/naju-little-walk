import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '나주 산책 — 금성관과 다시초등학교',
  description: '실제 지도와 사진을 참고해 블렌더로 만든 금성관과 다시초등학교를 걸어보세요. 높이와 세부 치수는 추정한 체험 모형입니다.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  );
}
