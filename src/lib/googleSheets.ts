import { GoogleSpreadsheet, GoogleSpreadsheetRow } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import type { User, Order, OrderItem, ConstructionItem, Notification, ChatMessage } from '@/types';
import { sendNotificationEmailToAdmins } from '@/lib/email';

// Google Sheets設定
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');
const GOOGLE_SHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

// JWT認証設定
const serviceAccountAuth = new JWT({
  email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: GOOGLE_PRIVATE_KEY,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});

// Google Spreadsheetインスタンス
let doc: GoogleSpreadsheet | null = null;
// 前回loadInfo実行時刻（ミリ秒）
let lastLoadTime = 0;
// loadInfoを再実行しないTTL（ミリ秒）
const LOAD_TTL = parseInt(process.env.GOOGLE_SHEETS_LOAD_TTL_MS || '60000', 10);

/**
 * Google Sheetsドキュメントに接続
 */
export async function connectToGoogleSheets(): Promise<GoogleSpreadsheet> {
  // 環境変数チェック
  if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    const missingVars = [];
    if (!GOOGLE_SHEET_ID) missingVars.push('GOOGLE_SPREADSHEET_ID');
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL) missingVars.push('GOOGLE_SHEETS_CLIENT_EMAIL');
    if (!GOOGLE_PRIVATE_KEY) missingVars.push('GOOGLE_SHEETS_PRIVATE_KEY');
    
    console.error('Google Sheets環境変数が設定されていません:', missingVars);
    throw new Error(`Google Sheets環境変数が設定されていません: ${missingVars.join(', ')}`);
  }

  if (!doc) {
    doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
  }
  // TTL内はloadInfoをスキップ
  const now = Date.now();
  if (!lastLoadTime || now - lastLoadTime > LOAD_TTL) {
    await doc.loadInfo();
    lastLoadTime = now;
    console.log('Google Sheets loadInfo実行:', doc.title);
  } else {
    console.log('Google Sheets loadInfoスキップ (TTL内)');
  }

  return doc;
}

/**
 * ユーザーデータの取得
 */
export async function getUsers(): Promise<User[]> {
  try {
    const doc = await connectToGoogleSheets();
    const usersSheet = doc.sheetsByTitle['users'] || doc.sheetsById[0];
    
    if (!usersSheet) {
      throw new Error('usersシートが見つかりません');
    }

    const rows = await usersSheet.getRows();
    
    return rows.map((row: GoogleSpreadsheetRow) => ({
      id: row.get('id') || '',
      role: (row.get('role') || 'user') as 'admin' | 'user',
      companyName: row.get('company_name') || '',
      storeName: row.get('store_name') || '',
      contactPerson: row.get('contact_person') || '',
      email: row.get('email') || '',
      phoneNumber: row.get('phone_number') || '',
      address: row.get('address') || '',
      password: row.get('password') || '',
      createdAt: row.get('created_at') || '',
      status: (row.get('status') || 'active') as 'active' | 'inactive'
    }));
  } catch (error) {
    console.error('ユーザーデータ取得エラー:', error);
    
    // 開発環境でのみモックデータを返す
    if (process.env.NODE_ENV === 'development') {
      console.warn('開発環境: ユーザーモックデータを返します');
    return [
      {
        id: 'USER001',
        role: 'admin',
        companyName: 'テスト管理会社',
        storeName: '本社',
        email: 'admin@test.com',
        phoneNumber: '03-1234-5678',
        address: '東京都渋谷区...',
          password: 'admin123',
        createdAt: '2025-01-01T00:00:00Z',
        status: 'active'
      },
      {
        id: 'USER002',
        role: 'user',
        companyName: 'サンプル不動産',
        storeName: '渋谷支店',
        email: 'user@test.com',
        phoneNumber: '03-2345-6789',
        address: '東京都新宿区...',
          password: 'user123',
        createdAt: '2025-01-01T00:00:00Z',
        status: 'active'
      }
    ];
    }
    
    // 本番環境ではエラーを投げる
    throw error;
  }
}

/**
 * 受注データの取得
 */
export async function getOrders(): Promise<Order[]> {
  try {
    const doc = await connectToGoogleSheets();
    const ordersSheet = doc.sheetsByTitle['orders'] || doc.sheetsByIndex.find(sheet => sheet.title === 'orders');
    
    if (!ordersSheet) {
      console.error('利用可能なシート:', Object.keys(doc.sheetsByTitle));
      throw new Error('ordersシートが見つかりません');
    }

    const rows = await ordersSheet.getRows();
    
    return rows.map((row: GoogleSpreadsheetRow) => ({
      id: row.get('id') || '',
      userId: row.get('user_id') || '',
      contactPerson: row.get('contact_person') || '',
      orderDate: row.get('order_date') || '',
      constructionDate: row.get('construction_date') || '',
      propertyName: row.get('property_name') || '',
      roomNumber: row.get('room_number') || '',
      address: row.get('address') || '',
      roomArea: row.get('room_area') ? parseFloat(row.get('room_area')) : undefined,
      keyLocation: row.get('key_location') || '',
      keyReturn: row.get('key_return') || '',
      keyStatus: (row.get('key_status') || 'handed') as 'pending' | 'handed',
      status: (row.get('status') || '日程待ち') as Order['status'],
      notes: row.get('notes') || '',
      createdAt: row.get('created_at') || '',
      updatedAt: row.get('updated_at') || ''
    }));
  } catch (error) {
    console.error('受注データ取得エラー:', error);
    
    // 開発環境でのみモックデータを返す
    if (process.env.NODE_ENV === 'development') {
      console.warn('開発環境: 受注モックデータを返します');
    return [
      {
        id: 'ORD001',
        userId: 'USER002',
        contactPerson: '田中太郎',
        orderDate: '2025-01-20',
        constructionDate: '2025-01-25',
        propertyName: 'レジデンス東京101',
        roomNumber: '101',
        address: '東京都渋谷区...',
        keyLocation: '管理室',
        keyReturn: '管理室',
        keyStatus: 'pending',
        status: '日程待ち',
        notes: '',
        createdAt: '2025-01-20T00:00:00Z',
        updatedAt: '2025-01-20T00:00:00Z'
      },
      {
        id: 'ORD002',
        userId: 'USER002',
        contactPerson: '佐藤花子',
        orderDate: '2025-01-19',
        constructionDate: '2025-01-23',
        propertyName: 'マンション渋谷205',
        roomNumber: '205',
        address: '東京都渋谷区...',
        keyLocation: 'フロント',
        keyReturn: 'フロント',
        keyStatus: 'pending',
        status: '日程確定',
        notes: '',
        createdAt: '2025-01-19T00:00:00Z',
        updatedAt: '2025-01-19T00:00:00Z'
      },
      {
        id: 'ORD003',
        userId: 'USER002',
        contactPerson: '山田次郎',
        orderDate: '2025-01-18',
        constructionDate: '2025-01-22',
        propertyName: 'アパート新宿303',
        roomNumber: '303',
        address: '東京都新宿区...',
        keyLocation: 'オーナー直接',
        keyReturn: 'オーナー直接',
        keyStatus: 'handed',
        status: '施工完了',
        notes: '',
        createdAt: '2025-01-18T00:00:00Z',
        updatedAt: '2025-01-22T00:00:00Z'
      }
    ];
    }
    
    // 本番環境ではエラーを投げる
    throw error;
  }
}

