/** Original sculptural chibi cast. No textures, assets, renderer hooks or global state.
 * Coordinates: feet on Y=0, face +Z. All material batches are independently owned.
 * Procedural spline lofts are closed solids; eye lenses sit inside raised eyelids.
 */
export function createChibiCreature(THREE, kind = 'pet') {
  if (!['pet', 'monster', 'boss'].includes(kind)) throw new RangeError(`Unknown creature kind: ${kind}`);
  const {Vector3: V, BufferGeometry: BG, Float32BufferAttribute: FA} = THREE;
  const group = new THREE.Group();
  const batches = new Map();
  const mat = (color, roughness = .72, metalness = 0) => new THREE.MeshStandardMaterial({color, roughness, metalness});
  const m = {
    fur: mat('#f1dfc3'), cream: mat('#fff1da'), coral: mat('#c96d60'), blush: mat('#dfa58a'),
    dark: mat('#312a34'), white: mat('#fff9e9', .37), iris: mat('#69918c', .4), pupil: mat('#172c30', .36),
    jade: mat('#719c8d', .48), gold: mat('#bd995c', .48, .45), seam: mat('#896b48'),
    plum: mat('#826172'), plumLight: mat('#ac8490'), earth: mat('#5b4641'), cloth: mat('#6d7570'),
    clothLight: mat('#a4a38a'), wood: mat('#8c6242'), woodDark: mat('#604633'),
    stone: mat('#818f97'), stoneLight: mat('#a5b1b4'), stoneDark: mat('#4c6069'),
    glow: new THREE.MeshStandardMaterial({color:'#b8e4df', emissive:'#5dbbb3', emissiveIntensity:.65, roughness:.42})
  };
  function put(g, material) {
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(g);
  }
  function grid(fn, nu = 32, nv = 24) {
    const p = [], indices = [];
    for (let j=0;j<=nv;j++) for(let i=0;i<=nu;i++) p.push(...fn(i/nu,j/nv));
    for (let j=0;j<nv;j++) for(let i=0;i<nu;i++) {
      const a=j*(nu+1)+i,b=a+nu+1;
      indices.push(a,b,a+1,a+1,b,b+1);
    }
    const g=new BG();g.setAttribute('position',new FA(p,3));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  // Soft superellipsoid: continuous, subtly squared cheeks / paws / stone plates.
  function volume(p, r, material, exponent=1, rotation=[0,0,0]) {
    const sp = x => Math.sign(x)*Math.pow(Math.abs(x),exponent);
    const g=grid((u,v)=>{const a=u*Math.PI*2,b=v*Math.PI;return [r[0]*sp(Math.sin(b))*sp(Math.cos(a)),r[1]*sp(Math.cos(b)),r[2]*sp(Math.sin(b))*sp(Math.sin(a))];},32,20);
    // Polar parameterization has the reverse orientation of the sweep grids.
    const index=g.index.array;for(let i=0;i<index.length;i+=3){const tmp=index[i+1];index[i+1]=index[i+2];index[i+2]=tmp;}g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation)));g.translate(...p);put(g,material);
  }
  const curve = pts => new THREE.CatmullRomCurve3(pts.map(p=>new V(...p)),false,'centripetal');
  function line(pts,r,material,sides=8) {put(new THREE.TubeGeometry(curve(pts),Math.max(12,pts.length*7),r,sides,false),material);}
  // A flattened curved solid, using a fixed face-plane lateral frame. The explicit
  // varying radii produce broad swept ears, fur locks, tails and carved brows.
  function sweep(pts, radii, material, segments=32, sides=16, options={}) {
    const c=curve(pts),start=options.start??0,end=options.end??1,expand=options.expand??0;
    function radius(t,k){const f=t*(radii.length-1),i=Math.min(radii.length-2,Math.floor(f)),s=f-i;return Math.max(.00001,THREE.MathUtils.lerp(radii[i][k],radii[i+1][k],s));}
    const g=grid((u,v)=>{const t=start+(end-start)*v,p=c.getPoint(t),d=c.getTangent(t),z=new V(0,0,1);let x=new V().crossVectors(d,z);if(x.lengthSq()<.001)x=new V(1,0,0);x.normalize();const y=new V().crossVectors(x,d).normalize(),a=u*2*Math.PI;return p.addScaledVector(x,Math.cos(a)*(radius(t,0)+expand)).addScaledVector(y,Math.sin(a)*(radius(t,1)+expand)).toArray();},sides,segments);
    put(g,material);
    // Close both end rings (small radii are intentional for rounded tips).
    for (const t of [0,1]) {
      const p=c.getPoint(t?end:start),pos=g.getAttribute('position'),base=t?segments*(sides+1):0,arr=[],ix=[];
      arr.push(...p.toArray());for(let i=0;i<=sides;i++)arr.push(pos.getX(base+i),pos.getY(base+i),pos.getZ(base+i));
      for(let i=1;i<=sides;i++)ix.push(0,t?i+1:i,t?i:i+1);
      const cap=new BG();cap.setAttribute('position',new FA(arr,3));cap.setIndex(ix);put(cap,material);
    }
  }
  // Convex almond patch: point corners, upper/lower lids, forward iris lenses.
  function almond(x,y,z,w,h,depth,tilt,material) {
    const g=grid((u,v)=>{
      const a=u*Math.PI*2,rr=Math.sin(v*Math.PI/2),xx=Math.cos(a)*w*rr,yy=Math.sin(a)*h*Math.pow(Math.abs(Math.sin(a)),.28)*rr;
      return [x+xx*Math.cos(tilt)-yy*Math.sin(tilt),y+xx*Math.sin(tilt)+yy*Math.cos(tilt),z+depth*Math.cos(v*Math.PI/2)];
    },40,12);put(g,material);
  }
  function eyes(y,z,x,w,h,organic=true) {
    const profile=kind==='pet'?{cy:.655,cz:.025,rx:.31,ry:.255,rz:.235,e:.91}:kind==='monster'?{cy:.95,cz:.025,rx:.40,ry:.35,rz:.285,e:.83}:{cy:1.49,cz:.105,rx:.415,ry:.37,rz:.30,e:.79};
    const faceZ=(xx,yy)=>profile.cz+profile.rz*Math.pow(Math.max(.003,1-Math.pow(Math.abs(xx)/profile.rx,2/profile.e)-Math.pow(Math.abs(yy-profile.cy)/profile.ry,2/profile.e)),profile.e/2);
    function relief(cx,cy,rx,ry,offset,depth,tilt,material,almondShape=false){
      put(grid((u,v)=>{const a=u*Math.PI*2,r=Math.sin(v*Math.PI/2),xx=Math.cos(a)*rx*r,yy=Math.sin(a)*ry*(almondShape?Math.pow(Math.abs(Math.sin(a)),.22):1)*r,px=cx+xx*Math.cos(tilt)-yy*Math.sin(tilt),py=cy+xx*Math.sin(tilt)+yy*Math.cos(tilt);return [px,py,faceZ(px,py)+offset+depth*(1-r*r)];},40,12),material);
    }
    for(const s of [-1,1]){
      const tilt=s*.11,cx=s*x;
      relief(cx,y,w*1.07,h*1.12,.002,.003,tilt,organic?m.dark:m.stoneDark,true);
      relief(cx,y+.001,w,h,.006,.005,tilt,organic?m.white:m.gold,true);
      if(organic){
        relief(s*(x-.014),y,w*.49,h*.87,.012,.003,0,kind==='pet'?m.iris:m.gold);
        relief(s*(x-.014),y,w*.24,h*.65,.017,.001,0,m.pupil);
        relief(s*(x-.014)-.024,y+.033,.017,.020,.021,.001,0,m.white);
        relief(s*(x-.014)+.020,y-.028,.007,.009,.021,.001,0,m.white);
      }else relief(cx,y,w*.76,h*.62,.012,.003,tilt,m.glow,true);
    }
  }
  function toes(x,y,z,w,material) {
    volume([x,y,z],[w,.10,w*1.1],material,.78);
    for(const s of [-1,1])line([[x+s*w*.32,y+.035,z+w*.99],[x+s*w*.32,y+.07,z+w*.73],[x+s*w*.32,y+.081,z+w*.5]],.004,kind==='boss'?m.stoneDark:m.seam,6);
  }
  function ribbonRing(y,rx,rz,material,thickness=.055) {
    const pts=Array.from({length:33},(_,i)=>{const a=i/32*Math.PI*2;return [rx*Math.sin(a),y+.018*Math.sin(a*3),rz*Math.cos(a)];});line(pts,thickness,material,12);
  }
  function plate(p,r,material=m.gold) {volume(p,r,material,.55);}
  const features=[];
  if(kind==='pet') {
    group.name='Emberveil — spirit fox';
    // Seated pear torso and four grounded, distinct paws.
    volume([0,.31,-.035],[.24,.31,.21],m.fur,.95);
    volume([0,.31,.137],[.168,.235,.085],m.cream);
    for(const s of [-1,1]) {
      sweep([[s*.13,.42,.07],[s*.15,.23,.13],[s*.16,.09,.18]],[[.075,.075],[.060,.06],[.057,.06]],m.fur);
      toes(s*.155,.075,.18,.083,m.cream);toes(s*.205,.067,-.105,.087,m.fur);
    }
    // Tail emerges from rump and curls up behind the face, wide rather than spikes.
    sweep([[.03,.22,-.17],[.32,.20,-.29],[.47,.40,-.27],[.47,.65,-.20],[.32,.79,-.15]],[[.08,.075],[.16,.13],[.17,.14],[.125,.11],[.005,.005]],m.coral,48,24);
    sweep([[.03,.22,-.17],[.32,.20,-.29],[.47,.40,-.27],[.47,.65,-.20],[.32,.79,-.15]],[[.08,.075],[.16,.13],[.17,.14],[.125,.11],[.005,.005]],m.cream,28,24,{start:.58,end:1,expand:.004});
    volume([0,.655,.025],[.31,.255,.235],m.fur,.91);
    // Broad ears have outer shell, smaller inset and a rolled inner fold.
    for(const s of [-1,1]) {
      sweep([[s*.195,.78,.01],[s*.28,.91,-.008],[s*.30,1.055,-.04],[s*.27,1.12,-.08]],[[.105,.065],[.095,.056],[.045,.035],[.002,.002]],m.fur);
      sweep([[s*.212,.817,.067],[s*.275,.94,.045],[s*.283,1.045,-.008]],[[.058,.012],[.054,.016],[.002,.002]],m.blush);
      sweep([[s*.24,.67,.07],[s*.32,.58,.055],[s*.36,.55,.012]],[[.088,.085],[.072,.065],[.002,.002]],m.fur);
      sweep([[s*.235,.58,.08],[s*.28,.51,.057],[s*.29,.47,.02]],[[.060,.055],[.040,.035],[.002,.002]],m.cream);
    }
    eyes(.682,.226,.137,.108,.068);
    // Cheek/muzzle forms flow together under the eyes; nose sits on bridge.
    volume([0,.568,.222],[.178,.091,.086],m.cream);
    volume([0,.608,.292],[.055,.034,.030],m.dark,.67);
    line([[0,.581,.302],[0,.558,.307],[-.048,.548,.299]],.006,m.seam);
    line([[0,.558,.307],[.033,.548,.303],[.061,.562,.289]],.006,m.seam);
    for(const s of [-1,1]) sweep([[s*.047,.805,.198],[s*.13,.811,.206],[s*.22,.777,.178]],[[.004,.005],[.021,.016],[.003,.004]],m.coral,24,12);
    sweep([[0,.89,.025],[-.055,.84,.18],[-.02,.773,.23]],[[.06,.04],[.07,.035],[.002,.002]],m.cream);
    ribbonRing(.433,.205,.175,m.coral,.045);
    sweep([[.135,.43,-.09],[.23,.37,-.16],[.27,.22,-.15]],[[.065,.018],[.071,.022],[.048,.018]],m.coral);
    line([[.015,.445,.198],[.022,.37,.226],[0,.335,.238]],.009,m.gold);
    plate([0,.319,.239],[.052,.066,.019],m.jade);
    line([[-.021,.323,.261],[0,.345,.263],[.021,.323,.261],[0,.300,.263],[-.021,.323,.261]],.004,m.gold,6);
    features.push('swept inset ears','almond eyes with jade irises and double catchlights','continuous curled coral tail with ivory tip','broad cheek and forehead fur locks','coral scarf with rear hanging end','engraved jade charm','four grooved paws');
  } else if(kind==='monster') {
    group.name='Brambleknuckle — woodland boar oni';
    volume([0,.51,0],[.32,.38,.24],m.plum,.85);
    for(const s of [-1,1]) {
      sweep([[s*.18,.38,0],[s*.20,.22,.01],[s*.21,.10,.045]],[[.12,.105],[.11,.10],[.10,.09]],m.plum);
      toes(s*.21,.09,.085,.132,m.earth);
      sweep([[s*.28,.64,.005],[s*.39,.47,.035],[s*.40,.34,.13]],[[.125,.12],[.10,.10],[.085,.09]],m.plum);
      volume([s*.41,.33,.15],[.115,.12,.105],m.plumLight,.78);
      for(let i=0;i<3;i++)line([[s*.41-.05+i*.045,.34,.248],[s*.41-.05+i*.045,.30,.247]],.005,m.plum,6);
    }
    volume([0,.36,0],[.325,.14,.255],m.cloth,.75);
    // Fully encircling, fluted cloth skirt with closed top/bottom and real thickness.
    for(let i=0;i<8;i++) {
      const a=i/8*Math.PI*2,sa=Math.sin(a),ca=Math.cos(a);
      sweep([[sa*.27,.47,ca*.21],[sa*.31,.35,ca*.245],[sa*.32,.26,ca*.255]],[[.12,.025],[.125,.031],[.105,.026]],i%2?m.cloth:m.clothLight,24,12);
    }
    ribbonRing(.50,.30,.23,m.earth,.044);plate([0,.50,.275],[.076,.060,.025]);
    line([[-.032,.50,.303],[.032,.50,.303]],.008,m.woodDark);
    volume([0,.95,.025],[.40,.35,.285],m.plum,.83);
    for(const s of [-1,1]) {
      sweep([[s*.30,1.03,-.005],[s*.46,1.09,-.01],[s*.51,1.20,-.03]],[[.13,.075],[.095,.06],[.005,.005]],m.plum);
      sweep([[s*.36,1.06,.057],[s*.445,1.105,.047],[s*.487,1.175,.005]],[[.067,.014],[.045,.017],[.002,.002]],m.plumLight);
    }
    eyes(1.004,.285,.174,.124,.072);
    for(const s of [-1,1]) {
      sweep([[s*.055,1.14,.254],[s*.16,1.15,.30],[s*.29,1.10,.252]],[[.025,.021],[.052,.041],[.008,.01]],m.earth);
    }
    volume([0,.837,.30],[.245,.137,.13],m.plumLight,.73);
    volume([0,.855,.397],[.176,.080,.04],m.blush,.69);
    for(const s of [-1,1]) volume([s*.086,.861,.434],[.034,.026,.012],m.earth,.8,[0,0,s*-.24]);
    line([[-.18,.766,.361],[-.075,.739,.398],[.035,.744,.405],[.166,.783,.374]],.009,m.earth);
    for(const s of [-1,1])sweep([[s*.193,.764,.35],[s*.226,.82,.388],[s*.216,.88,.403]],[[.040,.035],[.031,.027],[.002,.002]],m.cream);
    // Three directional, flattened forehead locks; small ivory oni horn.
    for(const s of [-1,0,1])sweep([[s*.075,1.27,-.04],[s*.085,1.31,.10],[s*.09+.035,1.19,.23]],[[.068,.058],[.066,.05],[.002,.002]],m.earth);
    sweep([[0,1.29,-.07],[0,1.40,-.065],[.045,1.44,-.10]],[[.065,.056],[.036,.030],[.002,.002]],m.cream);
    // Knotted back sash, curled boar tail, and seams keep rear view authored.
    plate([0,.51,-.265],[.07,.055,.035],m.clothLight);
    sweep([[.02,.49,-.27],[.09,.39,-.285],[.12,.28,-.29]],[[.055,.018],[.062,.020],[.042,.018]],m.clothLight);
    sweep([[0,.32,-.21],[.06,.36,-.34],[.14,.40,-.33],[.12,.46,-.28],[.07,.44,-.29]],[[.038,.038],[.032,.032],[.028,.028],[.023,.023],[.004,.004]],m.plum);
    // Club passes through left fist; head is a shaped tapered knot, with inlaid grain.
    sweep([[-.43,.20,.14],[-.44,.49,.14],[-.49,.78,.12],[-.53,1.01,.10]],[[.041,.041],[.043,.043],[.046,.046],[.035,.035]],m.woodDark);
    sweep([[-.47,.57,.13],[-.53,.78,.12],[-.56,.99,.10],[-.55,1.065,.09]],[[.065,.065],[.105,.092],[.096,.083],[.034,.031]],m.wood,32,16);
    for(let i=0;i<3;i++)line([[-.58+i*.052,.69,.201],[-.60+i*.05,.86,.207],[-.59+i*.04,1.015,.166]],.005,m.woodDark,6);
    for(const y of [.24,.28,.39,.43])line([[-.482,y,.139],[-.45,y+.012,.187],[-.404,y,.14],[-.45,y-.012,.095],[-.482,y,.139]],.011,m.clothLight,8);
    features.push('broad boar head and inset nostrils','upturned tiny tusks','arched mischievous brows','swept leaf ears','layered eight-panel wrap skirt','back sash and curled tail','solid wooden club with grain and bound grip','short oni horn and sculpted forelock');
  } else {
    group.name='Aurumwatch — stone lion guardian';
    volume([0,.79,-.015],[.49,.53,.32],m.stone,.65);
    for(const s of [-1,1]) {
      sweep([[s*.25,.54,0],[s*.28,.31,.015],[s*.29,.14,.06]],[[.19,.17],[.17,.15],[.16,.145]],m.stone,.0+32);
      toes(s*.29,.12,.12,.205,m.stoneLight);
      plate([s*.28,.32,.164],[.145,.135,.047],m.stoneDark);
      plate([s*.28,.33,.209],[.102,.095,.016]);
      sweep([[s*.42,.99,-.005],[s*.60,.78,.025],[s*.61,.59,.10]],[[.20,.18],[.18,.16],[.16,.15]],m.stone);
      volume([s*.64,.51,.16],[.22,.22,.19],m.stoneLight,.55);
      plate([s*.64,.57,.326],[.175,.095,.025],m.stone);
      for(let i=0;i<3;i++)line([[s*.64-.095+i*.092,.57,.355],[s*.64-.095+i*.092,.46,.352]],.009,m.stoneDark);
      volume([s*.48,1.07,0],[.28,.17,.32],m.stoneDark,.62,[0,0,s*-.2]);
      volume([s*.48,1.16,.015],[.265,.13,.315],m.gold,.66,[0,0,s*-.2]);
      volume([s*.48,1.23,.018],[.225,.105,.28],m.stoneLight,.63,[0,0,s*-.2]);
      for(const z of [-.16,0,.17])plate([s*.59,1.325,z],[.047,.022,.043]);
    }
    // Rear mane is built as a continuous cap plus eight large overlapping curved
    // lobes, each swept downward. No sphere chain or radial spike construction.
    volume([0,1.44,-.09],[.55,.53,.34],m.stoneDark,.85);
    for(let i=0;i<9;i++) {
      const a=(i/8)*Math.PI*1.7-Math.PI*.85,x=Math.sin(a),y=Math.cos(a);
      sweep([[x*.38,1.48+y*.34,.02],[x*.49,1.43+y*.39,.135],[x*.46,1.29+y*.34,.23]],[[.15,.18],[.16,.17],[.012,.018]],i%2?m.stone:m.stoneLight,32,20);
    }
    volume([0,1.49,.105],[.415,.37,.30],m.stone,.79);
    // Substantial lion muzzle with separate lower jaw and inset bounded eyes.
    volume([0,1.27,.283],[.29,.16,.15],m.stoneLight,.72);
    volume([0,1.18,.32],[.21,.075,.10],m.stoneDark,.69);
    volume([0,1.205,.365],[.18,.06,.063],m.stoneLight,.75);
    eyes(1.55,.379,.174,.125,.066,false);
    for(const s of [-1,1]) {
      sweep([[s*.035,1.675,.359],[s*.16,1.727,.38],[s*.31,1.68,.315],[s*.365,1.63,.26]],[[.035,.035],[.065,.065],[.06,.055],[.005,.008]],m.stoneLight);
      sweep([[s*.26,1.79,-.015],[s*.35,1.97,-.025],[s*.32,2.14,-.06],[s*.22,2.22,-.10]],[[.105,.09],[.09,.075],[.052,.046],[.002,.002]],m.gold,40,20);

      volume([s*.14,1.33,.389],[.156,.103,.085],m.stoneLight,.8);
      sweep([[s*.21,1.30,.377],[s*.30,1.31,.385],[s*.35,1.39,.33]],[[.048,.038],[.04,.036],[.003,.003]],m.gold);
    }
    volume([0,1.382,.445],[.096,.055,.037],m.stoneDark,.65);
    line([[0,1.34,.469],[0,1.28,.473],[-.07,1.26,.469]],.010,m.stoneDark);
    line([[0,1.28,.473],[.07,1.26,.469]],.010,m.stoneDark);
    // Engraved forehead crest and breastplate: dark recessed beds with narrow
    // gold raised borders; all are geometry, legible in neutral inspection.
    plate([0,1.84,.26],[.105,.115,.035],m.gold);
    plate([0,1.84,.295],[.075,.086,.014],m.stoneDark);
    line([[0,1.90,.316],[-.033,1.84,.316],[0,1.80,.316],[.033,1.84,.316],[0,1.90,.316]],.009,m.gold);
    plate([0,.91,.329],[.29,.23,.06],m.gold);
    plate([0,.92,.382],[.248,.187,.026],m.stoneDark);
    for(const s of [-1,1])line([[s*.19,1.02,.415],[s*.08,1.02,.416],[s*.08,.93,.416],[s*.16,.93,.416],[s*.16,.84,.416],[s*.055,.84,.416]],.012,m.gold);
    plate([0,.94,.419],[.036,.075,.019],m.glow);
    ribbonRing(.64,.435,.31,m.gold,.035);
    for(const s of [-1,0,1])plate([s*.22,.51,.297],[.095,.14,.043],m.stoneDark);
    // Back armor, recessed spine motif and a full sculptural lion tail.
    plate([0,.95,-.34],[.27,.25,.055],m.gold);
    plate([0,.95,-.393],[.23,.21,.018],m.stoneDark);
    line([[-.14,1.08,-.419],[0,1.13,-.42],[.14,1.08,-.419],[0,.98,-.42],[-.14,1.08,-.419]],.012,m.gold);
    line([[0,.98,-.42],[0,.80,-.42]],.012,m.gold);
    sweep([[0,.52,-.29],[.22,.42,-.46],[.46,.50,-.49],[.52,.72,-.43]],[[.072,.068],[.065,.06],[.06,.055],[.04,.035]],m.stone);
    sweep([[.50,.61,-.47],[.55,.78,-.43],[.48,.88,-.40],[.45,.91,-.38]],[[.08,.065],[.115,.085],[.07,.06],[.003,.003]],m.stoneDark);
    features.push('lion muzzle and curled gilded whiskers','bounded emissive almond eye inserts','broad carved eyebrows','curving twin horns','continuous rear mane cap and swept lobes','layered shoulder armor','stout grooved fists','engraved breast and back plates','stone lion tail');
  }
  // Bake material batches. Attribute-consistent nonindexed merging needs no addons.
  let triangles=0, sourceParts=0;
  for(const [material,geometries] of batches) {
    let count=0;const parts=geometries.map(g=>{const n=g.index?g.toNonIndexed():g;count+=n.getAttribute('position').count;return n;});
    const positions=new Float32Array(count*3),normals=new Float32Array(count*3);let offset=0;
    for(const g of parts) {positions.set(g.getAttribute('position').array,offset);normals.set(g.getAttribute('normal').array,offset);offset+=g.getAttribute('position').array.length;}
    const g=new BG();g.setAttribute('position',new FA(positions,3));g.setAttribute('normal',new FA(normals,3));
    const mesh=new THREE.Mesh(g,material);mesh.name=`${kind} / ${material.color.getHexString()} material batch`;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    triangles+=count/3;sourceParts+=geometries.length;
    for(const g of new Set([...geometries,...parts]))g.dispose();
  }
  group.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(group),height={pet:1.05,monster:1.45,boss:2.25}[kind],scale=height/(bounds.max.y-bounds.min.y);
  // Bake normalization, preserving identity root transforms for host animation.
  const cx=(bounds.max.x+bounds.min.x)/2,cz=0;
  for(const mesh of group.children) {mesh.geometry.translate(-cx,-bounds.min.y,-cz);mesh.geometry.scale(scale,scale,scale);mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();}
  group.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(group),size=box.getSize(new V());
  const stats={triangles,drawCalls:group.children.length,meshes:group.children.length,materials:batches.size,sourceParts,height:size.y,bounds:{min:box.min.toArray(),max:box.max.toArray()}};
  const target=[0,height*.51,0],distance=Math.max(height,size.x)*2.25;
  const views={front:{position:[0,height*.57,distance],target},side:{position:[distance,height*.57,0],target},back:{position:[0,height*.57,-distance],target},face:{position:[0,height*.73,height*1.1],target:[0,height*(kind==='pet'?.65:kind==='monster'?.69:.69),height*.12]}};
  const metadata={kind,name:group.name,original:true,license:'Original procedural geometry; no third-party assets',front:'+Z',groundY:0,normalizedHeight:height,features,style:'Rounded chibi; swept solid forms; restrained matte PBR',animation:'Static grounded inspection pose; update is intentionally a no-op'};
  group.userData={...metadata,stats};
  return {group,update(_t){},stats,views,metadata};
}
