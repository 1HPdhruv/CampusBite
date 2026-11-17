// Billable local synthetic HTTP check; no microphone, private records, raw replies or credentials logged.
// APP_PASSCODE must be the throwaway passcode used to launch the local server.
// APP_PASSCODE=local-review-only node scripts/check-agent-reliability.mjs
import assert from 'node:assert/strict';
const base = process.env.AGENT_CHECK_URL || 'http://127.0.0.1:3220';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname), 'Loopback only');
assert.ok(process.env.APP_PASSCODE, 'Use a throwaway local server passcode');
let cookie='';
async function post(path,body) {
 const r=await fetch(base+path,{method:'POST',headers:{origin:new URL(base).origin,cookie,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(55000)});
 const c=r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');if(c)cookie+='; '+c;
 return r;
}
assert.equal((await post('/api/login',{passcode:process.env.APP_PASSCODE})).status,200);
const me=await (await fetch(base+'/api/me',{headers:{cookie}})).json();
assert.equal(me.demo_mode,true);
assert.equal((await post('/api/session',{fixture:me.profiles[0].id})).status,200);
for(const test of [
 {label:'Tamil-script',language:'ta-IN',text:'என் மாதிரி அட்டையின் இருப்பு என்ன?'},
 {label:'code-mixed-auto',language:'auto',text:'என் demo balance என்ன?'},
]) {
 const started=Date.now();
 const r=await post('/api/agent',{language:test.language,messages:[{role:'user',text:test.text}]});
 const body=await r.json();
 console.log(JSON.stringify({case:test.label,status:r.status,elapsed_ms:Date.now()-started,error_code:body.error_code??null,correlation_match:!!body.correlation_id&&body.correlation_id===r.headers.get('x-request-id'),tamil_reply:/[\u0B80-\u0BFF]/.test(body.reply||''),tool_count:body.steps?.length??null,no_store:r.headers.get('cache-control')==='no-store'}));
}
await post('/api/logout',{});
