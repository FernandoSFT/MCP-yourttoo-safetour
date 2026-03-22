#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';

dotenv.config();

const BASE_URL = process.env.YOURTTOO_API_URL || 'https://www.yourttoo.com';
const API_BASE = BASE_URL + '/api';
const EMAIL = process.env.YOURTTOO_EMAIL;
const PASSWORD = process.env.YOURTTOO_PASSWORD;

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

async function authenticate() {
  console.log('🔐 Autenticando en Yourttoo...');
  console.log('   Email:', EMAIL);
  
  try {
    const response = await axios.post(
      `${API_BASE}/auth`,
      { email: EMAIL, password: PASSWORD },
      {
        httpsAgent,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const { userid, accessToken } = response.data;
    console.log('✅ Autenticación exitosa!');
    console.log('   UserID:', userid);
    console.log('   AccessToken:', accessToken.substring(0, 30) + '...');
    
    // Update .env file
    const envPath = './.env';
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update or add values
    envContent = envContent.replace(/YOURTTOO_AGENCY_CODE=.*/, `YOURTTOO_AGENCY_CODE=${userid}`);
    envContent = envContent.replace(/YOURTTOO_ACCESS_TOKEN=.*/, `YOURTTOO_ACCESS_TOKEN=${accessToken}`);
    
    fs.writeFileSync(envPath, envContent);
    console.log('\n📝 .env actualizado con nuevos tokens');
    
    return { userid, accessToken };
  } catch (error: any) {
    console.log('❌ Error de autenticación:', error.response?.data || error.message);
    process.exit(1);
  }
}

authenticate();