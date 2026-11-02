import { AuthError, handlePeople, sessionUser } from './volunteers.mjs';
const MAX_BODY = 6 * 1024 * 1024;
const LOADS = ['kitchen', 'pujari', 'deity'];
const STAGES = ['washed', 'dried', 'folded'];
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const reject = (condition, message, status = 400) => { if (condition) throw new HttpError(status, message); };
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
function today() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = type => parts.find(p => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function addDays(date, count) { return new Date(Date.parse(date + 'T12:00:00Z') + count * 86400000).toISOString().slice(0, 10); }
function date(value) {
  reject(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value), 'Invalid service date.');
  reject(!Number.isFinite(Date.parse(value + 'T12:00:00Z')) || addDays(value, 0) !== value, 'Invalid service date.');
  return value;
}
function text(value, max, required = false) {
  reject(typeof value !== 'string' || value.length > max || (required && !value.trim()), 'Please enter valid text within the field limit.');
  return value.trim();
}
async function body(request) {
  reject(!request.headers.get('Content-Type')?.startsWith('application/json'), 'Expected JSON.', 415);
  const reader = request.body?.getReader();
  reject(!reader, 'Missing request body.');
  let size = 0; const chunks = [];
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); throw new HttpError(413, 'Photos are too large. Use fewer or smaller photos.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { const data = JSON.parse(new TextDecoder().decode(bytes)); reject(!data || Array.isArray(data) || typeof data !== 'object', 'Invalid JSON.'); return data; }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'Invalid JSON.'); }
}
function rowUpdate(row, photos) {
  return { id: row.id, date: row.service_date, shift: row.shift, who: row.volunteer_name, volunteerId: row.volunteer_id, version: row.version, updatedAt: row.updated_at, loads: JSON.parse(row.loads_json), text: row.notes, time: row.created_at, photos: photos.map(p => '/api/photos/' + p.object_key) };
}
async function readSchedule(url, env) {
  const from = date(url.searchParams.get('from')), to = date(url.searchParams.get('to'));
  reject(to < from || to > addDays(from, 7), 'Request at most eight days.');
  const updates = await env.DB.prepare('SELECT * FROM load_updates WHERE deleted_at IS NULL AND service_date BETWEEN ? AND ? ORDER BY created_at DESC, id DESC').bind(from, to).all();
  const photos = await env.DB.prepare('SELECT p.* FROM update_photos p JOIN load_updates u ON p.update_id = u.id WHERE u.service_date BETWEEN ? AND ? ORDER BY p.object_key').bind(from, to).all();
  const backups = await env.DB.prepare('SELECT * FROM shift_backups WHERE service_date BETWEEN ? AND ?').bind(from, to).all();
  return json({ today: today(), updates: updates.results.map(row => rowUpdate(row, photos.results.filter(p => p.update_id === row.id))), backups: Object.fromEntries(backups.results.map(row => [row.service_date + ':' + row.shift, { ...JSON.parse(row.state_json), version: row.version }])) });
}
async function saveUpdate(data, env, user) {
  const day = date(data.date), nowDay = today();
  reject(day < addDays(nowDay, -1) || day > nowDay, 'Notes can be added only for yesterday and today.');
  reject(!['am', 'pm'].includes(data.shift), 'Invalid shift.');
  reject(typeof data.id !== 'string' || !/^[a-zA-Z0-9-]{16,64}$/.test(data.id), 'Invalid update identifier.');
  const who = user.name, notes = text(data.text, 1000);
  reject(!Array.isArray(data.photos) || data.photos.length > 4, 'Attach up to four photos.');
  const loads = {}; let any = false;
  for (const load of LOADS) {
    loads[load] = {};
    for (const stage of STAGES) {
      const checked = data.loads?.[load]?.[stage];
      reject(typeof checked !== 'boolean', 'Invalid load checklist.');
      loads[load][stage] = checked; any ||= checked;
    }
  }
  reject(!any && !notes && !data.photos.length, 'Check a task, add a note, or attach a photo.');
  // A retry after an interrupted response returns the existing update, without duplicates.
  const existing = await env.DB.prepare('SELECT * FROM load_updates WHERE id = ?').bind(data.id).first();
  if (existing) {
    reject(existing.volunteer_id !== user.id, 'Only the author can edit these notes.', 403);
    reject(existing.deleted_at, 'These notes were deleted. Reload the schedule.',409);
    reject(existing.service_date !== day || existing.shift !== data.shift, 'The day and shift cannot be changed.');
    if (data.version === undefined) return json({saved:true,id:data.id});
    reject(!Number.isInteger(data.version) || typeof data.operationId !== 'string' || !/^[a-zA-Z0-9-]{16,64}$/.test(data.operationId), 'Invalid edit version.');
    if (existing.last_operation === data.operationId) return json({saved:true,id:data.id});
    reject(existing.version !== data.version, 'These notes changed elsewhere. Close and reopen the editor to load the latest notes.',409);
  } else {
    reject(data.version !== undefined, 'These notes no longer exist. Reload the schedule.',409);
    const own = await env.DB.prepare('SELECT id FROM load_updates WHERE service_date=? AND shift=? AND volunteer_id=? AND deleted_at IS NULL').bind(day,data.shift,user.id).first();
    reject(own, 'You already added notes for this shift. Edit your existing notes instead.',409);
  }
  const oldPhotos = existing ? (await env.DB.prepare('SELECT object_key FROM update_photos WHERE update_id=?').bind(data.id).all()).results.map(p=>p.object_key) : [];
  const retained = data.photos.filter(p=>typeof p==='string' && p.startsWith('/api/photos/')).map(p=>p.slice('/api/photos/'.length));
  reject(new Set(retained).size !== retained.length || retained.some(key=>!oldPhotos.includes(key)), 'Only photos from your existing entry can be retained.');
  const images = data.photos.filter(p=>typeof p !== 'string' || !p.startsWith('/api/photos/')).map(encoded => {
    reject(typeof encoded !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(encoded), 'Invalid photo.');
    let bytes;
    try { bytes = Uint8Array.from(atob(encoded.split(',')[1]), c => c.charCodeAt(0)); } catch { throw new HttpError(400, 'Invalid photo.'); }
    reject(bytes.length > 1024 * 1024 || bytes.length < 3 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255, 'Use JPEG photos up to 1 MB each.');
    return bytes;
  });
  const time = new Date().toISOString();
  // Unique object keys keep failed requests from deleting another request's photos.
  const keys = images.map((_, i) => `${data.id}/${crypto.randomUUID()}-${i}.jpg`);
  const operation = existing ? data.operationId : crypto.randomUUID();
  try {
    for (let i = 0; i < images.length; i++) await env.PHOTOS.put(keys[i], images[i], { httpMetadata: { contentType: 'image/jpeg' } });
    const results = await env.DB.batch([
      existing
        ? env.DB.prepare('UPDATE load_updates SET volunteer_name=?,loads_json=?,notes=?,version=version+1,updated_at=?,last_operation=? WHERE id=? AND volunteer_id=? AND version=? AND deleted_at IS NULL').bind(who,JSON.stringify(loads),notes,time,operation,data.id,user.id,data.version)
        : env.DB.prepare('INSERT OR IGNORE INTO load_updates (id, service_date, shift, volunteer_name, loads_json, notes, created_at, volunteer_id,last_operation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(data.id, day, data.shift, who, JSON.stringify(loads), notes, time, user.id,operation),
      ...(existing ? [env.DB.prepare("DELETE FROM update_photos WHERE update_id=? AND object_key NOT IN (SELECT value FROM json_each(?)) AND EXISTS (SELECT 1 FROM load_updates WHERE id=? AND last_operation=?)").bind(data.id,JSON.stringify(retained),data.id,operation)] : []),
      ...images.map((bytes, i) => env.DB.prepare('INSERT INTO update_photos (object_key, update_id, content_type, byte_size, created_at) SELECT ?, ?, ?, ?, ? WHERE EXISTS(SELECT 1 FROM load_updates WHERE id=? AND last_operation=?)').bind(keys[i], data.id, 'image/jpeg', bytes.length, time,data.id,operation))
    ]);
    reject(results[0].meta.changes !== 1, 'These notes changed elsewhere. Reload and edit your existing entry.',409);
  } catch (error) {
    const committed = await env.DB.prepare('SELECT last_operation FROM load_updates WHERE id=?').bind(data.id).first();
    if (committed?.last_operation === operation) return json({saved:true,id:data.id});
    await Promise.allSettled(keys.map(key => env.PHOTOS.delete(key)));
    throw error;
  }
  await Promise.allSettled(oldPhotos.filter(key=>!retained.includes(key)).map(key=>env.PHOTOS.delete(key)));
  return json({ saved: true, id: data.id }, existing ? 200 : 201);
}
async function saveBackup(data, env, user) {
  const day = date(data.date), nowDay = today();
  reject(day < nowDay || day > addDays(nowDay, 6), 'Backup requests are available for today and the next six days.');
  reject(!['am', 'pm'].includes(data.shift) || !['request', 'offer'].includes(data.action), 'Invalid shift or action.');
  const name = text(data.name, 60, true), notes = text(data.notes || '', 1000);
  reject(!Number.isInteger(data.version) || data.version < 0, 'Invalid backup version.');
  const row = await env.DB.prepare('SELECT * FROM shift_backups WHERE service_date = ? AND shift = ?').bind(day, data.shift).first();
  const current = row ? JSON.parse(row.state_json) : null;
  reject((row?.version || 0) !== data.version, 'This shift changed. Review the latest status and try again.', 409);
  const time = new Date().toISOString(); let next;
  if (data.action === 'offer') {
    reject(!current || current.cover, 'This shift is no longer waiting for a backup.', 409);
    next = { ...current, cover: name, coveredAt: time, coveredBy: user.id };
  } else {
    const managesShift = user.isSuperAdmin || user.roles.some(role=>['super-admin','admin','coordinator'].includes(role));
    const weekday = (new Date(day+'T12:00:00Z').getUTCDay()+6)%7;
    const assigned = current?.cover ? current.coveredBy === user.id : user.assignments.some(a=>a.weekday===weekday && a.shift===data.shift);
    reject(!managesShift && !assigned, 'Only the assigned volunteer or a coordinator or administrator can request backup for this shift.',403);
    reject(!managesShift && name !== user.name, 'You can request backup only for yourself.',403);
    reject(current && !current.cover, 'A backup has already been requested for this shift.', 409);
    next = { person: name, notes, requestedAt: time, requestedBy: user.id, wasBackup: !!current?.cover, history: current ? [...(current.history || []), { ...current, history: undefined }] : [] };
  }
  const result = row
    ? await env.DB.prepare('UPDATE shift_backups SET state_json = ?, version = version + 1, updated_at = ? WHERE service_date = ? AND shift = ? AND version = ?').bind(JSON.stringify(next), time, day, data.shift, data.version).run()
    : await env.DB.prepare('INSERT OR IGNORE INTO shift_backups (service_date, shift, state_json, version, updated_at) VALUES (?, ?, ?, 1, ?)').bind(day, data.shift, JSON.stringify(next), time).run();
  reject(result.meta.changes !== 1, 'Someone else updated this shift. Review the latest status and try again.', 409);
  return json({ state: { ...next, version: data.version + 1 } });
}
export async function handleApi(request, env) {
  try {
    const url = new URL(request.url);
    reject(!env.DB || !env.PHOTOS, 'Shared storage is not connected yet.', 503);
    const user = await sessionUser(request, env);
    if (request.method === 'GET') { const result = await handlePeople(request, env, url, null, user); if (result) return result; }
    if (request.method === 'GET' && url.pathname === '/api/schedule') return await readSchedule(url, env);
    if (request.method === 'GET' && url.pathname.startsWith('/api/photos/')) {
      const key = url.pathname.slice('/api/photos/'.length);
      const row = await env.DB.prepare('SELECT p.object_key FROM update_photos p JOIN load_updates u ON u.id=p.update_id WHERE p.object_key=? AND u.deleted_at IS NULL').bind(key).first();
      reject(!row, 'Photo not found.', 404);
      const photo = await env.PHOTOS.get(key); reject(!photo, 'Photo not found.', 404);
      return new Response(photo.body, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
    }
    reject(request.method !== 'POST', 'Not found.', 404);
    reject(request.headers.get('Origin') !== url.origin, 'Submit updates from this website.', 403);
    const data = await body(request);
    const peopleResult = await handlePeople(request, env, url, data, user);
    if (peopleResult) return peopleResult;
    reject(!user, 'Please sign in with an approved volunteer account.', 401);
    if (url.pathname === '/api/updates/delete') {
      const entry = await env.DB.prepare('SELECT * FROM load_updates WHERE id=?').bind(text(data.id,64,true)).first();
      reject(!entry, 'Notes not found.',404);
      reject(entry.volunteer_id !== user.id, 'Only the author can delete these notes.',403);
      if (entry.deleted_at) return json({deleted:true});
      reject(!Number.isInteger(data.version) || entry.version !== data.version, 'These notes changed. Reload before deleting.',409);
      const result = await env.DB.prepare('UPDATE load_updates SET deleted_at=?,version=version+1 WHERE id=? AND volunteer_id=? AND version=? AND deleted_at IS NULL').bind(new Date().toISOString(),entry.id,user.id,data.version).run();
      reject(result.meta.changes !== 1,'These notes changed. Reload before deleting.',409);
      return json({deleted:true});
    }
    if (url.pathname === '/api/updates') return await saveUpdate(data, env, user);
    if (url.pathname === '/api/backups') return await saveBackup(data, env, user);
    throw new HttpError(404, 'Not found.');
  } catch (error) {
    if (!(error instanceof HttpError) && !(error instanceof AuthError)) console.error('Shared storage request failed', error);
    return json({ error: (error instanceof HttpError || error instanceof AuthError) ? error.message : 'Could not save or load shared data. Please try again.' }, error.status || 500);
  }
}
