import type { Metadata } from 'next';
import './globals.css';
import './tablet-ui.css';

export const metadata: Metadata = {
  title: '금성관 산책',
  description: '나주 금성관의 정청과 동서 익헌, 망화루를 3D로 둘러봅니다. 공식 사진과 지도 자료를 참고한 경내 산책 모형입니다.',
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
