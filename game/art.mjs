// Original lightweight illustrated assets. World geometry stays in the game rules.
const TAU=Math.PI*2;
const noise=(n)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export function createArt(ctx,project,getScale){
 const ellipse=(x,y,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();};
 const poly=(points,color,stroke='#193d35',width=1.4)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.stroke();}};
 const line=(points,color,width=2)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();};
 function local(o,fn,factor=1){const q=project(o.x,o.y),s=getScale()/24*factor;ctx.save();ctx.translate(q.x,q.y);ctx.scale(s,s);fn();ctx.restore();}
 const ground=(x,y,r,color)=>{const q=project(x,y);ellipse(q.x,q.y,r*getScale(),r*getScale()*.52,color);};
 const plants=Array.from({length:330},(_,i)=>({x:noise(i+1)*36-18,y:noise(i+700)*36-18,n:i}));
 const outdoor=[
  {type:'cherry',x:-3.6,y:1.1,size:1.15},{type:'cherry',x:2.8,y:-5,size:.9},
  {type:'pine',x:-6,y:-2,size:1.2},{type:'pine',x:6,y:-6,size:1.25},
  {type:'pine',x:4.5,y:6.6,size:1},{type:'cherry',x:-8,y:5,size:1.1},
  {type:'house',x:-5,y:-5,size:1.35},{type:'bridge',x:.5,y:-4.4,size:1},
  {type:'lantern',x:-1.4,y:2.3,size:.8},{type:'lantern',x:2,y:-1,size:.8},
  {type:'rock',x:3.5,y:2,size:.9},{type:'rock',x:-3,y:-1.4,size:.7},
  ...Array.from({length:22},(_,i)=>({type:i%3===0?'cherry':'pine',x:Math.cos(i*.83)*15,y:Math.sin(i*.83)*15,size:.8+noise(i)*.5}))
 ];
 const temple=[{type:'house',x:2,y:8,size:1.45},{type:'lantern',x:2,y:3,size:1.1},{type:'lantern',x:7,y:1,size:1.1},...Array.from({length:12},(_,i)=>({type:'rock',x:Math.cos(i)*14,y:Math.sin(i)*14,size:2}))];
 function terrain(W,H,time,zone){
  const dusk=zone==='dungeon';ctx.fillStyle=dusk?'#253b46':'#355e48';ctx.fillRect(0,0,W,H);
  const g=ctx.createRadialGradient(W*.52,H*.45,30,W*.5,H*.5,W*.8);g.addColorStop(0,dusk?'#7b7b6d44':'#a0b77a66');g.addColorStop(1,'#0d2f3366');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(const v of plants){const q=project(v.x,v.y);if(q.x<-100||q.x>W+100||q.y<-100||q.y>H+100)continue;
   if(dusk){const r=getScale()*.48;poly([[q.x-r,q.y],[q.x,q.y-r*.45],[q.x+r,q.y],[q.x,q.y+r*.45]],v.n%3?'#53615d':'#636a60','#82917a22',1);}
   else{ground(v.x,v.y,.25+noise(v.n+80)*.55,['#567c5355','#9ca66b33','#28584444'][v.n%3]);const a=getScale()/28;line([[q.x-4*a,q.y],[q.x-6*a,q.y-5*a],[q.x,q.y],[q.x+2*a,q.y-7*a]],'#89a66a66',1.2);if(v.n%7===0){ellipse(q.x,q.y-3,2,2,'#e7cf8baa');ellipse(q.x+4,q.y+1,1.5,1.5,'#d2dfaf99');}}
  }
  if(!dusk){
   const water=[];for(let x=-19;x<=19;x+=.4){const q=project(x,-4.6+Math.sin(x*.4)*.7);water.push([q.x,q.y]);}line(water,'#244c4933',getScale()*2.5);line(water,'#214e50',getScale()*1.95);line(water,'#3b7770',getScale()*1.5);line(water,'#6ca59a55',getScale()*.95);
   for(let i=0;i<34;i++){const x=i-17,y=-4.6+Math.sin(x*.4)*.7;const q=project(x,y);line([[q.x-10,q.y+Math.sin(time+i)*2],[q.x+8,q.y-4+Math.sin(time+i)*2]],'#badad155',1);}
  }
  // Worn stepping stones connect the three adventure landmarks.
  for(let i=-14;i<=19;i++){const x=i*.48,y=Math.sin(x*.48)*.6+x*.3;const q=project(x,y),r=getScale()*(.17+noise(i+100)*.05);ellipse(q.x,q.y+2,r*1.15,r*.6,'#163a3333');poly([[q.x-r,q.y],[q.x-r*.2,q.y-r*.4],[q.x+r,q.y-r*.08],[q.x+r*.6,q.y+r*.4],[q.x-r*.5,q.y+r*.42]],dusk?'#919486':'#b9b493','#546b5055',1);}
  ground(0,0,1.7,dusk?'#9ea68d22':'#cfca9b22');
 }
 function roof(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);poly([[-38,2],[0,-17],[38,2],[25,8],[0,-4],[-25,8]],'#273f45');poly([[-42,0],[-24,-5],[0,-23],[24,-5],[42,0],[27,5],[0,-9],[-27,5]],'#4d7973');line([[-40,0],[-24,1],[0,-14],[24,1],[40,0]],'#9bb198',2);for(let i=-25;i<30;i+=8)line([[i,-1],[i*.7,-10]],'#244d4b88',1);ctx.restore();}
 function prop(o,time,player){local(o,()=>{
   ellipse(0,1,28,10,'#102e3344');
   if(o.type==='pine'||o.type==='cherry'){
    const pink=o.type==='cherry';poly([[-7,0],[-4,-48],[4,-67],[7,-4],[13,3]],'#776c4f');line([[0,-5],[2,-38],[-15,-60]],'#a48c65',3);
    const sway=Math.sin(time*.7+o.x)*1.2;
    ctx.translate(sway,0);if(Math.hypot(o.x-player.x,o.y-player.y)<2)ctx.globalAlpha=.65;
    const colors=pink?['#8d6579','#bd7e8c','#e5a2a4','#f5c3b2']:['#214f45','#33745b','#559565','#8bad72'];
    for(let i=0;i<4;i++){ellipse((i%2?1:-1)*(12-i*2),-42-i*11,29-i*3,15-i,colors[i]);ellipse(12-i*3,-45-i*10,20-i*2,12-i,colors[i]);}
    if(pink)for(let i=0;i<14;i++)ellipse((noise(i+o.x)*2-1)*24,-40-noise(i+30)*40,2,1.5,'#ffe3c9');
   }else if(o.type==='house'){
    poly([[-27,0],[-27,-37],[4,-49],[29,-36],[29,-2],[2,10]],'#c6bd98');poly([[2,10],[2,-36],[29,-36],[29,-2]],'#918f78');poly([[-11,-1],[-11,-26],[1,-30],[1,5]],'#384e47');line([[-22,-5],[-22,-37]],'#8e574a',4);line([[23,-1],[23,-35]],'#8e574a',4);roof(0,-38,1);roof(0,-62,.67);poly([[-2,-80],[0,-91],[2,-80]],'#d6bd78');
    for(const x of [-18,19]){ellipse(x,-27,5,7,'#ce7751');ellipse(x,-28,2,5,'#f1ca7d');line([[x,-20],[x,-14]],'#d1ad68',1);}
   }else if(o.type==='bridge'){
    for(let i=0;i<8;i++){const y=-16+i*5;poly([[-25,y],[0,y-11],[25,y],[0,y+11]],i%2?'#b39868':'#c4a778','#775f47',.8);}for(const x of [-24,24]){line([[x,16],[x,-30]],'#6f5541',3);line([[x,-28],[x+(x<0?9:-9),-36]],'#c4a578',3);}
   }else if(o.type==='lantern'){
    poly([[-12,0],[0,-6],[12,0],[0,6]],'#8d9f87');poly([[-4,0],[-4,-30],[4,-30],[4,0]],'#899781');poly([[-10,-29],[-10,-46],[10,-46],[10,-29]],'#677d6d');ctx.shadowColor='#ffce83';ctx.shadowBlur=12;poly([[-5,-32],[-5,-42],[5,-42],[5,-32]],'#f9d78e',null);ctx.shadowBlur=0;roof(0,-47,.4);
   }else{poly([[-22,2],[-24,-10],[-12,-25],[8,-29],[24,-9],[18,7]],'#7f9183');poly([[-12,-25],[8,-29],[24,-9],[1,-15]],'#a8b29a',null);ellipse(-8,-8,12,4,'#668862');}
  },o.size||1);}
 function hero(o,run,time,attackCd){local(o,()=>{
   ellipse(0,1,14,6,'#102c3b66');const bob=Math.sin(time*3)*.6;ctx.translate(0,bob);
   const coat=run?.inventory.find(g=>g.id===run.equipment.coat);const weapon=run?.inventory.find(g=>g.id===run.equipment.weapon);const color=coat?.power?coat.color:'#5c9c9a';
   poly([[-8,-10],[-9,0],[-2,1],[-1,-12]],'#293b3e');poly([[3,-12],[3,1],[10,0],[9,-12]],'#293b3e');
   poly([[-10,-29],[-17,-11],[-8,-6],[0,-10],[9,-6],[16,-12],[9,-30]],color);poly([[-5,-30],[-7,-13],[2,-10],[6,-28]],'#e4dbbd');line([[-9,-15],[9,-15]],'#dcb97b',3);poly([[-4,-16],[-6,-1],[1,-4],[2,-16]],'#b6534d',null);
   ellipse(-13,-21,5,5,'#ebc4a0');ellipse(13,-23,5,5,'#ebc4a0');
   ellipse(0,-37,11,12,'#253c3b');ellipse(1,-35,9,9,'#f0caa3');ellipse(-3,-36,1,1.4,'#253c3b');ellipse(5,-36,1,1.4,'#253c3b');line([[0,-30],[3,-30]],'#ac745a',.8);poly([[-11,-38],[-8,-46],[2,-49],[10,-42],[10,-38],[0,-43],[-3,-37]],'#253c3b');
   if(run?.gender==='female'){line([[-8,-40],[-13,-27],[-10,-15]],'#273f3c',4);ellipse(7,-45,3,2,'#d18681');}else{ellipse(0,-50,5,4,'#273f3c');line([[-5,-47],[5,-47]],'#d1ab67',2);}
   const a=attackCd>.2?-.5:0;ctx.save();ctx.translate(16,-23);ctx.rotate(a);poly([[-2,9],[-2,-26],[1,-34],[4,-26],[3,9]],weapon?.power?weapon.color:'#e0ece0');line([[1,-27],[1,7]],'#fff8d5',1);line([[-6,5],[7,5]],'#d6b46e',3);line([[1,7],[1,15]],'#926249',3);ctx.restore();
   line([[-12,-29],[-21,-24],[-24,-12]],'#b3c9b4',2);
  });}
 function monster(o,time){local(o,()=>{
   ellipse(0,0,16,7,'#102c3b66');const bob=Math.sin(time*3+o.x)*1.5;ctx.translate(0,bob);
   if(o.boss){
    poly([[-16,-12],[-18,1],[-5,3],[-3,-13]],'#46555b');poly([[5,-13],[6,3],[19,1],[16,-13]],'#46555b');poly([[-16,-44],[-23,-16],[0,-8],[23,-16],[16,-44]],'#6a7880');poly([[-13,-40],[0,-46],[14,-40],[11,-22],[-12,-22]],'#9eaa9b');poly([[-10,-58],[10,-58],[14,-44],[0,-35],[-14,-44]],'#8a9995');poly([[-11,-51],[0,-54],[11,-51],[8,-45],[-8,-45]],'#273d43');ellipse(-5,-48,2,1.5,'#f1c778');ellipse(5,-48,2,1.5,'#f1c778');line([[-17,-35],[-29,-21],[-28,-9]],'#647579',9);line([[17,-35],[28,-21],[28,-9]],'#647579',9);poly([[-4,-34],[0,-39],[5,-33],[0,-26]],'#dfaa6d');
   }else{
    const spirit=o.name==='游魂';poly([[-11,-29],[-15,-8],[-8,-3],[0,-8],[9,-3],[15,-9],[10,-30]],spirit?'#92b9ae':'#7e8b61');ellipse(0,-33,11,11,spirit?'#c4d9bc':'#c2b385');poly([[-10,-36],[-12,-48],[-3,-40],[4,-42],[11,-48],[10,-34]],'#405b4c');ellipse(-4,-33,2,2,'#d8a064');ellipse(4,-33,2,2,'#d8a064');line([[-5,-27],[5,-27]],'#405b4c',2);line([[-11,-23],[-19,-17]],'#778d6a',5);line([[11,-23],[18,-14]],'#778d6a',5);if(!spirit)line([[18,-7],[20,-35]],'#775a42',3);
   }
   ctx.fillStyle='#102c32';ctx.fillRect(-16,-66,32,4);ctx.fillStyle=o.boss?'#edac71':'#d99b87';ctx.fillRect(-15,-65,30*Math.max(0,o.hp)/o.max,2);
  },o.boss?1.65:1);}
 function fox(o,time){local(o,()=>{ellipse(0,0,12,4,'#122e3544');ctx.save();ctx.rotate(Math.sin(time*3)*.08);poly([[-7,-3],[-21,-9],[-19,-20],[-12,-16],[-3,-9]],'#d4dfc8');ctx.restore();ellipse(0,-6,10,7,'#e6e9d3');poly([[2,-10],[2,-24],[9,-17],[14,-23],[15,-10]],'#e8e9d4');ellipse(10,-10,6,5,'#f3efdc');ellipse(8,-12,1,1,'#354a46');ellipse(13,-12,1,1,'#354a46');ellipse(11,-8,1,1,'#354a46');line([[2,-6],[15,-6]],'#d67762',2);},.8);}
 function landmark(mark,run,time){if(mark.id==='fox'){if(!run.pet.bonded)fox(mark,time);return;}if(mark.id==='camp'){prop({type:'lantern',x:mark.x-1.5,y:mark.y-.5,size:1.15},time,{x:99,y:99});return;}local(mark,()=>{
   ellipse(0,0,40,11,'#12343b44');for(const x of[-26,26]){poly([[x-5,0],[x-5,-58],[x+5,-58],[x+5,0]],'#a35f4e');poly([[x-9,0],[x,5],[x+9,0],[x,-4]],'#829684');}line([[-28,-43],[28,-43]],'#ba8b62',5);roof(0,-61,1.15);poly([[-12,-58],[-12,-45],[12,-45],[12,-58]],'#304e47');ctx.fillStyle='#e1c58d';ctx.font='9px serif';ctx.textAlign='center';ctx.fillText(mark.id==='exit'?'归':'古 寺',0,-48);ctx.textAlign='start';
  },.95);}
 function atmosphere(W,H,time){
  for(let i=0;i<16;i++){const x=(noise(i+50)*W+time*(i%2?4:-3)+W*10)%W,y=(noise(i+77)*H+Math.sin(time*.5+i)*12);ctx.globalAlpha=.15+Math.sin(time+i)*.1;ellipse(x,y,2,1.1,'#f4d5aa');}ctx.globalAlpha=1;
  const g=ctx.createRadialGradient(W*.5,H*.45,H*.15,W*.5,H*.5,W*.72);g.addColorStop(0,'#102e3300');g.addColorStop(1,'#102e3388');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 }
 function spell(f){
  const s=f.s;if(!s)return;const q=project(f.origin.x,f.origin.y),d=Math.hypot(f.point.x-f.origin.x,f.point.y-f.origin.y)||1;
  if(s.type==='line'){const t=project(f.origin.x+(f.point.x-f.origin.x)/d*s.range,f.origin.y+(f.point.y-f.origin.y)/d*s.range);ctx.save();ctx.globalAlpha=f.life/f.max;ctx.shadowBlur=14;ctx.shadowColor=s.color;line([[q.x,q.y-12],[t.x,t.y-12]],s.color,5);line([[q.x,q.y-12],[t.x,t.y-12]],'#f4ffde',1.5);ctx.restore();}
  if(s.type==='circle'&&f.life<.2){const k=Math.min(1,s.range/d),t=project(f.origin.x+(f.point.x-f.origin.x)*k,f.origin.y+(f.point.y-f.origin.y)*k);ctx.save();ctx.shadowColor=s.color;ctx.shadowBlur=20;line([[t.x-9,t.y-135],[t.x+5,t.y-95],[t.x-8,t.y-60],[t.x+3,t.y-24],[t.x,t.y]],'#e3eaff',3);ctx.restore();}
 }
 return {terrain,prop,hero,monster,fox,landmark,atmosphere,spell,props:zone=>zone==='dungeon'?temple:outdoor};
}
export function skillIcon(index){
 const paths=['M10 36L36 10M26 10h10v10M10 28l10 10M8 39l4-4','M9 32Q24 5 39 32M13 34l11-19 11 19M18 35h12','M28 7L12 27h12l-4 14 16-23H25z','M12 12l9 8-5 10 16 3 5 6H13l-4-8 5-10','M26 6L10 27h12l-3 15 19-25H26M7 13h7M34 36h7','M24 37C4 32 8 15 24 24C40 15 44 32 24 37M24 31C12 21 17 9 24 6C31 9 36 21 24 31'];
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="${paths[index]||paths[0]}" fill="none" stroke="#f4dfad" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
 return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
