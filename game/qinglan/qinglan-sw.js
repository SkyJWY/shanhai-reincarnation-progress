const VERSIONS={"index.wasm": "fc74679e3b97f768", "index.audio.worklet.js": "5b476a9c9ce642c0", "index.js": "33c94cb3175f3333", "index.audio.position.worklet.js": "be33985bc7160d6b", "scene-1d47235c336e49a8.pck": "1d47235c336e49a8", "loading.webp": "85ae808289a9e8a7"};
const CACHE='qinglan-runtime-assets-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url),name=u.pathname.split('/').pop();
 if(event.request.method!=='GET'||u.origin!==self.location.origin||!VERSIONS[name])return;
 event.respondWith((async()=>{
  let cache;try{cache=await caches.open(CACHE);}catch{return fetch(event.request);}
  const key=new URL('./'+name,self.location.href);key.search='content='+VERSIONS[name];
  const hit=await cache.match(key.href);
  if(hit){const client=await self.clients.get(event.clientId);client?.postMessage({type:'qinglan-cache-hit',file:name});return hit;}
  const response=await fetch(event.request);
  if(response.ok){const saving=cache.put(key.href,response.clone()).catch(()=>{});event.waitUntil(saving);}
  return response;
 })());
});
