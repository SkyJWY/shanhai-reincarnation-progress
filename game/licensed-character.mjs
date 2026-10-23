import {GLTFLoader} from './licensed-vendor/loaders/GLTFLoader.js';
// Only a licensed third-party asset is loaded here. No procedural hero fallback.
export async function createLicensedCharacter(THREE){
 const base='./assets/licensed-hero/';
 const infoResponse=await fetch(base+'source.json');if(!infoResponse.ok)throw new Error('角色来源说明未能加载');
 const info=await infoResponse.json();
 const gltf=await new GLTFLoader().loadAsync(base+'hero.glb');
 const group=new THREE.Group(),model=gltf.scene;group.add(model);model.updateMatrixWorld(true);
 let bounds=new THREE.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y;
 if(!Number.isFinite(height)||height<.01)throw new Error('角色模型尺寸无效');
 model.scale.multiplyScalar(1.85/height);model.updateMatrixWorld(true);bounds=new THREE.Box3().setFromObject(model);
 const center=bounds.getCenter(new THREE.Vector3());model.position.x-=center.x;model.position.y-=bounds.min.y;model.position.z-=center.z;
 let triangles=0,meshes=0,skinnedMeshes=0;
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;if(o.isSkinnedMesh)skinnedMeshes++;}});
 const mixer=new THREE.AnimationMixer(model),clips=gltf.animations;
 const clip=clips.find(c=>/idle|standing|stand/i.test(c.name))||clips[0];if(clip)mixer.clipAction(clip).play();
 const stats={name:info.name,author:info.author,license:info.license,source:info.source,height:1.85,procedural:false,externalAssets:1,triangles,meshes,skinnedMeshes,animations:clips.map(c=>c.name),activeAnimation:clip?.name||null};
 group.userData.characterStats=stats;let previous=0;
 return {group,stats,update(elapsed){const dt=Math.max(0,Math.min(elapsed-previous,.05));previous=elapsed;if(clip)mixer.update(dt);}};
}
