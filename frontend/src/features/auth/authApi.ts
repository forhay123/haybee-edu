// src/features/auth/authApi.ts
import api from "../../api/axios";

// Login payload
export const loginUser = (data: { email: string; password: string }) =>
  api.post("/auth/login", data);

// Registration payload with extra fields
export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  userType: string;
  studentType?: string;
  preferredClass?: string;      // ✅ NEW
  preferredDepartment?: string; // ✅ NEW
}

// Update registerUser to accept the full payload
export const registerUser = (data: RegisterPayload) =>
  api.post("/auth/register", data);