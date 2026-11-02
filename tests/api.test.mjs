import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { handleApi } from '../server/api.mjs';

import { fixture } from './test-fixture.mjs';
const serviceDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dayAfter = offset => new Date(Date.parse(serviceDay + 'T12:00:00Z') + offset * 86400000).toISOString().slice(0, 10);
function update() {
  return { id: crypto.randomUUID(), date: serviceDay, shift: 'am', who: 'Test Volunteer', text: 'Ready for the next shift', loads: Object.fromEntries(['kitchen', 'pujari', 'deity'].map(load => [load, { washed: true, dried: false, folded: false }])), photos: [] };
}
test('checklists, photos, and notes persist and can be read by a second visitor', async () => {
  const { call, objects } = fixture(); const data = update(); data.photos = ['data:image/jpeg;base64,/9j/2Q=='];
  assert.equal((await call('updates', data)).status, 201);
  assert.equal((await call('updates', data)).status, 200);
  assert.equal(objects.size, 1);
  const schedule = await (await call(`schedule?from=${dayAfter(-1)}&to=${dayAfter(6)}`)).json();
  assert.equal(schedule.updates.length, 1); assert.equal(schedule.updates[0].loads.kitchen.washed, true);
  assert.equal(schedule.updates[0].who, 'Nanda Kumar Das');
  const photo = await call(schedule.updates[0].photos[0].slice('/api/'.length));
  assert.equal(photo.status, 200); assert.equal(photo.headers.get('Content-Type'), 'image/jpeg');
  assert.equal((await photo.arrayBuffer()).byteLength, 4);
});
test('backup requests support repeat replacements and reject competing volunteers', async () => {
  const { call } = fixture();
  const data = { date: serviceDay, shift: 'am', action: 'request', name: 'Original', notes: 'Unavailable', version: 0 };
  assert.equal((await call('backups', data)).status, 200);
  assert.equal((await call('backups', data)).status, 409);
  const offer = { ...data, action: 'offer', name: 'First backup', version: 1 };
  const results = await Promise.all([call('backups', offer), call('backups', { ...offer, name: 'Competing volunteer' })]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal((await call('backups', { ...data, name: 'First backup', version: 2 })).status, 200);
  assert.equal((await call('backups', { ...offer, name: 'Second backup', version: 3 })).status, 200);
  const schedule = await (await call(`schedule?from=${serviceDay}&to=${serviceDay}`)).json();
  assert.equal(schedule.backups[serviceDay + ':am'].cover, 'Second backup');
  assert.equal(schedule.backups[serviceDay + ':am'].version, 4);
  assert.equal(schedule.backups[serviceDay + ':am'].history.length, 1);
  assert.equal(schedule.backups[serviceDay + ':pm'], undefined);
});

test('backup requests require assignment or a managing role, including requests by the current backup', async () => {
  const {call,db}=fixture({userId:'swetha'});
  const weekday=(new Date(serviceDay+'T12:00:00Z').getUTCDay()+6)%7;
  db.prepare('UPDATE volunteers SET assignments_json=? WHERE id=?').run('[]','swetha');
  const data={date:serviceDay,shift:'am',action:'request',name:'Swetha Mtj',notes:'',version:0};
  assert.equal((await call('backups',data)).status,403);
  db.prepare('UPDATE volunteers SET assignments_json=? WHERE id=?').run(JSON.stringify([{weekday,shift:'am'}]),'swetha');
  assert.equal((await call('backups',{...data,name:'Another volunteer'})).status,403);
  assert.equal((await call('backups',data)).status,200);
  db.prepare('UPDATE auth_sessions SET volunteer_id=?').run('hema');
  assert.equal((await call('backups',{...data,action:'offer',name:'Hema Mtj',version:1})).status,200);
  db.prepare('UPDATE auth_sessions SET volunteer_id=?').run('swetha');
  assert.equal((await call('backups',{...data,version:2})).status,403);
  db.prepare('UPDATE auth_sessions SET volunteer_id=?').run('hema');
  assert.equal((await call('backups',{...data,name:'Hema Mtj',version:2})).status,200);
  for(const role of ['coordinator','admin']) {
    const f=fixture({userId:'swetha'});
    f.db.prepare('UPDATE volunteers SET assignments_json=?,roles_json=? WHERE id=?').run('[]',JSON.stringify([role]),'swetha');
    assert.equal((await f.call('backups',data)).status,200);
  }
  assert.equal((await fixture().call('backups',data)).status,200);
});
test('validation rejects future notes, old backup requests, bad images, and cross-site writes', async () => {
  const { call } = fixture();
  assert.equal((await call('updates', { ...update(), date: dayAfter(1) })).status, 400);
  assert.equal((await call('updates', { ...update(), date: dayAfter(-2) })).status, 400);
  assert.equal((await call('updates', { ...update(), photos: ['data:image/jpeg;base64,SGVsbG8='] })).status, 400);
  assert.equal((await call('updates', { ...update(), photos: Array(5).fill('data:image/jpeg;base64,/9j/2Q==') })).status, 400);
  assert.equal((await call('updates', { ...update(), who: '' })).status, 201); // The authenticated name overrides submitted names.
  assert.equal((await call('updates', update(), 'https://unrelated.example')).status, 403);
  assert.equal((await call('backups', { date: dayAfter(-1), shift: 'am', action: 'request', name: 'Test', version: 0 })).status, 400);
  assert.equal((await call('schedule?from=2026-02-30&to=2026-03-01')).status, 400);
  assert.equal((await call(`schedule?from=${serviceDay}&to=${dayAfter(8)}`)).status, 400);
  assert.equal((await call('photos/nonexistent')).status, 404);
});
test('empty updates are rejected; checklist-only and photo-only updates are accepted', async () => {
  const { call } = fixture(); const data = update(); data.text = '';
  assert.equal((await call('updates', data)).status, 201);
  const empty = update(); empty.text = ''; Object.values(empty.loads).forEach(load => { load.washed = false; });
  assert.equal((await call('updates', empty)).status, 400);
  empty.photos = ['data:image/jpeg;base64,/9j/2Q==']; empty.shift = 'pm';
  assert.equal((await call('updates', empty)).status, 201);
});
test('failed database save cleans uploaded photos and leaves no partial update', async () => {
  const { call, env, objects, db } = fixture(); const data = update(); data.photos = ['data:image/jpeg;base64,/9j/2Q=='];
  env.DB.batch = async () => { throw new Error('Simulated database outage'); };
  assert.equal((await call('updates', data)).status, 500);
  assert.equal(objects.size, 0); assert.equal(db.prepare('SELECT count(*) AS n FROM load_updates').get().n, 0);
});
