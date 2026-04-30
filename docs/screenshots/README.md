# 스크린샷

README에서 참조하는 4장의 화면. 각 파일을 같은 이름으로 PNG (1440×900 권장) 저장.

| 파일명 | 화면 | 캡처 방법 |
|---|---|---|
| `01_dashboard.png` | 대시보드 | `/dashboard` — KPI·차트·알림 모두 데이터 채워진 상태에서 캡처 |
| `02_payroll.png` | 급여 일괄 계산 | `/payroll?year=2026&month=4` — 일괄 계산 후 결과 테이블 보이게 |
| `03_payslip.png` | 급여명세서 | `/payroll/[employeeId]?year=2026&month=4` — Cmd/Ctrl+P 미리보기 화면 |
| `04_closing.png` | 월말결산 | `/closing` — 일부 항목 체크된 상태로 진행률 보이게 |

## 캡처 팁

- **viewport**: 1440×900 (Vercel 데모와 동일)
- **테마**: 다크 (기본)
- **데이터**: `supabase/seed.sql` 적용된 상태 (직원 15명 + 3개월치)
- **개인정보**: 시드 데이터 사용 시 안전. 실제 데이터 캡처 시 마스킹 확인.

## 시연 GIF

`docs/demo.gif` — 30~60초 분량. 추천 시퀀스:
1. 로그인 → 대시보드
2. 직원 추가 (간단히)
3. 급여 일괄 계산 → 명세서 클릭
4. 결산 체크리스트 항목 체크 → 진행률 변경

도구: [LICEcap](https://www.cockos.com/licecap/), [Kap](https://getkap.co/), 또는 ScreenToGif.
