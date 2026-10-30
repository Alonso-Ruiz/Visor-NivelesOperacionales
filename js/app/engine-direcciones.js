(function(root){
  'use strict';
  const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[ñ]/gi,'n').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const numberKey=s=>normalize(s).replace(/\s/g,'');
  const streetWords=s=>normalize(s).split(' ').filter(t=>t&&!['AV','AVENIDA','JR','JIRON','CALLE','CA','PSJ','PASAJE','N','NUMERO'].includes(t));
  const collator=new Intl.Collator('es',{numeric:true,sensitivity:'base'});
  function create(data){
    const codeLots=new Map(),byLot=new Map(),byStreet=data.streets.map(()=>[]);
    data.lots.forEach((lot,i)=>{if(lot[0]){if(!codeLots.has(lot[0]))codeLots.set(lot[0],[]);codeLots.get(lot[0]).push(i);}});
    const streetNames=data.streets.map(v=>normalize(v[1]+' '+v[2]));
    const addresses=data.addresses.map((a,i)=>{
      const value={id:i,code:a[0],street:a[1],number:a[2],sourceCount:a[3],numberKey:numberKey(a[2]),mapped:codeLots.has(a[0])};
      if(!byLot.has(a[0]))byLot.set(a[0],[]);byLot.get(a[0]).push(value);byStreet[a[1]].push(value);return value;
    });
    function search(query,door='',limit=12){
      let q=String(query??'').trim(),n=String(door??'').trim();
      if(!q&&!n)return {kind:'empty',total:0,items:[]};
      if(!n&&/^\d{1,8}$/.test(q)){
        const matches=[...codeLots.entries()].filter(([code])=>code.startsWith(q)).sort((a,b)=>collator.compare(a[0],b[0]));
        return {kind:'lots',total:matches.length,items:matches.slice(0,limit).map(([code,ids])=>({code,ids}))};
      }
      // A full address may also be entered in the street field.
      if(!n){const match=q.match(/^(.*?)\s+(\d+[A-Za-z]?(?:[- ]+[A-Za-z])?|S\/?N)\s*$/i);if(match&&match[1]){q=match[1];n=match[2];}}
      const words=streetWords(q),nk=numberKey(n);
      const ss=[];
      data.streets.forEach((s,i)=>{if(words.every(w=>streetNames[i].includes(w)))ss.push(i);});
      if(!nk){
        const items=ss.filter(i=>byStreet[i].length).map(i=>({street:i,count:new Set(byStreet[i].map(a=>a.numberKey)).size,mappedCount:byStreet[i].filter(a=>a.mapped).length}));
        items.sort((a,b)=>Number(b.mappedCount>0)-Number(a.mappedCount>0)||collator.compare(data.streets[a.street][2],data.streets[b.street][2]));
        return {kind:'streets',total:items.length,items:items.slice(0,limit),query:q};
      }
      const addresses=ss.flatMap(i=>byStreet[i]);
      const exact=addresses.filter(a=>a.numberKey===nk);
      const found=exact.length?exact:addresses.filter(a=>a.numberKey.startsWith(nk));
      found.sort((a,b)=>Number(b.mapped)-Number(a.mapped)||collator.compare(a.code,b.code));
      return {kind:'addresses',total:found.length,items:found.slice(0,limit),query:q,door:n};
    }
    function streetAddresses(id,limit=80){
      const arr=[...byStreet[id]].sort((a,b)=>collator.compare(a.number,b.number)||collator.compare(a.code,b.code));
      return {kind:'addresses',total:arr.length,items:arr.slice(0,limit),street:id};
    }
    function groups(code){
      const map=new Map();(byLot.get(code)||[]).forEach(a=>{if(!map.has(a.street))map.set(a.street,[]);map.get(a.street).push(a);});
      return [...map].map(([street,items])=>({street,items:items.sort((a,b)=>collator.compare(a.number,b.number))})).sort((a,b)=>collator.compare(data.streets[a.street][2],data.streets[b.street][2]));
    }
    return {search,streetAddresses,groups,codeLots,byLot,byStreet,addresses,normalize,numberKey,collator};
  }
  root.LoteSearch={create,normalize,numberKey};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.LoteSearch;
})(typeof window!=='undefined'?window:globalThis);
