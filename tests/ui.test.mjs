import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const peopleScript = await readFile(new URL('../volunteers.js', import.meta.url), 'utf8');
function find(node, predicate) { return [...(predicate(node) ? [node] : []), ...(node.children || []).flatMap(child => find(child, predicate))]; }
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.events = {}; this.value = ''; this.style = {}; this.checked = false; this.hidden = false; }
  set textContent(value) { this.text = value; this.children = []; }
  appendChild(node) { this.children.push(node); return node; }
  setAttribute(key, value) { this.attrs[key] = value; }
  getAttribute(key) { return this.attrs[key]; }
  addEventListener(key, handler) { this.events[key] = handler; }
  focus() { this.focused = true; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  querySelector(tag) { return this.querySelectorAll(tag)[0] || null; }
  querySelectorAll(tags) { return find(this, n => tags.split(',').map(t => t.trim()).includes(n.tag)); }
}
async function fixture() {
  const nodes = {};
  for (const match of html.matchAll(/<[^>]*id="([^"]+)"[^>]*>/g)) {
    const node = nodes[match[1]] = new Element();
    for (const attr of match[0].matchAll(/([\w-]+)="([^"]*)"/g)) node.attrs[attr[1]] = attr[2];
  }
  let updates = [], backups = {}, fail = false;
  const context = vm.createContext({
    crypto, AbortSignal, setInterval() {},
    document: { getElementById: id => { assert.ok(nodes[id], id); return nodes[id]; }, createElement: tag => new Element(tag), createTextNode: text => ({ text }), addEventListener() {} },
    localStorage: { getItem() { return null; }, setItem() {} },
    async fetch(path, options) {
      if (fail) throw new Error('Connection failed');
      if (path === '/api/auth/me') return Response.json({user:{id:'tester',name:'Test User',roles:['volunteer'],isSuperAdmin:false}});
      if (path === '/api/volunteers') {
        const roster = new Map();
        context.WEEKLY_PLAN.forEach((plan, weekday) => ['am','pm'].forEach(shift => plan[shift].forEach(name => {
          if (!roster.has(name)) roster.set(name,{id:name,name,roles:['volunteer'],active:true,assignments:[],availabilityNotes:'',version:1});
          roster.get(name).assignments.push({weekday,shift});
        })));
        return Response.json({volunteers:[...roster.values()]});
      }
      if (!options.body) return Response.json({ updates, backups });
      const data = JSON.parse(options.body);
      if (path === '/api/updates') updates.unshift({ ...data, time: new Date().toISOString() });
      if (path === '/api/backups') {
        const key = data.date + ':' + data.shift;
        backups[key] = data.action === 'request' ? { person: data.name, notes: data.notes, version: data.version + 1 } : { ...backups[key], cover: data.name, version: data.version + 1 };
        return Response.json({ state: backups[key] });
      }
      return Response.json({ saved: true });
    }
  });
  vm.runInContext(peopleScript, context);
  await vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  return { nodes, context, setFail(value) { fail = value; }, get updates() { return updates; } };
}
const buttons = (node, text) => find(node, n => n.tag === 'button' && n.text === text);

test('volunteer management exposes add and edit forms only to administrators', async () => {
  const {nodes, context} = await fixture();
  context.currentUser = null; context.updateAccount();
  assert.equal(nodes['sign-in'].hidden, false);
  assert.equal(nodes['add-volunteer'].hidden, true);
  context.currentUser = {id:'admin',roles:['admin'],name:'Admin'};
  context.updateAccount(); context.renderVolunteers();
  assert.equal(nodes['sign-in'].hidden, true);
  assert.equal(nodes['add-volunteer'].hidden, false);
  nodes['add-volunteer'].events.click();
  assert.equal(nodes['new-volunteer'].hidden, false);
  assert.equal(nodes['add-volunteer'].attrs['aria-expanded'], 'true');
  assert.equal(nodes['new-volunteer'].querySelector('input').focused, true);
  buttons(nodes['new-volunteer'], 'Cancel')[0].events.click();
  assert.equal(nodes['new-volunteer'].hidden, true);
  const edit = buttons(nodes['volunteer-list'], 'Edit volunteer')[0];
  edit.events.click();
  assert.equal(edit.attrs['aria-expanded'], 'true');
  const editor = find(nodes['volunteer-list'], n => n.className === 'volunteer-editor' && !n.hidden)[0];
  assert.ok(editor.querySelector('input').value);
  buttons(editor, 'Cancel')[0].events.click();
  assert.equal(edit.attrs['aria-expanded'], 'false');
  nodes['add-volunteer'].events.click();
  context.currentUser = null; context.updateAccount();
  assert.equal(nodes['new-volunteer'].hidden, true);
});

