import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const useAuthCheck = (requiredRole: 'admin' | 'user' = 'user') => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const userData = localStorage.getItem('user');
        if (!userData) {
          router.push('/login');
          return;
        }

        const userInfo = JSON.parse(userData);
        
        // 必要な権限をチェック
        if (requiredRole === 'admin' && userInfo.role !== 'admin') {
          alert('管理者権限が必要です。');
          router.push('/user');
          return;
        }

        setUser(userInfo);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('認証チェックエラー:', error);
        router.push('/login');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router, requiredRole]);

  return { isAuthenticated, isCheckingAuth, user };
}; 