# 나주 산책 MVP

금성관 주변의 실제 OpenStreetMap 건물 윤곽과 도로 좌표를 **Blender 4.5 LTS**에서 입체로 제작하고, Blender에서 내보낸 GLB를 **Three.js**로 불러와 탐험합니다.

## 금성관 입구와 주변 거리 보완

망화루 앞 박석 보행대, 안내판, 자연석 기와담장, 낮은 원목 울타리와 관목 화단, 양쪽 잔디마당을 사진에 맞춰 보완했습니다. OSM의 서측 주차장 윤곽과 통로를 반영했으며, 위성영상에서 해석한 **주변 지붕 37개**를 별도 출처로 추가했습니다. 주변 건물 높이·창문, 주차 차량과 시설물 배치는 추정입니다.

- 최신 편집본: `outputs/geumseonggwan-surroundings.blend` (이전 두 Blender 파일 보존)
- 추가 제작: `scripts/geumseonggwan_surroundings.py`
- 확인 근거: `knowledge/sources/GEUMSEONGGWAN_SURROUNDINGS.md`
- 주변 지붕 관찰: `knowledge/sources/geumseonggwan-surrounding-roofs.json`
- 렌더: `outputs/geumseonggwan-surroundings-overview.png`, `outputs/geumseonggwan-entrance-street.png`, `outputs/geumseonggwan-entrance-aerial.png`

```powershell
& '.\work\tools\blender-4.5.13-windows-x64\blender.exe' --background --python scripts/build_city.py -- --output-blend outputs/geumseonggwan-surroundings.blend --render --render-surroundings
```

## 금성관 사진·영상 상세본

2009년 공식 정면 사진, **2020-02-18 촬영된 국가유산포털 내부 원본**, 나주시·광주MBC 영상의 실제 확인 프레임, 2015년 공개 실측도 썸네일을 대조했습니다. 다섯 칸의 서로 다른 폭과 개별 격자문·고창, 세 팔작지붕의 합각·겹처마·기와, **8개 내진 고주와 우물마루·단청 천장**, 월대·계단, 2층 망화루와 중삼문, 잔디·내삼문터·담장·비석군·우물을 보완했습니다.

- 건축 상세본: `outputs/geumseonggwan-detailed.blend` (최초 `outputs/geumseonggwan.blend` 보존)
- 제작: `scripts/build_city.py`, `scripts/geumseonggwan_detail.py`
- 사진·영상 시각·추정 치수: `knowledge/sources/GEUMSEONGGWAN_PHOTO_VIDEO.md`
- 렌더: `outputs/geumseonggwan-front-detailed.png`, `outputs/geumseonggwan-interior-detailed.png`, `outputs/geumseonggwan-ceiling-detailed.png`

**수리 전 모습의 참고 모델**입니다. 원본 실측도의 치수를 확보하지 못해 기둥 간격·높이·단청 그림·경내시설 좌표는 추정입니다. 중앙 문은 탐험을 위해 열어 두었고, 망화루 상층 계단과 숨겨진 방 내부는 미재현입니다. 사진·영상 원본은 사이트에 배포하지 않습니다.

```powershell
& '.\work\tools\blender-4.5.13-windows-x64\blender.exe' --background --python scripts/build_city.py -- --output-blend outputs/geumseonggwan-detailed.blend --render --render-details
```

## 복암리 고분군과 지도 이동

**복암리고분전시관 내부도 추가했습니다.** 지도에서 전시관을 선택하면 황토색 3호분 절개 모형, 보고서에서 위치를 추적한 41개 매장시설, 유리 난간 관람교량, 토기 진열장, 38석 영상실, 체험 공간과 2층 북카페를 둘러볼 수 있습니다. 계단을 실제로 올라가며 같은 위치의 아래층·위층을 구분합니다.

- 전시관 Blender 최신 마감본: `outputs/bogam-museum-finished.blend` (기존 `outputs/bogam-museum.blend` 보존)
- 관람교량 네 코너의 바닥·난간 연결과 막다른 끝부분을 마감했습니다. 계단 입구와 회전 통로는 그대로 걸을 수 있습니다.
- 전시관 렌더: `outputs/bogam-museum-overview.png`, `outputs/bogam-museum-main.png`, `outputs/bogam-museum-bridge.png`
- 제작: `scripts/build_bogam_museum.py`, `scripts/museum_geometry.py`
- 검증 범위와 추정 사항: `knowledge/sources/BOGAM_MUSEUM_REFERENCES.md`

공식 층별 안내는 정밀 평면도가 아닙니다. 현재 내부의 정확한 치수·교량 경로·가구 위치는 확인되지 않아 사진 참고 추정으로 표시했습니다. 화장실·직원 공간·3층 전망대 내부는 미포함입니다.

