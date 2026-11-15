// Local acceptance: real browser for Studio/Community; catalog responses are explicit fixtures.
// No real credentials, database writes or external services are used.
/* global Image, DOMException, history, location, innerWidth, scrollY, navigator */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dir = join(root, 'docs/sprint6-7/evidence/acceptance-2026-11-15', process.env.ACCEPTANCE_RUN ?? 'run-2');
await mkdir(dir, { recursive: true });
const base = 'http://127.0.0.1:4176';
const browser = await chromium.launch({ headless: true });
const results = [];
const selected = process.env.ACCEPTANCE_CASES?.split(',');
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const course = (id, status, title) => ({ ma_khoa_hoc: id, ma_giao_vien: 'fixture-teacher', tieu_de: title, cap_do: 'CO_BAN', chu_de: 'Demo', mo_ta: 'Local acceptance fixture', anh_dai_dien: null, trang_thai: status, ngay_tao: '2026-11-15T00:00:00Z' });
let fixtureMode = 'success';
const writes = [];
const external = [];
const errors = [];
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
await context.route('**/*', async route => {
  const r = route.request();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method())) writes.push({ method: r.method(), url: r.url() });
  if (new URL(r.url()).origin !== base) { external.push({ method: r.method(), url: r.url() }); return route.abort(); }
  if (new URL(r.url()).pathname === '/api/courses') {
    if (fixtureMode === 'slow') await new Promise(r => setTimeout(r, 1200));
    return route.fulfill({ status: fixtureMode === 'error' ? 503 : 200, contentType: 'application/json', body: fixtureMode === 'error' ? JSON.stringify({ detail: 'Local simulated outage' }) : JSON.stringify({ items: fixtureMode === 'empty' ? [] : [course(1, 'DA_DANG', 'Public fixture'), course(2, 'NHAP', 'Draft fixture'), course(3, 'DA_AN', 'Hidden fixture')], page: 1, pageSize: 12, totalCount: fixtureMode === 'empty' ? 0 : 3 }) });
  }
  return route.continue();
});
await context.tracing.start({ screenshots: true, snapshots: true });
const page = await context.newPage();
page.setDefaultTimeout(4500);
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', async dialog => dialog.dismiss());
const cleanGoto = async path => {
  // Setup deliberately accepts unload; assertions inside each case still control dialogs.
  page.removeAllListeners('dialog'); page.on('dialog', async d => d.accept());
  await page.goto(base + path); await page.waitForSelector('main');
  page.removeAllListeners('dialog'); page.on('dialog', async d => d.dismiss());
};
const canvas = () => page.locator('canvas');
const pixels = () => canvas().evaluate(c => c.toDataURL());
async function stroke(x = .3, y = .4, end = .65) {
  const b = await canvas().boundingBox();
  await page.mouse.move(b.x + b.width*x, b.y + b.height*y);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width*end, b.y + b.height*y, { steps: 8 });
  await page.mouse.up();
}
async function confirm(action, accept = false) {
  page.removeAllListeners('dialog');
  const ds = [];
  const handler = async d => { ds.push({ type: d.type(), message: d.message() }); await (accept ? d.accept() : d.dismiss()); };
  page.on('dialog', handler);
  await action();
  await page.waitForTimeout(200);
  page.off('dialog', handler);
  page.on('dialog', async d => d.dismiss());
  return ds;
}
async function shot(id) { await page.screenshot({ path: join(dir, `${id}.png`), fullPage: true }); }
async function run(id, description, fn) {
  if (selected && !selected.includes(id)) return;
  const start = new Date().toISOString();
  const offset = errors.length;
  try {
    const details = await fn();
    if (!page.isClosed()) await shot(id);
    results.push({ id, description, status: 'PASS', start, details, pageErrors: errors.slice(offset), artifact: page.isClosed() ? 'results.json (dialog assertions); browser-trace.zip' : `${id}.png` });
  } catch (e) {
    await shot(id).catch(() => {});
    results.push({ id, description, status: 'FAIL', start, actual: e.message, pageErrors: errors.slice(offset), artifact: `${id}.png` });
  }
  console.log(`${results.at(-1).status} ${id}: ${results.at(-1).actual ?? description}`);
}
function blocked(id, description, reason) { results.push({ id, description, status: 'BLOCKED', reason }); }

