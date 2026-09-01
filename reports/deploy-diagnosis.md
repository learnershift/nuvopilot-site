# NuvoPilot 배포 경로 진단

- 조사일: 2026-09-01 (KST)
- 조사 기준: `main` / `25eebaaae5d8369986127be82d6267d98f017451`
- 조사 범위: 현재 작업 트리, 로컬 Git 설정, 도달 가능한 전체 Git 이력
- 금지 경계: 원격 배포, `git push`, Cloudflare/GitHub 웹 콘솔 접근은 수행하지 않음

## 확인된 사실

1. 조사 시작 시 작업 트리는 깨끗했고 로컬 `main`, `origin/main`, Orca가 인식한 HEAD는 모두 `25eebaaae5d8369986127be82d6267d98f017451`이었다.
2. Git 원격 `origin`은 `https://github.com/learnershift/nuvopilot-site.git`이고, 로컬 설정상 `main`은 `origin/main`을 추적한다.
3. 도달 가능한 Git 이력은 5개 커밋이다. 이 가운데 `e773fbadeb7af744fb6dca9cb31fcf0be505d797`은 파일 변경이 전혀 없는 빈 커밋이며 커밋 메시지는 `Redeploy NuvoPilot site`이다. 작성자는 `OpenClaw <openclaw@local>`이고 시각은 `2026-06-20T23:39:18+09:00`이다.
4. Fridge Menu 페이지와 홈페이지 섹션은 `b38978d7e5eec2cdf7961496ec2c2ebf2b698daf` (`feat: publish Fridge Menu policy pages`)에서 추가됐다.
5. `404.html`, 정적 파일 계약 검증기, 유일한 GitHub Actions workflow는 그 다음 커밋 `25eebaaae5d8369986127be82d6267d98f017451`에서 추가됐다.
6. `.github/workflows/site-integrity.yml`은 `pull_request`와 `main` push에서 체크아웃 후 `node scripts/verify-site.mjs`만 실행한다. 권한은 `contents: read`뿐이며 배포 단계, 업로드 단계, Pages 설정 단계는 없다.
7. 조사 시작 시 트리와 도달 가능한 전체 이력에 `CNAME`, `wrangler.toml`, `_redirects`, `netlify.toml`, `vercel.json`, `.nojekyll`, `package.json`, `package-lock.json`은 없었다. 조사 시작 시 추적된 workflow도 `site-integrity.yml` 하나뿐이다.
8. 현재 또는 이력에 `gh-pages` 로컬/원격 추적 브랜치나 태그는 없다. 정적 사이트 파일은 저장소 루트의 `index.html` 및 경로별 `index.html` 구조로 배치돼 있다.
9. `scripts/verify-site.mjs`는 `learnershift.github.io` 아래의 은퇴한 Fridge Menu 개인정보처리방침 URL이 저장소 텍스트에 다시 들어오지 못하도록 검사한다. 이는 별도 Fridge Menu GitHub Pages 주소가 과거에 사용됐음을 가리키지만, `nuvopilot.com`의 현재 배포 제공자나 연결 설정을 증명하지는 않는다.
10. 저장소 안에는 `nuvopilot.com`을 특정 호스팅 프로젝트·계정·배포 디렉터리·빌드 명령에 연결하는 설정이 없다.

## 공개 라이브 응답 실측

1. `npm run verify:live`는 2026-09-01 KST에 종료코드 1을 반환했다. 루트와 Fridge Menu 4개 경로는 모두 HTTP 200이었지만 각 로컬 페이지 계약 문자열이 본문에 없었다.
2. 저장소에 존재하지 않는 `/__verify-live-nonexistent-page-404-check__/`도 HTTP 200을 반환해 `SOFT_404_DETECTED`로 판정됐다.
3. 루트 공개 응답 헤더에는 `server: cloudflare`와 `cf-cache-status: DYNAMIC`이 있었다. 이는 공개 트래픽이 Cloudflare를 통과한다는 증거지만, 원본 호스팅이 Cloudflare Pages라는 증거는 아니다.
4. 라이브 루트와 `075495cd3d06ae699ba6f56bc7beb7bbcce577dc:index.html`의 diff는 Cloudflare 이메일 보호가 `mailto:` 링크를 바꾸고 디코드 스크립트를 삽입한 부분뿐이었다.
5. `075495c`에서 추가된 `google8e38fabfae749839.html`의 고유 검증 본문도 라이브에서 확인됐다.

## 판단 가능한 범위

- **사실:** 빈 `Redeploy NuvoPilot site` 커밋은 당시 파일 변경 없이 새 커밋을 만드는 행위가 재배포 절차의 일부였음을 보여준다.
- **추측:** 원격 `main`의 새 커밋을 감지하는 저장소 외부 호스팅 연동이 있었을 가능성이 높다. GitHub Pages의 branch 배포, Cloudflare Pages의 Git 연동 등 여러 방식이 이 형태와 양립하므로 제공자는 특정할 수 없다.
- **추측:** 실측한 라이브 파일 조합은 `075495c` 트리와 일치하며, 라이브 배포가 그 시점에서 멈췄을 가능성이 높다. 다만 일부 파일만 대조했으므로 실제 배포 SHA를 확정할 수는 없다.

## 결론

저장소 내부 증거로 확인할 수 있는 배포 신호는 과거의 빈 재배포 커밋과 GitHub 원격뿐이다. 현재 workflow는 검증 전용이며 배포하지 않는다. 공개 응답은 Cloudflare를 통과하고 라이브 콘텐츠는 `075495c`와 일치하지만, 실제 호스팅 제공자, 연결된 프로젝트, 감시 브랜치, 배포 루트 및 마지막 성공 배포 SHA는 저장소 내부만으로 특정할 수 없다.
