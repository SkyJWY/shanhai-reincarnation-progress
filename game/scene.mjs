import * as THREE from './vendor/three.module.js';
import {createCharacter} from './character.mjs';
// All scenery below is actual geometry: no painted backdrop or image replacement.
const $=id=>document.getElementById(id), scene=new THREE.Scene();
let renderer;
try {renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){$('loading').hidden=true;$('error').hidden=false;$('error').textContent='当前浏览器无法创建 WebGL 三维画面。请使用支持 WebGL 的浏览器打开；这里不会用平面图冒充三维效果。';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
$('viewport').appendChild(renderer.domElement);
scene.background=new THREE.Color('#cfddd3');scene.fog=new THREE.FogExp2('#cfddd3',.018);
const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.1,180);
const ambient=new THREE.HemisphereLight('#ecf0d7','#617a65',1.5);scene.add(ambient);
const sun=new THREE.DirectionalLight('#fff0ce',2.8);sun.position.set(-10,20,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:1,far:70});sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;sun.shadow.radius=3;scene.add(sun);
const fill=new THREE.DirectionalLight('#91ccd5',.7);fill.position.set(12,9,-10);scene.add(fill);
// A generated sky-light probe illuminates metals and the water; it is not scene art.
const probeCanvas=document.createElement('canvas');probeCanvas.width=512;probeCanvas.height=256;const probeCtx=probeCanvas.getContext('2d');
const skyGradient=probeCtx.createLinearGradient(0,0,0,256);skyGradient.addColorStop(0,'#a7cbdc');skyGradient.addColorStop(.48,'#f4e8cf');skyGradient.addColorStop(.54,'#abb99c');skyGradient.addColorStop(1,'#4e6857');probeCtx.fillStyle=skyGradient;probeCtx.fillRect(0,0,512,256);
const skyTexture=new THREE.CanvasTexture(probeCanvas);skyTexture.mapping=THREE.EquirectangularReflectionMapping;skyTexture.colorSpace=THREE.SRGBColorSpace;const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(skyTexture).texture;scene.environmentIntensity=.5;skyTexture.dispose();pmrem.dispose();
const world=new THREE.Group();scene.add(world);
const unitBox=new THREE.BoxGeometry(1,1,1),unitSphere=new THREE.SphereGeometry(1,10,8),unitRock=new THREE.IcosahedronGeometry(1,1),unitCylinder=new THREE.CylinderGeometry(1,1,1,10),unitCone=new THREE.ConeGeometry(1,1,9);
const materials=new Map();
function mat(color,roughness=.8,metalness=0){const key=[color,roughness,metalness].join();if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));return materials.get(key);}
const C={grass:'#7b9765',darkGrass:'#4e755c',stone:'#a2ab93',wood:'#684d3a',red:'#ad5e49',ivory:'#e4d8b4',roof:'#396c65',gold:'#b49a5d',skin:'#ebbe96',ink:'#243b39'};
function mesh(g,m,p=[0,0,0],s=[1,1,1],parent=world){const o=new THREE.Mesh(g,typeof m==='string'?mat(m):m);o.position.set(...p);o.scale.set(...s);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
const box=(p,s,c,parent)=>mesh(unitBox,c,p,s,parent);
const ball=(p,s,c,parent)=>mesh(unitSphere,c,p,s,parent);
const cyl=(p,r,h,c,parent)=>mesh(unitCylinder,c,p,[r,h,r],parent);
const cone=(p,r,h,c,parent)=>mesh(unitCone,c,p,[r,h,r],parent);
function rod(a,b,r,c,parent=world){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const o=cyl(av.clone().add(bv).multiplyScalar(.5).toArray(),r,d.length(),c,parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
let seed=4281;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const range=(a,b)=>a+(b-a)*random();
// An elevated, irregular river terrace, including its exposed three-dimensional bank.
const outline=new THREE.Shape();for(let i=0;i<64;i++){const a=i/64*Math.PI*2,r=11.5+Math.sin(a*5)*.45;const x=Math.cos(a)*r,z=Math.sin(a)*r*.84;i?outline.lineTo(x,z):outline.moveTo(x,z);}outline.closePath();
const bank=mesh(new THREE.ExtrudeGeometry(outline,{depth:1.45,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.2,bevelThickness:.15}),mat('#6d806a'),[0,-1.65,0]);bank.rotation.x=-Math.PI/2;
const ground=mesh(new THREE.ShapeGeometry(outline,48),mat(C.grass),[0,.04,0]);ground.rotation.x=-Math.PI/2;
box([0,-2,0],[150,.15,150],mat('#829e87'));
for(let i=0;i<80;i++){const a=i/80*Math.PI*2,r=11.35;mesh(unitRock,mat(i%2?'#728773':'#8b9a7b'),[Math.cos(a)*r,-.55,Math.sin(a)*r*.84],[range(.3,.7),range(.35,.8),range(.3,.6)]);}
// Hills are meshes at genuinely different distances; fog gives atmospheric depth.
for(let i=0;i<34;i++){const a=range(Math.PI,Math.PI*2),r=range(42,78),x=Math.cos(a)*r,z=Math.sin(a)*r-7;const height=range(9,18);const o=mesh(unitCone,mat(['#789d91','#8eaca0','#9bb6a6'][i%3]),[x,height/2-1.9,z],[range(7,13),height,range(6,10)]);o.rotation.y=range(0,6);o.castShadow=false;}
function bush(x,z,r=1,color='#507d58',y=0){const o=mesh(unitRock,mat(color),[x,y+r*.32,z],[r,r*.55,r*.8]);o.rotation.y=random()*6;return o;}
// A continuous hip roof, with swept eaves and individual cylindrical tile courses.
function roofGeometry(){const p=[],uv=[],indices=[];const steps=8,columns=12;
 for(let side=0;side<4;side++){const base=p.length/3;for(let v=0;v<=steps;v++){const t=v/steps,r=.07+.93*t;for(let u=0;u<=columns;u++){const s=u/columns*2-1;let x=s*r,z=r;const y=Math.pow(1-t,1.6)+Math.pow(Math.abs(s),4)*Math.pow(t,6)*.13;const a=side*Math.PI/2;p.push(x*Math.cos(a)-z*Math.sin(a),y,x*Math.sin(a)+z*Math.cos(a));uv.push(u/columns,t);}}for(let v=0;v<steps;v++)for(let u=0;u<columns;u++){const a=base+v*(columns+1)+u,b=a+columns+1;indices.push(a,b,a+1,b,b+1,a+1);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;}
const roofGeo=roofGeometry(),roofMat=mat(C.roof);roofMat.side=THREE.DoubleSide;
function roof(x,y,z,w,d,h){mesh(roofGeo,roofMat,[x,y,z],[w,h,d]);
 const point=(side,s,t)=>{const r=.07+.93*t,a=side*Math.PI/2,xx=s*r*w,zz=r*d;return[x+xx*Math.cos(a)-zz*Math.sin(a),y+(Math.pow(1-t,1.6)+Math.pow(Math.abs(s),4)*Math.pow(t,6)*.13)*h,z+xx*Math.sin(a)+zz*Math.cos(a)];};
 // Square roofs use the same geometry proportions on every side.
 for(let side=0;side<4;side++){for(let n=-10;n<=10;n++){const s=n/10;for(let k=0;k<5;k++)rod(point(side,s,k/5),point(side,s,(k+1)/5),.021,mat('#527d6c'));}for(let k=0;k<10;k++)rod(point(side,-1+k*.2,1),point(side,-1+(k+1)*.2,1),.045,C.gold);rod(point(side,1,0),point(side,1,1),.048,mat('#6b9275'));}
 ball([x,y+h+.03,z],[.12,.13,.12],C.gold);
}
function lattice(x,y,z,w,h,parent=world){box([x,y,z],[w,.07,.08],C.wood,parent);box([x,y+h,z],[w,.07,.08],C.wood,parent);for(let i=0;i<5;i++)box([x-w/2+w*i/4,y+h/2,z],[.045,h,.045],C.wood,parent);for(let j=1;j<3;j++)box([x,y+h*j/3,z],[w,.035,.05],C.wood,parent);}
const lanternGlass=new THREE.MeshStandardMaterial({color:'#f2c67e',emissive:'#ffad42',emissiveIntensity:.6,roughness:.5});
const lampLights=[];
function lantern(x,y,z,size=1,light=false){cyl([x,y,z],.18*size,.43*size,lanternGlass);cyl([x,y+.24*size,z],.2*size,.055*size,C.gold);cyl([x,y-.24*size,z],.2*size,.055*size,C.gold);for(let i=0;i<6;i++){const a=i*Math.PI/3;rod([x+Math.cos(a)*.18*size,y-.2*size,z+Math.sin(a)*.18*size],[x+Math.cos(a)*.18*size,y+.2*size,z+Math.sin(a)*.18*size],.012*size,C.red);}rod([x,y-.27*size,z],[x,y-.49*size,z],.015*size,C.red);if(light){const l=new THREE.PointLight('#ffbb68',.8,4,2);l.position.set(x,y,z);scene.add(l);lampLights.push(l);}}
function floor(x,z,y,w,h){box([x,y+.1,z],[w+.35,.2,w+.35],C.wood);box([x,y+h*.48,z],[w-.22,h*.85,w-.22],C.ivory);for(const dx of [-1,1])for(const dz of [-1,1]){cyl([x+dx*(w/2-.14),y+h/2,z+dz*(w/2-.14)],.11,h,C.red);box([x+dx*(w/2-.14),y+h-.15,z],[.13,.22,w],C.red);}box([x,y+h-.15,z+w/2],[w,.2,.15],C.red);
 for(let j=-1;j<=1;j++){box([x+j*w*.28,y+h*.55,z+w*.5],[w*.2,h*.45,.055],mat('#52665a'));lattice(x+j*w*.28,y+h*.35,z+w*.5+.035,w*.2,h*.4);}
 for(let j=-1;j<=1;j++){const frame=new THREE.Group();world.add(frame);frame.position.set(x-w*.5-.04,y+h*.35,z+j*w*.28);frame.rotation.y=-Math.PI/2;lattice(0,0,0,w*.2,h*.4,frame);}
}
// Three-storey pavilion: open eaves, structural posts, window lattices and finial.
const tx=.5,tz=-4;
box([tx,.16,tz],[6.1,.32,6.1],C.stone);box([tx,.36,tz],[5.7,.2,5.7],mat('#bdc0a1'));
for(let i=0;i<5;i++)box([tx,.1+i*.075,tz+4-i*.24],[2.15,.15+i*.15,.5],mat('#b7b89a'));
floor(tx,tz,.48,4.6,2.5);roof(tx,2.95,tz,3.2,3.2,1.38);
floor(tx,tz,4.05,3.1,1.65);roof(tx,5.63,tz,2.43,2.43,1.1);
floor(tx,tz,6.5,1.9,1.05);roof(tx,7.5,tz,1.72,1.72,.85);
rod([tx,8.3,tz],[tx,9.03,tz],.045,C.gold);ball([tx,8.6,tz],[.13,.16,.13],C.gold);cone([tx,8.98,tz],.12,.27,C.gold);
box([tx,1.39,tz+2.34],[1.25,1.82,.08],C.wood);box([tx,1.39,tz+2.4],[1.09,1.7,.06],mat('#3f5147'));
for(let i=-2;i<=2;i++)box([tx+i*.2,1.39,tz+2.44],[.025,1.7,.025],C.wood);for(const x of [-.12,.12])ball([tx+x,1.4,tz+2.48],[.025,.045,.025],C.gold);
box([tx,2.46,tz+2.38],[1.1,.39,.07],C.ink);for(let i=0;i<3;i++)box([tx+(i-1)*.22,2.46,tz+2.43],[.08,.18,.035],C.gold);
for(const x of [-1.35,2.35])lantern(x,2.2,tz+2.5,1,true);
for(const x of [-.6,1.6])lantern(x,5.12,tz+1.68,.7);
// Side pavilion and a welcoming timber gate.
box([6,.2,-1.5],[3.3,.4,3.3],C.stone);for(const x of [4.8,7.2])for(const z of [-2.7,-.3])cyl([x,1.55,z],.095,2.7,C.red);roof(6,2.9,-1.5,2.1,2.1,1.02);box([6,.6,-1.5],[2.1,.18,.65],C.wood);lantern(6,2,-.2,.9,true);
for(const x of [2.7,5.1]){cyl([x,1.45,4.5],.13,2.9,C.red);box([x,.2,4.5],[.48,.4,.48],C.stone);}box([3.9,2.55,4.5],[2.9,.22,.3],C.red);roof(3.9,2.92,4.5,1.8,1.8,.6);
// Reflective pond, shallow ripples, lotus leaves and koi.
const waterMat=new THREE.MeshPhysicalMaterial({color:'#5caaa0',roughness:.22,metalness:.32,transparent:true,opacity:.89,clearcoat:1,clearcoatRoughness:.15,side:THREE.DoubleSide});
const waterUniform={value:0};waterMat.onBeforeCompile=s=>{s.uniforms.time=waterUniform;s.vertexShader='uniform float time;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.z += sin(position.x*18.0+time*.7)*.012+cos(position.y*22.0+time*.9)*.01;').replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n objectNormal.x = -.216*cos(position.x*18.0+time*.7); objectNormal.y=.22*sin(position.y*22.0+time*.9); objectNormal=normalize(objectNormal);');};
const waterGeo=new THREE.BufferGeometry(),waterPoints=[],waterIndices=[];for(let ring=0;ring<=32;ring++)for(let j=0;j<=96;j++){const a=j/96*Math.PI*2,r=ring/32;waterPoints.push(Math.cos(a)*r,Math.sin(a)*r,0);if(ring<32&&j<96){const k=ring*97+j;waterIndices.push(k,k+97,k+1,k+97,k+98,k+1);}}waterGeo.setAttribute('position',new THREE.Float32BufferAttribute(waterPoints,3));waterGeo.setIndex(waterIndices);waterGeo.computeVertexNormals();
const water=new THREE.Mesh(waterGeo,waterMat);water.rotation.x=-Math.PI/2;water.position.set(-3,.075,4.3);water.scale.set(4.9,2.85,1);water.receiveShadow=true;scene.add(water);
for(let i=0;i<44;i++){const a=i/44*Math.PI*2;const o=mesh(unitRock,mat(i%3?'#abb494':'#899c7d'),[-3+Math.cos(a)*5.05,.09,4.3+Math.sin(a)*2.93],[range(.25,.4),range(.14,.24),range(.22,.4)]);o.rotation.y=random()*6;}
for(let i=0;i<12;i++){const a=range(0,6.28),r=range(.65,.88),x=-3+Math.cos(a)*4.9*r,z=4.3+Math.sin(a)*2.85*r;const leaf=mesh(new THREE.CylinderGeometry(.22,.22,.015,20),mat('#6c9b68'),[x,.105,z]);if(i%3===0){for(let j=0;j<6;j++){const a=j*Math.PI/3;ball([x+Math.cos(a)*.07,.17,z+Math.sin(a)*.07],[.055,.1,.055],'#e5aeaa');}ball([x,.21,z],[.04,.04,.04],'#f1cf8f');}}
const rippleGeo=new THREE.TorusGeometry(1,.009,4,64),ripples=[];for(let i=0;i<5;i++){const r=new THREE.Mesh(rippleGeo,new THREE.MeshBasicMaterial({color:'#d8e7bd',transparent:true,opacity:.2,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.set(-5+random()*5,.12,3+random()*2.5);scene.add(r);ripples.push(r);}
// Arched bridge has individual deck planks, curved railings and capped stone posts.
function arch(x){return .3+Math.sin((x+7.7)/9.8*Math.PI)*.9;}
for(let i=0;i<35;i++){const x=-7.7+i*9.8/34;const o=box([x,arch(x),4.3],[.245,.18,1.45],mat(i%2?'#ac9673':'#b7a27d'));o.rotation.z=Math.cos((x+7.7)/9.8*Math.PI)*.16;}
for(const z of [3.5,5.1]){for(let i=0;i<12;i++){const x=-7.7+i*9.8/11,y=arch(x);box([x,y+.47,z],[.12,.95,.12],C.wood);ball([x,y+.98,z],[.1,.09,.1],C.gold);if(i<11){const nx=x+9.8/11;rod([x,y+.88,z],[nx,arch(nx)+.88,z],.055,C.wood);rod([x,y+.35,z],[nx,arch(nx)+.35,z],.035,C.wood);}}
 for(let i=0;i<8;i++){const x=-7.7+i*9.8/8,nx=x+9.8/8;rod([x,arch(x)-.18,z],[nx,arch(nx)-.18,z],.13,mat('#6d6954'));}}
for(const x of [-7.5,1.9]){box([x,arch(x)+.6,5.27],[.13,1.4,.13],C.wood);lantern(x,arch(x)+1.4,5.27,.75,true);}
for(let i=0;i<24;i++){const t=i/23,z=3.4-t*5.4,x=2.2-1.7*t+Math.sin(t*3)*.3;const p=mesh(unitCylinder,mat(i%2?'#b9bca1':'#c5c3a4'),[x,.09,z],[.42,.12,.27]);p.rotation.y=random()*.4;}
// Deliberately grouped, volumetric blossom crowns rather than billboard sprites.
const petalClusterGeo=new THREE.IcosahedronGeometry(1,0);
function tree(x,z,size=1,pink=true){const color=pink?['#d7969c','#e7b1ad','#f0c6b5','#c67f91']:['#416e54','#598760','#75996a','#91aa77'];const base=.1,h=3.8*size;rod([x,base,z],[x+.18*size,h*.7,z],.17*size,C.wood);rod([x+.1,h*.45,z],[x-.8*size,h*.91,z+.2],.105*size,C.wood);rod([x+.1,h*.5,z],[x+.9*size,h,z-.3],.08*size,C.wood);
 for(let i=0;i<19;i++){const a=i*2.4,r=Math.sqrt(i/19)*1.7*size;const bx=x+Math.cos(a)*r,bz=z+Math.sin(a)*r*.8,by=h+Math.sin(i*1.7)*.45*size;ball([bx,by,bz],[.85*size,.6*size,.8*size],mat(color[i%4]));for(let j=0;j<12;j++){const a=random()*6.28,u=range(-1,1),r=Math.sqrt(1-u*u);mesh(petalClusterGeo,mat(color[(i+j)%4]),[bx+Math.cos(a)*r*.86*size,by+u*.61*size,bz+Math.sin(a)*r*.81*size],[.14*size,.07*size,.12*size]);}}
 for(let i=0;i<13;i++){const a=random()*6.28,r=random()*1.5*size;ball([x+Math.cos(a)*r,h+.35*size+random()*.4,bzSafe(z,a,r)],[.1*size,.06*size,.1*size],mat(pink?'#f8d7c2':'#afbc86'));}
 bush(x,z,.7*size,'#547c54');}
function bzSafe(z,a,r){return z+Math.sin(a)*r*.8;}
tree(-6.6,-2.1,1.35,true);tree(7,3,1.3,true);tree(-7.6,6.6,.85,true);tree(4.7,-7,1.1,true);tree(-3.5,-7.5,1,false);tree(8,-4.5,.9,false);tree(-9,-4.2,.85,false);
for(let i=0;i<18;i++){const a=i/18*Math.PI*2,x=Math.cos(a)*10.3,z=Math.sin(a)*8.7;for(let j=0;j<3;j++)bush(x+range(-.6,.6),z+range(-.6,.6),range(.4,.9),i%2?'#5b8158':'#658a5d');}
// Bamboo grove: cylindrical culms, raised nodes, and pairs of three-dimensional leaves.
for(let i=0;i<18;i++){const x=-8+random()*2,z=-.5+random()*3,h=range(2.5,5);rod([x,0,z],[x+.1,h,z+.08],.035,mat('#789b60'));for(let y=.5;y<h;y+=.5){cyl([x,y,z],.048,.045,mat('#a9b780'));for(let k=0;k<2;k++){const leaf=ball([x+(k?1:-1)*.2,y+.12,z],[.33,.025,.07],mat('#527c56'));leaf.rotation.z=k?.5:-.5;}}}
// Flower and grass groups are instanced with all static geometry after construction.
for(let i=0;i<600;i++){const x=range(-10.5,10.5),z=range(-8.5,8.5);if((x+3)**2/30+(z-4.3)**2/11<1||Math.abs(x-.5)<3&&z<-1||Math.abs(x-.9)<.7&&z>-1)continue;if(i%5===0){const color=['#eadba0','#e8b0ae','#cbb9cf'][i%3];rod([x,0,z],[x,.19,z],.009,mat('#6a925a'));ball([x,.2,z],[.06,.035,.06],mat(color));}else{const g=cone([x,.12,z],.045,.24,mat(i%2?'#91a96f':'#688e5c'));g.rotation.z=range(-.3,.3);}}
// Stone lanterns, offerings and small foreground rocks.
for(const [x,z] of [[2.5,1],[-2.5,-.7],[5,6.3],[-8,2]]){box([x,.12,z],[.6,.24,.6],C.stone);cyl([x,.65,z],.13,1.1,C.stone);box([x,1.28,z],[.53,.45,.53],C.stone);box([x,1.3,z+.27],[.25,.27,.015],lanternGlass);roof(x,1.58,z,.45,.45,.3);}
for(const [x,z] of [[-4,8],[7,7.5],[-9,1],[8,-7]]){const r=mesh(unitRock,mat('#8b9b82'),[x,.27,z],[.9,.6,.65]);r.rotation.y=random()*6;bush(x+.3,z+.2,.45,'#6b8f58',.28);}
// Shared detailed character asset; the accepted environment remains unchanged.
const character=createCharacter(THREE),hero=character.group;scene.add(hero);hero.position.set(-2.6,arch(-2.6)+.12,4.3);hero.rotation.y=.45;character.update(0);
// Companion with a volumetric curved tail, ears, muzzle and articulated paws.
const fox=new THREE.Group();scene.add(fox);fox.position.set(-3.7,arch(-3.7)+.14,4.15);fox.rotation.y=.35;
ball([0,.28,0],[.3,.2,.15],mat('#eee6ca'),fox);for(const x of [-.17,.17])for(const z of [-.08,.08])rod([x,.28,z],[x,.05,z],.035,mat('#ddd9be'),fox);ball([.26,.46,0],[.16,.17,.14],mat('#f3ebd0'),fox);ball([.39,.42,0],[.13,.07,.07],mat('#f3ebd0'),fox);ball([.49,.43,0],[.025,.025,.025],C.ink,fox);for(const z of [-.08,.08]){cone([.25,.65,z],.065,.2,mat('#e4d8bd'),fox);ball([.34,.49,z*1.5],[.018,.019,.01],C.ink,fox);}const tail=rod([-.22,.3,0],[-.55,.62,0],.11,mat('#e8dfc2'),fox);ball([-.58,.66,0],[.13,.16,.12],mat('#f7eed2'),fox);rod([.18,.34,-.13],[.18,.34,.13],.025,C.red,fox);
// Batch static geometry by material and geometry, retaining real light/shadow response.
world.updateMatrixWorld(true);const batches=new Map(),sources=[];world.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+o.material.uuid;const b=batches.get(key)||{g:o.geometry,m:o.material,items:[]};b.items.push(o.matrixWorld.clone());batches.set(key,b);sources.push(o);});sources.forEach(o=>o.removeFromParent());
for(const b of batches.values()){const instance=new THREE.InstancedMesh(b.g,b.m,b.items.length);b.items.forEach((m,i)=>instance.setMatrixAt(i,m));instance.castShadow=true;instance.receiveShadow=true;instance.computeBoundingSphere();scene.add(instance);}
// Real, wind-carried blossom particles in world space.
const petalGeo=new THREE.SphereGeometry(1,5,3),petalMesh=new THREE.InstancedMesh(petalGeo,mat('#efc4b8'),70);petalMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);petalMesh.castShadow=false;scene.add(petalMesh);const petals=Array.from({length:70},()=>({x:range(-9,9),y:range(1,8),z:range(-7,8),phase:random()*6}));const dummy=new THREE.Object3D();
// Orbit control is shared by mouse and touch; scene and model views are genuine camera changes.
const shots={wide:{target:[0,1.7,0],radius:33,yaw:.53,pitch:.62,caption:'溪桥、古寺与漫山春色'},bridge:{target:[-2.65,2.0,4.3],radius:6.8,yaw:.45,pitch:.4,caption:'衣袂、剑锋与桥上同行的灵狐'},temple:{target:[.5,3.9,-4],radius:14,yaw:.65,pitch:.27,caption:'飞檐、瓦垄与灯下的木构细节'}};
let active='wide',night=false,orbit={target:new THREE.Vector3(...shots.wide.target),radius:33,yaw:.53,pitch:.62},destination={...shots.wide,target:new THREE.Vector3(...shots.wide.target)},interacting=false;
function selectShot(name){active=name;document.body.classList.toggle("detail",name!=="wide");const s=shots[name];destination={...s,target:new THREE.Vector3(...s.target)};document.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera===name)));$('caption').textContent=s.caption;}
document.querySelectorAll('[data-camera]').forEach(b=>b.addEventListener('click',()=>selectShot(b.dataset.camera)));
const pointers=new Map();let lastPinch=0;
renderer.domElement.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});renderer.domElement.setPointerCapture(e.pointerId);interacting=true;});
renderer.domElement.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId);const dx=e.clientX-prev.x,dy=e.clientY-prev.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){destination.yaw-=dx*.005;destination.pitch=THREE.MathUtils.clamp(destination.pitch+dy*.004,.13,1.15);}else{const p=[...pointers.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(lastPinch)destination.radius=THREE.MathUtils.clamp(destination.radius*lastPinch/distance,4,46);lastPinch=distance;}});
function release(e){pointers.delete(e.pointerId);lastPinch=0;interacting=pointers.size>0;}renderer.domElement.addEventListener('pointerup',release);renderer.domElement.addEventListener('pointercancel',release);window.addEventListener('blur',()=>{pointers.clear();lastPinch=0;interacting=false;});
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();destination.radius=THREE.MathUtils.clamp(destination.radius*Math.exp(e.deltaY*.001),4,46);},{passive:false});
$('daylight').onclick=()=>{night=!night;document.body.classList.toggle('night',night);$('daylight').textContent=night?'晨光入山':'入夜赏灯';scene.background.set(night?'#243d50':'#cfddd3');scene.fog.color.copy(scene.background);ambient.intensity=night?.8:1.5;sun.intensity=night?.8:2.8;sun.color.set(night?'#a4cde8':'#fff0ce');fill.intensity=night?.35:.7;renderer.toneMappingExposure=night?1.05:1.1;scene.environmentIntensity=night?.1:.5;lanternGlass.emissiveIntensity=night?3:.6;lampLights.forEach(l=>l.intensity=night?7:.8);};
$('hideUI').onclick=()=>{document.body.classList.add('clean');$('restoreUI').hidden=false;};$('restoreUI').onclick=()=>{document.body.classList.remove('clean');$('restoreUI').hidden=true;};
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('error').hidden=false;$('error').textContent='三维渲染上下文被浏览器回收，请刷新页面重试。';});
let first=true,frames=0,last=performance.now(),elapsed=0;const frameTimes=[];
function render(now){const dt=Math.min((now-last)/1000,.05);last=now;elapsed+=dt;const a=1-Math.exp(-dt*5);orbit.target.lerp(destination.target,a);for(const k of ['radius','yaw','pitch'])orbit[k]=THREE.MathUtils.lerp(orbit[k],destination[k],a);
 const aspectScale=camera.aspect<1?1.32:1,r=orbit.radius*aspectScale;camera.position.set(orbit.target.x+Math.sin(orbit.yaw)*Math.cos(orbit.pitch)*r,orbit.target.y+Math.sin(orbit.pitch)*r,orbit.target.z+Math.cos(orbit.yaw)*Math.cos(orbit.pitch)*r);camera.lookAt(orbit.target);
 waterUniform.value=elapsed;ripples.forEach((m,i)=>{const phase=(elapsed*.12+i*.23)%1;m.scale.setScalar(.1+phase*.6);m.material.opacity=(1-phase)*.18;});
 petals.forEach((p,i)=>{dummy.position.set(p.x+Math.sin(elapsed*.3+p.phase)*.6,((p.y-elapsed*.2)%8+8)%8,p.z+Math.cos(elapsed*.3+p.phase)*.3);dummy.rotation.set(elapsed*.4+i,elapsed*.2+i,elapsed*.7+i);dummy.scale.set(.035,.012,.055);dummy.updateMatrix();petalMesh.setMatrixAt(i,dummy.matrix);});petalMesh.instanceMatrix.needsUpdate=true;
 character.update(elapsed);fox.rotation.y=.35+Math.sin(elapsed*.8)*.09;
 renderer.render(scene,camera);frames++;frameTimes.push(dt);if(frameTimes.length>120)frameTimes.shift();if(first){first=false;renderer.shadowMap.autoUpdate=true;$('loading').classList.add('done');document.body.dataset.ready='true';}requestAnimationFrame(render);
}
window.sceneDebug=()=>({renderer:'Three.js WebGL',revision:THREE.REVISION,character:character.stats,ready:!first,frames,active,night,settled:orbit.target.distanceTo(destination.target)+Math.abs(orbit.radius-destination.radius)+Math.abs(orbit.yaw-destination.yaw)+Math.abs(orbit.pitch-destination.pitch)<.02,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,staticInstances:sources.length,camera:camera.position.toArray(),target:orbit.target.toArray(),pixelRatio:renderer.getPixelRatio(),size:[innerWidth,innerHeight],contextLost:renderer.getContext().isContextLost()});
requestAnimationFrame(render);
