const API_BASE_URL = 'http://localhost:8000/api';

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  let token = null;
  const path = window.location.pathname;
  if (path.startsWith('/customer') || endpoint.includes('/customer')) {
    token = localStorage.getItem('customer_auth_token');
  } else if (path.startsWith('/driver') || endpoint.includes('/driver')) {
    token = localStorage.getItem('driver_auth_token');
  } else if (path.startsWith('/admin') || endpoint.includes('/admin')) {
    token = localStorage.getItem('admin_auth_token');
  } else {
    token = localStorage.getItem('customer_auth_token') || 
            localStorage.getItem('driver_auth_token') || 
            localStorage.getItem('admin_auth_token');
  }
  
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};

export const calculateFare = (vehicleType: string, distance: number): number => {
  const normalized = vehicleType.toLowerCase();
  let rate = 30; // default to car
  if (normalized === 'bike') {
    rate = 10;
  } else if (normalized === 'rickshaw' || normalized === 'auto rickshaw' || normalized === 'auto') {
    rate = 20;
  }
  return 50.00 + (distance * rate);
};
