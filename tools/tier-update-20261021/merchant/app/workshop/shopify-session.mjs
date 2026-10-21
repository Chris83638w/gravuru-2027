import {createHmac, timingSafeEqual} from 'node:crypto';

const reject = (reason='malformed') => {throw Object.assign(Error('Shopify-Anmeldung nicht bestätigt.'), {status: 401, code: 'shopify_session', reason});};
const decode = value => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) reject();
  const bytes = Buffer.from(value, 'base64url');
  if (bytes.toString('base64url') !== value) reject();
  try {const result = JSON.parse(bytes.toString('utf8')); if (!result || typeof result !== 'object' || Array.isArray(result)) reject(); return result;} catch {reject();}
};

// These are session tokens, not OAuth access tokens. Fixed configuration supplies
// the audience/shop; untrusted JWT claims never choose a key or network target.
export function createShopifySessionVerifier({shopDomain, clientId, secret, clock = Date.now}) {
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain || '') ||
      typeof clientId !== 'string' || !clientId || typeof secret !== 'string' || secret.length < 16)
    throw Object.assign(Error('Shopify-Sitzungsprüfung ist nicht eingerichtet.'), {status: 503, code: 'shopify_session_config'});
  return (authorization, role) => {
    if (!['merchant', 'customer'].includes(role) || typeof authorization !== 'string' || authorization.length > 8192 || !authorization.startsWith('Bearer ')) reject();
    const parts = authorization.slice(7).split('.'); if (parts.length !== 3) reject();
    const [headerText, payloadText, signatureText] = parts, header = decode(headerText);
    if (header.alg !== 'HS256' || (header.typ !== undefined && header.typ !== 'JWT') || header.crit !== undefined || header.b64 !== undefined) reject();
    const signature = Buffer.from(signatureText, 'base64url');
    if (signature.length !== 32 || signature.toString('base64url') !== signatureText ||
        !timingSafeEqual(signature, createHmac('sha256', secret).update(headerText + '.' + payloadText).digest())) reject('signature');
    const p = decode(payloadText), now = Math.floor(clock() / 1000);
    // Shopify's official Admin session verifier permits ten seconds of clock
    // skew. Signed real navigation tokens here were observed two seconds ahead.
    // Customer-account verification keeps its existing strict time boundary.
    const tolerance=role==='merchant'?10:0;
    if (p.aud !== clientId || ![p.exp, p.nbf, p.iat].every(Number.isSafeInteger) || p.exp <= p.iat || p.nbf > p.exp || p.exp - p.iat > 300 || typeof p.jti !== 'string' || !p.jti || p.jti.length > 256) reject('claims');
    if(p.exp<=now-tolerance)reject('expired');
    if(p.nbf>now+tolerance||p.iat>now+tolerance)reject('not_yet_valid');
    if (role === 'merchant') {
      if (p.dest !== 'https://' + shopDomain || p.iss !== 'https://' + shopDomain + '/admin' || typeof p.sub !== 'string' || !/^[1-9][0-9]{0,19}$/.test(p.sub)) reject();
    } else {
      if (p.dest !== shopDomain || typeof p.sub !== 'string' || !/^gid:\/\/shopify\/Customer\/[1-9][0-9]{0,19}$/.test(p.sub)) reject();
    }
    return Object.freeze({role, shopDomain, subject: p.sub, expiresAt: p.exp});
  };
}
