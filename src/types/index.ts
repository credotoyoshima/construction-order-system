// 基本的な型定義

// ユーザー権限
export type UserRole = 'admin' | 'user';

// ステータス
export type OrderStatus = 
  | '日程待ち' 
  | '日程確定' 
  | '施工完了' 
  | '請求済み' 
  | '入金済み' 
  | 'キャンセル';

// 通知タイプ
export type NotificationType = 'order' | 'user' | 'schedule' | 'system' | 'key_status_change';

// ユーザー情報
export interface User {
  id: string;
  role: UserRole;
  companyName: string;
  storeName: string;
  email: string;
  phoneNumber: string;
  address: string;
  password?: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

// 受注情報
export interface Order {
  id: string;
  userId: string;
  contactPerson: string; // 案件担当者（案件ごとに個別指定）
  orderDate: string;
  constructionDate: string;
  propertyName: string;
  roomNumber: string;
  address: string;
  roomArea?: number; // 部屋の広さ（㎡）
  keyLocation: string;
  keyReturn: string;
  keyStatus?: 'pending' | 'handed'; // 鍵の状態（pending: 事務所にある, handed: 事務所にない）
  status: OrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // リレーション
  user?: User;
  orderItems?: OrderItem[];
  totalAmount?: number;
}

// 施工項目マスター
export interface ConstructionItem {
  id: string;
  name: string;
  price: number;
  active: boolean;
  createdAt: string;
  hasQuantity?: boolean; // 数量選択が可能か（エアコンクリーニングのみ）
  hasAreaSelection?: boolean; // 広さ選択が必要か
  priceOptions?: PriceOption[]; // 広さ別価格オプション
}

// 広さ別価格オプション
export interface PriceOption {
  label: string;
  price: number;
}

// 発注項目詳細
export interface OrderItem {
  id: string;
  orderId: string;
  itemId: string;
  quantity: number;
  price: number;
  createdAt: string;
  
  // リレーション
  constructionItem?: ConstructionItem;
}

// 通知情報
export interface Notification {
  id: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// フォーム関連
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  companyName: string;
  storeName: string;
  email: string;
  phoneNumber: string;
  address: string;
  password: string;
  confirmPassword: string;
}

export interface NewOrderForm {
  contactPerson: string; // 案件担当者
  propertyName: string;
  roomNumber: string;
  roomArea?: number; // 部屋の広さ（㎡）
  address: string;
  constructionDate: string;
  keyLocation: string;
  keyReturn: string;
  status: OrderStatus;
  notes?: string;
  constructionItems: {
    itemId: string;
    quantity: number;
    selectedAreaOption?: string; // 選択された広さオプション（光触媒コーティング、空間除菌用）
    priceOverride?: number; // 広さ選択による価格上書き
  }[];
}

// API レスポンス
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ページネーション
export interface PaginationParams {
  page: number;
  limit: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// フィルター関連
export interface OrderFilters {
  search?: string;
  status?: OrderStatus;
  companyName?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: 'active' | 'inactive';
}

// 統計・レポート
export interface OrderStats {
  totalOrders: number;
  totalAmount: number;
  averageAmount: number;
  completionRate: number;
  statusBreakdown: Record<OrderStatus, number>;
}

export interface MonthlyReport {
  month: string;
  orders: number;
  amount: number;
  completionRate: number;
}

export interface CompanyRanking {
  companyName: string;
  orderCount: number;
  totalAmount: number;
  rank: number;
}

// 設定関連
export interface SystemSettings {
  companyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  notifications: {
    email: boolean;
    system: boolean;
  };
  constructionItems: ConstructionItem[];
}

// エラー処理
export interface FormError {
  field: string;
  message: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

// 共通プロパティ
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

// 検索・並び替え
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  [key: string]: any;
}

export interface ChatMessage {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'user';
  message: string;
  messageType: 'text' | 'system' | 'file';
  fileUrl?: string;
  fileName?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
} 