공식 사진·영상 프레임, 2023년 위성영상, 발굴조사 기록을 대조해 **네 봉분과 주변 360×340m 구역**을 Blender로 제작했습니다. 원형·긴 네모형·넓은 평탄 정상·낮은 봉분의 차이를 반영하고 실제 지도상의 진입로와 농지 구획을 연결했습니다. 현재 실측 3D 모델은 아니며 기록 치수와 추정한 복원 외형을 구분했습니다.

- 편집 가능한 Blender: `outputs/bogam-tumuli.blend`
- 렌더: `outputs/bogam-overview.png`, `outputs/bogam-ground-view.png`, `outputs/bogam-mounds-detail.png`
- 웹 모델·이동 정보: `public/models/bogam-tumuli.glb`, `public/bogam-world.json`
- 제작 스크립트: `scripts/build_bogam.py`
- 사진·영상 확인 범위 및 추정: `knowledge/sources/BOGAM_REFERENCES.md`

**지도로 이동**을 누르면 나주 전체 지도에서 금성관·다시초·복암리 고분군을 선택할 수 있습니다. 현재 장소 탭에서는 열린 지면이나 번호를 눌러 바로 이동합니다. 봉분·건물과 지도 경계는 같은 충돌 정보로 검사합니다. 장소 사이 전체 도시가 연속 모델링된 것은 아닙니다.

```powershell
& '.\work\tools\blender-4.5.13-windows-x64\blender.exe' --background --python scripts/build_bogam.py -- --render
node scripts/build_regional_map.mjs
node --experimental-strip-types --test tests/world.test.mjs
```

기존 `bogam-tumuli.blend`가 있으면 생성 스크립트는 중단합니다. 직접 수정한 파일을 보관한 뒤 생성본만 다시 만들 때 `--replace`를 명시하세요. 다시초·금성관 파일은 열거나 덮어쓰지 않습니다.

## 다시초등학교 추가

현재 학교 체험은 **다시초 주변 약 570×440m**까지 확장했습니다. 위성영상의 지붕·농지·주차 공간과 지도 건물·도로를 대조했고, 다시역 외관·호남선 두 선로·승강장을 추가했습니다. 아래 기존 학교 파일들은 보존했습니다.

- 새 Blender: `outputs/dasi-neighborhood.blend`
- 전체 조감도: `outputs/dasi-neighborhood-overview.png`
- 웹 모형·충돌: `public/models/dasi-neighborhood.glb`, `public/dasi-neighborhood-world.json`
- 주변 제작: `scripts/dasi_neighborhood.py`
- 실제 자료와 추정 범위: `knowledge/sources/DASI_NEIGHBORHOOD_REFERENCES.md`
- 주변 포함 생성: 기존 Blender 명령의 마지막에 `-- --neighborhood --render`를 전달합니다.

2022년 영상과 일부 과거 사진을 기준으로 제작했으며, 현재 모습과 완전히 일치하는 실측 복원은 아닙니다. 주변 건물의 높이·창문·지붕 세부와 평면 지형은 추정입니다.

- 화면 왼쪽의 **다시초등학교**를 누르거나 `/?place=dasi`로 열면 학교 탐험으로 이동합니다. 기본 주소의 금성관 체험은 유지합니다.
- 나주시 다시로 203의 실제 학교 부지와 건물 2개 윤곽을 사용했습니다.
- 공식 학교앨범 사진을 참고해 2층 벽돌 외관, 흰 창틀, 원형 표식, 분홍색 계단실, 둥근 붉은 지붕, 돌 문기둥을 표현했습니다.
- 본관의 열린 문으로 들어가 1층 복도·체험 교실·작은 도서실을 걸어볼 수 있습니다. 실내는 실제 학교 배치와 다른 체험용 구성입니다.
- 뒤집혀 보이던 학교명 간판의 방향과 크기를 수정했습니다. 교실의 책상·의자·칠판, 도서실의 책장·독서 테이블을 추가했습니다.
- 2022-10-14 항공영상과 2025/2026 사진을 대조해 운동장 전체, 서쪽 주차 공간, 남쪽 수목 구역과 길, 코트·농구대, 남동쪽 건물 배치를 보완했습니다.
- 높이·창문 수·개별 수목·정문 위치·코트 치수는 추정입니다. 항공영상으로 잡은 위치도 약 5m 이상 차이 날 수 있습니다. 실측 복원물이 아닙니다.
- 출처 및 확인 범위: `knowledge/sources/DASI_REFERENCES.md`

학교 파일은 기존 금성관 파일과 별도로 관리합니다.

