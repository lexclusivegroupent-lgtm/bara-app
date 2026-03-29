let _baseUrl = "";
let _authTokenGetter: (() => string | null) | null = null;

export function setBaseUrl(url: string): void {
  _baseUrl = url;
}

export function getBaseUrl(): string {
  return _baseUrl;
}

export function setAuthTokenGetter(getter: (() => string | null) | null): void {
  _authTokenGetter = getter;
}

export function getAuthToken(): string | null {
  return _authTokenGetter ? _authTokenGetter() : null;
}
