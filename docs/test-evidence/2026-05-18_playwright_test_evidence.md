# Playwright テスト エビデンス

**実施日時:** 2026-05-18  
**テストツール:** Playwright v1.60.0  
**ブラウザ:** Chromium (headless)  
**対象URL:** http://localhost:3000  
**テスト対象バージョン:** RAG機能実装完了版（Migration 006・007 適用済み）

---

## 総合結果

| 項目 | 件数 |
|---|---|
| **合計テスト数** | 18 |
| ✅ **PASS** | 17 |
| ⏭️ **SKIP** | 1（認証情報未設定のため） |
| ❌ **FAIL** | 0 |
| **実行時間** | 5.8秒 |

---

## テスト一覧と結果

### ファイル: `tests/role-restriction.spec.ts`

| # | テスト名 | 結果 | 備考 |
|---|---|---|---|
| 1 | 未ログインユーザーはルートにアクセスするとログインページにリダイレクトされる | ✅ PASS | スクリーンショットあり |
| 2 | ログインページが正しくレンダリングされる | ✅ PASS | スクリーンショットあり |
| 3 | 新規登録ページが正しくレンダリングされる | ✅ PASS | スクリーンショットあり |
| 4 | 空フォームでログインボタン押下時にブラウザバリデーションが動作する | ✅ PASS | スクリーンショットあり |
| 5 | 無効なメールアドレス形式での入力確認 | ✅ PASS | スクリーンショットあり |
| 6 | 管理者: ステータス全選択可能・削除ボタン表示 | ⏭️ SKIP | TEST_EMAIL/TEST_PASSWORD 未設定 |
| 7 | content ページのセレクトオプションに権限なし表示ロジックが含まれる | ✅ PASS | スクリーンショットあり |

### ファイル: `tests/invite.spec.ts`

| # | テスト名 | 結果 | 備考 |
|---|---|---|---|
| 8 | 未認証で /api/invite POST すると 401 を返す | ✅ PASS | HTTP 401 確認 |
| 9 | 必須フィールドなしで /api/invite POST すると 400 または 401 を返す | ✅ PASS | HTTP 401 確認（middleware 先行） |
| 10 | 未ログインで /settings にアクセスするとリダイレクト | ✅ PASS | スクリーンショットあり |

### ファイル: `tests/file-upload.spec.ts`

| # | テスト名 | 結果 | 備考 |
|---|---|---|---|
| 11 | 未認証で /api/files/upload POST すると 401 を返す | ✅ PASS | HTTP 401 確認 |
| 12 | 未認証で /api/files/:id GET すると 401 を返す | ✅ PASS | HTTP 401 確認 |
| 13 | 未認証で /api/files/:id DELETE すると 401 を返す | ✅ PASS | HTTP 401 確認 |
| 14 | 未ログインで /projects/:id にアクセスするとリダイレクト | ✅ PASS | スクリーンショットあり |

### ファイル: `tests/rag.spec.ts`

| # | テスト名 | 結果 | 備考 |
|---|---|---|---|
| 15 | 未認証で /api/ai/suggest POST すると 401 を返す | ✅ PASS | HTTP 401 確認 |
| 16 | 認証なしで空の body を送ると 401 を返す（認証チェックが先行） | ✅ PASS | HTTP 401 確認 |
| 17 | 認証なしで不正な promptType を送ると 401 を返す | ✅ PASS | HTTP 401 確認 |
| 18 | 未ログインでコンテンツ詳細ページにアクセスするとリダイレクト | ✅ PASS | スクリーンショットあり |

---

## テスト詳細

### テスト No.1: 未ログインユーザーリダイレクト

**検証内容:** 未ログイン状態で `/` にアクセスしたとき、`/login` にリダイレクトされること

**手順:**
1. ブラウザで `http://localhost:3000/` にアクセス
2. URL が `/login` に変わることを確認

