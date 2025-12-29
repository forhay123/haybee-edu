// src/features/auth/useAuth.ts
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { setCredentials, logout, updateAccessToken } from "./authSlice";
import { loginUser, registerUser } from "./authApi";
import api from "../../api/axios";
import { jwtDecode } from "jwt-decode";
import { AxiosRequestConfig } from "axios";

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  userType: string;
  studentType?: string;
}

// JWT decode type
interface DecodedToken {
  exp: number;
  [key: string]: any;
}

// Extend AxiosRequestConfig to include _retry flag
interface AxiosRequestConfigWithRetry extends AxiosRequestConfig {
  _retry?: boolean;
}

export const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const refreshToken = useSelector((state: RootState) => state.auth.refreshToken);

  /**
   * Login user - NOW RETURNS THE USER DATA
   */
  const login = async (credentials: LoginCredentials) => {
    const response = await loginUser(credentials);
    const data = response.data;

    const mappedUser = {
      id: data.userId.toString(),
      name: data.email,
      email: data.email,
      roles: data.roles.map((r: string) => r.toUpperCase()),
    };

    dispatch(
      setCredentials({
        user: mappedUser,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
    );

    // Return the user data so LoginPage can use it
    return mappedUser;
  };

  /**
   * Register user
   */
  const register = async (data: RegisterData) => {
    const response = await registerUser({
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      phone: data.phone,
      userType: data.userType,
      ...(data.studentType ? { studentType: data.studentType } : {}),
    });

    const resData = response.data;

    const mappedUser = {
      id: resData.userId.toString(),
      name: resData.email,
      email: resData.email,
      roles: resData.roles.map((r: string) => r.toUpperCase()),
    };

    dispatch(
      setCredentials({
        user: mappedUser,
        accessToken: resData.accessToken,
        refreshToken: resData.refreshToken,
      })
    );

    return mappedUser;
  };

  /**
   * Logout user
   */
  const logoutUser = () => dispatch(logout());

  /**
   * Refresh access token
   */
  const refreshAccessToken = async (): Promise<string> => {
    if (!refreshToken) throw new Error("No refresh token available");

    const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) throw new Error("Failed to refresh token");
    const data = await response.json();
    dispatch(updateAccessToken(data.accessToken));
    return data.accessToken;
  };

  /**
   * Auto-refresh token on app load if expired
   */
  useEffect(() => {
    if (!accessToken || !refreshToken) return;

    try {
      const decoded: DecodedToken = jwtDecode(accessToken);
      const now = Date.now() / 1000;
      if (decoded.exp < now) {
        refreshAccessToken().catch(() => logoutUser());
      }
    } catch (err) {
      console.error("Failed to decode token:", err);
      logoutUser();
    }
  }, []);

  /**
   * Axios interceptors to attach token & refresh on 401
   */
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(async (config) => {
      let token = accessToken;
      if (!token && refreshToken) {
        token = await refreshAccessToken();
      }
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        } as any;
      }
      return config;
    });

    const responseInterceptor = api.interceptors.response.use(
      (res) => res,
      async (err) => {
        const originalRequest = err.config as AxiosRequestConfigWithRetry;
        if (err.response?.status === 401 && refreshToken && !originalRequest._retry) {
          originalRequest._retry = true;
          const newToken = await refreshAccessToken();
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${newToken}`,
          } as any;
          return api(originalRequest);
        }
        return Promise.reject(err);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [accessToken, refreshToken]);

  return { user, accessToken, refreshToken, login, register, logoutUser, refreshAccessToken };
};