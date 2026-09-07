import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '나주 산책 — 금성관 주변을 걷다',
  description: '실제 지도에서 가져온 금성관 주변의 길과 건물을 블렌더로 만든 3D 산책 공간입니다. 높이, 외관, 실내는 단순화한 체험 모형입니다.',
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