**結果:** ✅ PASS — `/login` へ正常にリダイレクト

**スクリーンショット:**
![リダイレクト後のログインページ](../../test-results/role-restriction-認証なし---リダ-b6d20-ートにアクセスするとログインページにリダイレクトされる-chromium/test-finished-1.png)

---

### テスト No.2: ログインページのレンダリング

**検証内容:** ログインページに必要な UI 要素がすべて表示されること

**確認項目:**
- [x] 「ログイン」テキストが表示される
- [x] メールアドレス入力欄 (`type="email"`) が表示される
- [x] パスワード入力欄 (`type="password"`) が表示される
- [x] ログインボタン (`「ログイン」`) が表示される
- [x] 「アカウントを作成する」リンクが表示される

**結果:** ✅ PASS — 全要素確認済み

**スクリーンショット:**
![ログインページ](../../test-results/role-restriction-認証なし---リダイレクト確認-ログインページが正しくレンダリングされる-chromium/test-finished-1.png)

---

### テスト No.3: 新規登録ページのレンダリング

**検証内容:** 新規登録ページに必要な UI 要素がすべて表示されること

**確認項目:**
- [x] 「アカウント作成」テキストが表示される
- [x] メールアドレス入力欄が表示される
- [x] パスワード入力欄が2つ表示される（パスワード・確認用）
- [x] パスワード強度インジケーターが表示される

**結果:** ✅ PASS — 全要素確認済み

**スクリーンショット:**
![新規登録ページ](../../test-results/role-restriction-認証なし---リダイレクト確認-新規登録ページが正しくレンダリングされる-chromium/test-finished-1.png)

---

### テスト No.4: ログインフォームの空送信バリデーション

**検証内容:** メールアドレス未入力でログインボタンを押したとき、HTML5 バリデーションによりページが `/login` に留まること

**手順:**
1. `/login` を開く
2. 何も入力せずにログインボタンをクリック
3. URL が変わらないことを確認

**結果:** ✅ PASS — `/login` に留まることを確認

**スクリーンショット:**
![空フォームバリデーション](../../test-results/role-restriction-ログインフォームバ-d29ae-ログインボタン押下時にブラウザバリデーションが動作する-chromium/test-finished-1.png)

---

### テスト No.5: 無効なメールアドレス形式のバリデーション

**検証内容:** `invalid-email`（`@` なし）を入力してログインボタンを押したとき、HTML5 バリデーションによりページが `/login` に留まること

**結果:** ✅ PASS — `/login` に留まることを確認

**スクリーンショット:**
![無効なメール形式バリデーション](../../test-results/role-restriction-ログインフォームバリデーション-無効なメールアドレス形式での入力確認-chromium/test-finished-1.png)

---

### テスト No.6: 管理者ロール制限 UI（スキップ）

**スキップ理由:** テスト用認証情報（`TEST_EMAIL` / `TEST_PASSWORD` 環境変数）が未設定

**手動確認手順:** 
1. 管理者アカウントでログイン
2. コンテンツ詳細ページ (`/projects/:id/contents/:contentId`) を開く
3. 以下を目視確認：
   - ステータスセレクトに Draft / Review / Approved / Published すべてが選択可能
   - 削除ボタンが表示される
   - 閲覧者バナーが表示されない

---

### テスト No.8: 未認証の招待 API アクセス

**検証内容:** 認証なしで `POST /api/invite` を叩いたとき HTTP 401 が返ること

**手順:**
1. Cookie なしで `POST http://localhost:3000/api/invite` を実行
2. レスポンスステータスコードを確認

**期待値:** HTTP 401  
**実際値:** HTTP 401  

**結果:** ✅ PASS

**修正経緯:**
- 初回実行時は HTTP 200 が返っていた
- 原因: middleware が未認証リクエストを `/login` (302) にリダイレクトし、Playwright がリダイレクト先の HTML (200) を受け取っていた
- 修正: middleware で `/api/` ルートは HTML リダイレクトではなく JSON 形式の 401 を返すよう変更

