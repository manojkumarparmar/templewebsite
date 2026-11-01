import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyFirebasePhone, normalizePhone} from '../server/firebase.mjs';
import {fixture} from './test-fixture.mjs';

const config = JSON.stringify({apiKey:'test-key',authDomain:'test-project.firebaseapp.com',projectId:'test-project',appId:'test-app'});
const key = await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'}, true, ['sign','verify']);
const jwk = {...await crypto.subtle.exportKey('jwk', key.publicKey),kid:'firebase-test'};
const fetchKeys = async url => {
  assert.equal(url, 'https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com');
  return Response.json({keys:[jwk]}, {headers:{'Cache-Control':'max-age=3600'}});
};
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
async function jwt(overrides = {}) {
  const now = Math.floor(Date.now()/1000);
  const body = encode({alg:'RS256',kid:'firebase-test'}) + '.' + encode({aud:'test-project',iss:'https://securetoken.google.com/test-project',sub:'phone-user',exp:now+600,iat:now,auth_time:now,phone_number:'+12145550123',firebase:{sign_in_provider:'phone'},...overrides});
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key.privateKey,new TextEncoder().encode(body));
  return body + '.' + Buffer.from(signature).toString('base64url');
}
test('Firebase phone tokens require a valid signature, project, issuer, recent phone authentication and number', async () => {
  assert.equal((await verifyFirebasePhone(await jwt(),'test-project',fetchKeys)).phone_number,'+12145550123');
  const now = Math.floor(Date.now()/1000);
  for (const overrides of [{aud:'wrong'}, {iss:'wrong'}, {exp:1}, {iat:now+100}, {auth_time:now-600}, {auth_time:now+100}, {sub:''}, {firebase:{sign_in_provider:'google.com'}}, {phone_number:'+919876543210'}]) {
    await assert.rejects(() => jwt(overrides).then(token => verifyFirebasePhone(token,'test-project',fetchKeys)));
  }
  const token = await jwt();
  await assert.rejects(() => verifyFirebasePhone(token.slice(0,-12)+'AAAAAAAAAAAA','test-project',fetchKeys));
});
test('phone sign-in grants a session only for an active registered number and never exposes numbers publicly', async () => {
  const {db,env,call} = fixture({anonymous:true}); env.FIREBASE_WEB_CONFIG = config;
  const originalFetch = globalThis.fetch; globalThis.fetch = fetchKeys;
  try {
    assert.equal((await call('auth/phone',{idToken:await jwt()})).status,403);
    db.prepare('UPDATE volunteers SET phone=? WHERE id=?').run('+12145550123','vaidehi');
    const response = await call('auth/phone',{idToken:await jwt()}); assert.equal(response.status,200);
    assert.equal((await response.json()).user.id,'vaidehi');
    assert.match(response.headers.get('Set-Cookie'),/HttpOnly/);
    const people = (await (await call('volunteers')).json()).volunteers;
    assert.ok(people.every(v => !('phone' in v)));
    db.prepare('UPDATE volunteers SET active=0 WHERE id=?').run('vaidehi');
    assert.equal((await call('auth/phone',{idToken:await jwt()})).status,403);
    assert.equal((await call('auth/phone',{idToken:'forged'})).status,401);
  } finally { globalThis.fetch = originalFetch; }
});
test('admin phone edits normalize numbers, reject duplicates, and revoke sessions when a number changes', async () => {
  const {db,env,call} = fixture(); env.FIREBASE_WEB_CONFIG = config;
  let people = (await (await call('volunteers')).json()).volunteers;
  const vaidehi = people.find(v => v.id === 'vaidehi');
  assert.equal((await call('volunteers/save',{...vaidehi,phone:'(214) 555-0123',roles:['volunteer','admin']})).status,200);
  assert.equal(db.prepare('SELECT phone FROM volunteers WHERE id=?').get('vaidehi').phone,'+12145550123');
  const swetha = people.find(v => v.id === 'swetha');
  assert.equal((await call('volunteers/save',{...swetha,phone:'+12145550123'})).status,409);
  assert.equal((await call('volunteers/save',{...swetha,phone:'+919876543210'})).status,400);
  db.prepare('INSERT INTO auth_sessions VALUES(?,?,?)').run('test-session','vaidehi',Math.floor(Date.now()/1000)+600);
  people = (await (await call('volunteers')).json()).volunteers;
  assert.equal((await call('volunteers/save',{...people.find(v => v.id === 'vaidehi'),phone:'2145550124'})).status,200);
  assert.equal(db.prepare('SELECT count(*) AS count FROM auth_sessions WHERE volunteer_id=?').get('vaidehi').count,0);
  assert.equal(normalizePhone('214-555-0123'),'+12145550123');
});
test('phone configuration is optional and absent configuration disables phone login', async () => {
  const {call} = fixture({anonymous:true});
  assert.equal((await (await call('auth/config')).json()).firebase,null);
  assert.equal((await call('auth/phone',{idToken:'anything'})).status,503);
});
