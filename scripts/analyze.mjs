import {readdir,readFile,writeFile} from 'node:fs/promises';import {summary} from './statistics.mjs';
const out=[];
for(const file of await readdir('results')){
 if(!file.endsWith('.json')||file.includes('account-root')||file==='summaries.json')continue;
 const data=JSON.parse(await readFile('results/'+file));const rows=data.trials||data.rows;
 if(!rows?.some(r=>'ms'in r))continue;
 const groups=new Map();for(const r of rows){if(!('ms'in r))continue;const k=r.name+'|'+r.mode;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)}
 for(const [k,rs] of groups){const [name,mode]=k.split('|');out.push({file,name,mode,...summary(rs)})}
}
await writeFile('results/summaries.json',JSON.stringify({method:'Linear-interpolated quantiles; deterministic 1000-resample empirical bootstrap over individual trials. Conditional intervals do not account for serial correlation or population/device variability.',rows:out},null,2)+'\n');
console.log(out.length+' workload summaries written');
