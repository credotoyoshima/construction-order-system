import { VALIDATION_RULES, ERROR_MESSAGES } from './constants';
import { ValidationErrors } from '@/types';

// メールアドレスバリデーション
export function validateEmail(email: string): string | null {
  if (!email) return ERROR_MESSAGES.REQUIRED;
  if (!VALIDATION_RULES.EMAIL_PATTERN.test(email)) {
    return ERROR_MESSAGES.INVALID_EMAIL;
  }
  return null;
}

// 電話番号バリデーション
export function validatePhone(phone: string): string | null {
  if (!phone) return ERROR_MESSAGES.REQUIRED;
  if (!VALIDATION_RULES.PHONE_PATTERN.test(phone)) {
    return ERROR_MESSAGES.INVALID_PHONE;
  }
  return null;
}

// パスワードバリデーション
export function validatePassword(password: string): string | null {
  if (!password) return ERROR_MESSAGES.REQUIRED;
  if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
    return ERROR_MESSAGES.PASSWORD_TOO_SHORT;
  }
  return null;
}

// パスワード確認バリデーション
export function validatePasswordConfirm(
  password: string,
  confirmPassword: string
): string | null {
  if (!confirmPassword) return ERROR_MESSAGES.REQUIRED;
  if (password !== confirmPassword) {
    return ERROR_MESSAGES.PASSWORD_MISMATCH;
  }
  return null;
}

// 必須フィールドバリデーション
export function validateRequired(value: string, fieldName?: string): string | null {
  if (!value || value.trim() === '') {
    return fieldName ? `${fieldName}は必須項目です` : ERROR_MESSAGES.REQUIRED;
  }
  return null;
}

// 数値バリデーション
export function validateNumber(
  value: string | number,
  min?: number,
  max?: number
): string | null {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return '有効な数値を入力してください';
  }
  
  if (min !== undefined && num < min) {
    return `${min}以上の値を入力してください`;
  }
  
  if (max !== undefined && num > max) {
    return `${max}以下の値を入力してください`;
  }
  
  return null;
}

// 日付バリデーション
export function validateDate(date: string): string | null {
  if (!date) return ERROR_MESSAGES.REQUIRED;
  
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return '有効な日付を入力してください';
  }
  
  return null;
}

// 未来日バリデーション
export function validateFutureDate(date: string): string | null {
  const dateError = validateDate(date);
  if (dateError) return dateError;
  
  const parsedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (parsedDate < today) {
    return '今日以降の日付を選択してください';
  }
  
  return null;
}

// 文字列長バリデーション
export function validateLength(
  value: string,
  min?: number,
  max?: number,
  fieldName?: string
): string | null {
  if (min !== undefined && value.length < min) {
    return `${fieldName || 'この項目'}は${min}文字以上で入力してください`;
  }
  
  if (max !== undefined && value.length > max) {
    return `${fieldName || 'この項目'}は${max}文字以下で入力してください`;
  }
  
  return null;
}

// ログインフォームバリデーション
export function validateLoginForm(data: {
  email: string;
  password: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};
  
  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;
  
  const passwordError = validateRequired(data.password);
  if (passwordError) errors.password = passwordError;
  
  return errors;
}

// 登録フォームバリデーション
export function validateRegisterForm(data: {
  companyName: string;
  storeName: string;
  email: string;
  phoneNumber: string;
  address: string;
  password: string;
  confirmPassword: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};
  
  // 必須フィールドチェック
  const requiredFields = {
    companyName: '会社名',
    storeName: '店舗名',
    email: 'メールアドレス',
    phoneNumber: '電話番号',
    address: '住所',
    password: 'パスワード',
    confirmPassword: 'パスワード（確認）'
  };
  
  Object.entries(requiredFields).forEach(([field, label]) => {
    const value = data[field as keyof typeof data];
    const error = validateRequired(value, label);
    if (error) errors[field] = error;
  });
  
  // 個別バリデーション
  if (data.email) {
    const emailError = validateEmail(data.email);
    if (emailError) errors.email = emailError;
  }
  
  if (data.phoneNumber) {
    const phoneError = validatePhone(data.phoneNumber);
    if (phoneError) errors.phoneNumber = phoneError;
  }
  
  if (data.password) {
    const passwordError = validatePassword(data.password);
    if (passwordError) errors.password = passwordError;
  }
  
  if (data.password && data.confirmPassword) {
    const confirmError = validatePasswordConfirm(data.password, data.confirmPassword);
    if (confirmError) errors.confirmPassword = confirmError;
  }
  
  return errors;
}

