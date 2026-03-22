import dotenv from 'dotenv';

dotenv.config();

export const config = {
  yourttoo: {
    baseUrl: process.env.YOURTTOO_API_URL || 'https://www.yourttoo.com',
    userid: process.env.YOURTTOO_AGENCY_CODE || '',
    accessToken: process.env.YOURTTOO_ACCESS_TOKEN || '',
    email: process.env.YOURTTOO_EMAIL || '',
    password: process.env.YOURTTOO_PASSWORD || '',
  },
  server: {
    port: parseInt(process.env.PORT || '8080', 10),
  },
};

export type YourttooConfig = typeof config.yourttoo;