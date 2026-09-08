export const destinations = {
  yeongsanpo: {
    coordinates:{lat:35.00025,lon:126.71075},
    name:'영산포 · 홍어거리',area:'영산포 강변과 홍어거리',worldUrl:'/yeongsanpo-world.json?v=detail-2',modelUrl:'/models/yeongsanpo.glb.gz?v=detail-2',
    heading:['강을 따라서,','영산포 한 바퀴.'],
    introduction:['두 황포돛배에 올라 강 위를 직접 운전해 보세요.','홍어거리의 역사갤러리와 문학관은 입구로 들어갈 수 있어요.'],
    sourceUrl:'https://www.naju.go.kr/tour',sourceLabel:'나주시 관광 사진',
    limitation:'지도·공식 사진 참고 · 높이·세부 추정',
    overview:{center:[40,45],radius:620,elevation:.86,angle:-.45},
  },
  'yeongsanpo-history': {
    coordinates:{lat:35.000721,lon:126.711504},parent:'yeongsanpo',
    name:'영산포 역사갤러리',area:'영산포 역사갤러리 실내',worldUrl:'/yeongsanpo-history-world.json?v=detail-2',modelUrl:'/models/yeongsanpo-history.glb.gz?v=detail-2',
    heading:['옛 포구 안으로,','영산포의 기억.'],
    introduction:['배 모형과 홍어, 포구의 생활 전시를 둘러보세요.','들어온 문을 지나면 홍어거리로 돌아갑니다.'],
    sourceUrl:'https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=b6fd947a-7ff4-461c-bffd-8952bcc6b105',sourceLabel:'한국관광공사 사진 참고',
    limitation:'공개 실내 사진 참고 · 치수·패널 콘텐츠 재구성',
    overview:{center:[0,0],radius:28,elevation:1.05,angle:.4},
  },
  'yeongsanpo-literature': {
    coordinates:{lat:34.9998292,lon:126.712917},parent:'yeongsanpo',
    name:'타오르는 강 문학관',area:'타오르는 강 문학관 실내',worldUrl:'/yeongsanpo-literature-world.json?v=detail-2',modelUrl:'/models/yeongsanpo-literature.glb.gz?v=detail-2',
    heading:['목조 복도를 따라,','이야기가 흐르는 집.'],
    introduction:['다다미 전시방과 서재, 좌식 독서실을 둘러보세요.','현관의 출구로 나가면 영산포 거리로 돌아갑니다.'],
    sourceUrl:'https://www.jnfilm.or.kr/web_jnfilm/jn_ldbview.php?clmsuid=5079',sourceLabel:'전남영상위원회 사진 참고',
    limitation:'2025년 실내 사진 참고 · 방 치수·배치 일부 추정',
    overview:{center:[0,0],radius:36,elevation:1.05,angle:.35},
  },
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
  return place && Object.hasOwn(destinations,place) ? place as DestinationId : 'geumseonggwan';
}
