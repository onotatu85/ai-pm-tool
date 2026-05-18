# E2E テスト ガイド

## セットアップ

```bash
pnpm exec playwright install chromium
```

## テスト実行

### 認証なしテスト（常時実行可能）

```bash
pnpm exec playwright test
```

### 認証済みテスト（ロール制限確認など）

`.env.test` または環境変数を設定してから実行：

```bash
TEST_EMAIL=your@email.com TEST_PASSWORD=yourpassword pnpm exec playwright test
```

## テスト一覧

| テストファイル | 内容 | 認証要否 |
|---|---|---|
| `role-restriction.spec.ts` | ステータス遷移ロール制限 | 一部要（スキップ可） |

## ロール制限の手動確認手順

1. ログインしてコンテンツ詳細ページを開く
2. **Admin**: 全ステータス選択可能 / 削除ボタン表示
3. **Member**: Draft・Review のみ選択可能 / Approved・Published は「(権限なし)」と表示・選択不可 / 削除ボタン非表示
4. **Viewer**: 閲覧者モードバナー表示 / 全入力無効 / 「戻る」ボタンのみ表示

メンバーのロール変更は設定ページ（/settings）→ メンバー管理から行えます（Admin のみ）。
