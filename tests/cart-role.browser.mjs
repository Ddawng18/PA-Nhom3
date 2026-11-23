// Role-aware cart regression. No live accounts or business-data writes.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port)],{cwd:fileURLToPath(new URL('../',import.meta.url)),windowsHide:true,stdio:'ignore',env:{...process.env,VITE_API_URL:origin}});
let browser;
try{
for(let i=0;i<60;i++){try{if((await fetch(origin)).ok)break;}catch{ /* Vite is starting. */ }await new Promise(r=>setTimeout(r,250));}
browser=await chromium.launch({headless:true});
for(const role of ['teacher','student','admin']){
 const page=await browser.newPage();let calls=0;
 page.on('pageerror',e=>console.log('PAGEERROR',role,e.message));
 page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',role,m.text());});
 await page.addInitScript(()=>localStorage.setItem('linea-cart-guest-v1','[11]'));
 await page.route(/\/src\/auth\/useAuth\.ts(?:\?|$)/,r=>r.fulfill({contentType:'application/javascript',body:`export function useAuth(){return {user:{id:'${role}-1',email:'${role}@example.test',user_metadata:{}},session:{access_token:'fixture'},loading:false}}`}));
 await page.route(/\/src\/hooks\/useUserRole\.ts(?:\?|$)/,async r=>{
 const original=await r.fetch();const source=await original.text();const react=source.match(/from\s+["']([^"']*react[^"']*)["']/)?.[1];assert.ok(react,'Vite React import must be available');
 await r.fulfill({contentType:'application/javascript',body:`import React from '${react}';const {useState,useEffect}=React;export function useUserRole(){const [loading,setLoading]=useState(!window.__cartRoleReady);useEffect(()=>{const ready=()=>setLoading(false);window.addEventListener('qa:role-ready',ready);return()=>window.removeEventListener('qa:role-ready',ready)},[]);return {role:loading?null:'${role}',loading,error:null}}`});
 });
 await page.route(/\/src\/lib\/supabase\.ts(?:\?|$)/,r=>r.fulfill({contentType:'application/javascript',body:'export const supabase=null;export const isSupabaseConfigured=false;export const getGoogleProviderStatus=async()=>false;'}));
 await page.route('**/api/**',async r=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/api/cart')){calls++;return r.fulfill({json:{items:[{courseId:11,title:'Khóa thử',priceVnd:0,level:'CO_BAN',coverImage:null,available:true,enrolled:false,reason:null}],totalVnd:0,paidCount:0,freeCount:1,blockedCount:0}});}if(u.pathname==='/api/catalog/courses')return r.fulfill({json:{items:[{ma_khoa_hoc:11,tieu_de:'Khóa học kiểm tra vai trò',mo_ta:'Fixture',cap_do:'CO_BAN',chu_de:'Vẽ',anh_dai_dien:null,ma_giao_vien:'teacher-2',ten_giao_vien:'GV',gia_vnd:0,so_chuong:1,so_bai_hoc:1,so_hoc_vien:0,ngay_tao:'2026-11-23'}],page:1,pageSize:12,totalCount:1,chu_de:[]}});return r.fulfill({json:[]});});
 await page.goto(origin+'/courses',{waitUntil:'domcontentloaded'});
 await page.locator('.cat-card').first().waitFor({timeout:10000}).catch(async e=>{console.log('BODY',await page.locator('body').innerText());throw e;});assert.equal(calls,0,`${role}: must not request cart before verified role is available`);
 await page.evaluate(()=>{window.__cartRoleReady=true;window.dispatchEvent(new window.Event('qa:role-ready'));});
 if(role!=='teacher')await page.waitForFunction(()=>localStorage.getItem('linea-cart-guest-v1')===null);
 await page.waitForTimeout(200);await page.evaluate(()=>window.dispatchEvent(new window.Event('focus')));await page.waitForTimeout(200);
 if(role==='teacher'){assert.equal(calls,0,'teacher must not load or merge cart, including on focus');assert.equal(await page.getByRole('button',{name:'Thêm vào giỏ',exact:true}).count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('linea-cart-guest-v1')),'[11]','teacher login must preserve the guest cart');}
 else{assert.ok(calls>0,`${role} should sync cart after role loads`);assert.equal(await page.evaluate(()=>localStorage.getItem('linea-cart-guest-v1')),null);}
 console.log(`PASS ${role}: wait for role, cart access and guest-cart preservation`);await page.close();
}
}finally{await browser?.close();if(process.platform==='win32')await new Promise(resolve=>spawn('taskkill',['/PID',String(server.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'}).on('close',resolve));else server.kill();}
