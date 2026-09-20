# 드들강 솔밭유원지와 전체 맵 채색

## 확인한 자료

- OpenStreetMap API: `knowledge/sources/deudeulgang/map.osm`, 2026-09-20 조회. ODbL 1.0. 보행로 1306096510·1306096511, 강변 도로·주차장, 노래비 10237942552, 화장실과 쉼터 위치를 사용했다.
- [Esri World Imagery](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer): 2026-09-20 조회. 실제 반환 영역은 `sources/deudeulgang/satellite-extent.json`에 저장. 촬영일은 확인되지 않았다. 사진을 직접 보고 강안·솔밭·농경지 윤곽을 추적했다. 원본 영상은 배포하지 않는다.
- [오마이뉴스 현장 사진, 2025-08](https://www.ohmynews.com/NWS_Web/View/at_pg.aspx?CNTN_CD=A0003156492): 노송의 높고 붉은 줄기, 위쪽에 퍼진 가지, 강변 왕버들, 노래비의 석재 형태를 직접 확인했다. 사진은 참고용이며 모델에 복제하지 않는다.
- [청풍강산 현장 블로그, 2025-06-25 방문](https://shwkdrns5353.tistory.com/2035): 숲길·탁사정·노래비·강변 산책 구성을 교차 확인했다. 같은 이름의 다른 유원지 사진은 사용하지 않았다.
- [나주시 관광 10선 안내](https://www.naju.go.kr/www/administration/reporting/coverage?idx=95334&mode=view&page=3): 장소명과 남평 소재를 확인했다.

## 실제 위치 기반과 추정 구분

실제 위치 기반: OSM 보행로 중심선, 도로, 주차장, 노래비·화장실·쉼터 지점. 위성영상에서 추적한 강변과 솔밭·농경지의 큰 형태.

추정: 소나무 개체 수와 정확한 식재점, 수고·가지 형태, 강 수위, 지형 높이, 벤치 수량, 쉼터의 치수·지붕 세부, 도로와 길의 폭, 농작물 종류. 측량 또는 완전한 실사 복원으로 표기하지 않는다. 정자 두 곳은 OSM상 쉼터이므로 특정 역사 정자의 정확한 재현이라고 단정하지 않는다.

## Blender 제작

`scripts/build_deudeulgang.py` → `outputs/deudeulgang/deudeulgang-pine-grove-v2.blend` → `scripts/finish_deudeulgang_landscape.py` → `deudeulgang-pine-grove-v3.blend` → `public/models/deudeulgang.glb` 및 `.gz`.

소나무는 4가지 가지 형태, 뿌리·수피 틈·붉은 상부 줄기·솔잎으로 제작했다. 근거리와 원거리 메시를 Blender에서 각각 작성하고 기존 Three.js 인스턴싱/거리 전환을 사용한다. 노래비, 벤치, 나무 줄기와 강에는 충돌 데이터를 함께 만든다.

솔밭 소나무 280그루, 서쪽 배경 수목 170그루를 배치했다. 직접 작성한 솔잎·수피 텍스처를 사용하며 솔잎은 glTF MASK 재질로 내보내 깊이 기록과 인스턴싱을 유지한다. 강 건너 산등성이는 연속 메시이며 높이는 추정이다. 브라우저 프레임률 수치는 측정하지 않았다.

## 전체 맵 채색

`scripts/color_all_maps.py`가 현재 배포 중인 모든 기존 GLB를 Blender로 불러와 수목, 흙·목재, 물·유리, 건축 중성색 계열을 조정한다. 새 전체 장면 `.blend`는 `outputs/palette-v51`에 저장하며 기존 사용자의 작업 파일은 덮어쓰지 않는다.

Blender의 glTF exporter로 색상 재질을 내보내고, 이 값을 기존 GLB의 재질 항목에만 옮긴다. 정점과 이미지가 든 BIN 청크, 노드, 애니메이션, 충돌 데이터는 유지한다. 이 방법은 앞서 수정한 양자화 지오메트리의 재손상을 막는다. 재질 변경 내역과 BIN 해시는 `sources/palette-v51`에 기록한다.

사진·전시 패널·파노라마·텍스처와 투명·발광 재질은 보호한다. 현장 모든 건물의 실제 도장색을 확인한 것은 아니며 전체 자연색 조화를 위한 미술적 채색이다.

## 확인 결과

- 기존 GLB 17개, 재질 1,894개 색감 조정. 사진·투명·발광 등 보호 재질 항목 343개.
- `scripts/verify_palette.py`: 전체 모델의 BIN 청크, 지오메트리와 이미지, 노드·애니메이션 및 보호 재질 동일성 검사 통과.
- 기존 이동 73개와 드들강 3개 검사 통과. 실제 OSM 보행로 두 구간을 0.5m 간격으로 검사해 충돌 없는 연속 통행을 확인했다.
- 빛가람 양자화 좌표 회귀 검사, 지붕·벽 색상 및 식생 거리 전환 검사 통과.
- 새 모델을 포함한 모든 GLB를 무손실 gzip으로 전달한다. 브라우저에서 걷기 전환, 솔잎 표시, 전체 지도 연결을 확인했다. 평면의 그림자 줄무늬와 새 장소의 근거리 식생 전환도 보정했다.
- TypeScript 검사와 정적 배포 빌드 통과. 프레임률은 별도로 측정하지 않았다.
