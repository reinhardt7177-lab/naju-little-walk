export const destinations = {
  geumseonggwan: {
    coordinates: { lat: 35.0327357, lon: 126.7167886 },
    name: '금성관', area: '금성관 주변', worldUrl: '/city-world.json?v=surroundings-3', modelUrl: '/models/geumseonggwan.glb.gz?v=surroundings-3',
    heading: ['골목 안으로,', '나주 한 걸음.'],
    introduction: ['망화루 앞 거리와 담장, 골목까지 걸어보세요.', '박석길을 따라 정청의 마루와 단청 천장으로 이어집니다.'],
    sourceUrl: 'https://encykorea.aks.ac.kr/Article/E0011462', sourceLabel: '금성관 사진 참고',
    limitation: '수리 전 사진·위성영상 참고 · 높이·세부 추정',
    overview: { center: [0, -12], radius: 165, elevation: .62, angle: .25 },
  },
  dasi: {
    coordinates: { lat: 35.017517, lon: 126.6400205 },
    name: '다시초등학교', area: '다시초 주변', worldUrl: '/dasi-neighborhood-world.json', modelUrl: '/models/dasi-neighborhood.glb',
    heading: ['학교 앞에서,', '다시 한 걸음.'],
    introduction: ['운동장과 교실, 학교 앞 골목을 걸어보세요.', '다시역과 철길, 동쪽 들판까지 이어집니다.'],
    sourceUrl: 'https://najudasi.es.jne.kr/', sourceLabel: '다시초등학교',
    limitation: '2022년 항공영상 기준 · 높이·세부·실내 추정',
    overview: { center: [0, -25], radius: 410, elevation: .82, angle: -.15 },
  },
  bogam: {
    coordinates: { lat: 34.9955088790031, lon: 126.650613161695 },
    name: '복암리 고분군', area: '복암리 고분군', worldUrl: '/bogam-world.json', modelUrl: '/models/bogam-tumuli.glb',
    heading: ['봉분 사이로,', '마한의 시간.'],
    introduction: ['네 개의 고분과 들판을 둘러보세요.', '지도에서 길을 누르면 그곳으로 이동해요.'],
    sourceUrl: 'https://www.heritage.go.kr/heri/cul/culSelectDetail.do?ccbaCpno=1333604040000&pageNo=1_1_1_1', sourceLabel: '국가유산포털',
    limitation: '사진·영상·조사자료 참고 · 현재 치수·세부 추정',
    overview: { center: [0, 0], radius: 245, elevation: .76, angle: -.30 },
  },
  'bogam-museum': {
    coordinates: {lat:34.996091,lon:126.657059219},
    name:'복암리고분전시관',area:'복암리고분전시관 내부',worldUrl:'/bogam-museum-world.json?v=bridge-finish-1',modelUrl:'/models/bogam-museum.glb?v=bridge-finish-1',
    heading:['고분 속으로,','시간을 따라.'],
    introduction:['석실과 옹관, 관람교량을 가까이 둘러보세요.','계단을 올라 3호분 재현 공간을 내려다볼 수 있어요.'],
    sourceUrl:'http://www.njbogam.or.kr/page/s21',sourceLabel:'전시관 공식 사진',
    limitation:'공식·2024년 사진 참고 · 세부 치수·동선 추정',
    overview:{center:[0,8],radius:100,elevation:.88,angle:.27},
  },
} as const;

export type DestinationId = keyof typeof destinations;

export function destinationFromSearch(search: string): DestinationId {
  const place = new URLSearchParams(search).get('place');
  return place === 'dasi' || place === 'bogam' || place === 'bogam-museum' ? place : 'geumseonggwan';
}
