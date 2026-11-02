import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './test-fixture.mjs';
const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const day = offset => new Date(Date.parse(today+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10);
const read = async (call,from,to=from) => {const response=await call(`schedule?from=${from}&to=${to}`);assert.equal(response.status,200);return response.json();};
const shifts = Array.from({length:7},(_,weekday)=>({weekday,shift:'am'}));

test('recurring edits, names and deactivation preserve yesterday and older assignments without daily visits',async()=>{
 const {db,call}=fixture();
 db.prepare('UPDATE volunteers SET assignments_json=? WHERE id=?').run(JSON.stringify(shifts),'swetha');
 db.prepare('UPDATE schedule_versions SET recorded_at=?').run(day(-20)+'T00:00:00.000Z');
 const before=await read(call,day(-7),day(-1));
 const roster=(await (await call('volunteers')).json()).volunteers.filter(v=>v.active);
 const payload={volunteers:roster.map(v=>({id:v.id,version:v.version,assignments:v.id==='swetha'?[]:v.assignments}))};
 assert.equal((await call('recurring/save',payload)).status,200);
 db.prepare('UPDATE volunteers SET name=?,active=0 WHERE id=?').run('Changed name','swetha');
 const after=await read(call,day(-7),day(-1));
 assert.deepEqual(after.assignments,before.assignments);
 assert.ok(after.assignments[day(-1)].am.some(v=>v.id==='swetha'&&v.name==='Swetha Mtj'));
 const current=await read(call,today,day(6));
 assert.ok(!current.assignments[today].am.some(v=>v.id==='swetha'));
});

test('older notes survive, history requires sign-in, and unknown assignments are explicit',async()=>{
 const {db,call}=fixture();
 db.prepare('INSERT INTO load_updates(id,service_date,shift,volunteer_name,loads_json,notes,created_at,volunteer_id) VALUES(?,?,?,?,?,?,?,?)').run('historical-note-123',day(-10),'am','Nanda Kumar Das','{}','Saved history',day(-10)+'T12:00:00Z','nanda-kumar-das');
 const result=await read(call,day(-10));
 assert.equal(result.assignments[day(-10)],null);
 assert.equal(result.updates[0].text,'Saved history');
 assert.equal((await call(`schedule?from=${day(-10)}&to=${day(-10)}`,null,undefined,'')).status,401);
 assert.equal((await call('updates/delete',{id:'historical-note-123',version:1})).status,403);
 assert.equal(db.prepare('SELECT notes FROM load_updates WHERE id=?').get('historical-note-123').notes,'Saved history');
 assert.equal((await call(`schedule?from=${day(-1)}&to=${day(6)}`,null,undefined,'')).status,200);
 assert.equal((await call(`schedule?from=${day(-10)}&to=${today}`)).status,400);
});

test('Chicago day boundaries preserve history across spring and fall daylight saving changes',async()=>{
 const {db,call}=fixture(); db.exec('DELETE FROM schedule_versions');
 const insert=(timestamp,name)=>db.prepare('INSERT INTO schedule_versions(recorded_at,people_json) VALUES(?,?)').run(timestamp,JSON.stringify([{id:'person',name,assignments:shifts}]));
 insert('2026-03-08T05:59:59.999Z','Before spring day');
 insert('2026-03-08T06:00:00.000Z','Spring day');
 insert('2026-03-09T05:00:00.000Z','After spring day');
 assert.equal((await read(call,'2026-03-07')).assignments['2026-03-07'].am[0].name,'Before spring day');
 assert.equal((await read(call,'2026-03-08')).assignments['2026-03-08'].am[0].name,'Spring day');
 insert('2026-11-01T04:59:59.999Z','Before fall day');
 insert('2026-11-01T05:00:00.000Z','Fall day');
 insert('2026-11-02T06:00:00.000Z','After fall day');
 assert.equal((await read(call,'2026-10-31')).assignments['2026-10-31'].am[0].name,'Before fall day');
 // Future days deliberately use the latest current plan; assert the boundary only once this day is past.
 if(today>'2026-11-01') assert.equal((await read(call,'2026-11-01')).assignments['2026-11-01'].am[0].name,'Fall day');
});
