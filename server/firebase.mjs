let cachedKeys = [], keysExpire = 0;
export function firebaseConfig(env) {
  if (!env.FIREBASE_WEB_CONFIG) return null;
  try {
    const {apiKey, authDomain, projectId, appId} = JSON.parse(env.FIREBASE_WEB_CONFIG);
    if (![apiKey, authDomain, projectId, appId].every(v => typeof v === 'string' && v.length > 0)) return null;
    return {apiKey, authDomain, projectId, appId};
  } catch { return null; }
}
export function normalizePhone(value) {
  if (typeof value !== 'string' || value.length > 30) return '';
  let digits = value.replace(/[\s().-]/g, '');
  if (/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) digits = '+1' + digits;
  if (/^1[2-9]\d{2}[2-9]\d{6}$/.test(digits)) digits = '+' + digits;
  return /^\+1[2-9]\d{2}[2-9]\d{6}$/.test(digits) ? digits : '';
}
function decode(part) {
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
}
export async function verifyFirebasePhone(jwt, projectId, fetcher = fetch) {
  const invalid = () => { throw new Error('Invalid Firebase phone sign-in.'); };
  if (typeof jwt !== 'string' || jwt.length > 12000) invalid();
  const parts = jwt.split('.'); if (parts.length !== 3) invalid();
  const header = decode(parts[0]), claims = decode(parts[1]), now = Math.floor(Date.now() / 1000);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string'
    || claims.aud !== projectId || claims.iss !== 'https://securetoken.google.com/' + projectId
    || typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128
    || typeof claims.exp !== 'number' || claims.exp <= now
    || typeof claims.iat !== 'number' || claims.iat > now
    || typeof claims.auth_time !== 'number' || claims.auth_time > now || claims.auth_time < now - 300
    || claims.firebase?.sign_in_provider !== 'phone'
    || !normalizePhone(claims.phone_number) || normalizePhone(claims.phone_number) !== claims.phone_number) invalid();
  if (keysExpire <= now || !cachedKeys.some(k => k.kid === header.kid)) {
    const response = await fetcher('https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com', {signal: AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error('Firebase key service unavailable.');
    cachedKeys = (await response.json()).keys;
    if (!Array.isArray(cachedKeys)) { cachedKeys = []; invalid(); }
    const maxAge = Number((response.headers.get('Cache-Control') || '').match(/max-age=(\d+)/)?.[1] || 300);
    keysExpire = now + Math.min(maxAge, 21600);
  }
  const jwk = cachedKeys.find(k => k.kid === header.kid); if (!jwk) invalid();
  const key = await crypto.subtle.importKey('jwk', jwk, {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, ['verify']);
  const signature = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, new TextEncoder().encode(parts[0] + '.' + parts[1]))) invalid();
  return claims;
}
