/** Original procedural swordsman: the Reed-Wind traveler. Units: metres, +Z front.
 * No assets, DOM, renderer or external helpers required. update(t) takes seconds.
 * update() invalidates light shadows; the host owns renderer shadow scheduling.
 */
export function createCharacter(THREE) {
  const {Vector3:V, BufferGeometry:BG, Float32BufferAttribute:FA}=THREE;
  const group=new THREE.Group(); group.name='Reed-Wind swordsman';
  const body=new THREE.Group(), tails=new THREE.Group(), pony=new THREE.Group();
  group.add(body,tails,pony);
  body.name='Torso, face, limbs and equipment';tails.name='Six split embroidered coat leaves';pony.name='Nine tied-back hair locks';
  const material=(color,roughness,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const M={skin:material('#d9a080',.62),skinDark:material('#a96857',.75),lip:material('#b7806b',.78),
    teal:material('#174e50',.92),tealLight:material('#286565',.87),ivory:material('#e5dbc0',.95),
    wine:material('#703b49',.87),gold:material('#b99a58',.37,.72),goldDark:material('#75613d',.48,.6),
    hair:material('#20262a',.67),hairLight:material('#333a3e',.72),leather:material('#383137',.78),
    seam:material('#9c8170',.9),steel:material('#bdcdd0',.23,.88),edge:material('#e4e9de',.18,.9),
    eye:material('#eee8d9',.35),iris:material('#70503a',.32),black:material('#171e23',.38)};
  // Tiny woven normal perturbation is procedural; no image/Canvas dependence.
  for(const key of ['teal','tealLight','ivory','wine']) {
    M[key].onBeforeCompile=s=>{
      s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 wovenPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nwovenPosition = position;');
      s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 wovenPosition;').replace('#include <color_fragment>','#include <color_fragment>\nfloat weave = sin(wovenPosition.y*1800.0)*sin((wovenPosition.x+wovenPosition.z)*1500.0);\ndiffuseColor.rgb *= 0.975 + 0.025*weave;');
    };
    M[key].customProgramCacheKey=()=> 'reed-woven-v1';
  }
  const buckets=new Map();
  function add(g,m,parent=body){
    if(!g.getAttribute('normal'))g.computeVertexNormals();
    const key=parent.uuid+':'+m.uuid;
    if(!buckets.has(key))buckets.set(key,{parent,m,geometries:[]});
    buckets.get(key).geometries.push(g);return g;
  }
  // Parametric grids use outward winding; every surface has true geometry.
  function surface(fn,nu,nv){
    const p=[],uv=[],ix=[];
    for(let v=0;v<=nv;v++)for(let u=0;u<=nu;u++){p.push(...fn(u/nu,v/nv));uv.push(u/nu,v/nv);}
    for(let v=0;v<nv;v++)for(let u=0;u<nu;u++){const a=v*(nu+1)+u,b=a+nu+1;ix.push(a,a+1,b,a+1,b+1,b);}
    const g=new BG();g.setAttribute('position',new FA(p,3));g.setAttribute('uv',new FA(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
  }
  const curve=pts=>new THREE.CatmullRomCurve3(pts.map(p=>new V(...p)));
  function tube(pts,r,m,parent=body,segments=28,sides=8){return add(new THREE.TubeGeometry(curve(pts),segments,r,sides,false),m,parent);}
  // Ring loft: [y, x-radius, z-radius, center-x, center-z], optional cloth fluting.
  function loft(rows,m,{fold=0,n=48,parent=body}={}){
    const paths=[0,1,2,3,4].map(k=>rows.map(r=>r[k]||0));
    const sample=(k,t)=>{const q=t*(rows.length-1),i=Math.min(rows.length-2,Math.floor(q)),f=q-i,p=paths[k],a=p[Math.max(0,i-1)],b=p[i],c=p[i+1],d=p[Math.min(p.length-1,i+2)],v=.5*((2*b)+(-a+c)*f+(2*a-5*b+4*c-d)*f*f+(-a+3*b-3*c+d)*f*f*f);return k===1||k===2?Math.max(.0001,v):v;};
    for(const end of [0,1])add(surface((u,v)=>{const a=u*Math.PI*2,r=(end?1-v:v)*(1+fold*(Math.sin(a*9+end*2)+.35*Math.sin(a*17-end*3)));return[sample(3,end)+Math.sin(a)*sample(1,end)*r,sample(0,end),sample(4,end)+Math.cos(a)*sample(2,end)*r];},n,1),m,parent);
    return add(surface((u,v)=>{const a=u*Math.PI*2,y=sample(0,v),r=1+fold*(Math.sin(a*9+v*2)+.35*Math.sin(a*17-v*3));return [sample(3,v)+Math.sin(a)*sample(1,v)*r,y,sample(4,v)+Math.cos(a)*sample(2,v)*r];},n,(rows.length-1)*5),m,parent);
  }
  // Flattened tapered spline locks / straps. Elliptical cross section, nonconstant radius.
  function lock(pts,width,depth,m,parent=body){
    const c=curve(pts),frames=c.computeFrenetFrames(36,false);
    return add(surface((u,t)=>{const i=Math.round(t*36),p=c.getPointAt(t),a=u*Math.PI*2;
      const taper=Math.max(.025,Math.pow(Math.sin(Math.PI*(.035+.965*t)),.65));
      return p.addScaledVector(frames.normals[i],Math.cos(a)*width*taper).addScaledVector(frames.binormals[i],Math.sin(a)*depth*taper).toArray();},12,36),m,parent);
  }
  // Solid cloth panel with back surface and stitched perimeter, not a flat plane.
  function panel(fn,m,{nu=20,nv=32,thickness=.009,trim=true,parent=body}={}){
    add(surface(fn,nu,nv),m,parent);
    const inset=(u,v)=>{const p=new V(...fn(u,v)),e=.0001;
      const du=new V(...fn(Math.min(1,u+e),v)).sub(new V(...fn(Math.max(0,u-e),v)));
      const dv=new V(...fn(u,Math.min(1,v+e))).sub(new V(...fn(u,Math.max(0,v-e))));
      return p.addScaledVector(du.cross(dv).normalize(),-thickness).toArray();};
    add(surface((u,v)=>inset(1-u,v),nu,nv),m,parent);
    for(const edge of [t=>[t,0],t=>[1,t],t=>[1-t,1],t=>[0,1-t]]){
      add(surface((u,v)=>{const [s,t]=edge(u),p=fn(s,t),b=inset(s,t);return p.map((x,k)=>b[k]+(x-b[k])*v);},32,1),m,parent);
      if(trim)tube(Array.from({length:17},(_,i)=>fn(...edge(i/16))),.0032,M.gold,parent,32,6);
    }
  }
  function oval(cx,cy,cz,rx,ry,depth,m,parent=body){
    return add(surface((u,v)=>{const a=u*Math.PI*2,b=v*Math.PI;return[cx+rx*Math.sin(b)*Math.sin(a),cy-ry*Math.cos(b),cz+depth*Math.sin(b)*Math.cos(a)];},28,16),m,parent);
  }
  // Boots have an asymmetrical instep and projecting rounded toe, continuous lofts.
  for(const s of [-1,1]){
    const x=s*.115,z=s===-1?.035:-.025;
    loft([[0,.066,.115,x,z+.035],[.023,.075,.13,x,z+.045],[.065,.074,.13,x,z+.048],[.105,.066,.108,x,z+.027],[.15,.056,.065,x,z],[.31,.061,.057,x,z],[.34,.065,.061,x,z]],M.leather);
    loft([[.005,.069,.12,x,z+.037],[.026,.077,.133,x,z+.044]],M.black);
    loft([[.327,.066,.063,x,z],[.35,.068,.064,x,z]],M.wine);
    tube([[x-.047,.05,z+.14],[x-.05,.09,z+.108],[x-.05,.17,z+.038],[x-.05,.31,z+.036]],.0025,M.seam);
    tube([[x+.047,.05,z+.14],[x+.05,.09,z+.108],[x+.05,.17,z+.038],[x+.05,.31,z+.036]],.0025,M.seam);
    for(let j=0;j<4;j++)tube([[x-.05,.17+j*.035,z+.046],[x,.185+j*.035,z+.064],[x+.05,.17+j*.035,z+.046]],.003,M.seam);
    loft([[.33,.055,.055,x,z],[.48,.072,.067,x,z],[.72,.07,.066,x*.8,z*.5],[.9,.068,.066,x*.65,0]],M.ivory,{fold:.055});
  }
  // Underskirt, shaped body, and outward-flaring separate skirt leaves.
  loft([[.44,.185,.11,0,0],[.65,.17,.112,0,0],[.91,.137,.09,0,0],[1.01,.133,.09,0,0]],M.ivory,{fold:.08});
  loft([[.87,.157,.111,0,0],[1.0,.157,.114,0,0],[1.19,.197,.12,0,0],[1.36,.218,.102,0,-.006],[1.43,.215,.067,0,-.008],[1.46,.069,.062,0,0]],M.teal,{fold:.035});
  // Six overlapping skirt panels, front opening reveals ivory pleats and boots.
  for(let k=0;k<6;k++){
    const a0=.24+k*(Math.PI*2-.48)/6,a1=a0+(Math.PI*2-.48)/6+.1;
    const fn=(u,v)=>{const a=a0+(a1-a0)*u,r=.16+v*.105,flutter=.012*Math.sin(u*Math.PI*5+v*4)*v;
      return[Math.sin(a)*(r+flutter),.96-v*(.49+.06*Math.sin(u*Math.PI)),Math.cos(a)*(r*.70+flutter)];};
    panel((u,v)=>fn(1-u,v),k%2?M.teal:M.tealLight,{parent:tails,thickness:.008});
    // Needle-like embroidered reeds with a gold stem and paired leaves.
    if(k===0||k===2||k===4)for(let j=0;j<3;j++){
      const u=.28+j*.19,ps=[];for(let q=0;q<5;q++){const p=fn(u+.035*Math.sin(q),.52+q*.085);p[2]+=.005;ps.push(p);}tube(ps,.0018,M.gold,tails,16,5);
      for(let q=1;q<4;q++){const p=ps[q];tube([[p[0]-.012,p[1]+.018,p[2]],[p[0],p[1],p[2]],[p[0]+.014,p[1]+.012,p[2]]],.0016,M.gold,tails,8,5);}
    }
  }
  // Continuous neck with a distinct jaw, cheekbones, temples and chin.
  loft([[1.4,.054,.052,0,0],[1.49,.052,.048,0,.004],[1.53,.064,.055,0,.006]],M.skin);
  const headRows=[[1.49,.032,.032,0,.024],[1.51,.059,.054,0,.024],[1.55,.086,.067,0,.013],[1.61,.105,.081,0,0],[1.67,.108,.086,0,-.004],[1.73,.1,.081,0,-.008],[1.78,.073,.062,0,-.01],[1.8,.004,.004,0,-.012]];
  const hg=loft(headRows,M.skin,{n:80});
  // Sculpt sockets and cheek planes into the actual head rather than a ball.
  const hp=hg.getAttribute('position');for(let i=0;i<hp.count;i++){
    const x=hp.getX(i),y=hp.getY(i),z=hp.getZ(i);
    if(z>0){const socket=Math.exp(-(((Math.abs(x)-.047)/.028)**2)-((y-1.653)/.025)**2);const cheek=Math.exp(-(((Math.abs(x)-.065)/.031)**2)-((y-1.61)/.02)**2);hp.setZ(i,z-.011*socket+.008*cheek);}
    if(y>1.68){hp.setX(i,x*.94);hp.setZ(i,hp.getZ(i)*.92);}
  }hg.computeVertexNormals();
  // Nose bridge, alar wings and tip are one custom, tapering ring mesh.
  loft([[1.586,.004,.004,0,.084],[1.596,.021,.012,0,.091],[1.61,.017,.021,0,.102],[1.637,.011,.014,0,.091],[1.674,.006,.005,0,.078]],M.skin,{n:32});
  for(const s of [-1,1]){
    oval(s*.012,1.597,.104,.006,.0025,.002,M.skinDark);
    // Almond eye surface with shaped corners, upper and lower lid rims.
    const eyeFn=(u,v)=>{const x=s*.047+(u-.5)*.067,b=Math.sin(Math.PI*u);return[x,1.652+(v-.5)*.020*b+.005*(u-.5)*s,.078+.011*b*Math.sin(Math.PI*v)];};
    add(surface(eyeFn,28,10),M.eye);
    oval(s*.047,1.652,.0895,.009,.009,.0023,M.iris);
    oval(s*.047,1.652,.0915,.004,.0055,.0012,M.black);
    oval(s*.044,1.656,.093,.0021,.0021,.0007,M.eye);
    for(const v of [0,1])tube(Array.from({length:15},(_,i)=>eyeFn(i/14,v)),v?.0018:.0013,M.skinDark,body,24,7);
    lock([[s*.016,1.681,.08],[s*.046,1.687,.086],[s*.078,1.679,.073],[s*.087,1.672,.065]],.0055,.003,M.hair);
    oval(s*.109,1.625,-.002,.019,.035,.013,M.skin);
    tube([[s*.11,1.602,.009],[s*.124,1.62,.011],[s*.124,1.648,.005],[s*.113,1.651,.005]],.004,M.skinDark);
    tube([[s*.113,1.613,.014],[s*.118,1.629,.016],[s*.111,1.639,.015]],.003,M.skin);
  }
  tube([[-.027,1.568,.081],[-.012,1.572,.09],[0,1.569,.092],[.012,1.572,.09],[.027,1.568,.081]],.0023,M.lip,body,36);
  tube([[-.023,1.565,.084],[0,1.561,.092],[.023,1.565,.084]],.0021,M.lip);
  tube([[-.018,1.557,.084],[0,1.555,.088],[.018,1.557,.084]],.0023,M.skin);
  // Swept hair cap, carved into directional locks; open forehead and sideburns.
  add(surface((u,v)=>{const a=u*Math.PI*2,b=.06+(1-v)*(1.45+.42*(1-Math.cos(a)));return[.114*Math.sin(b)*Math.sin(a),1.68+.129*Math.cos(b),-.014+.096*Math.sin(b)*Math.cos(a)];},64,32),M.hair);
  for(let j=0;j<17;j++){
    const a=j/17*Math.PI*2,front=Math.cos(a)>0;
    const p0=[.035*Math.sin(a),1.798,-.015+.031*Math.cos(a)],p1=[.096*Math.sin(a),1.757,-.018+.084*Math.cos(a)],p2=[.112*Math.sin(a),front?1.705:1.633,-.018+.094*Math.cos(a)],p3=[.102*Math.sin(a)+.012,front?1.69:1.59,-.025+.087*Math.cos(a)];
    lock([p0,p1,p2,p3],.021,.009,j%4?M.hair:M.hairLight);
  }
  for(const s of [-1,1])lock([[s*.087,1.738,.05],[s*.105,1.69,.048],[s*.101,1.619,.042],[s*.092,1.582,.039]],.014,.009,M.hair);
  // A swept forelock stops above the eyebrow, not across the eyes.
  lock([[-.074,1.77,.068],[-.033,1.754,.095],[.019,1.717,.099],[.036,1.694,.088]],.021,.009,M.hair);
  for(let j=0;j<7;j++)lock([[.035*Math.sin(j),1.77,-.065],[.045*Math.sin(j),1.824,-.089],[.039*Math.sin(j+1),1.831,-.119],[.022*Math.sin(j),1.78,-.13]],.019,.014,M.hair);
  loft([[1.773,.047,.04,0,-.099],[1.791,.048,.041,0,-.099]],M.wine);
  tube([[-.086,1.792,-.096],[0,1.8,-.099],[.086,1.808,-.102]],.005,M.gold);
  for(let j=0;j<9;j++)lock([[.019*Math.sin(j),1.788,-.12],[.032*Math.sin(j),1.673,-.153],[.057+Math.sin(j)*.025,1.51,-.177],[.11+Math.sin(j)*.017,1.405,-.151]],.017,.012,j%3?M.hair:M.hairLight,pony);
  // Ivory inner collar and thick teal crossing lapels. Each has cloth edge walls.
  const ribbon=(pts,width,m)=>{const c=curve(pts);panel((u,v)=>{const p=c.getPoint(v),t=c.getTangent(v),n=new V(t.y,-t.x,0).normalize();return p.addScaledVector(n,(u-.5)*width).toArray();},m,{nu:8,nv:40,thickness:.012});};
  ribbon([[-.061,1.465,.042],[-.104,1.403,.095],[-.02,1.267,.135],[.115,1.12,.119]],.052,M.ivory);
  ribbon([[.061,1.465,.044],[.111,1.404,.096],[.028,1.276,.146],[-.13,1.091,.12]],.055,M.ivory);
  ribbon([[-.101,1.438,.063],[-.147,1.369,.095],[-.06,1.242,.137],[.113,1.075,.125]],.048,M.tealLight);
  ribbon([[.104,1.437,.065],[.146,1.366,.105],[.042,1.224,.153],[-.132,1.041,.128]],.05,M.tealLight);
  loft([[.935,.168,.121,0,0],[.965,.17,.125,0,0],[1.014,.165,.121,0,0]],M.wine,{fold:.014});
  for(const y of [.941,1.007])tube(Array.from({length:65},(_,i)=>[Math.sin(i/64*Math.PI*2)*.171,y,Math.cos(i/64*Math.PI*2)*.127]),.003,M.gold,body,64,6);
  oval(.012,.975,.13,.034,.024,.009,M.gold);
  oval(.012,.975,.141,.021,.014,.003,M.teal);
  ribbon([[.045,.967,.136],[.103,.898,.152],[.098,.77,.174],[.15,.665,.177]],.05,M.wine);
  // Spline-loft sleeves follow bent arms, with gravity folds and thick open cuffs.
  function sleeve(s){
    const pts=[[s*.17,1.371,-.005],[s*.245,1.306,0],[s*.295,1.19,.015],[s*.323,1.071,.06]],c=curve(pts),frames=c.computeFrenetFrames(40,false);
    const fn=(u,t,inner=false,extra=0)=>{const a=u*Math.PI*2,i=Math.round(t*40),p=c.getPointAt(t);const radius=(.077+.020*Math.sin(t*Math.PI)-.017*t)*(1+.065*Math.sin(a*8+t*8))-(inner?.009:0)+extra;return p.addScaledVector(frames.normals[i],Math.cos(a)*radius).addScaledVector(frames.binormals[i],Math.sin(a)*radius*1.12).toArray();};
    add(surface((u,t)=>fn(u,t),48,40),M.teal);
    add(surface((u,v)=>{const edge=new V(...fn(u,0)),center=c.getPointAt(0);return center.lerp(edge,v).toArray();},48,4),M.teal);
    add(surface((u,t)=>fn(1-u,.89+.11*t,true),48,8),M.ivory);
    add(surface((u,t)=>fn(u,.91+.09*t,false,.0015),48,6),M.wine);
    for(const t of [.91,1])tube(Array.from({length:49},(_,i)=>fn(i/48,t)),.0034,M.gold,body,48,6);
    add(surface((u,v)=>{const a=fn(u,1),b=fn(u,1,true);return a.map((x,k)=>x+(b[k]-x)*v);},48,1),M.ivory);
    for(let j=0;j<5;j++)tube(Array.from({length:10},(_,i)=>fn((j+.3)/5,.15+i*.065)),.0022,M.tealLight,body,24,5);
    return [s*.33,1.022,.075];
  }
  // Right = character's right = viewer-left. Four separately bent digits + thumb.
  for(const s of [-1,1]){
    const [x,y,z]=sleeve(s);
    loft([[y-.072,.032,.024,x,z+.009],[y-.029,.038,.03,x,z],[y+.035,.033,.027,x,z-.002]],M.skin,{n:32});
    if(s===-1){
      for(let i=0;i<4;i++){
        const yy=y+.003-i*.017;
        tube([[x-.024,yy,z],[x-.04,yy-.003,z+.022],[x-.029,yy-.005,z+.049],[x-.001,yy-.006,z+.051],[x+.011,yy-.004,z+.034]],.0083-i*.0004,M.skin,body,24,10);
        tube([[x-.033,yy-.006,z+.042],[x-.025,yy-.009,z+.047]],.0011,M.skinDark,body,6,5);
      }
      tube([[x+.027,y+.008,z-.004],[x+.034,y-.018,z+.018],[x+.012,y-.034,z+.049],[x-.004,y-.03,z+.051]],.0105,M.skin,body,24,10);
    }else{
      for(let i=0;i<4;i++){const xx=x-.024+i*.015; tube([[xx,y-.046,z+.006],[xx+.002,y-.077,z+.013],[xx-.003,y-.101+(i===3?.016:0),z+.029]],.007,M.skin,body,20,9);}
      tube([[x-.03,y-.018,z],[x-.045,y-.042,z+.011],[x-.037,y-.065,z+.023]],.01,M.skin);
    }
  }
  // Straight jian: a true diamond-section ridge and distinct sharpened edges.
  const weapon=new THREE.Group();weapon.name='Right-hand diamond-section jian';body.add(weapon);weapon.position.set(-.345,.957,.104);weapon.rotation.z=-.17;
  loft([[0,.014,.013,0,0],[.124,.014,.013,0,0]],M.leather,{n:20,parent:weapon});
  for(let i=0;i<9;i++)tube([[-.012,.009+i*.012,.009],[0,.016+i*.012,.014],[.012,.023+i*.012,.008]],.0028,M.wine,weapon,10,6);
  oval(0,.132,0,.021,.019,.017,M.gold,weapon);
  // Curved quillons and central rain guard.
  lock([[-.085,-.007,0],[-.056,.009,0],[0,.011,0],[.056,.009,0],[.085,-.007,0]],.012,.014,M.gold,weapon);
  loft([[-.038,.025,.013,0,0],[.013,.023,.015,0,0]],M.gold,{n:8,parent:weapon});
  loft([[-.71,.0001,.0001,0,0],[-.63,.018,.0048,0,0],[-.26,.022,.0068,0,0],[-.04,.024,.008,0,0]],M.steel,{n:4,parent:weapon});
  for(const sign of [-1,1]){
    tube([[sign*.024,-.045,0],[sign*.02,-.58,0],[0,-.71,0]],.0015,M.edge,weapon,24,5);
    tube([[sign*.007,-.07,.008],[sign*.008,-.14,.008],[sign*.004,-.21,.008]],.0011,M.goldDark,weapon,18,5);
  }
  // Scabbard sits on left hip, angled out so rear and side views reveal fittings.
  const scabbard=new THREE.Group();scabbard.name='Left-hip leather scabbard and brass fittings';body.add(scabbard);scabbard.position.set(.175,.97,-.075);scabbard.rotation.z=.31;
  loft([[-.68,.013,.014,0,0],[-.66,.024,.018,0,0],[-.03,.026,.02,0,0],[.025,.027,.021,0,0]],M.leather,{n:24,parent:scabbard});
  for(const y of [-.65,-.43,-.08,.018])loft([[y-.013,.027,.022,0,0],[y+.013,.027,.022,0,0]],M.gold,{n:24,parent:scabbard});
  tube([[-.018,-.62,.016],[-.018,-.35,.019],[-.018,-.04,.019]],.002,M.wine,scabbard);
  tube([[.17,.99,-.05],[.235,.91,-.065],[.225,.82,-.07]],.006,M.wine);
  // Back yoke embroidery: a ring of stylized reeds, entirely raised stitch mesh.
  for(let j=0;j<7;j++){
    const x=(j-3)*.027; tube([[x,1.11,-.123],[x+.012,1.19,-.128],[x+.005,1.28,-.117]],.0017,M.gold,body,20,5);
    for(let k=0;k<3;k++)tube([[x-.012,1.17+k*.031,-.126],[x+.007,1.156+k*.031,-.13],[x+.02,1.184+k*.031,-.124]],.0014,M.gold,body,10,5);
  }
  // Merge by material AND animated parent: draw count remains small, detail stays.
  let triangles=0,vertices=0,drawCalls=0;
  for(const {parent,m,geometries} of buckets.values()){
    const p=[],n=[],uv=[];
    for(const indexed of geometries){const g=indexed.index?indexed.toNonIndexed():indexed; p.push(...g.attributes.position.array); n.push(...g.attributes.normal.array);uv.push(...g.attributes.uv.array);if(g!==indexed)g.dispose();indexed.dispose();}
    const g=new BG();g.setAttribute('position',new FA(p,3));g.setAttribute('normal',new FA(n,3));g.setAttribute('uv',new FA(uv,2));g.computeBoundingSphere();
    const mesh=new THREE.Mesh(g,m);mesh.name='Reed-Wind / '+Object.keys(M).find(k=>M[k]===m);mesh.castShadow=true;mesh.receiveShadow=true;
    // Keep the next frame's shadow pass live if the host cached static shadows.
    // Hosts should also enable shadowMap.autoUpdate for the initial frame.
    // The host owns shadow scheduling; update() marks lights when geometry moves.
    parent.add(mesh);triangles+=p.length/9;vertices+=p.length/3;drawCalls++;
  }
  // Rotation pivots keep tied hair and coat waists attached during motion.
  for(const [part,pivot] of [[tails,new V(0,.96,0)],[pony,new V(0,1.788,-.12)]]){part.children.forEach(mesh=>mesh.geometry.translate(-pivot.x,-pivot.y,-pivot.z));part.position.copy(pivot);}
  group.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(group),height=bounds.max.y-bounds.min.y;
  // Normalize authored silhouette to the requested 1.85m including tied hair.
  const scale=1.85/height;body.scale.setScalar(scale);tails.scale.setScalar(scale);pony.scale.setScalar(scale);
  for(const part of [body,tails,pony]){part.position.multiplyScalar(scale);part.position.y-=bounds.min.y*scale;}
  const stats={name:'Reed-Wind traveler',triangles,vertices,drawCalls,materials:Object.keys(M).length,height:1.85,front:'+Z',rightHand:'-X',procedural:true,externalAssets:0};
  group.userData.characterStats=stats;
  let lastTime=0;
  function update(time=0){
    const t=Number.isFinite(time)?time:0;lastTime=t;
    // Feet stay grounded; only ponytail and skirt leaves gently move.
    pony.rotation.x=Math.sin(t*1.5)*.009;pony.rotation.z=Math.sin(t*1.1)*.006;
    tails.rotation.x=Math.sin(t*1.25)*.005;
    // Force per-light cached shadows too, without requiring renderer access.
    let root=group;while(root.parent)root=root.parent;
    root.traverse(o=>{if(o.isLight&&o.shadow)o.shadow.needsUpdate=true;});
  }
  group.userData.getAnimationTime=()=>lastTime;
  const normalized=p=>[p[0]*scale,(p[1]-bounds.min.y)*scale,p[2]*scale];
  const views={face:normalized([0,1.65,.075]),hand:normalized([-.334,.995,.104]),sword:normalized([-.39,.63,.104]),back:normalized([0,1.22,-.125]),boots:normalized([0,.18,.07]),full:normalized([0,.915,0])};
  return {group,update,stats,views};
}
