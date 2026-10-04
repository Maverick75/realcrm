import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_API_URL } from '../constants/config';

const api = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export async function setApiBaseUrl(url) {
  const clean = (url || DEFAULT_API_URL).replace(/\/$/, '');
  api.defaults.baseURL = clean;
  await AsyncStorage.setItem('apiBaseUrl', clean);
}

export async function loadApiBaseUrl() {
  const saved = await AsyncStorage.getItem('apiBaseUrl');
  if (saved) {
    api.defaults.baseURL = saved;
    return saved;
  }
  return DEFAULT_API_URL;
}

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && onUnauthorized) {
      await onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default api;
