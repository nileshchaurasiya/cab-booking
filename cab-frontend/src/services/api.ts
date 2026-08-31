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
    if (response.status === 401) {
      if (path.startsWith('/customer') || endpoint.includes('/customer')) {
        localStorage.removeItem('customer_auth_token');
        localStorage.removeItem('customer_user');
      } else if (path.startsWith('/driver') || endpoint.includes('/driver')) {
        localStorage.removeItem('driver_auth_token');
        localStorage.removeItem('driver_user');
      } else if (path.startsWith('/admin') || endpoint.includes('/admin')) {
        localStorage.removeItem('admin_auth_token');
        localStorage.removeItem('admin_user');
      }
    }

    let errorMessage = data.message || 'Something went wrong';
    
    // If Laravel validation errors exist, extract the first specific error message
    if (data.errors && typeof data.errors === 'object') {
      const firstKey = Object.keys(data.errors)[0];
      if (firstKey && Array.isArray(data.errors[firstKey]) && data.errors[firstKey].length > 0) {
        errorMessage = data.errors[firstKey][0];
      }
    }
    
    throw new Error(errorMessage);
  }

  return data;
};

export const calculateFare = (vehicleType: string, distance: any, pickup?: string, dropoff?: string): number => {
  if (!pickup || !dropoff || !pickup.trim() || !dropoff.trim()) {
    return 0;
  }
  const parsedDist = typeof distance === 'string' ? parseFloat(distance) : Number(distance);
  if (isNaN(parsedDist) || parsedDist <= 0) {
    return 0;
  }
  const normalized = (vehicleType || '').toLowerCase();
  let rate = 30; // Car = 30/km
  if (normalized === 'bike') {
    rate = 10; // Bike = 10/km
  } else if (normalized === 'rickshaw' || normalized === 'auto rickshaw' || normalized === 'auto') {
    rate = 20; // Rickshaw = 20/km
  }
  return parsedDist * rate;
};