test('directory combines search, role and service-day filters and supports sorting', async () => {
  const { nodes, context } = await fixture();
  context.volunteerDirectory = [
    {name:'Vaidehi Mtj',roles:['volunteer'],assignments:[],active:true,availabilityNotes:''},
    {name:'Ajinkya Pr',roles:['backup'],assignments:[{weekday:2,shift:'pm'}],active:true,availabilityNotes:'Evenings'},
    {name:'Swetha Mtj',roles:['volunteer'],assignments:[{weekday:0,shift:'pm'}],active:true,availabilityNotes:''}
  ];
  nodes['volunteer-sort'].value = 'name-desc';
  nodes['volunteer-sort'].events.change();
  assert.equal(find(nodes['volunteer-list'], n => n.tag === 'h3')[0].text, 'Vaidehi Mtj');
  nodes['volunteer-search'].value = 'evenings';
  nodes['volunteer-role'].value = 'backup';
  nodes['volunteer-day'].value = '2';
  nodes['volunteer-search'].events.input();
  assert.equal(nodes['volunteer-count'].text, '1 of 3 volunteers');
  assert.equal(find(nodes['volunteer-list'], n => n.tag === 'h3')[0].text, 'Ajinkya Pr');
  nodes['volunteer-day'].value = '0'; nodes['volunteer-day'].events.change();
  assert.equal(nodes['volunteer-count'].text, '0 of 3 volunteers');
});
test('shared load updates preserve drafts during refresh and render summaries after saving', async () => {
  const f = await fixture(), { nodes, context } = f;
  assert.equal(nodes.days.children.length, 8);
  assert.equal(buttons(nodes.days.children[0], 'Add Notes').length, 2);
  assert.equal(buttons(nodes.days.children[2], 'Add Notes').length, 0);
  const shift = nodes.days.children[1].children[1];
  buttons(shift, 'Add Notes')[0].events.click();
  const form = find(shift, n => n.tag === 'form' && n.id.startsWith('update-'))[0];
  const text = find(form, n => n.tag === 'textarea')[0]; text.value = 'Draft';
  const checks = find(form, n => n.type === 'checkbox'); checks[0].checked = true;
  await context.syncShared(); assert.equal(form.hidden, false); assert.equal(text.value, 'Draft');
  f.setFail(true); await form.events.submit({ preventDefault() {} });
  assert.equal(form.hidden, false); assert.equal(text.value, 'Draft'); assert.equal(checks[0].checked, true);
  f.setFail(false); await form.events.submit({ preventDefault() {} });
  assert.equal(form.hidden, true); assert.equal(f.updates.length, 1);
  assert.equal(find(shift, n => n.className === 'entry').length, 1);
  assert.equal(f.updates[0].shift, 'am'); assert.equal(f.updates[0].loads.kitchen.washed, true);
});
test('backup changes use shared state while preserving laundry drafts', async () => {
  const { nodes, context } = await fixture(); const shift = nodes.days.children[1].children[1];
  const noteForm = find(shift, n => n.tag === 'form' && n.id.startsWith('update-'))[0];
  find(noteForm, n => n.tag === 'textarea')[0].value = 'Keep my draft';
  let form = find(shift, n => n.tag === 'form' && n.id.startsWith('backup-'))[0];
  find(form, n => n.type === 'text')[0].value = 'Original';
  await form.events.submit({ preventDefault() {} });
  assert.equal(buttons(shift, 'Opt for backup').length, 1);
  form = find(shift, n => n.tag === 'form' && n.id.startsWith('backup-'))[0];
  find(form, n => n.type === 'text')[0].value = 'Replacement';
  await form.events.submit({ preventDefault() {} });
  assert.equal(buttons(shift, 'Need backup').length, 1);
  assert.ok(find(shift, n => n.text === 'Replacement').length);
  assert.equal(find(noteForm, n => n.tag === 'textarea')[0].value, 'Keep my draft');
  await context.syncShared();
  assert.ok(find(shift, n => n.text === 'Replacement').length);
});

test('three tabs work, public directory has no editing controls, and signed-out actions require sign-in', async () => {
  const { nodes, context } = await fixture();
  nodes['volunteers-tab'].events.click();
  assert.equal(nodes['volunteers-panel'].hidden, false);
  assert.equal(nodes['schedule-panel'].hidden, true);
  nodes['volunteers-tab'].events.keydown({key:'ArrowRight',preventDefault(){}});
  assert.equal(nodes['schedule-panel'].hidden, false);
  assert.equal(buttons(nodes['volunteer-list'], 'Edit volunteer').length, 0);
  context.currentUser = null;
  buttons(nodes.days.children[1], 'Add Notes')[0].events.click();
  assert.equal(nodes['auth-dialog'].open, true);
  const updateForm = find(nodes.days.children[1], n => n.tag === 'form' && n.id.startsWith('update-'))[0];
  assert.equal(updateForm.hidden, true);
});
test('admin editor locks self-demotion and super-admin editor locks the protected role', async () => {
  const { context } = await fixture();
  context.currentUser = {id:'self',name:'Admin',roles:['admin'],isSuperAdmin:false};
  const self = {id:'self',name:'Admin',email:'admin@example.com',roles:['admin','volunteer'],assignments:[],availabilityNotes:'',active:true,version:1};
  let editor = context.volunteerForm(self, () => {});
  let labels = find(editor, n => n.className === 'check-label');
  const labelText = n => (n.children || []).find(c => c.text)?.text;
  assert.equal(labels.find(n => labelText(n) === 'admin').children[0].disabled, true);
  assert.equal(buttons(editor,'Remove volunteer').length,0);
  context.currentUser = {id:'self',name:'Super',roles:['super-admin'],isSuperAdmin:true};
  editor = context.volunteerForm({...self,roles:['super-admin'],isSuperAdmin:true},()=>{});
  labels = find(editor, n => n.className === 'check-label');
  assert.equal(labels.find(n => labelText(n) === 'super-admin').children[0].disabled,true);
  assert.equal(buttons(editor,'Remove volunteer').length,0);
});