try {
await run('ST-01', 'Mouse tools: pen, color, size and eraser', async () => {
  await cleanGoto('/studio'); const blank = await pixels(); await stroke(); const ink = await pixels(); assert.notEqual(ink, blank);
  await page.getByLabel('Màu nét vẽ').fill('#ff0000');
  await page.getByLabel('Cỡ nét').fill('24'); await stroke(.3, .6);
  const red = await canvas().evaluate(c => Array.from(c.getContext('2d').getImageData(600,432,1,1).data)); assert.deepEqual(red, [255,0,0,255]);
  await page.getByRole('button', { name: 'Tẩy', exact: true }).click(); await stroke(.3,.6);
  const erased = await canvas().evaluate(c => Array.from(c.getContext('2d').getImageData(600,432,1,1).data)); assert.deepEqual(erased,[255,253,247,255]);
  return { red, erased };
});
await run('ST-03', 'History bound and discard redo after new stroke', async () => {
  await cleanGoto('/studio'); for(let i=0;i<32;i++) await stroke(.1+i*.01,.2+i*.01,.13+i*.01);
  let undo=0; const u=page.getByRole('button',{name:'Hoàn tác',exact:true});
  while(await u.isEnabled() && undo<35){await u.click();undo++;}
  assert.equal(undo,29); await page.getByRole('button',{name:'Làm lại',exact:true}).click();
  await stroke(); assert.equal(await page.getByRole('button',{name:'Làm lại',exact:true}).isEnabled(),false);
  return { undoCount: undo, historySnapshotLimit: 30 };
});
await run('ST-04', 'Clear cancel, accept, then resume drawing', async()=>{
  await cleanGoto('/studio');await stroke();const before=await pixels();
  assert.equal((await confirm(()=>page.getByRole('button',{name:'Xóa tranh',exact:true}).click())).length,1);assert.equal(await pixels(),before);
  await confirm(()=>page.getByRole('button',{name:'Xóa tranh',exact:true}).click(),true);const blank=await pixels();assert.notEqual(blank,before);await stroke();assert.notEqual(await pixels(),blank);
});
await run('ST-05', 'Downloaded PNG bytes exactly match canvas',async()=>{
  await cleanGoto('/studio');await stroke();const data=await pixels();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Tải PNG',exact:true}).click();const dl=await downloadPromise;
  await dl.saveAs(join(dir,'studio-export.png'));const file=await readFile(join(dir,'studio-export.png'));assert.equal(file.toString('base64'),data.split(',')[1]);
  assert.equal(file.readUInt32BE(16),1200);assert.equal(file.readUInt32BE(20),720);return { bytes:file.length,width:1200,height:720 };
});
await run('ST-06', 'Internal link cancel preserves image; accept navigates',async()=>{
  await cleanGoto('/studio');await stroke();const before=await pixels();const link=page.getByRole('link',{name:'Khám phá khóa học',exact:true});
  const ds=await confirm(()=>link.click());assert.equal(ds[0]?.type,'confirm');assert.ok(page.url().endsWith('/studio'));assert.equal(await pixels(),before);
  assert.equal((await confirm(()=>link.click(),true))[0]?.type,'confirm');await page.waitForURL('**/courses');return { cancelDialogs:ds };
});
await run('ST-07', 'Back and Forward guard, cancel and accept',async()=>{
  await cleanGoto('/community');await page.getByRole('navigation',{name:'Điều hướng chính'}).getByRole('link',{name:'Studio',exact:true}).click();
  await page.getByRole('link',{name:'Khám phá khóa học',exact:true}).click();await page.goBack();await stroke();const before=await pixels();
  for(const direction of ['back','forward']){
    const ds=await confirm(()=>page.evaluate(d=>history[d](),direction));assert.equal(ds[0]?.type,'confirm',`${direction} should guard`);assert.ok(page.url().endsWith('/studio'));assert.equal(await pixels(),before);
  }
  await confirm(()=>page.evaluate(()=>history.forward()),true);await page.waitForURL('**/courses');await page.goBack();await stroke();
  await confirm(()=>page.evaluate(()=>history.back()),true);await page.waitForURL('**/community');
});
await run('ST-08', 'Exported snapshot stays clean; undo/redo, edit and clear update guard',async()=>{
  await cleanGoto('/studio');await stroke(.2,.3);await stroke(.2,.6);
  await page.getByRole('button',{name:'Tải PNG',exact:true}).click();
  const clean=await confirm(()=>page.getByRole('link',{name:'Khám phá khóa học',exact:true}).click());assert.equal(clean.length,0);await page.goBack();
  await stroke(.2,.3);await stroke(.2,.6);await page.getByRole('button',{name:'Tải PNG',exact:true}).click();
  await page.getByRole('button',{name:'Hoàn tác',exact:true}).click();assert.equal((await confirm(()=>page.getByRole('link',{name:'Khám phá khóa học',exact:true}).click())).length,1);
  await page.getByRole('button',{name:'Làm lại',exact:true}).click();assert.equal((await confirm(()=>page.getByRole('link',{name:'Khám phá khóa học',exact:true}).click())).length,0);await page.goBack();
  await stroke();await page.getByRole('button',{name:'Tải PNG',exact:true}).click();await stroke(.2,.7);
  assert.equal((await confirm(()=>page.getByRole('link',{name:'Khám phá khóa học',exact:true}).click())).length,1);
  await page.getByRole('button',{name:'Tải PNG',exact:true}).click();await confirm(()=>page.getByRole('button',{name:'Xóa tranh',exact:true}).click(),true);
  assert.equal((await confirm(()=>page.getByRole('link',{name:'Khám phá khóa học',exact:true}).click())).length,1);
});
await run('ST-09-reload', 'Real beforeunload dialog on reload, stay and leave',async()=>{
  await cleanGoto('/studio');await stroke();const before=await pixels();
  const ds=await confirm(()=>page.evaluate(()=>{setTimeout(()=>location.reload(),0);}));assert.equal(ds[0]?.type,'beforeunload');assert.equal(await pixels(),before);
  const accepted=await confirm(()=>page.evaluate(()=>{setTimeout(()=>location.reload(),0);}),true);assert.equal(accepted[0]?.type,'beforeunload');await page.waitForSelector('canvas');assert.notEqual(await pixels(),before);
});
await run('ST-09-close','Real beforeunload dialog on tab close, cancel and accept',async()=>{
  await cleanGoto('/studio');await stroke();let ds=[];page.removeAllListeners('dialog');
  page.on('dialog',async d=>{ds.push(d.type());await d.dismiss();});await page.close({runBeforeUnload:true});await new Promise(r=>setTimeout(r,250));assert.equal(page.isClosed(),false);assert.deepEqual(ds,['beforeunload']);
  page.removeAllListeners('dialog');page.on('dialog',async d=>{ds.push(d.type());await d.accept();});await page.close({runBeforeUnload:true});await new Promise(r=>setTimeout(r,250));assert.equal(page.isClosed(),true);
  return { dialogs:ds };
});
// Remaining groups use a fresh page because the close test intentionally closes the first one.
} finally {
  // The second phase below is separated so a close-test failure cannot skip all remaining evidence.
}
const p2=await context.newPage();p2.setDefaultTimeout(4500);p2.on('pageerror',e=>errors.push(e.message));
async function run2(id,description,fn){
  if (selected && !selected.includes(id)) return;
  const start=new Date().toISOString();try{const details=await fn();await p2.screenshot({path:join(dir,`${id}.png`),fullPage:true});results.push({id,description,status:'PASS',start,details,artifact:`${id}.png`});}
  catch(e){await p2.screenshot({path:join(dir,`${id}.png`),fullPage:true}).catch(()=>{});results.push({id,description,status:'FAIL',start,actual:e.message,artifact:`${id}.png`});}
  console.log(`${results.at(-1).status} ${id}: ${results.at(-1).actual??description}`);
}
await run2('ST-10','Resize preserves raster; 360px and keyboard toolbar',async()=>{
  await p2.goto(base+'/studio');const c=p2.locator('canvas');await c.waitFor();const b=await c.boundingBox();await p2.mouse.click(b.x+100,b.y+100);const before=await c.evaluate(c=>c.toDataURL());
  await p2.setViewportSize({width:360,height:800});assert.equal(await c.evaluate(c=>c.toDataURL()),before);assert.equal(await p2.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const eraser=p2.getByRole('button',{name:'Tẩy',exact:true});await eraser.focus();await p2.keyboard.press('Enter');assert.equal(await eraser.getAttribute('aria-pressed'),'true');
  await p2.setViewportSize({width:800,height:360});assert.equal(await c.evaluate(c=>c.toDataURL()),before);
  await p2.setViewportSize({width:360,height:800});
});
await run2('ST-02-scale','Mobile rendered ink follows pointer coordinates',async()=>{
  await p2.goto(base+'/studio');await p2.setViewportSize({width:360,height:800});const c=p2.locator('canvas');await c.scrollIntoViewIfNeeded();const b=await c.boundingBox();const x=b.x+b.width*.4,y=b.y+b.height*.25;
  await p2.mouse.click(x,y);const png=await c.screenshot();await writeFile(join(dir,'studio-mobile-canvas.png'),png);
  const metrics=await p2.evaluate(async({png,wantedX,wantedY})=>{const img=new Image();img.src='data:image/png;base64,'+png;await img.decode();const el=document.createElement('canvas');el.width=img.width;el.height=img.height;const cx=el.getContext('2d');cx.drawImage(img,0,0);const d=cx.getImageData(0,0,img.width,img.height).data;let sumX=0,sumY=0,count=0;for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){let i=(y*img.width+x)*4;if(d[i]<100&&d[i+1]<100&&d[i+2]<100){sumX+=x;sumY+=y;count++;}}return {wantedX,wantedY,actualX:sumX/count,actualY:sumY/count,count,width:img.width,height:img.height};},{png:png.toString('base64'),wantedX:b.width*.4,wantedY:b.height*.25});
  await writeFile(join(dir,'mobile-coordinate-metrics.json'),JSON.stringify(metrics,null,2));assert.ok(metrics.count>0,'ink should be visible');assert.ok(Math.abs(metrics.actualY-metrics.wantedY)<5,JSON.stringify(metrics));return metrics;
});
await run2('ST-02-touch-emulation','Emulated touch draws and does not scroll canvas',async()=>{
  const mobile=await browser.newContext({viewport:{width:360,height:800},hasTouch:true,isMobile:true});await mobile.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const p=await mobile.newPage();await p.goto(base+'/studio');const c=p.locator('canvas');await c.scrollIntoViewIfNeeded();const b=await c.boundingBox();const before=await c.evaluate(c=>c.toDataURL());const scroll=await p.evaluate(()=>scrollY);const cdp=await mobile.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width*.3,y:b.y+b.height*.4}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width*.6,y:b.y+b.height*.4}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.notEqual(await c.evaluate(c=>c.toDataURL()),before);assert.equal(await p.evaluate(()=>scrollY),scroll);await p.screenshot({path:join(dir,'studio-touch-emulation.png'),fullPage:true});await mobile.close();return {device:'Chromium CDP touch emulation; not a physical device'};
});
await run2('ST-11','Studio interactions do not send write requests',async()=>{assert.deepEqual(writes,[]);return {writes:[...writes],external:[...external]};});
await p2.setViewportSize({width:1280,height:900});
await run2('GH-01','Anonymous direct URL, reload and guest CTAs',async()=>{
  await p2.goto(base+'/');await p2.reload();await p2.getByRole('heading',{level:1}).waitFor();for(const href of ['/register','/courses','/studio','/community'])assert.ok(await p2.locator(`main a[href="${href}"]`).count()>0,href);
});
await run2('GH-03-fixture','Frontend filters draft/hidden courses from fixture response',async()=>{
  fixtureMode='success';await p2.goto(base+'/courses');await p2.getByRole('heading',{name:'Public fixture',exact:true}).waitFor();assert.equal(await p2.getByText('Draft fixture',{exact:true}).count(),0);assert.equal(await p2.getByText('Hidden fixture',{exact:true}).count(),0);return {scope:'UI fixture only; does not prove backend filtering or real API'};
});
await run2('GH-04-fixture','Catalog loading, empty, error, retry with intercepted local responses',async()=>{
  fixtureMode='slow';await p2.goto(base+'/courses');await p2.getByText('Đang tải khóa học...', {exact:true}).waitFor();await p2.getByRole('heading',{name:'Public fixture',exact:true}).waitFor();
  fixtureMode='empty';await p2.reload();await p2.getByText('Chưa có khóa học nào được đăng.',{exact:true}).waitFor();
  fixtureMode='error';await p2.reload();await p2.getByRole('alert').waitFor();assert.equal(await p2.getByText('Chưa có khóa học nào được đăng.',{exact:true}).count(),0);
  fixtureMode='success';await p2.getByRole('button',{name:'Thử lại',exact:true}).click();await p2.getByRole('heading',{name:'Public fixture',exact:true}).waitFor();return {scope:'Local API fixtures; no real API acceptance'};
});
await run2('GH-05-local','Anonymous guest DOM and network have no private account data',async()=>{
  await p2.goto(base+'/');const text=await p2.locator('body').innerText();assert.ok(!text.includes('fixture-teacher'));assert.equal(await p2.locator('.header-user-chip').count(),0);return {scope:'Local anonymous unconfigured Auth; not real authenticated isolation'};
});
await run2('GH-06','Guest and catalog layout at 360px',async()=>{
  await p2.setViewportSize({width:360,height:800});for(const path of ['/','/courses']){await p2.goto(base+path);await p2.waitForSelector('main');assert.equal(await p2.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,path);await p2.screenshot({path:join(dir,path==='/'?'guest-360.png':'catalog-360.png'),fullPage:true});}
});
await run2('GH-07','Guest links open Studio and Community',async()=>{
  await p2.goto(base+'/');await p2.locator('main a[href="/studio"]').click();await p2.locator('canvas').waitFor();await p2.goto(base+'/');await p2.locator('main a[href="/community"]').click();await p2.locator('.community-demo').waitFor();
});
await run2('CM-01','Feed/detail direct route and demo label',async()=>{
  await p2.goto(base+'/community');await p2.locator('.community-demo').waitFor();await p2.locator('.community-post h2 a').first().click();await p2.locator('.community-comments').waitFor();assert.ok(await p2.locator('.community-demo').innerText());await p2.reload();await p2.locator('.community-comments').waitFor();
});
await run2('CM-02','Like/unlike and reload reset',async()=>{
  await p2.goto(base+'/community');const like=p2.locator('.community-actions button').first();const before=await like.innerText();await like.click();assert.equal(await like.getAttribute('aria-pressed'),'true');assert.notEqual(await like.innerText(),before);await like.click();assert.equal(await like.innerText(),before);await like.click();await p2.reload();assert.equal(await like.innerText(),before);assert.equal(await like.getAttribute('aria-pressed'),'false');
});
await run2('CM-03','Blank comment refused; valid comment resets on reload',async()=>{
  await p2.goto(base+'/community/net-but');const input=p2.locator('#demo-comment');await input.fill('   ');await p2.getByRole('button',{name:'Thêm bình luận demo',exact:true}).click();await p2.getByText('Nhập nội dung bình luận trước khi gửi.',{exact:true}).waitFor();
  await input.fill('LOCAL_ACCEPTANCE_COMMENT');await p2.getByRole('button',{name:'Thêm bình luận demo',exact:true}).click();await p2.getByText('LOCAL_ACCEPTANCE_COMMENT',{exact:true}).waitFor();await p2.reload();assert.equal(await p2.getByText('LOCAL_ACCEPTANCE_COMMENT',{exact:true}).count(),0);
});
await run2('CM-04','Unknown post shows fallback and return link',async()=>{
  await p2.goto(base+'/community/no-such-post');await p2.getByRole('heading',{name:'Không tìm thấy bài viết',exact:true}).waitFor();await p2.getByRole('link',{name:'Quay lại cộng đồng',exact:true}).click();await p2.locator('.community-post').first().waitFor();
});
await run2('CM-05-success','Clipboard API copies exact post link',async()=>{
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:base});await p2.goto(base+'/community/net-but');await p2.getByRole('button',{name:'Sao chép liên kết',exact:true}).click();await p2.getByText('Đã sao chép liên kết demo.',{exact:true}).waitFor();assert.equal(await p2.evaluate(()=>navigator.clipboard.readText()),base+'/community/net-but');
});
await run2('CM-05-rejected','Clipboard rejection gives feedback (simulated denial)',async()=>{
  await p2.evaluate(()=>{navigator.clipboard.writeText=()=>Promise.reject(new DOMException('denied','NotAllowedError'));});await p2.getByRole('button',{name:'Sao chép liên kết',exact:true}).click();await p2.getByText('Không thể sao chép liên kết trên thiết bị này.',{exact:true}).waitFor();return {scope:'Injected rejected Clipboard Promise; not OS permission dialog'};
});
await run2('CM-06','Community interactions send no write requests',async()=>{assert.deepEqual(writes,[]);return {writes:[...writes],external:[...external]};});
await run2('CM-07','Community 360px layout and sensitive information warning',async()=>{
  await p2.setViewportSize({width:360,height:800});for(const path of ['/community','/community/net-but']){await p2.goto(base+path);await p2.locator('.community-demo').waitFor();assert.ok((await p2.locator('.community-demo').innerText()).includes('Không nhập thông tin cá nhân'));assert.equal(await p2.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p2.screenshot({path:join(dir,path.endsWith('net-but')?'community-detail-360.png':'community-feed-360.png'),fullPage:true});}
});
blocked('ST-02-physical','Physical touch device and rotation','No physical device available; CDP emulation recorded separately.');
blocked('GH-02','Real login/logout and course context across auth','No designated test identity or integrated backend in this local acceptance; did not create accounts or alter shared data.');
blocked('GH-03-real','Real catalog API excludes draft/hidden','Only local fixture endpoints configured; no actual backend/schema/SHA verified.');
blocked('GH-05-real','Real API response/DOM privacy across authenticated roles','Requires designated integrated test environment and identities.');
blocked('CM-08','PO approval of sample content and asset provenance','Requires actual approval by Đăng; source inspection is not approval.');
await context.tracing.stop({path:join(dir,'browser-trace.zip')});
await writeFile(join(dir,'network.json'),JSON.stringify({scope:'Local browser contexts; all external requests blocked; no credentials',writes,external,pageErrors:errors},null,2));
await writeFile(join(dir,'results.json'),JSON.stringify({sha,codeSha:'b8933d1',date:new Date().toISOString(),timezone:'Asia/Bangkok',platform:process.platform,node:process.version,browser:browser.version(),viewport:'1280x900 and 360x800; touch emulated',mode:'Local Vite dev; catalog API fixtures; Auth not configured; not deployed E2E',results},null,2));
await browser.close();
const summary=results.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{});console.log(JSON.stringify(summary));
process.exitCode=results.some(r=>r.status==='FAIL')?1:0;