// 新規発注フォームバリデーション
export function validateNewOrderForm(data: {
  contactPerson: string;
  propertyName: string;
  roomNumber: string;
  address: string;
  constructionDate: string;
  keyLocation: string;
  keyReturn: string;
  constructionItems: { itemId: string; quantity: number }[];
}): ValidationErrors {
  const errors: ValidationErrors = {};
  
  // 必須フィールドチェック
  const requiredFields = {
    contactPerson: '担当者名',
    propertyName: '物件名',
    roomNumber: '号室',
    address: '住所',
    constructionDate: '施工予定日',
    keyLocation: '鍵の所在',
    keyReturn: '鍵の返却先'
  };
  
  Object.entries(requiredFields).forEach(([field, label]) => {
    const value = data[field as keyof typeof data];
    if (typeof value === 'string') {
      const error = validateRequired(value, label);
      if (error) errors[field] = error;
    }
  });
  
  // 施工予定日の未来日チェック
  if (data.constructionDate) {
    const dateError = validateFutureDate(data.constructionDate);
    if (dateError) errors.constructionDate = dateError;
  }
  
  // 施工項目の選択チェック
  if (!data.constructionItems || data.constructionItems.length === 0) {
    errors.constructionItems = '施工項目を最低一つ選択してください';
  }
  
  // 施工項目の数量チェック
  data.constructionItems?.forEach((item, index) => {
    if (!item.quantity || item.quantity < 1) {
      errors[`constructionItems.${index}.quantity`] = '数量は1以上で入力してください';
    }
  });
  
  return errors;
}

// 受注詳細フォームバリデーション
export function validateOrderDetailForm(data: {
  propertyName: string;
  roomNumber: string;
  address: string;
  constructionDate: string;
  keyLocation: string;
  keyReturn: string;
  contactPerson: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};
  
  // 必須フィールドチェック
  const requiredFields = {
    propertyName: '物件名',
    roomNumber: '号室',
    address: '住所',
    constructionDate: '施工予定日',
    keyLocation: '鍵の所在',
    keyReturn: '鍵の返却先',
    contactPerson: '担当者'
  };
  
  Object.entries(requiredFields).forEach(([field, label]) => {
    const value = data[field as keyof typeof data];
    const error = validateRequired(value, label);
    if (error) errors[field] = error;
  });
  
  // 施工予定日のバリデーション
  if (data.constructionDate) {
    const dateError = validateDate(data.constructionDate);
    if (dateError) errors.constructionDate = dateError;
  }
  
  return errors;
}

// ユーザー管理フォームバリデーション
export function validateUserForm(data: {
  companyName: string;
  storeName: string;
  email: string;
  phoneNumber: string;
  address: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};
  
  // 必須フィールドチェック
  const requiredFields = {
    companyName: '会社名',
    storeName: '店舗名',
    email: 'メールアドレス',
    phoneNumber: '電話番号',
    address: '住所'
  };
  
  Object.entries(requiredFields).forEach(([field, label]) => {
    const value = data[field as keyof typeof data];
    const error = validateRequired(value, label);
    if (error) errors[field] = error;
  });
  
  // 個別バリデーション
  if (data.email) {
    const emailError = validateEmail(data.email);
    if (emailError) errors.email = emailError;
  }
  
  if (data.phoneNumber) {
    const phoneError = validatePhone(data.phoneNumber);
    if (phoneError) errors.phoneNumber = phoneError;
  }
  
  return errors;
}

// 汎用フォームバリデーター
export function validateForm<T extends Record<string, any>>(
  data: T,
  validators: Record<keyof T, (value: any) => string | null>
): ValidationErrors {
  const errors: ValidationErrors = {};
  
  Object.entries(validators).forEach(([field, validator]) => {
    const value = data[field];
    const error = validator(value);
    if (error) errors[field] = error;
  });
  
  return errors;
} 