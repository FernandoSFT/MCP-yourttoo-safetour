import axios from "axios";
import { config } from "../config.js";
import { authenticate } from "./auth.js";

export async function apiPost(endpoint: string, payload: any = {}): Promise<any> {
    // Ensure endpoint has leading slash
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${config.YOURTTOO_BASE_URL}${path}`;

    const doRequest = async () => {
        const auth = await authenticate();
        const response = await axios.post(url, payload, {
            headers: {
                userid: auth.userid,
                accesstoken: auth.accessToken,
                "Content-Type": "application/json",
            },
        });
        return response.data;
    };

    try {
        return await doRequest();
    } catch (error: any) {
        // If 401, clear auth and retry once
        if (error.response?.status === 401) {
            console.log("Token expired (401), refreshing and retrying...");
            await authenticate(true); // Force refresh
            return await doRequest();
        }
        throw error;
    }
}
