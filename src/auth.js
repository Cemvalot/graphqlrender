// Use proxy in development, or if VITE_PROXY_URL is set
// Otherwise try direct URL (may fail due to CORS)
const getSigninUrl = () => {
  if (import.meta.env.DEV) {
    return "/api/auth/signin";
  }
  const proxyUrl = import.meta.env.VITE_PROXY_URL;
  if (proxyUrl) {
    return `${proxyUrl}/api/auth/signin`;
  }
  return "https://platform.zone01.gr/api/auth/signin";
};
const SIGNIN_URL = getSigninUrl();
const TOKEN_KEY = "zone01_jwt";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = "/index.html";
}

/**
 * Perform login with username/email + password using Basic Auth.
 * Stores JWT (if returned) in localStorage.
 */
export async function login(identifier, password) {
  const basic = btoa(`${identifier}:${password}`);

  const response = await fetch(SIGNIN_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basic}`,
      "Content-Type": "application/json"
    },
    mode: "cors",
    credentials: "omit"
  });

  if (!response.ok) {
    let message = "Login failed. Please check your credentials.";
    try {
      const errData = await response.json();
      if (errData && (errData.error || errData.message)) {
        message = errData.error || errData.message;
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(message);
  }

  // Check response headers first (some APIs return JWT in headers)
  const authHeader = response.headers.get("Authorization");
  const tokenHeader = response.headers.get("X-Token") || response.headers.get("X-Auth-Token");
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  }
  
  if (tokenHeader) {
    localStorage.setItem(TOKEN_KEY, tokenHeader);
    return tokenHeader;
  }

  // Try to parse response body
  let data = null;
  const contentType = response.headers.get("content-type");
  
  try {
    // Zone01 returns the JWT as a JSON-encoded string (just the token, not an object)
    const text = await response.text();
    
    // If content-type is JSON, parse it (might be a string or an object)
    if (contentType && contentType.includes("application/json")) {
      try {
        data = JSON.parse(text);
      } catch {
        // If parsing fails, text might be the token itself
        data = text;
      }
    } else {
      data = text;
    }
    
    // Check if data is a string that looks like a JWT (starts with "eyJ" and has dots)
    if (typeof data === "string" && data.length > 20 && data.includes(".")) {
      // It's likely the JWT token itself as a plain string
      const token = data.trim().replace(/^["']|["']$/g, ""); // Remove quotes if present
      localStorage.setItem(TOKEN_KEY, token);
      return token;
    }
    
  } catch (e) {
    console.error("Failed to parse response:", e);
    throw new Error("Unexpected response from server.");
  }

  // If data is an object, try multiple common field names and nested paths
  if (typeof data === "object" && data !== null) {
    const token = 
      data?.jwt || 
      data?.token || 
      data?.accessToken || 
      data?.access_token ||
      data?.data?.jwt ||
      data?.data?.token ||
      data?.auth?.jwt ||
      data?.auth?.token ||
      data?.user?.token ||
      data?.result?.jwt ||
      data?.result?.token;

    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      return token;
    }
  }

  // If we get here, we couldn't find the token
  console.error("Login succeeded but no JWT found. Response data:", data);
  console.error("Response headers:", Object.fromEntries(response.headers.entries()));
  throw new Error("Authentication succeeded but no JWT was returned. Check console for response details.");

  localStorage.setItem(TOKEN_KEY, token);
  return token;
}


