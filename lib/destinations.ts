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
    name: '다시초등학교', area: '다시초 주변', worldUrl: '/dasi-neighborhood-world.json', modelUrl: '/models/dasi-neighborhood.glb',
    heading: ['학교 앞에서,', '다시 한 걸음.'],
    introduction: ['운동장과 교실, 학교 앞 골목을 걸어보세요.', '다시역과 철길, 동쪽 들판까지 이어집니다.'],
    sourceUrl: 'https://najudasi.es.jne.kr/', sourceLabel: '다시초등학교',
    limitation: '2022년 항공영상 기준 · 높이·세부·실내 추정',
    overview: { center: [0, -25], radius: 410, elevation: .82, angle: -.15 },
  },
} as const;

export type DestinationId = keyof typeof destinations;

export function destinationFromSearch(search: string): DestinationId {
  return new URLSearchParams(search).get('place') === 'dasi' ? 'dasi' : 'geumseonggwan';
}