/**
 * 施工内容を含む発注詳細データの取得
 */
export async function getOrdersWithItems(): Promise<(Order & { services: string[] })[]> {
  try {
    const doc = await connectToGoogleSheets();
    const ordersSheet = doc.sheetsByTitle['orders'] || doc.sheetsByIndex.find(sheet => sheet.title === 'orders');
    
    if (!ordersSheet) {
      console.error('利用可能なシート:', Object.keys(doc.sheetsByTitle));
      throw new Error('ordersシートが見つかりません');
    }

    const rows = await ordersSheet.getRows();
    
    // 施工項目とorder_itemsも取得
    const constructionItems = await getConstructionItems();
    let orderItemsSheet = doc.sheetsByTitle['order_items'];
    let orderItemsRows: any[] = [];
    
    if (orderItemsSheet) {
      orderItemsRows = await orderItemsSheet.getRows();
    }
    
    return rows.map((row: GoogleSpreadsheetRow) => {
      const orderId = row.get('id') || '';
      
      // この発注に関連する施工項目を取得
      const relatedOrderItems = orderItemsRows.filter(item => item.get('order_id') === orderId);
      
      // 施工項目名を取得
      const services = relatedOrderItems.map(item => {
        const itemId = item.get('item_id');
        const constructionItem = constructionItems.find(ci => ci.id === itemId);
        return constructionItem ? constructionItem.name : `未知の項目 (${itemId})`;
      });
      
      return {
        id: orderId,
        userId: row.get('user_id') || '',
        contactPerson: row.get('contact_person') || '',
        orderDate: row.get('order_date') || '',
        constructionDate: row.get('construction_date') || '',
        propertyName: row.get('property_name') || '',
        roomNumber: row.get('room_number') || '',
        roomArea: row.get('room_area') ? parseFloat(row.get('room_area')) : undefined,
        address: row.get('address') || '',
        keyLocation: row.get('key_location') || '',
        keyReturn: row.get('key_return') || '',
        keyStatus: (row.get('key_status') || 'handed') as 'pending' | 'handed',
        status: (row.get('status') || '日程待ち') as Order['status'],
        notes: row.get('notes') || '',
        createdAt: row.get('created_at') || '',
        updatedAt: row.get('updated_at') || '',
        services: services
      };
    });
  } catch (error) {
    console.error('施工内容付き受注データ取得エラー:', error);
    
    // 開発環境でのみモックデータを返す
    if (process.env.NODE_ENV === 'development') {
      console.warn('開発環境: 施工内容付き受注モックデータを返します');
      return [
        {
          id: 'ORD001',
          userId: 'USER002',
          contactPerson: '田中太郎',
          orderDate: '2025-01-20',
          constructionDate: '2025-01-25',
          propertyName: 'レジデンス東京101',
          roomNumber: '101',
          roomArea: 30,
          address: '東京都渋谷区...',
          keyLocation: '管理室',
          keyReturn: '管理室',
          keyStatus: 'pending',
          status: '日程待ち',
          notes: '',
          createdAt: '2025-01-20T00:00:00Z',
          updatedAt: '2025-01-20T00:00:00Z',
          services: ['ゴキブリ防御', '光触媒コーティング']
        },
        {
          id: 'ORD002',
          userId: 'USER002',
          contactPerson: '佐藤花子',
          orderDate: '2025-01-19',
          constructionDate: '2025-01-23',
          propertyName: 'マンション渋谷205',
          roomNumber: '205',
          roomArea: 50,
          address: '東京都渋谷区...',
          keyLocation: 'フロント',
          keyReturn: 'フロント',
          keyStatus: 'pending',
          status: '日程確定',
          notes: '',
          createdAt: '2025-01-19T00:00:00Z',
          updatedAt: '2025-01-19T00:00:00Z',
          services: ['空間除菌', '排水管高圧洗浄']
        },
        {
          id: 'ORD003',
          userId: 'USER002',
          contactPerson: '山田次郎',
          orderDate: '2025-01-18',
          constructionDate: '2025-01-22',
          propertyName: 'アパート新宿303',
          roomNumber: '303',
          roomArea: 30,
          address: '東京都新宿区...',
          keyLocation: 'オーナー直接',
          keyReturn: 'オーナー直接',
          keyStatus: 'handed',
          status: '施工完了',
          notes: '',
          createdAt: '2025-01-18T00:00:00Z',
          updatedAt: '2025-01-22T00:00:00Z',
          services: ['浴室コーティング', 'エアコンクリーニング']
        }
      ];
    }
    
    // 本番環境ではエラーを投げる
    throw error;
  }
}

/**
 * 施工項目データの取得
 */
export async function getConstructionItems(): Promise<ConstructionItem[]> {
  try {
    const doc = await connectToGoogleSheets();
    const itemsSheet = doc.sheetsByTitle['construction_items'] || doc.sheetsByIndex.find(sheet => sheet.title === 'construction_items');
    
    if (!itemsSheet) {
      console.error('利用可能なシート:', Object.keys(doc.sheetsByTitle));
      throw new Error('construction_itemsシートが見つかりません');
    }

    const rows = await itemsSheet.getRows();
    
    return rows.map((row: GoogleSpreadsheetRow) => {
      // Google Sheetsからの値を正規化（TRUE/true/1 を true として扱う）
      const normalizeBoolean = (value: string): boolean => {
        if (!value) return false;
        const normalized = value.toString().toLowerCase().trim();
        return normalized === 'true' || normalized === '1' || normalized === 'yes';
      };
      
      const hasAreaSelection = normalizeBoolean(row.get('has_area_selection'));
      const hasQuantity = normalizeBoolean(row.get('has_quantity'));
      const active = normalizeBoolean(row.get('active'));
      
      let priceOptions = undefined;
      
      if (hasAreaSelection) {
        try {
          const priceOptionsStr = row.get('price_options');
          if (priceOptionsStr && priceOptionsStr.trim()) {
            priceOptions = JSON.parse(priceOptionsStr);
          }
        } catch (e) {
          console.warn('価格オプションのパースに失敗:', row.get('id'), e);
        }
      }
      
      console.log('施工項目処理:', {
        id: row.get('id'),
        name: row.get('name'),
        active,
        hasQuantity,
        hasAreaSelection,
        priceOptions: priceOptions ? 'あり' : 'なし'
      });
      
      return {
      id: row.get('id') || '',
      name: row.get('name') || '',
      price: parseInt(row.get('price') || '0'),
        active,
        createdAt: row.get('created_at') || '',
        hasQuantity,
        hasAreaSelection,
        priceOptions
      };
    });
  } catch (error) {
    console.error('施工項目データ取得エラー:', error);
    
    // 開発環境でのみモックデータを返す
    if (process.env.NODE_ENV === 'development') {
      console.warn('開発環境: モックデータを返します');
    return [
      {
        id: 'ITEM001',
          name: 'ゴキブリ防御',
          price: 6600,
        active: true,
          createdAt: '2025-01-01T00:00:00Z',
          hasQuantity: false
      },
      {
        id: 'ITEM002',
          name: '光触媒コーティング',
          price: 8800,
        active: true,
          createdAt: '2025-01-01T00:00:00Z',
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
          createdAt: '2025-01-01T00:00:00Z',
          hasQuantity: false
      },
      {
        id: 'ITEM003',
          name: '空間除菌',
          price: 6600,
        active: true,
          createdAt: '2025-01-01T00:00:00Z',
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
          createdAt: '2025-01-01T00:00:00Z',
          hasQuantity: false
        },
        {
          id: 'ITEM006',
          name: 'エアコンクリーニング',
          price: 8800,
          active: true,
          createdAt: '2025-01-01T00:00:00Z',
          hasQuantity: true
      }
    ];
    }
    
    // 本番環境ではエラーを投げる
    throw error;
  }
}

