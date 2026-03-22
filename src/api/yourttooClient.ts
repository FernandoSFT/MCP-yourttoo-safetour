import axios, { AxiosInstance } from 'axios';
import { config, YourttooConfig } from '../config.js';

/**
 * Cliente para interactuar con la API de Yourttoo.
 * 
 * IMPORTANTE: La API interna de Yourttoo (www.yourttoo.com/api/*) funciona con
 * cookies de sesión (connect.sid), NO solo con headers userid/accesstoken.
 * 
 * Flujo de autenticación:
 * 1. POST /auth/login → devuelve userid, accessToken Y establece cookie connect.sid
 * 2. Las llamadas siguientes a /api/* necesitan AMBOS: la cookie Y los headers
 */
export class YourttooClient {
  private client: AxiosInstance;
  private auth: YourttooConfig;
  private baseUrl: string;
  private freshlyAuthenticated: boolean = false;
  private sessionCookie: string = '';

  constructor(authConfig?: YourttooConfig) {
    this.auth = authConfig || config.yourttoo;
    this.baseUrl = (this.auth.baseUrl || config.yourttoo.baseUrl);
    
    this.client = axios.create({
      baseURL: this.baseUrl + '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Configura las cabeceras de autenticación en la instancia de Axios.
   */
  private setAuthHeaders() {
    if (this.auth.userid && this.auth.accessToken) {
      this.client.defaults.headers.common['userid'] = this.auth.userid.trim();
      this.client.defaults.headers.common['accesstoken'] = this.auth.accessToken.trim();
    }
    // Incluir la cookie de sesión si existe
    if (this.sessionCookie) {
      this.client.defaults.headers.common['Cookie'] = this.sessionCookie;
    }
  }

  /**
   * Proceso de autenticación mediante email y password.
   * Endpoint: /auth/login (NO /api/auth)
   * Captura tanto el userid/accessToken como la cookie connect.sid.
   */
  private async authenticate(): Promise<void> {
    if (!this.auth.email || !this.auth.password) {
      throw new Error('Credenciales de autenticación no disponibles en las variables de entorno');
    }

    const loginUrl = this.baseUrl + '/auth/login';
    console.log(`🔐 Autenticando en Yourttoo: ${loginUrl}`);

    try {
      const response = await axios.post(
        loginUrl,
        { 
          email: this.auth.email, 
          password: this.auth.password,
          iamnew: false,
          sociallogged: false,
        },
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Referer': this.baseUrl + '/',
          },
          // No seguir redirects para capturar las cookies
          maxRedirects: 0,
          validateStatus: (status) => status < 400,
        }
      );

      // Capturar la cookie connect.sid del header Set-Cookie
      const setCookies = response.headers['set-cookie'];
      if (setCookies) {
        // Extraer solo la parte "connect.sid=..." de cada cookie
        this.sessionCookie = setCookies
          .map((c: string) => c.split(';')[0])
          .join('; ');
        console.log(`🍪 Cookie de sesión capturada: ${this.sessionCookie.substring(0, 40)}...`);
      }

      // Extraer userid y accessToken del body
      const { userid, accessToken } = response.data;
      if (!userid || !accessToken) {
        throw new Error('Respuesta de auth incompleta: faltan userid o accessToken');
      }
      
      this.auth.userid = userid;
      this.auth.accessToken = accessToken;
      this.freshlyAuthenticated = true;
      this.setAuthHeaders();
      console.log(`✅ Autenticación exitosa. UserID: ${userid.substring(0, 10)}...`);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data || error.message;
      console.error(`❌ Error fatal de autenticación en Yourttoo: ${msg}`);
      throw new Error(`Auth failed: ${msg}`);
    }
  }

  /**
   * Realiza una petición genérica a la API manejando la re-autenticación automática.
   */
  private async request<T>(method: string, endpoint: string, data?: any): Promise<T> {
    // Si no hemos autenticado en esta instancia y tenemos credenciales, lo hacemos proactivamente
    if (!this.freshlyAuthenticated && this.auth.email && this.auth.password) {
      console.log('🔑 Iniciando autenticación proactiva...');
      await this.authenticate();
    }

    this.setAuthHeaders();
    
    try {
      const response = await this.client.request({
        method,
        url: endpoint,
        data,
      });
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const responseData = error.response?.data;
      
      // Detectar error de sesión: puede ser 401 o 500 con mensaje de sesión caducada
      const isSessionError = status === 401 || 
        (status === 500 && typeof responseData === 'string' && responseData.includes('sesion ha caducado'));

      if (isSessionError) {
        console.log(`🔄 Sesión inválida (${status}), re-autenticando...`);
        this.freshlyAuthenticated = false;
        await this.authenticate();
        
        this.setAuthHeaders();
        const response = await this.client.request({
          method,
          url: endpoint,
          data,
        });
        return response.data;
      }
      
      const errorMsg = responseData?.message || (typeof responseData === 'string' ? responseData : error.message);
      console.error(`❌ Error en petición ${method} ${endpoint} (Status: ${status}): ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Obtiene inventario de países, ciudades, proveedores o etiquetas.
   */
  async find(type: 'countries' | 'cities' | 'providers' | 'tags') {
    return this.request('POST', '/find', { type });
  }

  /**
   * Busca programas de viaje basándose en filtros.
   */
  async search(params: {
    countries?: string[];
    cities?: string[];
    tags?: string[];
    providers?: string[];
    minprice?: number;
    maxprice?: number;
    mindays?: number;
    maxdays?: number;
    page?: number;
    maxresults?: number;
  }) {
    return this.request('POST', '/search', { filter: params });
  }

  /**
   * Obtiene el detalle de un programa o de una reserva.
   */
  async fetch(type: 'program' | 'booking', code: string) {
    return this.request('POST', '/fetch', { type, code });
  }

  /**
   * Consulta disponibilidad para un programa y fecha específicos.
   */
  async checkAvailability(request: {
    bookrequest: {
      date: { day: number; month: number; year: number };
      productcode: string;
      roomdistribution: Array<{
        name: string;
        roomcode: number;
        paxlist: Array<{
          name: string;
          lastname: string;
          documentnumber: string;
          documenttype: string;
          documentexpeditioncountry: string;
          birthdate: string;
          country: string;
        }>;
      }>;
    };
  }) {
    return this.request('POST', '/checkavailability', request);
  }

  /**
   * Realiza una reserva formal en Yourttoo.
   */
  async book(request: {
    bookrequest: {
      date: { day: number; month: number; year: number };
      signup: { email: string; phone: string; name: string; lastname: string };
      productcode: string;
      roomdistribution: Array<{
        name: string;
        roomcode: number;
        paxlist: Array<{
          name: string;
          lastname: string;
          documentnumber: string;
          documenttype: string;
          documentexpeditioncountry: string;
          birthdate: string;
          country: string;
        }>;
      }>;
      meetingdata?: string;
    };
  }) {
    return this.request('POST', '/book', request);
  }

  /**
   * Cancela una reserva existente.
   */
  async cancel(idbooking: string) {
    return this.request('POST', '/cancel', { idbooking });
  }
}