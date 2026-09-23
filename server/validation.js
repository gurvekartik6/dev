const arrays=['navigation','stats','announcements','events','timeline','team','projects','media','achievements'];
const strings=['site.name','site.subtitle','site.tagline','site.description','site.email'];
function get(obj,path){return path.split('.').reduce((a,k)=>a?.[k],obj)}
function validateContent(value){
  if(!value || typeof value!=='object' || Array.isArray(value)) throw new Error('Content must be an object');
  for(const key of arrays) if(!Array.isArray(value[key])) throw new Error(`${key} must be an array`);
  for(const key of strings) if(typeof get(value,key)!=='string') throw new Error(`${key} must be a string`);
  if(!value.navigation.every(x=>x && typeof x.label==='string' && typeof x.path==='string')) throw new Error('Invalid navigation item');
  for(const e of value.events){ if(!e.id||!e.title||!e.date) throw new Error('Every event needs id, title and date'); if(!Array.isArray(e.links)) throw new Error('Event links must be an array'); for(const l of e.links) if(!l.label||!l.url) throw new Error('Every event link needs label and url'); }
  for(const m of value.team) if(!m.id||!m.name||!m.role) throw new Error('Every team member needs id, name and role');
  return value;
}
module.exports={validateContent};
