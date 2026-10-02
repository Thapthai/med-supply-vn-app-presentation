import staffApi from './index';

export type StaffPermissionDepartmentsResponse = {
  success?: boolean;
  data?: {
    unrestricted?: boolean;
    departments?: Array<{ id: number; department_name?: string | null }>;
  };
  message?: string;
};

/** แผนกที่ผู้ใช้ Staff เข้าถึงได้ — unrestricted = เห็นทุกแผนก */
export async function fetchStaffPermissionDepartments(
  userId: number,
): Promise<StaffPermissionDepartmentsResponse> {
  const response = await staffApi.get<StaffPermissionDepartmentsResponse>(
    '/staff-permission-departments',
    { params: { user_id: userId } },
  );
  return response.data;
}
