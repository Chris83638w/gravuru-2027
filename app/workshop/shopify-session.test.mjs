import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac, randomBytes} from 'node:crypto';
import {createShopifySessionVerifier} from './shopify-session.mjs';

const now = 1800000000, config = {shopDomain: 'fixture.myshopify.com', clientId: 'fixture-client', secret: randomBytes(32).toString('hex'), clock: () => now * 1000};
const claims = role => ({aud: config.clientId, dest: role === 'merchant' ? 'https://' + config.shopDomain : config.shopDomain,
  ...(role === 'merchant' ? {iss: 'https://' + config.shopDomain + '/admin', sub: '123'} : {sub: 'gid://shopify/Customer/456'}), exp: now + 60, nbf: now, iat: now, jti: 'fixture-session'});
const token = (payload, header = {alg: 'HS256', typ: 'JWT'}, secret = config.secret) => {
  const input = [header, payload].map(v => Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
  return 'Bearer ' + input + '.' + createHmac('sha256', secret).update(input).digest('base64url');
};
const verify = createShopifySessionVerifier(config);
test('signed merchant and customer tokens have separate identities; roles cannot be interchanged', () => {
  for (const role of ['merchant', 'customer']) {
    const result = verify(token(claims(role)), role);
    assert.equal(result.role, role); assert.equal(result.shopDomain, config.shopDomain); assert.ok(Object.isFrozen(result));
    assert.throws(() => verify(token(claims(role)), role === 'customer' ? 'merchant' : 'customer'), e => e.status === 401);
  }
});
for (const [name, patch] of Object.entries({expired: {exp: now}, future: {nbf: now + 1}, futureIssued: {iat: now + 1}, long: {exp: now + 301}, wrongAudience: {aud: 'other'}, wrongShop: {dest: 'other.myshopify.com'}, noCustomer: {sub: undefined}, merchantAsCustomer: {sub: '123'}, unsafeCustomer: {sub: 'gid://shopify/Customer/0'}, stringTime: {exp: String(now + 60)}, noNonce: {jti: undefined}}))
  test('customer token rejected: ' + name, () => assert.throws(() => verify(token({...claims('customer'), ...patch}), 'customer'), e => e.status === 401));
test('signature, algorithm, critical header and malformed encodings are rejected', () => {
  const p = claims('customer');
  for (const value of [undefined, ['Bearer abc'], token(p, undefined, 'different-key'), token(p, {alg: 'none'}), token(p, {alg: 'HS256', crit: ['custom']}), token(p) + '=', token(p).replace('Bearer ', 'bearer '), 'Bearer e30.e30.invalid'])
    assert.throws(() => verify(value, 'customer'), e => e.status === 401);
});
test('admin issuer and destination are exact, config fails closed', () => {
  for (const patch of [{iss: 'https://other.myshopify.com/admin'}, {dest: config.shopDomain}, {sub: 'gid://shopify/Customer/456'}]) assert.throws(() => verify(token({...claims('merchant'), ...patch}), 'merchant'));
  for (const patch of [{secret: ''}, {clientId: ''}, {shopDomain: 'https://fixture.myshopify.com'}]) assert.throws(() => createShopifySessionVerifier({...config, ...patch}), e => e.status === 503);
});
