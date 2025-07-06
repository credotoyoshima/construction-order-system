# 工事受注システム

工事会社と発注企業間の受注・発注業務を効率化するWebアプリケーションシステムです。

## 🚀 機能一覧

### 🔐 認証機能
- ユーザーログイン・ログアウト
- 新規ユーザー登録
- 権限管理（管理者・ユーザー）

### 👨‍💼 管理者機能
- 受注管理（一覧・詳細・ステータス更新）
- ユーザー管理
- レポート・統計表示
- システム設定

### 👩‍💼 ユーザー機能
- 新規発注作成
- 案件管理・進捗確認
- アカウント設定

### 🔄 共通機能
- 受注/発注詳細表示
- PDF・Excel出力
- レスポンシブデザイン

## 🛠️ 技術スタック

- **Frontend**: Next.js 15.3.4, React 18, TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React Icons
- **Forms**: React Hook Form
- **Authentication**: NextAuth.js (予定)
- **Charts**: Recharts
- **File Generation**: jsPDF, xlsx
- **Date Handling**: date-fns
- **HTTP Client**: Axios
- **Backend Integration**: Google Sheets API

## 📦 セットアップ

### 前提条件
- Node.js 18.0以上
- npm または yarn

### インストール

1. リポジトリのクローン
```bash
git clone <repository-url>
cd construction-order-system
```

2. 依存関係のインストール
```bash
npm install
```

3. 開発サーバーの起動
```bash
npm run dev
```

4. ブラウザでアクセス
```
http://localhost:3000
```

## 🧪 テストアカウント

### 管理者アカウント
- **メール**: admin@test.com
- **パスワード**: password

### ユーザーアカウント
- **メール**: user@test.com
- **パスワード**: password

## 📁 プロジェクト構造

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   │   ├── login/         # ログイン
│   │   └── register/      # 新規登録
│   ├── admin/             # 管理者画面
│   │   ├── orders/        # 受注管理
│   │   ├── users/         # ユーザー管理
│   │   ├── reports/       # レポート
│   │   └── settings/      # 設定
│   ├── user/              # ユーザー画面
│   │   ├── new-order/     # 新規発注
│   │   ├── orders/        # 案件管理
│   │   └── settings/      # アカウント設定
│   ├── order/[id]/        # 受注詳細
│   └── api/               # APIエンドポイント
├── components/            # 共通コンポーネント
│   ├── ui/               # UIコンポーネント
│   ├── forms/            # フォームコンポーネント
│   └── charts/           # グラフコンポーネント
├── lib/                  # ユーティリティライブラリ
├── types/                # TypeScript型定義
├── utils/                # ユーティリティ関数
├── hooks/                # カスタムフック
└── contexts/             # Reactコンテキスト
```

## 🎨 画面一覧

### 認証画面
- **ログイン画面** (`/login`) - システムへのログイン
- **新規登録画面** (`/register`) - ユーザー新規登録

### 管理者画面
- **管理者ダッシュボード** (`/admin`) - 全体統計・最近の受注
- **受注管理** (`/admin/orders`) - 受注一覧・検索・フィルタ
- **ユーザー管理** (`/admin/users`) - ユーザー一覧・権限管理
- **レポート** (`/admin/reports`) - 売上分析・レポート出力
- **設定** (`/admin/settings`) - システム設定・施工項目管理

### ユーザー画面
- **ユーザーダッシュボード** (`/user`) - 発注状況・統計
- **新規発注** (`/user/new-order`) - 新規工事発注
- **案件管理** (`/user/orders`) - 発注済み案件の管理
- **アカウント設定** (`/user/settings`) - プロフィール・パスワード変更

### 共通画面
- **受注/発注詳細** (`/order/[id]`) - 案件詳細・ステータス更新

## 🔧 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start

# リンター実行
npm run lint

# TypeScript型チェック
npm run type-check
```

## 📊 データベース設計

### テーブル/シート構成
1. **users** - ユーザー情報
2. **orders** - 受注情報
3. **order_items** - 発注項目詳細
4. **construction_items** - 施工項目マスター
5. **notifications** - 通知情報

## 🚀 今後の開発予定

- [ ] Google Sheets API連携
- [ ] メール通知機能
- [ ] PDF・Excel出力機能
- [ ] モバイルアプリ化（PWA）
- [ ] データ分析・予測機能
- [ ] 多言語対応

## 📄 ライセンス

MIT License

## 📞 お問い合わせ

プロジェクトに関するお問い合わせは、開発チームまでご連絡ください。
