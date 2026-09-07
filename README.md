# 나주 산책 MVP

금성관 주변의 실제 OpenStreetMap 건물 윤곽과 도로 좌표를 **Blender 4.5 LTS**에서 입체로 제작하고, Blender에서 내보낸 GLB를 **Three.js**로 불러와 탐험합니다.

## 체험 범위

- 금성관 주변 약 283 × 256m 구역
- 지도에 등록된 건물 5채: 금성관, 외삼문, 중삼문, 나주곰탕 하얀집, 나주목문화관(원본 지도 이름: 나주시목문화관)
- 금성관 앞마당에서 출발, 출입구 통과, 가상 실내 전시 탐험
- 벽 충돌, 지도 경계, 전체 조망, 위치 지도, 터치 이동

건물 윤곽과 도로 중심선은 실제 좌표입니다. 금성관의 지붕·창호·기둥·마루·박석길은 국가유산청과 한국학중앙연구원의 공식 사진을 참고했습니다. 높이·세부 치수·수목 위치·도로 폭·실내는 추정입니다. 지형은 평면이며 주변 미등록 건물은 표시하지 않습니다. 항공사진이나 실측 3D 복원물이 아닙니다. 참고 범위는 `knowledge/sources/PHOTO_REFERENCES.md`에 기록했습니다.

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