/**
 * 施工内容を含むアーカイブ済み受注データの取得
 */
export async function getArchivedOrdersWithItems(): Promise<(Order & { services: string[]; archivedAt: string; totalAmount: number })[]> {
  try {
    const doc = await connectToGoogleSheets();
    const archiveSheet = doc.sheetsByTitle['orders_archive'];
    if (!archiveSheet) {
      console.error('orders_archive シートが見つかりません');
      throw new Error('orders_archive シートが見つかりません');
    }
    const rows = await archiveSheet.getRows();

    // 施工項目データ取得
    const constructionItems = await getConstructionItems();
    const orderItemsSheet = doc.sheetsByTitle['order_items'];
    const orderItemsRows = orderItemsSheet ? await orderItemsSheet.getRows() : [];

    return rows.map((row: GoogleSpreadsheetRow) => {
      const orderId = row.get('id') || '';
      const relatedItems = orderItemsRows.filter(item => item.get('order_id') === orderId);
      const services = relatedItems.map(item => {
        const itemId = item.get('item_id');
        const ci = constructionItems.find(c => c.id === itemId);
        return ci ? ci.name : `未知の項目 (${itemId})`;
      });
      // 請求額を計算 (quantity * price の合計)
      const totalAmount = relatedItems.reduce((sum, item) => {
        const qty = parseInt(item.get('quantity') || '0', 10);
        const price = parseFloat(item.get('price') || '0');
        return sum + qty * price;
      }, 0);
      return {
        id: orderId,
        userId: row.get('user_id') || '',
        contactPerson: row.get('contact_person') || '',
        orderDate: row.get('order_date') || '',
        constructionDate: row.get('construction_date') || '',
        propertyName: row.get('property_name') || '',
        roomNumber: row.get('room_number') || '',
        roomArea: row.get('room_area') ? parseFloat(row.get('room_area')) : undefined,
        address: row.get('address') || '',
        keyLocation: row.get('key_location') || '',
        keyReturn: row.get('key_return') || '',
        keyStatus: (row.get('key_status') || 'pending') as 'pending' | 'handed',
        status: (row.get('status') || '日程待ち') as Order['status'],
        notes: row.get('notes') || '',
        createdAt: row.get('created_at') || '',
        updatedAt: row.get('updated_at') || '',
        services: services,
        archivedAt: row.get('archived_at') || '',
        totalAmount: totalAmount
      };
    });
  } catch (error) {
    console.error('アーカイブ済み受注データ取得エラー:', error);
    throw error;
  }
}

/**
 * 次のユーザーIDを生成
 */
