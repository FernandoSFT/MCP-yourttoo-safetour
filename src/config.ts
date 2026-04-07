import "dotenv/config";

export const config = {
  PORT: process.env.PORT || 8080,
  YOURTTOO_EMAIL: process.env.YOURTTOO_EMAIL || "",
  YOURTTOO_PASSWORD: process.env.YOURTTOO_PASSWORD || "",
  YOURTTOO_BASE_URL: process.env.YOURTTOO_BASE_URL || "https://api.yourttoo.com",
  NODE_ENV: process.env.NODE_ENV || "production",
  CACHE_TTL_HOURS: Number(process.env.CACHE_TTL_HOURS) || 24,
  MAX_RESPONSE_CHARS: Number(process.env.MAX_RESPONSE_CHARS) || 4000,
};

if (!config.YOURTTOO_EMAIL || !config.YOURTTOO_PASSWORD) {
  console.warn(
    "WARNING: YOURTTOO_EMAIL and YOURTTOO_PASSWORD not defined. Make sure they are provided in environment."
  );
}