| 파일 | 용도 |
|---|---|
| `outputs/dasi-elementary-detailed.blend` | 실내·운동장·간판 개선본 |
| `outputs/dasi-elementary.blend` | 보존한 최초 학교 원본 |
| `outputs/dasi-overview.png` | 블렌더 조감도 |
| `outputs/dasi-sign-detail.png` | 간판 방향 확인 렌더 |
| `outputs/dasi-classroom.png`, `outputs/dasi-library.png` | 실내 렌더 |
| `public/models/dasi-elementary.glb` | 웹 탐험용 모델 |
| `public/dasi-world.json` | 학교 충돌·위치·출처 데이터 |
| `scripts/build_dasi_school.py` | 학교 모델 재현 스크립트 |
| `scripts/dasi_interior.py` | 출입구·교실·도서실·운동장 세부 구성 |

```powershell
& '.\work\tools\blender-4.5.13-windows-x64\blender.exe' --background --python scripts/build_dasi_school.py -- --render
```

기존 학교 생성본이 있으면 중단합니다. 직접 편집한 파일은 다른 이름으로 보관하고, 생성본 갱신 시에만 `-- --replace --render`를 사용하세요.

`--render-details`를 함께 전달하면 간판과 실내 렌더도 저장합니다. `.blend`에는 개별 편집 가능한 물체를 유지하고, 웹에서는 같은 불투명 재질의 고정 물체를 묶어 그려 렌더링 부담을 줄입니다.

## 체험 범위

- 금성관 주변 약 283 × 256m 구역
- 지도에 등록된 건물 5채: 금성관, 외삼문, 중삼문, 나주곰탕 하얀집, 나주목문화관(원본 지도 이름: 나주시목문화관)
- 금성관 앞마당에서 출발, 출입구 통과, 사진 참고 정청 마루·천장 탐험
- 벽 충돌, 지도 경계, 전체 조망, 위치 지도, 터치 이동

지도 건물 윤곽과 도로 중심선은 실제 좌표입니다. 상세본의 지붕·창호·기둥·마루·박석길은 공식 사진과 영상 및 공개 도면의 비례를 참고했습니다. 높이·세부 치수·수목 위치·도로 폭은 추정입니다. 지형은 평면이며 주변 미등록 건물은 표시하지 않습니다. 실측 3D 복원물이 아닙니다. 최신 참고 범위는 `knowledge/sources/GEUMSEONGGWAN_PHOTO_VIDEO.md`에 기록했습니다.

## 조작

| 조작 | 동작 |
|---|---|
| W A S D | 이동 |
| 마우스 또는 드래그 | 시선 회전 |
| 좌우 방향키 / Q E | 시선 회전 |
| Shift | 빠르게 이동 |
| Esc / 쉬기 | 일시정지 |
| 전체 보기 | 드래그로 회전, 휠로 확대·축소 |
| 처음 위치 | 출발점으로 돌아가기 |
| 지도로 이동 | 나주 지도에서 장소 전환, 현재 장소 지도에서 지점 이동 |

## 파일 구조

- `outputs/geumseonggwan.blend`: 편집 가능한 블렌더 원본
- `outputs/city-overview.png`: 블렌더에서 렌더링한 조감도
- `public/models/geumseonggwan.glb`: **실제로 블렌더에서 내보낸** 브라우저용 모델
- `public/city-world.json`: 같은 제작 과정에서 생성한 충돌·위치 정보
- `scripts/build_city.py`: 지도 → 블렌더 → GLB 재현 스크립트
- `scripts/photo_architecture.py`: 공식 사진에 기반한 금성관 외관 제작
- `knowledge/sources/`: 지도 원본, 좌표 출처, 추정 범위
- `knowledge/MVP.md`: 작업 범위와 다음 단계
- `tests/world.test.mjs`: 출입구 통과·충돌·경계·GLB 검사
- `work/tools/`: 작업 폴더에만 설치한 Blender 휴대용 버전, 배포 제외

## 실행과 재제작

```powershell
npm install
npm run dev
node --experimental-strip-types --test tests/world.test.mjs
npm run build
```

블렌더 원본은 `outputs/geumseonggwan.blend`를 열면 됩니다. 포터블 실행 파일은 `work/tools/blender-4.5.13-windows-x64/blender.exe`입니다.

```powershell
& '.\work\tools\blender-4.5.13-windows-x64\blender.exe' --background --python scripts/build_city.py
```

스크립트는 기존 결과가 있으면 중단합니다. 직접 수정한 `.blend`는 별도 이름으로 저장한 뒤, 생성본을 명시적으로 갱신할 때만 명령 끝에 `-- --replace --render`를 붙이세요. 블렌더에서 벽을 수정하면 웹 충돌 데이터도 같이 갱신해야 합니다.

## 출처

© [OpenStreetMap 기여자](https://www.openstreetmap.org/copyright), ODbL 1.0. 지도 원본과 변경한 좌표 데이터는 `knowledge/sources` 및 `public/city-world.json`에 보관합니다. 공개 배포 시 같은 출처 표기를 유지하세요.

[금성관 국가유산포털](https://www.heritage.go.kr/heri/cul/culSelectDetail.do?VdkVgwKey=12%2C20370000%2C36&pageNo=1_1_1_1)