async function generateNextUserId(): Promise<string> {
  try {
    const users = await getUsers();
    if (users.length === 0) {
      return 'USER001';
    }
    
    // 既存のIDから最大番号を取得
    const maxNumber = users
      .map(user => user.id)
      .filter(id => id.startsWith('USER'))
      .map(id => parseInt(id.replace('USER', ''), 10))
      .filter(num => !isNaN(num))
      .reduce((max, num) => Math.max(max, num), 0);
    
    const nextNumber = maxNumber + 1;
    return `USER${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('ユーザーID生成エラー:', error);
    // フォールバック：現在時刻ベースの短縮ID
    return `USER${Math.floor(Date.now() / 1000).toString().slice(-3)}`;
  }
}

/**
 * 次の受注IDを生成
 */
async function generateNextOrderId(): Promise<string> {
  try {
    const orders = await getOrders();
    if (orders.length === 0) {
      return 'ORD001';
    }
    
    // 既存のIDから最大番号を取得
    const maxNumber = orders
      .map(order => order.id)
      .filter(id => id.startsWith('ORD'))
      .map(id => parseInt(id.replace('ORD', ''), 10))
      .filter(num => !isNaN(num))
      .reduce((max, num) => Math.max(max, num), 0);
    
    const nextNumber = maxNumber + 1;
    // 動的に桁数を調整（最低3桁、必要に応じて拡張）
    const minDigits = nextNumber >= 1000 ? nextNumber.toString().length : 3;
    return `ORD${nextNumber.toString().padStart(minDigits, '0')}`;
  } catch (error) {
    console.error('受注ID生成エラー:', error);
    // フォールバック：現在時刻ベースの短縮ID
    return `ORD${Math.floor(Date.now() / 1000).toString().slice(-3)}`;
  }
}

/**
 * 新規ユーザーの追加
 */
export async function addUser(userData: {
  companyName: string;
  storeName: string;
  email: string;
  phoneNumber: string;
  address: string;
  password: string;
}): Promise<User> {
  try {
    const doc = await connectToGoogleSheets();
    const usersSheet = doc.sheetsByTitle['users'];
    
    if (!usersSheet) {
      throw new Error('usersシートが見つかりません');
    }

    const userId = await generateNextUserId();

    const newUser = {
      id: userId,
      role: 'user',
      company_name: userData.companyName,
      store_name: userData.storeName,
      email: userData.email,
      phone_number: userData.phoneNumber,
      address: userData.address,
      password: userData.password, // 本番では暗号化必要
      created_at: new Date().toISOString(),
      status: 'active'
    };

    await usersSheet.addRow(newUser);
    console.log('新規ユーザー追加成功:', userData.email, 'ID:', userId);
    
    return {
      id: newUser.id,
      role: 'user',
      companyName: userData.companyName,
      storeName: userData.storeName,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      address: userData.address,
      createdAt: newUser.created_at,
      status: 'active'
    };
  } catch (error) {
    console.error('ユーザー追加エラー:', error);
    throw error;
  }
}

/**
 * 新規受注の追加
 */
export async function addOrder(orderData: {
  userId: string;
  contactPerson: string;
  propertyName: string;
  roomNumber: string;
  address: string;
  roomArea?: number;
  constructionDate: string;
  keyLocation: string;
  keyReturn: string;
  notes?: string;
  constructionItems?: {
    itemId: string;
    quantity: number;
    selectedAreaOption?: string;
  }[];
  status?: Order['status'];
}): Promise<Order> {
  try {
    const doc = await connectToGoogleSheets();
    const ordersSheet = doc.sheetsByTitle['orders'];
    
    if (!ordersSheet) {
      throw new Error('ordersシートが見つかりません');
    }

    const orderId = await generateNextOrderId();

    const newOrder = {
      id: orderId,
      user_id: orderData.userId,
      contact_person: orderData.contactPerson,
      order_date: new Date().toISOString().split('T')[0],
      construction_date: orderData.constructionDate,
      property_name: orderData.propertyName,
      room_number: orderData.roomNumber,
      address: orderData.address,
      room_area: orderData.roomArea || '',
      key_location: orderData.keyLocation,
      key_return: orderData.keyReturn,
      key_status: 'handed',
      status: orderData.status || '日程待ち',
      notes: orderData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await ordersSheet.addRow(newOrder);
    console.log('新規受注追加成功:', orderId, 'ユーザーID:', orderData.userId);

    // 施工項目詳細を保存
    if (orderData.constructionItems && orderData.constructionItems.length > 0) {
      await addOrderItems(orderId, orderData.constructionItems);
    }
    
    return {
      id: newOrder.id,
      userId: orderData.userId,
      contactPerson: orderData.contactPerson,
      orderDate: newOrder.order_date,
      constructionDate: orderData.constructionDate,
      propertyName: orderData.propertyName,
      roomNumber: orderData.roomNumber,
      address: orderData.address,
      roomArea: orderData.roomArea,
      keyLocation: orderData.keyLocation,
      keyReturn: orderData.keyReturn,
      keyStatus: 'handed',
      status: newOrder.status as Order['status'],
      notes: orderData.notes || '',
      createdAt: newOrder.created_at,
      updatedAt: newOrder.updated_at
    };
  } catch (error) {
    console.error('受注追加エラー:', error);
    throw error;
  }
}

/**
 * 発注項目詳細の追加
 */
async function addOrderItems(orderId: string, constructionItems: {
  itemId: string;
  quantity: number;
  selectedAreaOption?: string;
}[]): Promise<void> {
  try {
    console.log('➕ 施工項目追加開始:', orderId);
    console.log('📋 追加項目詳細:', constructionItems);

    const doc = await connectToGoogleSheets();
    let orderItemsSheet = doc.sheetsByTitle['order_items'];
    
    // order_itemsシートが存在しない場合は作成
    if (!orderItemsSheet) {
      console.log('📄 order_itemsシートを新規作成中...');
      orderItemsSheet = await doc.addSheet({
        title: 'order_items',
        headerValues: ['id', 'order_id', 'item_id', 'quantity', 'price', 'selected_area_option', 'price_override', 'created_at']
      });
    }

    // 施工項目マスタを取得して価格を決定
    console.log('📖 施工項目マスタを取得中...');
    const allConstructionItems = await getConstructionItems();
    console.log(`📚 マスタ項目数: ${allConstructionItems.length}件`);

    // 各施工項目を追加
    for (let i = 0; i < constructionItems.length; i++) {
      const item = constructionItems[i];
      const itemId = `${orderId}_${item.itemId}_${i + 1}`;
      
              // 価格を決定（広さ選択を考慮）
        const constructionItemMaster = allConstructionItems.find(ci => ci.id === item.itemId);
        let finalPrice = constructionItemMaster ? constructionItemMaster.price : 0;
        
        // 広さ選択がある場合、選択されたオプションの価格を使用
        if (constructionItemMaster?.hasAreaSelection && constructionItemMaster.priceOptions && item.selectedAreaOption) {
          const selectedPriceOption = constructionItemMaster.priceOptions.find(
            option => option.label === item.selectedAreaOption
          );
          if (selectedPriceOption) {
            finalPrice = selectedPriceOption.price;
          }
        }
      
              console.log(`💰 価格計算 [${i + 1}/${constructionItems.length}]:`, {
          itemId: item.itemId,
          itemName: constructionItemMaster?.name || '不明',
          quantity: item.quantity,
          basePrice: constructionItemMaster?.price,
          hasAreaSelection: constructionItemMaster?.hasAreaSelection || false,
          selectedAreaOption: item.selectedAreaOption,
          finalPrice: finalPrice
        });
      
              const rowData = {
          id: itemId,
          order_id: orderId,
          item_id: item.itemId,
          quantity: item.quantity,
          price: finalPrice,
          selected_area_option: item.selectedAreaOption || '',
          price_override: '', // 常に空文字（単価固定のため）
          created_at: new Date().toISOString()
        };

      console.log('💾 行データ追加:', rowData);
      
      await orderItemsSheet.addRow(rowData);
      console.log(`✅ 項目追加完了: ${itemId}`);
    }
    
    console.log('🎉 発注項目詳細追加成功:', orderId, constructionItems.length, '件');
  } catch (error) {
    console.error('💥 発注項目詳細追加エラー:', error);
    throw error;
  }
}

/**
 * 受注ステータスの更新
 */
export async function updateOrderStatus(orderId: string, status: Order['status']): Promise<GoogleSpreadsheetRow> {
  try {
    const doc = await connectToGoogleSheets();
    const ordersSheet = doc.sheetsByTitle['orders'];
    
    if (!ordersSheet) {
      throw new Error('ordersシートが見つかりません');
    }

    const rows = await ordersSheet.getRows();
    const targetRow = rows.find((row: GoogleSpreadsheetRow) => row.get('id') === orderId);
    
    if (!targetRow) {
      throw new Error(`受注ID ${orderId} が見つかりません`);
    }

    targetRow.set('status', status);
    targetRow.set('updated_at', new Date().toISOString());
    await targetRow.save();
    
    console.log('受注ステータス更新成功:', orderId, status);
    // 入金済みに更新された場合、orders_archive シートへコピー
    if (status === '入金済み') {
      const archiveSheet = doc.sheetsByTitle['orders_archive'];
      if (!archiveSheet) {
        throw new Error('orders_archive シートが見つかりません');
      }
      // アーカイブ用データを準備
      await archiveSheet.addRow({
        id: targetRow.get('id'),
        user_id: targetRow.get('user_id'),
        contact_person: targetRow.get('contact_person'),
        order_date: targetRow.get('order_date'),
        construction_date: targetRow.get('construction_date'),
        property_name: targetRow.get('property_name'),
        room_number: targetRow.get('room_number'),
        address: targetRow.get('address'),
        room_area: targetRow.get('room_area'),
        key_location: targetRow.get('key_location'),
        key_return: targetRow.get('key_return'),
        status: targetRow.get('status'),
        notes: targetRow.get('notes'),
        created_at: targetRow.get('created_at'),
        updated_at: targetRow.get('updated_at'),
        key_status: targetRow.get('key_status'),
        archived_at: new Date().toISOString()
      });
      console.log('案件をアーカイブシートにコピーしました:', orderId);
    }
    return targetRow;
  } catch (error) {
    console.error('受注ステータス更新エラー:', error);
    throw error;
  }
}

/**
 * ユーザー認証（簡易版）
 */
export async function authenticateUser(email: string, password: string): Promise<User> {
  try {
    const users = await getUsers();
    const user = users.find((u: User) => u.email === email);
    
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    // パスワードが一致しない場合はエラー
    if (user.password !== password) {
      throw new Error('パスワードが正しくありません');
    }

    return {
      id: user.id,
      role: user.role,
      companyName: user.companyName,
      storeName: user.storeName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      createdAt: user.createdAt,
      status: user.status
    };
  } catch (error) {
    console.error('認証エラー:', error);
    throw error;
  }
}

/**
 * 統計データの取得
 */
export async function getStatistics() {
  try {
    const orders = await getOrders();
    const users = await getUsers();
    
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyOrders = orders.filter((order: Order) => 
      order.orderDate.startsWith(currentMonth)
    );
    
    const statusCounts = orders.reduce((acc: Record<string, number>, order: Order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalOrders: orders.length,
      monthlyOrders: monthlyOrders.length,
      totalUsers: users.length,
      statusBreakdown: statusCounts,
      pendingOrders: statusCounts['日程待ち'] || 0
    };
  } catch (error) {
    console.error('統計データ取得エラー:', error);
    throw error;
  }
}

/**
 * 通知IDの生成
 */
async function generateNextNotificationId(): Promise<string> {
  try {
    const doc = await connectToGoogleSheets();
    const notificationsSheet = doc.sheetsByTitle['notifications'];
    
    if (!notificationsSheet) {
      console.warn('notificationsシートが見つかりません');
      return 'NOT001';
    }

    const rows = await notificationsSheet.getRows();
    
    if (rows.length === 0) {
      return 'NOT001';
    }

    // 既存のIDから最大値を取得
    const existingIds = rows
      .map(row => row.get('id'))
      .filter(id => id && id.startsWith('NOT'))
      .map(id => parseInt(id.substring(3)))
      .filter(num => !isNaN(num));

    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const nextId = maxId + 1;
    
    return `NOT${nextId.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('通知ID生成エラー:', error);
    return `NOT${Date.now().toString().slice(-3)}`;
  }
}

/**
 * 通知データの取得
 */
export async function getNotifications(userId?: string): Promise<Notification[]> {
  try {
    const doc = await connectToGoogleSheets();
    const notificationsSheet = doc.sheetsByTitle['notifications'];
    
    if (!notificationsSheet) {
      console.warn('notificationsシートが見つかりません。空の配列を返します。');
      return [];
    }

    const rows = await notificationsSheet.getRows();
    
    let notifications = rows.map((row: GoogleSpreadsheetRow) => {
      const readValue = row.get('read');
      const isRead = String(readValue).toLowerCase() === 'true';
      console.log(`通知取得: ${row.get('id')} - read値: ${readValue} (${typeof readValue}) -> ${isRead}`);
      
      return {
        id: row.get('id') || '',
        userId: row.get('user_id') || null,
        type: (row.get('type') || 'system') as Notification['type'],
        title: row.get('title') || '',
        message: row.get('message') || '',
        read: isRead,
        createdAt: row.get('created_at') || ''
      };
    });

    // ユーザーIDでフィルター（指定された場合のみ）
    if (userId) {
      notifications = notifications.filter(n => 
        n.userId === userId || n.userId === null || n.userId === ''
      );
    }

    // 新しい順にソート
    notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 最新50件だけ取得して返す
    return notifications.slice(0, 50);
  } catch (error) {
    console.error('通知データ取得エラー:', error);
    return [];
  }
}

/**
 * 管理者ユーザーの取得
 */
export async function getAdminUsers(): Promise<User[]> {
  try {
    const allUsers = await getUsers();
    return allUsers.filter(user => user.role === 'admin' && user.status === 'active');
  } catch (error) {
    console.error('管理者ユーザー取得エラー:', error);
    return [];
  }
}

/**
 * 新しい通知の追加（メール送信機能付き）
 */
export async function addNotification(notificationData: {
  userId?: string;
  type: Notification['type'];
  title: string;
  message: string;
}): Promise<Notification> {
  try {
    const doc = await connectToGoogleSheets();
    const notificationsSheet = doc.sheetsByTitle['notifications'];
    
    if (!notificationsSheet) {
      throw new Error('notificationsシートが見つかりません');
    }

    const id = await generateNextNotificationId();
    const now = new Date().toISOString();

    const newRow = await notificationsSheet.addRow({
      id: id,
      user_id: notificationData.userId || '',
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      read: false,
      created_at: now
    });

    console.log('通知が追加されました:', id);

    const newNotification: Notification = {
      id: id,
      userId: notificationData.userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      read: false,
      createdAt: now
    };

    // メール送信は各通知生成関数で個別に処理するため、ここでは送信しない

    return newNotification;
  } catch (error) {
    console.error('通知追加エラー:', error);
    throw new Error('通知の追加に失敗しました');
  }
}

/**
 * 通知を既読にする
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const doc = await connectToGoogleSheets();
    const notificationsSheet = doc.sheetsByTitle['notifications'];
    
    if (!notificationsSheet) {
      throw new Error('notificationsシートが見つかりません');
    }

    const rows = await notificationsSheet.getRows();
    const targetRow = rows.find(row => row.get('id') === notificationId);
    
    if (!targetRow) {
      throw new Error(`通知が見つかりません: ${notificationId}`);
    }

    targetRow.set('read', true);
    await targetRow.save();

    console.log('通知を既読にしました:', notificationId);
  } catch (error) {
    console.error('通知既読更新エラー:', error);
    throw new Error('通知の既読更新に失敗しました');
  }
}

/**
 * 通知の既読/未読状態を切り替える
 */
export async function toggleNotificationReadStatus(notificationId: string): Promise<boolean> {
  try {
    const doc = await connectToGoogleSheets();
    const notificationsSheet = doc.sheetsByTitle['notifications'];
    
    if (!notificationsSheet) {
      throw new Error('notificationsシートが見つかりません');
    }

    const rows = await notificationsSheet.getRows();
    const targetRow = rows.find(row => row.get('id') === notificationId);
    
    if (!targetRow) {
      throw new Error(`通知が見つかりません: ${notificationId}`);
    }

    const readValue = targetRow.get('read');
    const currentReadStatus = String(readValue).toLowerCase() === 'true';
    const newReadStatus = !currentReadStatus;
    
    console.log(`通知状態切り替え: ${notificationId}`);
    console.log(`現在の状態: ${readValue} (${typeof readValue})`);
    console.log(`判定された現在状態: ${currentReadStatus}`);
    console.log(`新しい状態: ${newReadStatus}`);
    
    targetRow.set('read', newReadStatus);
    await targetRow.save();

    console.log(`通知の既読状態を切り替えました: ${notificationId} -> ${newReadStatus ? '既読' : '未読'}`);
    return newReadStatus;
  } catch (error) {
    console.error('通知既読状態切り替えエラー:', error);
    throw new Error('通知の既読状態切り替えに失敗しました');
  }
}

/**
 * システム通知の自動生成：新規受注
 */
export async function createOrderNotification(order: Order): Promise<void> {
  try {
    // 顧客情報を取得
    let customerInfo = undefined;
    try {
      const users = await getUsers();
      const user = users.find(u => u.id === order.userId);
      
      if (user) {
        customerInfo = {
          orderId: order.id,
          propertyName: order.propertyName,
          roomNumber: order.roomNumber,
          companyName: user.companyName,
          storeName: user.storeName,
          contactPerson: order.contactPerson
        };
      }
    } catch (error) {
      console.warn('顧客情報取得エラー:', error);
    }

    const notification = await addNotification({
      type: 'order',
      title: '新しい受注が追加されました',
      message: `${order.propertyName}の工事依頼が追加されました（受注ID: ${order.id}）`
    });

    // 顧客情報付きでメール送信
    if (customerInfo) {
      const adminUsers = await getAdminUsers();
      if (adminUsers.length > 0) {
        sendNotificationEmailToAdmins(notification, adminUsers, customerInfo).catch(error => {
          console.error('❌ 新規受注メール送信エラー:', error);
        });
      }
    }
  } catch (error) {
    console.error('受注通知生成エラー:', error);
  }
}

/**
 * システム通知の自動生成：新規ユーザー登録
 */
export async function createUserRegistrationNotification(user: User): Promise<void> {
  try {
    const customerInfo = {
      companyName: user.companyName,
      storeName: user.storeName,
      contactPerson: '', // ユーザー登録時は担当者情報なし
      propertyName: '', // ユーザー登録時は物件情報なし
      roomNumber: '' // ユーザー登録時は部屋番号なし
    };

    const notification = await addNotification({
      type: 'user',
      title: '新規ユーザーが登録されました',
      message: `${user.companyName} ${user.storeName}のユーザーアカウントが作成されました`
    });

    // 顧客情報付きでメール送信
    const adminUsers = await getAdminUsers();
    if (adminUsers.length > 0) {
      sendNotificationEmailToAdmins(notification, adminUsers, customerInfo).catch(error => {
        console.error('❌ ユーザー登録メール送信エラー:', error);
      });
    }
  } catch (error) {
    console.error('ユーザー登録通知生成エラー:', error);
  }
}

/**
 * システム通知の自動生成：ステータス変更
 */
export async function createStatusChangeNotification(orderId: string, newStatus: string, propertyName: string, userId: string): Promise<void> {
  try {
    // 注文情報と顧客情報を取得
    const orders = await getOrders();
    const order = orders.find(o => o.id === orderId);
    
    let customerInfo = undefined;
    let targetUser;
    if (order) {
      const users = await getUsers();
      const user = users.find(u => u.id === order.userId);
      
      if (user) {
        customerInfo = {
          orderId: orderId,
          propertyName: order.propertyName,
          roomNumber: order.roomNumber,
          companyName: user.companyName,
          storeName: user.storeName,
          contactPerson: order.contactPerson
        };
        targetUser = user;
      }
    }

    const notification = await addNotification({
      userId: userId,
      type: 'schedule',
      title: 'ステータスが更新されました',
      message: `${propertyName}（受注ID: ${orderId}）のステータスが「${newStatus}」に更新されました`
    });

    // 管理者へのメール送信（「日程確定」「依頼キャンセル」時）
      const adminUsers = await getAdminUsers();
    if (customerInfo && adminUsers.length > 0 && ['日程確定', '依頼キャンセル'].includes(newStatus)) {
        sendNotificationEmailToAdmins(notification, adminUsers, customerInfo).catch(error => {
        console.error('❌ 管理者へのステータス変更メール送信エラー:', error);
        });
      }
    // ユーザーへのメール送信（「日程確定」「依頼キャンセル」時は送信しない）
    if (!['日程確定', '依頼キャンセル'].includes(newStatus) && customerInfo && targetUser && targetUser.email) {
      sendNotificationEmailToAdmins(notification, [targetUser], customerInfo).catch(error => {
        console.error('❌ ユーザーへのステータス変更メール送信エラー:', error);
      });
    }
  } catch (error) {
    console.error('ステータス変更通知生成エラー:', error);
  }
}

/**
 * システム通知の自動生成：鍵状態変更
 */
export async function createKeyStatusChangeNotification(orderId: string, propertyName: string): Promise<void> {
  try {
    // 注文情報と顧客情報を取得
    const orders = await getOrders();
    const order = orders.find(o => o.id === orderId);
    
    let customerInfo = undefined;
    if (order) {
      const users = await getUsers();
      const user = users.find(u => u.id === order.userId);
      
      if (user) {
        customerInfo = {
          orderId: orderId,
          propertyName: order.propertyName,
          roomNumber: order.roomNumber,
          companyName: user.companyName,
          storeName: user.storeName,
          contactPerson: order.contactPerson
        };
      }
    }

    const notification = await addNotification({
      type: 'order',
      title: '鍵が到着しました',
      message: `${propertyName}（受注ID: ${orderId}）の鍵が到着済みになりました`
    });

    // 顧客情報付きでメール送信
    if (customerInfo) {
      const adminUsers = await getAdminUsers();
      if (adminUsers.length > 0) {
        sendNotificationEmailToAdmins(notification, adminUsers, customerInfo).catch(error => {
          console.error('❌ 鍵状態変更メール送信エラー:', error);
        });
      }
    }
  } catch (error) {
    console.error('鍵状態変更通知生成エラー:', error);
  }
}

/**
 * ユーザー情報の更新
 */
export async function updateUser(userId: string, updateData: {
  companyName?: string;
  storeName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  role?: 'admin' | 'user';
  status?: 'active' | 'inactive';
}): Promise<{ success: boolean; data?: User; error?: string }> {
  try {
    const doc = await connectToGoogleSheets();
    const usersSheet = doc.sheetsByTitle['users'] || doc.sheetsById[0];
    
    if (!usersSheet) {
      throw new Error('usersシートが見つかりません');
    }

    const rows = await usersSheet.getRows();
    const userRow = rows.find(row => row.get('id') === userId);

    if (!userRow) {
      return {
        success: false,
        error: 'ユーザーが見つかりません'
      };
    }

    // データの更新
    if (updateData.companyName !== undefined) userRow.set('company_name', updateData.companyName);
    if (updateData.storeName !== undefined) userRow.set('store_name', updateData.storeName);
    if (updateData.email !== undefined) userRow.set('email', updateData.email);
    if (updateData.phoneNumber !== undefined) userRow.set('phone_number', updateData.phoneNumber);
    if (updateData.address !== undefined) userRow.set('address', updateData.address);
    if (updateData.role !== undefined) userRow.set('role', updateData.role);
    if (updateData.status !== undefined) userRow.set('status', updateData.status);

    // 更新日時を設定
    userRow.set('updated_at', new Date().toISOString());

    await userRow.save();

    // 更新されたユーザーデータを返す
    const updatedUser: User = {
      id: userRow.get('id'),
      role: (userRow.get('role') || 'user') as 'admin' | 'user',
      companyName: userRow.get('company_name') || '',
      storeName: userRow.get('store_name') || '',
      email: userRow.get('email') || '',
      phoneNumber: userRow.get('phone_number') || '',
      address: userRow.get('address') || '',
      createdAt: userRow.get('created_at') || '',
      status: (userRow.get('status') || 'active') as 'active' | 'inactive'
    };

    console.log('ユーザー情報更新成功:', userId);
    
    return {
      success: true,
      data: updatedUser
    };
  } catch (error) {
    console.error('ユーザー情報更新エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ユーザー情報の更新に失敗しました'
    };
  }
}

/**
 * ユーザーの削除
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const doc = await connectToGoogleSheets();
    const usersSheet = doc.sheetsByTitle['users'] || doc.sheetsById[0];
    
    if (!usersSheet) {
      throw new Error('usersシートが見つかりません');
    }

    const rows = await usersSheet.getRows();
    const userRow = rows.find(row => row.get('id') === userId);

    if (!userRow) {
      return {
        success: false,
        error: 'ユーザーが見つかりません'
      };
    }

    // 物理削除ではなく、ステータスを'deleted'に変更する（データ保持のため）
    userRow.set('status', 'deleted');
    userRow.set('updated_at', new Date().toISOString());
    await userRow.save();

    console.log('ユーザー削除成功:', userId);
    
    return {
      success: true
    };
  } catch (error) {
    console.error('ユーザー削除エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ユーザーの削除に失敗しました'
    };
  }
} 

/**
 * 注文情報の更新
 */
export async function updateOrder(orderId: string, updateData: {
  propertyName?: string;
  roomNumber?: string;
  address?: string;
  roomArea?: number;
  constructionDate?: string;
  keyLocation?: string;
  keyReturn?: string;
  keyStatus?: 'pending' | 'handed';
  notes?: string;
  contactPerson?: string;
  status?: Order['status'];
  orderItems?: {
    itemId: string;
    quantity: number;
    selectedAreaOption?: string;
  }[];
}): Promise<Order> {
  try {
    const doc = await connectToGoogleSheets();
    const ordersSheet = doc.sheetsByTitle['orders'];
    
    if (!ordersSheet) {
      throw new Error('ordersシートが見つかりません');
    }

    const rows = await ordersSheet.getRows();
    const orderRow = rows.find(row => row.get('id') === orderId);

    if (!orderRow) {
      throw new Error('注文が見つかりません');
    }

    // 基本情報の更新
    if (updateData.propertyName !== undefined) orderRow.set('property_name', updateData.propertyName);
    if (updateData.roomNumber !== undefined) orderRow.set('room_number', updateData.roomNumber);
    if (updateData.address !== undefined) orderRow.set('address', updateData.address);
    if (updateData.roomArea !== undefined) orderRow.set('room_area', updateData.roomArea || '');
    if (updateData.constructionDate !== undefined) orderRow.set('construction_date', updateData.constructionDate);
    if (updateData.keyLocation !== undefined) orderRow.set('key_location', updateData.keyLocation);
    if (updateData.keyReturn !== undefined) orderRow.set('key_return', updateData.keyReturn);
    if (updateData.keyStatus !== undefined) {
      console.log('🔑 鍵ステータス更新:', { orderId, oldStatus: orderRow.get('key_status'), newStatus: updateData.keyStatus });
      orderRow.set('key_status', updateData.keyStatus);
    }
    if (updateData.notes !== undefined) orderRow.set('notes', updateData.notes);
    if (updateData.contactPerson !== undefined) orderRow.set('contact_person', updateData.contactPerson);
    if (updateData.status !== undefined) orderRow.set('status', updateData.status);

    // 更新日時を設定
    orderRow.set('updated_at', new Date().toISOString());

    console.log('💾 Google Sheetsに保存中...', { orderId, keyStatus: orderRow.get('key_status') });
    await orderRow.save();
    console.log('✅ Google Sheets保存完了');

    // 施工項目の更新（既存のorder_itemsを削除して再作成）
    if (updateData.orderItems !== undefined) {
      await updateOrderItems(orderId, updateData.orderItems);
    }

    // 更新されたデータを返す
    const updatedOrder: Order = {
      id: orderRow.get('id'),
      userId: orderRow.get('user_id'),
      contactPerson: orderRow.get('contact_person') || '',
      orderDate: orderRow.get('order_date'),
      constructionDate: orderRow.get('construction_date'),
      propertyName: orderRow.get('property_name'),
      roomNumber: orderRow.get('room_number') || '',
      address: orderRow.get('address'),
      roomArea: orderRow.get('room_area') ? parseFloat(orderRow.get('room_area')) : undefined,
              keyLocation: orderRow.get('key_location') || '',
        keyReturn: orderRow.get('key_return') || '',
        keyStatus: (orderRow.get('key_status') || 'handed') as 'pending' | 'handed',
        status: orderRow.get('status') as Order['status'],
      notes: orderRow.get('notes') || '',
      createdAt: orderRow.get('created_at'),
      updatedAt: orderRow.get('updated_at')
    };

    console.log('注文更新成功:', orderId);
    
    return updatedOrder;
  } catch (error) {
    console.error('注文更新エラー:', error);
    throw new Error('注文の更新に失敗しました');
  }
}

/**
 * 注文の施工項目を更新
 */
async function updateOrderItems(orderId: string, constructionItems: {
  itemId: string;
  quantity: number;
  selectedAreaOption?: string;
}[]): Promise<void> {
  try {
    console.log('🔧 施工項目更新開始:', orderId);
    console.log('📋 更新対象項目:', constructionItems);

    const doc = await connectToGoogleSheets();
    const orderItemsSheet = doc.sheetsByTitle['order_items'];
    
    if (!orderItemsSheet) {
      console.warn('⚠️ order_itemsシートが見つかりません。施工項目の更新をスキップします。');
      return;
    }

    // 既存のorder_itemsを削除
    console.log('🗑️ 既存の施工項目を削除中...');
    const rows = await orderItemsSheet.getRows();
    const existingItems = rows.filter(row => row.get('order_id') === orderId);
    
    console.log(`📊 削除対象: ${existingItems.length}件`);
    
    for (const item of existingItems) {
      console.log('🗑️ 削除:', item.get('id'));
      await item.delete();
    }

    // 新しいorder_itemsを追加
    if (constructionItems.length > 0) {
      console.log('➕ 新しい施工項目を追加中...');
      await addOrderItems(orderId, constructionItems);
    } else {
      console.log('📝 施工項目なし（空の配列）');
    }

    console.log('✅ 施工項目更新成功:', orderId);
  } catch (error) {
    console.error('💥 施工項目更新エラー:', error);
    throw new Error('施工項目の更新に失敗しました');
  }
}

/**
 * 特定注文の施工項目を取得
 */
export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  try {
    const doc = await connectToGoogleSheets();
    const orderItemsSheet = doc.sheetsByTitle['order_items'];
    
    if (!orderItemsSheet) {
      console.warn('order_itemsシートが見つかりません。空の配列を返します。');
      return [];
    }

    const rows = await orderItemsSheet.getRows();
    const orderItems = rows
      .filter(row => row.get('order_id') === orderId)
      .map((row: GoogleSpreadsheetRow) => ({
        id: row.get('id') || '',
        orderId: row.get('order_id') || '',
        itemId: row.get('item_id') || '',
        quantity: Number(row.get('quantity')) || 1,
        price: Number(row.get('price')) || 0,
        selectedAreaOption: row.get('selected_area_option') || undefined,
        createdAt: row.get('created_at') || ''
      }));

    return orderItems;
  } catch (error) {
    console.error('施工項目取得エラー:', error);
    return [];
  }
}

