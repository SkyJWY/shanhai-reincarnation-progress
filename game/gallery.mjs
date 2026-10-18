import {createArt} from './art.mjs';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');let W,H,scale,camera={x:0,y:0},view='village';
const project=(x,y)=>({x:W*.51+((x-camera.x)-(y-camera.y))*scale,y:H*.54+((x-camera.x)+(y-camera.y))*scale*.52});
const art=createArt(ctx,project,()=>scale);
function resize(){W=innerWidth;H=innerHeight;const d=Math.min(devicePixelRatio||1,2);canvas.width=W*d;canvas.height=H*d;ctx.setTransform(d,0,0,d,0,0);scale=view==='hero'?Math.min(W/5,H/5):(W<H?Math.min(W/11,H/14):Math.min(W/24,H/14));}
window.addEventListener('resize',resize);resize();
const info={village:['青岚渡','桃花照水，旧梦重逢。'],temple:['镇灵古寺','山门无声，石魁守旧约。'],hero:['游侠与灵狐','一柄剑，一盏灯，一场人间游。']};
document.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.view;document.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelector('#title').textContent=info[view][0];document.querySelector('#subtitle').textContent=info[view][1];resize();}));
const run={gender:'female',inventory:[],equipment:{},pet:{bonded:false}};
function frame(now){const time=now/1000,zone=view==='temple'?'dungeon':'overworld';camera=view==='temple'?{x:5,y:5}:view==='hero'?{x:0,y:0}:{x:-2,y:-2};
 art.terrain(W,H,time,zone);const hero=view==='temple'?{x:4,y:6}:{x:0,y:0},pet={x:hero.x+1,y:hero.y-.5};let layers=[...art.props(zone).map(o=>({o,type:'prop'})),{o:hero,type:'hero'},{o:pet,type:'pet'}];
 if(view==='temple')layers.push({o:{x:8,y:5,hp:280,max:280,boss:true},type:'enemy'});
 if(view==='hero')layers=layers.filter(v=>v.type!=='prop');
 layers.sort((a,b)=>a.o.x+a.o.y-b.o.x-b.o.y).forEach(({o,type})=>{if(type==='prop')art.prop(o,time,hero);else if(type==='hero')art.hero(o,run,time,0);else if(type==='pet')art.fox(o,time);else art.monster(o,time)});art.atmosphere(W,H,time);requestAnimationFrame(frame);
}requestAnimationFrame(frame);
