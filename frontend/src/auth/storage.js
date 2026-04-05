const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const ROLE_KEY = "role";
const AUTH_USER_KEY = "tms_auth_user";

function getStoredAuth() {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const role = localStorage.getItem(ROLE_KEY);
  const user = localStorage.getItem(AUTH_USER_KEY);

  return {
    accessToken,
    refreshToken,
    role,
    user: user ? JSON.parse(user) : null,
  };
}

function storeAuth({ access, refresh, username, role }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ username, role }));
}

function clearStoredAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  ROLE_KEY,
  AUTH_USER_KEY,
  getStoredAuth,
  storeAuth,
  clearStoredAuth,
};
