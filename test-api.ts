#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

const BASE_URL = process.env.YOURTTOO_API_URL || 'https://www.yourttoo.com';
const API_BASE = BASE_URL + '/api';
const USER_ID = process.env.YOURTTOO_AGENCY_CODE;
const ACCESS_TOKEN = process.env.YOURTTOO_ACCESS_TOKEN;

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'userid': USER_ID,
    'accesstoken': ACCESS_TOKEN,
  },
  httpsAgent,
});

async function testInventory() {
  console.log('\n🗂️  Test: get_inventory (countries)');
  try {
    const res = await client.post('/find', { type: 'countries' });
    const countries = Array.isArray(res.data) ? res.data : res.data.items || [];
    console.log(`   ✓ ${countries.length} países encontrados`);
    console.log('   Ejemplo:', countries.slice(0, 3).map(c => c.label_es || c.label_en).join(', '));
  } catch (e: any) {
    console.log('   ✗ Error:', e.response?.data || e.message);
  }
}

async function testSearch() {
  console.log('\n🔍 Test: search_programs');
  try {
    const res = await client.post('/search', { 
      filter: { page: 1, maxresults: 5 } 
    });
    const items = res.data.items || [];
    console.log(`   ✓ ${res.data.totalItems || 0} programas encontrados`);
    console.log('   Ejemplos:', items.slice(0, 3).map((i: any) => i.title).join(' | '));
  } catch (e: any) {
    console.log('   ✗ Error:', e.response?.data || e.message);
  }
}

async function testFetch() {
  console.log('\n📋 Test: get_program_detail');
  try {
    // Primero buscar un código de programa
    const searchRes = await client.post('/search', { 
      filter: { page: 1, maxresults: 1 } 
    });
    const items = searchRes.data.items || [];
    if (items.length === 0) {
      console.log('   ✗ No hay programas disponibles');
      return;
    }
    const code = items[0].code;
    console.log('   Código:', code);
    
    const res = await client.post('/fetch', { type: 'program', code });
    console.log('   ✓ Programa obtenido:', res.data.title?.substring(0, 50));
  } catch (e: any) {
    console.log('   ✗ Error:', e.response?.data || e.message);
  }
}

async function main() {
  console.log('🧪 Yourttoo MCP - Tests de API');
  console.log('================================');
  console.log('Base URL:', BASE_URL);
  console.log('User ID:', USER_ID?.substring(0, 10) + '...');
  
  await testInventory();
  await testSearch();
  await testFetch();
  
  console.log('\n✅ Tests completados\n');
}

main();