---

### テスト No.10: 設定ページのアクセス制御

**検証内容:** 未ログインで `/settings` にアクセスしたとき `/login` にリダイレクトされること

**結果:** ✅ PASS

**スクリーンショット:**
![settingsリダイレクト](../../test-results/invite-設定ページ---招待フォーム-UI-未ログインで-settings-にアクセスするとリダイレクト-chromium/test-finished-1.png)

---

## バグ修正記録

### BUG-001: 未認証 API リクエストへの誤った 200 レスポンス

| 項目 | 内容 |
|---|---|
| **発生テスト** | invite.spec.ts - 招待 API 認証チェック |
| **症状** | 未認証で `/api/invite` に POST → HTTP 200 が返っていた |
| **原因** | middleware が API ルートに対してもブラウザリダイレクト (302→/login) を適用。Playwright がリダイレクト先の `/login` HTML (200) を最終結果として受け取っていた |
| **修正ファイル** | `src/middleware.ts` |
| **修正内容** | `/api/` パスへのリクエストは HTML リダイレクトではなく `NextResponse.json({ error: '認証が必要です' }, { status: 401 })` を返すよう分岐を追加 |
| **修正後** | HTTP 401 JSON レスポンスが正しく返ることを確認 |

---

---

## ファイルアップロード機能 実装内容

### 実装ファイル一覧

| ファイル | 役割 |
|---|---|
| `src/app/api/files/upload/route.ts` | POST: ファイルアップロード API（認証・サイズ・MIME 検証→Storage→DB） |
| `src/app/api/files/[fileId]/route.ts` | GET: 署名付きダウンロードURL生成 / DELETE: ファイル削除（admin only） |
| `src/components/FileUpload.tsx` | ドラッグ&ドロップ + クリックアップロードUI |
| `src/components/FileList.tsx` | ファイル一覧（ダウンロード・削除ボタン付き） |
| `src/components/ProjectFilesSection.tsx` | 折りたたみパネル（ファイルセクション全体） |
| `supabase/migrations/006_fix_files_fk.sql` | `uploaded_by` FK を `auth.users` から `public.profiles` に変更 |

### 検証項目（API 認証テスト）

| エンドポイント | 未認証アクセス | 期待値 | 実際値 | 判定 |
|---|---|---|---|---|
| POST /api/files/upload | Cookie なし | 401 | 401 | ✅ |
| GET /api/files/:id | Cookie なし | 401 | 401 | ✅ |
| DELETE /api/files/:id | Cookie なし | 401 | 401 | ✅ |
| GET /projects/:id (UI) | 未ログイン | /login リダイレクト | /login リダイレクト | ✅ |

---

## 今後の課題（自動テストに追加が必要なもの）

| テスト内容 | 必要な環境 |
|---|---|
| 管理者ロール: 全ステータス選択可・削除ボタン表示 | `TEST_EMAIL` / `TEST_PASSWORD` 環境変数 |
| メンバーロール: draft/review のみ選択可 | テスト用 member ロールのアカウント |
| 閲覧者ロール: 読み取り専用モード表示 | テスト用 viewer ロールのアカウント |
| 招待メール送信の正常系 | 管理者アカウント + テスト用メールアドレス |
| コンテンツ保存・変更履歴記録 | ログイン済みアカウント |
| ファイルアップロード正常系 (txt/pdf) | ログイン済み admin/member アカウント + `project-files` Supabase Storage バケット |
| ファイルダウンロード（署名付き URL 取得） | ログイン済みアカウント + アップロード済みファイル |
| ファイル削除 (admin only) | admin アカウント |
| viewer によるアップロード拒否 | viewer ロールのアカウント |

---

*このエビデンスは Playwright の自動テストにより生成されました。スクリーンショットは `test-results/` ディレクトリに保存されています。*
