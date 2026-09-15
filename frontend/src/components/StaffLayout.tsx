'use client';

import React, { ReactNode, useState, useEffect, useRef } from 'react';
import StaffSidebar from './StaffSidebar';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';
import { clearStaffDepartmentScopeCache } from '@/lib/staffDepartmentScope';
import {
  clearStaffLocalAuth,
  getAppName,
  getStaffUserIfSameApp,
  saveStaffUser,
} from '@/lib/appAuth';

interface StaffLayoutProps {
  children: ReactNode;
}

export default function StaffLayout({ children }: StaffLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: adminUser, isAuthenticated: isAdminAuth, loading: adminLoading } = useAuth();
  const [staffUser, setStaffUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const hasUserInteracted = useRef(false);

  // Load zoom level from localStorage on mount (per user)
  useEffect(() => {
    if (!staffUser) {
      // No user yet, initialize to 100%
      document.documentElement.style.setProperty('--staff-zoom', '1');
      setZoomLevel(100);
      return;
    }
    
    const userKey = staffUser.id 
      ? `staff_zoom_level_${staffUser.id}` 
      : staffUser.email 
        ? `staff_zoom_level_${staffUser.email}`
        : staffUser.client_id
          ? `staff_zoom_level_${staffUser.client_id}`
          : null;
    
    if (!userKey) {
      document.documentElement.style.setProperty('--staff-zoom', '1');
      setZoomLevel(100);
      return;
    }
    
    const savedZoom = localStorage.getItem(userKey);
    
    if (savedZoom) {
      const zoom = parseInt(savedZoom, 10);
      setZoomLevel(zoom);
      document.documentElement.style.setProperty('--staff-zoom', `${zoom / 100}`);
    } else {
      // No saved value, initialize to 100%
      document.documentElement.style.setProperty('--staff-zoom', '1');
      setZoomLevel(100);
    }
  }, [staffUser]);

  // Apply zoom when zoomLevel changes
  useEffect(() => {
    // Always update CSS variable for zoom to work
    document.documentElement.style.setProperty('--staff-zoom', `${zoomLevel / 100}`);
    
    // Only save to localStorage if user has interacted and staffUser exists
    if (!hasUserInteracted.current || !staffUser) {
      return;
    }
    
    const userKey = staffUser.id 
      ? `staff_zoom_level_${staffUser.id}` 
      : staffUser.email 
        ? `staff_zoom_level_${staffUser.email}`
        : staffUser.client_id
          ? `staff_zoom_level_${staffUser.client_id}`
          : null;
    
    if (userKey) {
      localStorage.setItem(userKey, zoomLevel.toString());
    }
  }, [zoomLevel, staffUser]);

  const handleZoomIn = () => {
    hasUserInteracted.current = true;
    const newZoom = Math.min(zoomLevel + 10, 200); // Max 200%
    setZoomLevel(newZoom);
  };

  const handleZoomOut = () => {
    hasUserInteracted.current = true;
    const newZoom = Math.max(zoomLevel - 10, 50); // Min 50%
    setZoomLevel(newZoom);
  };

  const handleResetZoom = () => {
    hasUserInteracted.current = true;
    setZoomLevel(100);
  };

  // Get page title from pathname
  const getPageTitle = () => {
    // Next.js automatically strips basePath from pathname, so we can use it directly
    const pathMap: Record<string, string> = {
      '/staff/dashboard': 'Dashboard',
      '/staff/equipment': 'จัดการอุปกรณ์',
      '/staff/equipment/stock': 'สต๊อกอุปกรณ์',
      '/staff/equipment/dispense': 'เบิกอุปกรณ์',
      '/staff/equipment/return': 'คืนอุปกรณ์',
      '/staff/usage': 'บันทึกการใช้งาน',
      '/staff/reports': 'รายงาน',
      '/staff/reports/dispense': 'รายงานเบิกอุปกรณ์',
      '/staff/reports/return': 'รายงานคืนอุปกรณ์',
      '/staff/reports/usage': 'รายงานการใช้งาน',
      '/staff/comparison': 'เปรียบเทียบข้อมูล',
      '/staff/settings': 'ตั้งค่า',
      '/staff/permissions/users': 'จัดการสิทธิ์',
      '/staff/permissions/roles': 'กำหนดสิทธิ์',
      '/staff/management/permission-users': 'จัดการสิทธิ์',
      '/staff/management/permission-roles': 'กำหนดสิทธิ์',
      '/staff/management/staff-roles': 'จัดการ Staff Role',
      '/staff/management/departments': 'จัดการแผนก',
    };
    return pathMap[pathname] || 'Staff Portal';
  };

  useEffect(() => {
    // Wait for admin auth check to complete
    if (adminLoading) {
      setLoading(true);
      return;
    }

    if (isAdminAuth && adminUser) {
      const isAdminUser = (adminUser as { is_admin?: boolean }).is_admin === true;
      /** staffApi อ่าน staff_token จาก localStorage — sync จาก NextAuth ก่อนลูกหน้าเรียก /staff/me */
      if (typeof window !== 'undefined') {
        const u = adminUser as Record<string, unknown>;
        const sessionApp = (u as { appname?: string }).appname;
        if (sessionApp && sessionApp !== getAppName()) {
          clearStaffLocalAuth();
          router.push('/auth/login');
          return;
        }
        const token = u.accessToken as string | undefined;
        if (token) {
          const prev = localStorage.getItem('staff_token');
          if (prev !== token) clearStaffDepartmentScopeCache();
          localStorage.setItem('staff_token', token);
        }
        const uid = u.id ?? u.staff_user_id ?? u.user_id;
        if (uid != null && Number.isFinite(Number(uid))) {
          saveStaffUser({
            id: Number(uid),
            email: u.email,
            fname: u.fname,
            lname: u.lname,
            role: (u.role as string) || (u.role_code as string) || '',
            role_id: u.role_id ?? null,
            client_id: (u.client_id as string) || (u.clientId as string) || '',
            client_secret: (u.client_secret as string) || (u.clientSecret as string) || '',
          });
        }
      }
      if (isAdminUser) {
        setIsAdmin(true);
        setStaffUser(adminUser);
        setLoading(false);
        return;
      }
      setIsAdmin(false);
      setStaffUser(adminUser);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('staff_token');
    const user = getStaffUserIfSameApp();

    if (!token || !user) {
      clearStaffLocalAuth();
      router.push('/auth/login');
      return;
    }

    try {
      setIsAdmin(false);
      setStaffUser(user);
    } catch (error) {
      console.error('Error parsing staff user:', error);
      clearStaffLocalAuth();
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  }, [router, isAdminAuth, adminUser, adminLoading]);

  const handleLogout = async () => {
    if (isAdmin) {
      router.push('/auth/logout');
      return;
    }
    clearStaffLocalAuth();
    await signOut({ redirect: false });
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50/50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-lg text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!staffUser) {
    return null;
  }

  return (
    <div className="flex h-screen bg-rose-50/30 overflow-hidden">
      <StaffSidebar staffUser={staffUser} onLogout={handleLogout} isAdmin={isAdmin} />
      
      {/* Main Content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col transition-all duration-300">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="h-14 flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center flex-1 min-w-0">
              <div className="lg:hidden w-14 flex-shrink-0"></div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {getPageTitle()}
              </h1>
            </div>
            
            {/* Zoom Control */}
            <div className="flex items-center gap-1 border rounded-md p-1 bg-white mr-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleZoomOut}
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-base min-w-[50px]"
                onClick={handleResetZoom}
                title={`Reset Zoom: ${zoomLevel}%`}
              >
                {zoomLevel}%
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleZoomIn}
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* User Menu */}
            {staffUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 h-9 px-2 sm:px-3 hover:bg-pink-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-base shadow-md ring-2 ring-white flex-shrink-0">
                      {isAdmin 
                        ? (staffUser.name?.charAt(0) || staffUser.email?.charAt(0) || 'A').toUpperCase()
                        : staffUser.fname?.charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-lg font-medium text-gray-900">
                        {isAdmin 
                          ? staffUser.name || staffUser.email
                          : `${staffUser.fname} ${staffUser.lname}`
                        }
                        {isAdmin && <span className="ml-2 text-base text-blue-600 font-bold">(Admin)</span>}
                      </div>
                      <div className="text-base text-gray-500 truncate max-w-[120px]">
                        {staffUser.email}
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-lg font-medium leading-none">
                        {isAdmin 
                          ? staffUser.name || staffUser.email
                          : `${staffUser.fname} ${staffUser.lname}`
                        }
                        {isAdmin && <span className="ml-2 text-base text-blue-600 font-bold">(Admin)</span>}
                      </p>
                      <p className="text-base leading-none text-muted-foreground">
                        {staffUser.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <button
                      onClick={() => {
                        // Next.js automatically handles basePath, so we don't need to include it
                        router.push('/staff/settings');
                      }}
                      className="w-full flex items-center cursor-pointer text-lg"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>ตั้งค่าบัญชี</span>
                    </button>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    variant="destructive"
                    className="cursor-pointer text-lg"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>ออกจากระบบ</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        
        {/* Main Content Area - เต็มความกว้างเหมือน admin */}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-rose-50/30" style={{ zoom: zoomLevel / 100 }}>
          <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