/**
 * チャットメッセージIDの生成
 */
async function generateNextChatId(): Promise<string> {
  try {
    const doc = await connectToGoogleSheets();
    const chatSheet = doc.sheetsByTitle['order_chats'];
    
    if (!chatSheet) {
      return 'CHAT001';
    }

    const rows = await chatSheet.getRows();
    const existingIds = rows.map(row => row.get('id')).filter(id => id && id.startsWith('CHAT'));
    
    if (existingIds.length === 0) {
      return 'CHAT001';
    }

    const maxNumber = Math.max(...existingIds.map(id => parseInt(id.replace('CHAT', ''), 10)));
    return `CHAT${String(maxNumber + 1).padStart(3, '0')}`;
  } catch (error) {
    console.error('チャットID生成エラー:', error);
    return `CHAT${Date.now()}`;
  }
}

/**
 * チャットメッセージの取得
 */
export async function getChatMessages(orderId: string): Promise<ChatMessage[]> {
  try {
    const doc = await connectToGoogleSheets();
    const chatSheet = doc.sheetsByTitle['order_chats'];
    
    if (!chatSheet) {
      console.warn('order_chatsシートが見つかりません。空の配列を返します。');
      return [];
    }

    const rows = await chatSheet.getRows();
    const messages = rows
      .filter(row => row.get('order_id') === orderId)
      .map((row: GoogleSpreadsheetRow) => ({
        id: row.get('id') || '',
        orderId: row.get('order_id') || '',
        userId: row.get('user_id') || '',
        userName: row.get('user_name') || '',
        userRole: (row.get('user_role') || 'user') as 'admin' | 'user',
        message: row.get('message') || '',
        messageType: (row.get('message_type') || 'text') as 'text' | 'system' | 'file',
        fileUrl: row.get('file_url') || undefined,
        fileName: row.get('file_name') || undefined,
        isRead: String(row.get('is_read')).toLowerCase() === 'true',
        createdAt: row.get('created_at') || '',
        updatedAt: row.get('updated_at') || ''
      }));

    // 作成日時順にソート
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return messages;
  } catch (error) {
    console.error('チャットメッセージ取得エラー:', error);
    return [];
  }
}

