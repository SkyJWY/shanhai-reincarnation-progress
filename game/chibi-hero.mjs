/** Original procedural figurine, front +Z. No assets, renderer state or addons.
 * createChibiHero(THREE) -> {group, update(seconds), stats, views, metadata}.
 * views are normalized look-at targets in the final 1.8-unit model space.
 */
export function createChibiHero(THREE) {
  const group = new THREE.Group(); group.name = '燕归 · Yan Gui / cloud-road swordsman';
  const V = (x,y,z) => new THREE.Vector3(x,y,z);
  const materials = {}, buckets = new Map();
  const mat = (name,color,roughness=.65,metalness=0) => {
    const m = new THREE.MeshStandardMaterial({name,color,roughness,metalness});
    materials[name]=m; buckets.set(name,[]); return name;
  };
  const skin=mat('warm porcelain skin',0xf1bd94,.78), blush=mat('soft cheek warmth',0xe5a082,.83);
  const hair=mat('ink chestnut hair',0x283047,.48), hairLight=mat('broad hair ridge',0x424b65,.51);
  const blue=mat('cornflower outer silk',0x587fcc,.69), navy=mat('midnight undercoat',0x202e51,.77);
  const cream=mat('warm cream folded cloth',0xf2dfb9,.8), brass=mat('satin brass fittings',0xcba458,.35,.65);
  const leather=mat('navy leather',0x30394e,.62), white=mat('warm eye whites',0xfff3dc,.28);
  const ink=mat('eyelashes pupils',0x20202d,.45), iris=mat('iris deep amber',0x855028,.4);
  const irisLight=mat('iris honey lower crescent',0xd59b47,.42), glint=mat('eye catchlight',0xffffff,.15);
  const mouth=mat('subtle warm smile',0x995b51,.85), steel=mat('silver blue blade',0xb0c7d9,.3,.7);
  function add(g,m,p=[0,0,0],s=[1,1,1],r=[0,0,0]) {
    const matrix=new THREE.Matrix4().compose(V(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),V(...s));
    g.applyMatrix4(matrix); buckets.get(m).push(g); return g;
  }
  function ell(m,p,s,r=[0,0,0],seg=28) {return add(new THREE.SphereGeometry(1,seg,20),m,p,s,r);}
  function mesh(pos,ind,m) {
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setIndex(ind); g.computeVertexNormals(); add(g,m); return g;
  }
  // Smooth elliptical swept loft. Width changes along a genuine curved spine.
  function sweep(points,width,depth,m,{steps=30,sides=14,profile=null,hollow=0}={}) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>V(...p))), pos=[],ids=[];
    for(let i=0;i<=steps;i++) {
      const t=i/steps,c=curve.getPoint(t),tan=curve.getTangent(t).normalize();
      let u=V(1,0,0).addScaledVector(tan,-tan.x);
      if(u.lengthSq()<.015) u=V(0,0,1).addScaledVector(tan,-tan.z);
      u.normalize(); const v=new THREE.Vector3().crossVectors(tan,u).normalize();
      const f=profile?profile(t):Math.max(.015,Math.pow(Math.sin(Math.PI*t),.4));
      for(let j=0;j<=sides;j++) {const a=j/sides*Math.PI*2,q=c.clone().addScaledVector(u,Math.cos(a)*width*f).addScaledVector(v,Math.sin(a)*depth*f);pos.push(q.x,q.y,q.z);}
    }
    for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;ids.push(a,a+1,b,b,a+1,b+1);}
    if(hollow){const base=pos.length/3;for(let i=0;i<=steps;i++){const c=curve.getPoint(i/steps);for(let j=0;j<=sides;j++){const k=(i*(sides+1)+j)*3;pos.push(c.x+(pos[k]-c.x)*hollow,c.y+(pos[k+1]-c.y)*hollow,c.z+(pos[k+2]-c.z)*hollow);}}for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){const a=base+i*(sides+1)+j,b=a+sides+1;ids.push(a,b,a+1,b,b+1,a+1);}for(const row of [0,steps])for(let j=0;j<sides;j++){const a=row*(sides+1)+j,b=base+a;ids.push(...(row===0?[a,b,a+1,a+1,b,b+1]:[a,a+1,b,a+1,b+1,b]));}}
    else {for(const [row,reverse] of [[0,true],[steps,false]]){const c=pos.length/3,point=curve.getPoint(row/steps);pos.push(point.x,point.y,point.z);for(let j=0;j<sides;j++){const a=row*(sides+1)+j;ids.push(...(reverse?[c,a+1,a]:[c,a,a+1]));}}}
    mesh(pos,ids,m);
  }
  function line(points,r,m){sweep(points,r,r,m,{steps:24,sides:8,profile:()=>1});}
  // Closed sculpted garment, broad three-lobed folds instead of thin pleats.
  function cloth(rings,m,fold=.015) {
    const pos=[],ids=[],N=48;
    for(let i=0;i<rings.length;i++) {const [x,y,z,rx,rz]=rings[i];for(let j=0;j<=N;j++) {
      const a=j/N*Math.PI*2,f=fold*Math.cos(a*3+.3)*Math.sin(i/(rings.length-1)*Math.PI);
      pos.push(x+Math.cos(a)*(rx+f),y,z+Math.sin(a)*(rz+f));
    }}
    for(let i=0;i<rings.length-1;i++)for(let j=0;j<N;j++){const a=i*(N+1)+j,b=a+N+1;ids.push(a,b,a+1,a+1,b,b+1);}
    for(const row of [0,rings.length-1]){const [x,y,z]=rings[row],c=pos.length/3;pos.push(x,y,z);for(let j=0;j<N;j++){const a=row*(N+1)+j;ids.push(...(row===0?[c,a,a+1]:[c,a+1,a]));}}
    return mesh(pos,ids,m);
  }
  // Feet set wide with one toe turned outward; compact bent legs.
  ell(navy,[-.115,.32,.005],[.105,.21,.105],[0,0,-.10]);
  ell(navy,[.145,.32,.035],[.10,.20,.10],[0,0,.15]);
  for(const [x,z,turn] of [[-.13,.04,-.19],[.165,.07,.22]]) {
    ell(leather,[x,.115,z],[.115,.115,.17],[0,turn,0]);
    ell(navy,[x,.185,z-.025],[.098,.12,.105],[0,turn,0]);
    ell(brass,[x,.025,z+.01],[.112,.025,.163],[0,turn,0]);
    // Keep the rounded boot surface uninterrupted; no half-buried piping.
  }
  cloth([[0,.35,0,.17,.105],[0,.39,0,.20,.132],[0,.56,0,.185,.128],[0,.74,0,.14,.105],[0,.91,0,.175,.125],[0,1.07,0,.14,.10]],navy,.008);
  cloth([[0,.38,.005,.245,.165],[0,.405,.005,.249,.168],[0,.44,.005,.24,.16]],cream,.006);
  cloth([[0,.45,.002,.243,.168],[0,.55,.002,.231,.164],[0,.76,.002,.182,.142],[0,.94,.002,.219,.158],[0,1.07,.002,.172,.124]],blue,.012);
  // Raised diagonal wrap panels and thick turned collar.
  sweep([[-.125,1.07,.09],[-.08,.96,.154],[.025,.85,.163],[.11,.765,.146]],.043,.018,cream,{profile:()=>1});
  sweep([[.12,1.075,.09],[.085,.96,.157],[.015,.9,.174],[-.09,.82,.158]],.034,.017,cream,{profile:()=>1});
  ell(skin,[0,1.09,.015],[.088,.13,.083]);
  // Sash and overlapping substantial hanging panels.
  cloth([[0,.715,.004,.191,.153],[0,.735,.004,.196,.157],[0,.78,.004,.191,.153],[0,.797,.004,.183,.15]],leather,.002);
  line([[-.17,.785,.075],[-.1,.792,.143],[0,.793,.166],[.12,.785,.132]],.012,brass);
  sweep([[.06,.735,.176],[.075,.61,.197],[.16,.49,.21],[.22,.43,.19]],.068,.022,cream,{profile:t=>.9-.2*t});
  sweep([[-.075,.72,.16],[-.14,.61,.194],[-.21,.54,.17],[-.29,.55,.13]],.058,.023,blue,{profile:t=>1-.35*t});
  ell(brass,[.065,.754,.183],[.054,.057,.019]);
  ell(navy,[.065,.754,.202],[.034,.037,.009]);
  // Embossed cloud curl, large enough to read on a phone.
  line([[.044,.748,.214],[.041,.767,.215],[.063,.777,.215],[.081,.762,.215],[.067,.752,.216]],.006,brass);
  // Wide sleeves, different gestures, with rounded voluminous cloth lofts.
  sweep([[-.15,.99,0],[-.25,.96,.01],[-.34,.93,.04],[-.40,.9,.07]],.13,.12,blue,{profile:t=>.78+.5*t});
  sweep([[.15,.985,0],[.26,.90,0],[.32,.80,.045],[.38,.745,.09]],.135,.125,blue,{profile:t=>.8+.45*t});
  sweep([[-.375,.921,.063],[-.405,.9,.081],[-.425,.885,.095]],.179,.166,cream,{profile:()=>1,hollow:.72});
  sweep([[.355,.78,.074],[.38,.747,.09],[.4,.725,.103]],.181,.166,cream,{profile:()=>1,hollow:.72});


  // Palm, thumb and four curled fingers: grip encloses the sword handle.
  ell(skin,[-.453,.868,.115],[.086,.076,.065],[0,0,-.25]);
  ell(skin,[-.453,.882,.171],[.046,.031,.032],[0,0,-.5]);
  for(let i=0;i<4;i++)ell(skin,[-.492+i*.023,.841,.159],[.019,.032,.026],[0,0,-.2],16);
  ell(skin,[.421,.678,.121],[.076,.082,.059],[0,0,.35]);
  ell(skin,[.369,.684,.154],[.029,.044,.029],[0,0,-.3]);
  for(let i=0;i<4;i++)ell(skin,[.387+i*.024,.624+Math.abs(i-1.5)*.009,.139],[.019,.029,.025],[0,0,.2],16);
  // Jian carried point down beside the body. Broad bevels are actual geometry.
  const sx=-.485,sz=.111;
  sweep([[sx,.81,sz],[sx,.94,sz],[sx,.995,sz]],.025,.025,leather,{profile:()=>1});
  ell(brass,[sx,1.009,sz],[.039,.032,.032]);
  sweep([[sx-.105,.801,sz],[sx-.06,.817,sz],[sx,.803,sz],[sx+.07,.814,sz],[sx+.102,.799,sz]],.018,.025,brass,{profile:()=>1});
  mesh([sx-.042,.79,sz,sx,.79,sz+.022,sx+.042,.79,sz,sx,.79,sz-.022,sx-.028,.23,sz,sx,.23,sz+.017,sx+.028,.23,sz,sx,.23,sz-.017,sx,.15,sz], [0,4,1,1,4,5,1,5,2,2,5,6,2,6,3,3,6,7,3,7,0,0,7,4,4,8,5,5,8,6,6,8,7,7,8,4,0,1,2,0,2,3],steel);
  line([[sx,.77,sz+.024],[sx,.30,sz+.019]],.004,brass);
  // A compact back scabbard and rounded brass suspension, visible on orbit.
  sweep([[.16,.99,-.155],[.19,.74,-.19],[.28,.41,-.17]],.042,.033,leather,{profile:t=>1-.2*t});
  ell(brass,[.28,.42,-.17],[.045,.055,.037]);
  line([[.145,.92,-.185],[.04,.81,-.18],[-.13,.735,-.14]],.018,brass);
  // Soft custom head: narrow chin, broad full cheeks, rounded forehead.
  const cy=1.397,ry=.299,rx=.316,rz=.249;
  const cheek = y => 1+.095*Math.exp(-Math.pow((y-1.32)/.1,2))-.17*Math.max(0,(1.28-y)/.18);
  function faceZ(x,y) {const fy=(y-cy)/ry;return .021+rz*Math.sqrt(Math.max(.008,1-fy*fy-x*x/Math.pow(rx*cheek(y),2)));}
  {
    const p=[],id=[],U=64,W=40;
    for(let i=0;i<=W;i++){const a=i/W*Math.PI,y=cy+ry*Math.cos(a);for(let j=0;j<=U;j++){const b=j/U*Math.PI*2;p.push(rx*cheek(y)*Math.sin(a)*Math.cos(b),y,.021+rz*Math.sin(a)*Math.sin(b));}}
    for(let i=0;i<W;i++)for(let j=0;j<U;j++){const a=i*(U+1)+j,b=a+U+1;id.push(a,a+1,b,b,a+1,b+1);}mesh(p,id,skin);
  }
  for(const s of [-1,1]){
    ell(skin,[s*.306,1.383,.005],[.057,.083,.049],[0,0,s*-.2]);
    ell(blush,[s*.331,1.385,.035],[.022,.047,.018],[0,0,s*-.2]);
    ell(brass,[s*.323,1.321,.03],[.016,.024,.014]);
  }
  // All eye layers are curved reliefs sampled ON the cheek surface, not spheres.
  function patch(cx,yy,w,h,offset,m,shape='almond') {
    const p=[cx,yy,faceZ(cx,yy)+offset+.002],id=[],N=64,R=8;
    for(let r=1;r<=R;r++)for(let j=0;j<=N;j++){
      const a=j/N*Math.PI*2,k=r/R,x=cx+w*Math.cos(a)*k;
      const yn=shape==='almond'?Math.sin(a)*(.72+.28*Math.abs(Math.sin(a))):Math.sin(a);
      const y=yy+h*yn*k+(shape==='almond'?.10*(x-cx):0);
      p.push(x,y,faceZ(x,y)+offset+.002*(1-k*k));
    }
    for(let j=0;j<N;j++)id.push(0,1+j,2+j);
    for(let r=0;r<R-1;r++)for(let j=0;j<N;j++){const a=1+r*(N+1)+j,b=a+N+1;id.push(a,b,a+1,b,b+1,a+1);}mesh(p,id,m);
  }
  for(const s of [-1,1]){
    const x=s*.134,y=1.426;
    patch(x,y,.106,.074,.006,ink);
    patch(x,y-.004,.101,.069,.009,white);
    patch(x-s*.009,y-.006,.056,.063,.013,iris,'round');
    patch(x-s*.009,y-.025,.044,.037,.016,irisLight,'round');
    patch(x-s*.009,y+.001,.030,.049,.019,ink,'round');
    patch(x-.024,y+.028,.019,.020,.023,glint,'round');
    patch(x+.018,y-.031,.008,.009,.023,glint,'round');
    const eyelid=[];for(let i=0;i<=18;i++){const a=Math.PI-i/18*Math.PI,xx=x+.106*Math.cos(a),yy=y+.078*Math.sin(a)+.10*(xx-x);eyelid.push([xx,yy,faceZ(xx,yy)+.011]);}line(eyelid,.0058,ink);
    const brow=[];for(let i=0;i<=12;i++){const k=i/12,xx=x-.08+.16*k,yy=1.539+.022*Math.sin(k*Math.PI)-s*.02*(k-.5);brow.push([xx,yy,faceZ(xx,yy)+.009]);}sweep(brow,.014,.008,hair,{steps:20,profile:t=>.35+.65*Math.sin(t*Math.PI)});
    patch(s*.219,1.322,.040,.017,.003,blush,'round');
  }
  ell(skin,[0,1.345,faceZ(0,1.345)+.006],[.030,.026,.026]);
  // Warm fine upward smile, no black lip outline or moustache shape.
  const smile=[];for(let i=0;i<=20;i++){const x=-.043+i/20*.086,y=1.267+.013*Math.pow(x/.043,2);smile.push([x,y,faceZ(x,y)+.005]);}line(smile,.004,mouth);
  ell(skin,[0,1.252,faceZ(0,1.252)+.002],[.026,.009,.006]);
  // Hair is an overlapping fan of swept tapered locks; there is NO scalp cap.
  const lock=(points,w,d,light=false)=>sweep(points,w,d,light?hairLight:hair,{steps:32,sides:16,profile:t=>Math.max(.015,Math.pow(Math.sin(Math.PI*(.12+.88*t)),.53))});
  // Rear crown and back fan: broad volumes close the silhouette in side/back views.
  for(let i=0;i<13;i++){
    const a=Math.PI*.02+i/12*Math.PI*.96,x=Math.cos(a)*.25,z=-Math.sin(a)*.20;
    lock([[.025,1.687,-.01],[x*.64,1.719,z*.7],[x*1.18,1.57,z*1.26],[x*1.15,1.35,z*1.2],[x*.99,1.22,z]],.083,.062,i%5===0);
  }
  // Swept top part, readable chunky S-curved bangs frame rather than cover eyes.
  lock([[.06,1.70,.07],[-.07,1.755,.105],[-.22,1.66,.173],[-.29,1.53,.19]],.104,.065);
  lock([[.075,1.708,.10],[-.035,1.709,.19],[-.15,1.63,.242],[-.23,1.535,.227]],.089,.049,true);
  lock([[.08,1.716,.086],[.17,1.71,.145],[.255,1.619,.187],[.278,1.51,.153]],.095,.058);
  lock([[.074,1.709,.123],[.127,1.67,.221],[.195,1.602,.258],[.229,1.551,.228]],.068,.041,true);
  lock([[-.22,1.62,.07],[-.303,1.53,.09],[-.318,1.41,.093],[-.29,1.32,.095]],.064,.047);
  lock([[.25,1.62,.065],[.313,1.51,.08],[.326,1.4,.083],[.291,1.32,.075]],.061,.048);
  // Tiny swept crown tuft, stays within the 40% head silhouette.
  lock([[.025,1.68,-.05],[.033,1.755,-.055],[.12,1.785,-.025],[.174,1.741,.005]],.062,.044);
  // Original cloud-shaped brass temple clasp, not the reference's forehead crown.
  ell(brass,[.275,1.57,.176],[.035,.053,.018],[0,0,-.35]);
  ell(blue,[.279,1.57,.193],[.019,.033,.009],[0,0,-.35]);
  // Merge by material with normals preserved: one draw call per material.
  let triangles=0,vertices=0;
  for(const [name,geos] of buckets){if(!geos.length)continue;const pp=[],nn=[];
    for(const source of geos){const g=source.index?source.toNonIndexed():source;const p=g.getAttribute('position'),n=g.getAttribute('normal');for(let i=0;i<p.count;i++){pp.push(p.getX(i),p.getY(i),p.getZ(i));nn.push(n.getX(i),n.getY(i),n.getZ(i));}if(g!==source)g.dispose();source.dispose();}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pp,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nn,3));g.computeBoundingSphere();
    const m=new THREE.Mesh(g,materials[name]);m.name=name;m.castShadow=true;m.receiveShadow=true;group.add(m);vertices+=pp.length/3;triangles+=pp.length/9;
  }
  group.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(group),size=box.getSize(new THREE.Vector3()),scale=1.8/size.y;
  // Bake the normalization so parent transforms and floor alignment are simple.
  for(const m of group.children){m.geometry.translate(0,-box.min.y,0);m.geometry.scale(scale,scale,scale);m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();}
  group.updateMatrixWorld(true);const finalBox=new THREE.Box3().setFromObject(group),finalSize=finalBox.getSize(new THREE.Vector3());
  const target=(x,y,z)=>[x*scale,(y-box.min.y)*scale,z*scale];
  const stats={triangles,vertices,drawCalls:group.children.length,materials:group.children.length,height:finalSize.y,width:finalSize.x,depth:finalSize.z,headFraction:(box.max.y-1.098)/size.y};
  const views={face:target(0,1.425,.16),hand:target(-.46,.86,.12),full:target(0,.9,0)};
  const metadata={name:'燕归 · Yan Gui',kind:'original chibi Chinese-fantasy swordsman',front:'+Z',units:'1.8 units tall; soles y=0',palette:'midnight / cornflower / warm cream / brass',construction:'custom cheek surface, conformal almond eye relief, swept variable-thickness hair, broad closed cloth lofts; material-batched',viewsConvention:'model-local look-at targets in final scaled units',animation:'static collectible pose; update(seconds) intentionally a no-op',limitations:['No skeletal rig or combat animations','Procedural geometry, not a hand-authored production sculpt','Artistic acceptance and browser visual QA belong to the host review']};
  function update(t){void t;}
  return {group,update,stats,views,metadata};
}
