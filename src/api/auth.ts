import axios from "axios";
import { config } from "../config.js";

let currentAuth: { userid: string; accessToken: string } | null = null;

export async function authenticate(forceRefresh = false) {
  if (currentAuth && !forceRefresh) return currentAuth;
  
  try {
    const response = await axios.post(`${config.YOURTTOO_BASE_URL}/apiv2/auth`, {
      email: config.YOURTTOO_EMAIL,
      password: config.YOURTTOO_PASSWORD,
    });
    
    if (response.data && response.data.userid && response.data.accessToken) {
      currentAuth = {
        userid: response.data.userid,
        accessToken: response.data.accessToken
      };
      return currentAuth;
    } else {
      throw new Error("Invalid response format from /auth");
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error("Authentication failed:", errorMsg);
    throw new Error(`Authentication failed: ${errorMsg}`);
  }
}

export function clearAuth() {
  currentAuth = null;
}