/**
 * チャットメッセージの送信
 */
export async function sendChatMessage(messageData: {
  orderId: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'user';
  message: string;
  messageType?: 'text' | 'system' | 'file';
  fileUrl?: string;
  fileName?: string;
}): Promise<ChatMessage> {
  try {
    const doc = await connectToGoogleSheets();
    const chatSheet = doc.sheetsByTitle['order_chats'];
    
    if (!chatSheet) {
      throw new Error('order_chatsシートが見つかりません');
    }

    const id = await generateNextChatId();
    const now = new Date().toISOString();

    const newRow = await chatSheet.addRow({
      id: id,
      order_id: messageData.orderId,
      user_id: messageData.userId,
      user_name: messageData.userName,
      user_role: messageData.userRole,
      message: messageData.message,
      message_type: messageData.messageType || 'text',
      file_url: messageData.fileUrl || '',
      file_name: messageData.fileName || '',
      is_read: false,
      created_at: now,
      updated_at: now
    });

    console.log('チャットメッセージ送信成功:', id);

    const newMessage: ChatMessage = {
      id: id,
      orderId: messageData.orderId,
      userId: messageData.userId,
      userName: messageData.userName,
      userRole: messageData.userRole,
      message: messageData.message,
      messageType: messageData.messageType || 'text',
      fileUrl: messageData.fileUrl,
      fileName: messageData.fileName,
      isRead: false,
      createdAt: now,
      updatedAt: now
    };

    return newMessage;
  } catch (error) {
    console.error('チャットメッセージ送信エラー:', error);
    throw new Error('チャットメッセージの送信に失敗しました');
  }
}

