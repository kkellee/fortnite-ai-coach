let opening;
function db(){return opening ||= new Promise((resolve,reject)=>{const r=indexedDB.open('fortnite-coach-evidence',1);r.onupgradeneeded=()=>r.result.createObjectStore('files',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>{opening=null;reject(r.error);};});}
async function transaction(mode,fn){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('files',mode),r=fn(t.objectStore('files'));t.oncomplete=()=>resolve(r.result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('Storage aborted'));});}
export const putFile=(id,file)=>transaction('readwrite',s=>s.put({id,file}));
export const getFile=id=>transaction('readonly',s=>s.get(id));
export const deleteFile=id=>transaction('readwrite',s=>s.delete(id));
export const clearFiles=()=>transaction('readwrite',s=>s.clear());
export function validateFile(file,existing){
 if(!/\.(mp4|webm|png|jpe?g|webp|replay)$/i.test(file.name))throw Error('Поддерживаются MP4, WebM, PNG, JPG, WebP и .replay.');
 if(existing.length>=3)throw Error('В одном разборе до трёх файлов. Удали лишний, чтобы добавить новый.');
 if(file.size+existing.reduce((n,f)=>n+f.size,0)>100*1024*1024)throw Error('Максимум 100 МБ на разбор. Вырежи отдельный момент.');
}
