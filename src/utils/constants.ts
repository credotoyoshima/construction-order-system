import { OrderStatus, UserRole, NotificationType } from '@/types';

// ステータス関連
export const ORDER_STATUSES: OrderStatus[] = [
  '日程待ち',
  '日程確定', 
  '施工完了',
  '請求済み',
  '入金済み',
  'キャンセル'
];

export const ORDER_STATUS_COLORS = {
  '日程待ち': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  '日程確定': 'bg-blue-100 text-blue-700 border-blue-200',
  '施工完了': 'bg-green-100 text-green-700 border-green-200',
  '請求済み': 'bg-purple-100 text-purple-700 border-purple-200',
  '入金済み': 'bg-gray-100 text-gray-700 border-gray-200',
  'キャンセル': 'bg-red-100 text-red-700 border-red-200'
};

export const ORDER_STATUS_ORDER = [
  '日程待ち',
  '日程確定',
  '施工完了', 
  '請求済み',
  '入金済み'
];

// ユーザー権限
export const USER_ROLES: UserRole[] = ['admin', 'user'];

export const USER_ROLE_LABELS = {
  admin: '管理者',
  user: 'ユーザー'
};

// 通知タイプ
export const NOTIFICATION_TYPES: NotificationType[] = [
  'order',
  'user', 
  'schedule',
  'system'
];

export const NOTIFICATION_TYPE_LABELS = {
  order: '受注関連',
  user: 'ユーザー関連',
  schedule: '日程関連',
  system: 'システム関連'
};

// 施工項目（初期データ）
export const DEFAULT_CONSTRUCTION_ITEMS = [
  {
    id: 'ITEM001',
    name: 'ゴキブリ防御',
    price: 6600,
    active: true,
    hasQuantity: false
  },
  {
    id: 'ITEM002',
    name: '光触媒コーティング',
    price: 8800, // デフォルト価格（30㎡未満）
    active: true,
    hasQuantity: false,
    hasAreaSelection: true,
    priceOptions: [
      { label: '30㎡未満', price: 8800 },
      { label: '30㎡以上50㎡未満', price: 11000 },
      { label: '50㎡以上', price: 15400 }
    ]
  },
  {
    id: 'ITEM004',
    name: '排水管高圧洗浄',
    price: 8800,
    active: true,
    hasQuantity: false
  },
  {
    id: 'ITEM003',
    name: '空間除菌',
    price: 6600, // デフォルト価格（30㎡未満）
    active: true,
    hasQuantity: false,
    hasAreaSelection: true,
    priceOptions: [
      { label: '30㎡未満', price: 6600 },
      { label: '30㎡以上50㎡未満', price: 8800 },
      { label: '50㎡以上', price: 13200 }
    ]
  },
  {
    id: 'ITEM005',
    name: '浴室コーティング',
    price: 4400,
    active: true,
    hasQuantity: false
  },
  {
    id: 'ITEM006',
    name: 'エアコンクリーニング',
    price: 8800,
    active: true,
    hasQuantity: true
  }
];

// ページネーション
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// APIエンドポイント
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me'
  },
  ORDERS: {
    LIST: '/api/orders',
    CREATE: '/api/orders',
    UPDATE: (id: string) => `/api/orders/${id}`,
    DELETE: (id: string) => `/api/orders/${id}`,
    DETAIL: (id: string) => `/api/orders/${id}`,
    STATS: '/api/orders/stats'
  },
  USERS: {
    LIST: '/api/users',
    CREATE: '/api/users',
    UPDATE: (id: string) => `/api/users/${id}`,
    DELETE: (id: string) => `/api/users/${id}`,
    DETAIL: (id: string) => `/api/users/${id}`
  },
  REPORTS: {
    MONTHLY: '/api/reports/monthly',
    COMPANY_RANKING: '/api/reports/company-ranking',
    CONSTRUCTION_DEMAND: '/api/reports/construction-demand'
  },
  SETTINGS: {
    GET: '/api/settings',
    UPDATE: '/api/settings'
  },
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    MARK_READ: (id: string) => `/api/notifications/${id}/read`,
    MARK_ALL_READ: '/api/notifications/read-all'
  }
};

// ローカルストレージキー
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'construction_order_auth_token',
  USER: 'construction_order_user',
  PREFERENCES: 'construction_order_preferences'
};

// フォームバリデーション
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  PHONE_PATTERN: /^\d{2,4}-\d{2,4}-\d{3,4}$/,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

// エラーメッセージ
export const ERROR_MESSAGES = {
  REQUIRED: '必須項目です',
  INVALID_EMAIL: '有効なメールアドレスを入力してください',
  INVALID_PHONE: '電話番号は00-0000-0000の形式で入力してください',
  PASSWORD_TOO_SHORT: 'パスワードは8文字以上で入力してください',
  PASSWORD_MISMATCH: 'パスワードが一致しません',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  SERVER_ERROR: 'サーバーエラーが発生しました',
  UNAUTHORIZED: '認証が必要です',
  FORBIDDEN: 'アクセス権限がありません',
  NOT_FOUND: 'データが見つかりません'
};

// 成功メッセージ
export const SUCCESS_MESSAGES = {
  LOGIN: 'ログインしました',
  LOGOUT: 'ログアウトしました',
  REGISTER: '登録が完了しました',
  ORDER_CREATED: '発注を登録しました',
  ORDER_UPDATED: '受注情報を更新しました',
  ORDER_DELETED: '受注を削除しました',
  USER_CREATED: 'ユーザーを登録しました',
  USER_UPDATED: 'ユーザー情報を更新しました',
  USER_DELETED: 'ユーザーを削除しました',
  SETTINGS_UPDATED: '設定を更新しました'
};

// ナビゲーション項目
export const ADMIN_NAV_ITEMS = [
  {
    name: 'ホーム',
    href: '/admin',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
  },
  {
    name: '受注管理',
    href: '/admin/orders',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
  },
  {
    name: 'ユーザー管理', 
    href: '/admin/users',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
  },
  {
    name: 'レポート',
    href: '/admin/reports', 
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
  },
  {
    name: '設定',
    href: '/admin/settings',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
  }
];

export const USER_NAV_ITEMS = [
  {
    name: 'ホーム',
    href: '/user',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
  },
  {
    name: '新規発注',
    href: '/user/new-order',
    icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6'
  },
  {
    name: '案件管理',
    href: '/user/orders',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
  },
  {
    name: 'アカウント設定',
    href: '/user/settings',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
  }
];

// デフォルト設定
export const DEFAULT_SETTINGS = {
  companyInfo: {
    name: '工事会社A',
    address: '東京都渋谷区...',
    phone: '03-0000-0000',
    email: 'info@construction-company.jp'
  },
  notifications: {
    email: true,
    system: true
  }
}; 