/**
 * チャットメッセージの既読状態を更新
 */
export async function markChatMessageAsRead(messageId: string): Promise<void> {
  try {
    const doc = await connectToGoogleSheets();
    const chatSheet = doc.sheetsByTitle['order_chats'];
    
    if (!chatSheet) {
      throw new Error('order_chatsシートが見つかりません');
    }

    const rows = await chatSheet.getRows();
    const targetRow = rows.find(row => row.get('id') === messageId);
    
    if (!targetRow) {
      throw new Error(`チャットメッセージが見つかりません: ${messageId}`);
    }

    targetRow.set('is_read', true);
    targetRow.set('updated_at', new Date().toISOString());
    await targetRow.save();

    console.log('チャットメッセージを既読にしました:', messageId);
  } catch (error) {
    console.error('チャットメッセージ既読更新エラー:', error);
    throw new Error('チャットメッセージの既読更新に失敗しました');
  }
}

/**
 * 発注に関連する未読チャットメッセージ数を取得
 */
export async function getUnreadChatCount(orderId: string, userId: string): Promise<number> {
  try {
    const doc = await connectToGoogleSheets();
    const chatSheet = doc.sheetsByTitle['order_chats'];
    
    if (!chatSheet) {
      return 0;
    }

    const rows = await chatSheet.getRows();
    const unreadCount = rows.filter(row => 
      row.get('order_id') === orderId && 
      row.get('user_id') !== userId && 
      String(row.get('is_read')).toLowerCase() !== 'true'
    ).length;

    return unreadCount;
  } catch (error) {
    console.error('未読チャット数取得エラー:', error);
    return 0;
  }
}

// 新規追加: 施工予定日変更通知
export async function createScheduleChangeNotification(orderId: string, oldDate: string, newDate: string): Promise<void> {
  try {
    const orders = await getOrders();
    const order = orders.find(o => o.id === orderId);
    let customerInfo;
    if (order) {
      const users = await getUsers();
      const user = users.find(u => u.id === order.userId);
      if (user) {
        customerInfo = {
          orderId: orderId,
          propertyName: order.propertyName,
          roomNumber: order.roomNumber,
          companyName: user.companyName,
          storeName: user.storeName,
          contactPerson: order.contactPerson
        };
      }
    }

    const notification = await addNotification({
      type: 'schedule',
      title: '施工予定日が変更されました',
      message: `${order?.propertyName || ''}（受注ID: ${orderId}）の施工予定日が「${oldDate}」から「${newDate}」に変更されました`
    });

    if (customerInfo) {
      const adminUsers = await getAdminUsers();
      if (adminUsers.length > 0) {
        sendNotificationEmailToAdmins(notification, adminUsers, customerInfo).catch(error => {
          console.error('❌ 施工予定日変更メール送信エラー:', error);
        });
      }
    }
  } catch (error) {
    console.error('施工予定日変更通知生成エラー:', error);
  }
}