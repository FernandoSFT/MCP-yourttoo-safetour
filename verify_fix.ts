import { YourttooClient } from './src/api/yourttooClient.js';
import dotenv from 'dotenv';
dotenv.config();

async function runTest() {
  console.log('🧪 Verificando YourttooClient con el nuevo flujo de auth...');
  const client = new YourttooClient();
  
  try {
    const countries = await client.find('countries');
    console.log('✅ Éxito al obtener inventario!');
    console.log('   Países encontrados:', Array.isArray(countries) ? countries.length : 'N/A');
    
    const search = await client.search({ page: 1, maxresults: 2 });
    console.log('✅ Éxito al buscar programas!');
    console.log('   Total:', (search as any).totalItems);
  } catch (error: any) {
    console.error('❌ Error en el test:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

runTest();
