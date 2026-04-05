const ACCESS_TOKEN_KEY = "tms_access_token";
const REFRESH_TOKEN_KEY = "tms_refresh_token";
const AUTH_USER_KEY = "tms_auth_user";

function getStoredAuth() {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const user = localStorage.getItem(AUTH_USER_KEY);

  return {
    accessToken,
    refreshToken,
    user: user ? JSON.parse(user) : null,
  };
}

function storeAuth({ access, refresh, username }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ username }));
}

function clearStoredAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  AUTH_USER_KEY,
  getStoredAuth,
  storeAuth,
  clearStoredAuth,
};
