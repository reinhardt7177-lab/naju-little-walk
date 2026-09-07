export const destinations = {
  geumseonggwan: {
    name: '금성관', area: '금성관 주변', worldUrl: '/city-world.json', modelUrl: '/models/geumseonggwan.glb',
    heading: ['골목 안으로,', '나주 한 걸음.'],
    introduction: ['지도 위의 건물과 길을 입체로 옮겼어요.', '마당을 지나 금성관 안까지 걸어가 보세요.'],
    sourceUrl: 'https://encykorea.aks.ac.kr/Article/E0011462', sourceLabel: '금성관 사진 참고',
    limitation: '높이·실내는 추정한 체험 모형',
    overview: { center: [0, -12], radius: 165, elevation: .62, angle: .25 },
  },
  dasi: {
    name: '다시초등학교', area: '다시초등학교', worldUrl: '/dasi-world.json', modelUrl: '/models/dasi-elementary.glb',
    heading: ['학교 앞에서,', '다시 한 걸음.'],
    introduction: ['실제 부지와 건물 윤곽, 사진을 참고했어요.', '운동장과 건물 사이를 자유롭게 걸어보세요.'],
    sourceUrl: 'https://najudasi.es.jne.kr/', sourceLabel: '다시초등학교',
    limitation: '사진 참고 외관 · 높이·조경 추정 · 실내 미구현',
    overview: { center: [-2, -14], radius: 188, elevation: .67, angle: -.15 },
  },
} as const;

export type DestinationId = keyof typeof destinations;

export function destinationFromSearch(search: string): DestinationId {
  return new URLSearchParams(search).get('place') === 'dasi' ? 'dasi' : 'geumseonggwan';
}
