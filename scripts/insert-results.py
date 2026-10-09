from pathlib import Path
import json,re,statistics
ROOT=Path(__file__).resolve().parents[1]
def esc(s):return s.replace('_',r'\_').replace('%',r'\%').replace('&',r'\&')
data=json.loads((ROOT/'results/summaries.json').read_text())['rows']
sections=[]
for file in sorted(set(r['file'] for r in data)):
 rows=[r for r in data if r['file']==file]
 label='Actual application server activation' if file=='private-lifecycle.json' else file.replace('browser-','').replace('.json','')
 header=r'\subsection{'+esc(label)+r'''}
\begingroup\scriptsize\setlength{\tabcolsep}{3pt}
\begin{longtable}{P{1.8in}P{.35in}r r r P{.95in}P{.95in}r}\toprule
Workload & Mode & $n$ & Median & p95 & Median 95\% CI & p95 95\% CI & Fail\\\midrule\endhead
'''
 body=''
 for r in rows:
  name=r['name'].replace('application.','app.').replace('library.','lib.')
  interval=lambda ci:'--' if ci is None else f"[{ci[0]:.2f}, {ci[1]:.2f}]"
  number=lambda x:'--' if x is None else f'{x:.2f}'
  body+=r'\path{'+name+'} & '+('fresh' if r['mode']=='cold' else 'init.')+f" & {r['n']} & {number(r['median'])} & {number(r['p95'])} & {interval(r['medianCI'])} & {interval(r['p95CI'])} & {r['failures']}"+r'\\'+'\n'
 body+=r'\bottomrule\end{longtable}\endgroup All latencies and intervals are in milliseconds; CI is a conditional empirical bootstrap interval.'+'\n'
 sections.append(header+body)
if not any('browser-' in r['file'] for r in data):sections.append(r'Browser collection is running; this intermediate rendering contains only the completed activation observations. The final artifact must identify which browser runs completed.')
benchmark='\n'.join(sections)
p=json.loads((ROOT/'results/protocol-baseline.json').read_text());rs=p['rows']
protocol=r'\begin{table}[ht]\centering\begin{tabular}{lrr}\toprule Component & Median ms & p95 ms\\\midrule'+'\n'
def q(a,t):a=sorted(a);p=(len(a)-1)*t;i=int(p);return a[i]+(a[min(i+1,len(a)-1)]-a[i])*(p-i)
for k,name in [('setupMs','Disposable key/descriptor setup'),('submitMs','Encryption and guest commitment'),('acceptMs','Verification and local opening')]:protocol+=f"{name} & {q([r[k] for r in rs],.5):.3f} & {q([r[k] for r in rs],.95):.3f}"+r'\\'+'\n'
protocol+=r'\bottomrule\end{tabular}\caption{One hundred Node.js baseline observations; setup and network/enrollment boundaries are separate.}\end{table}'
comparative=r'\begin{table}[ht]\centering\small\begin{tabular}{P{1.2in}P{2.7in}P{2.1in}}\toprule Implementation & Executed evidence & Comparative status\\\midrule 1Bridge pinned source & Six real-function/database cases, seven existing persisted integration cases, selected crypto/route tests & First-implementation pilot; limited boundary doubles.\\ Nextcloud E2EE 1.17.1 & Pinned source inspected; compatible deployment/calibration under preparation & No complete encrypted client journey or comparative lifecycle result asserted.\\ Experimental baseline & Signed-envelope countermodels and 100 local timing observations & Synthetic protocol baseline, not an additional deployed product.\\\bottomrule\end{tabular}\caption{Current evidence boundary. Downloading or inspecting a second system is not a completed comparison.}\end{table}'
for p in (ROOT/'papers').glob('*.tex'):
 s=p.read_text()
 for name,value in [('benchmark-results',benchmark),('protocol-results',protocol),('comparative-results',comparative)]:
  pattern=r'(% BEGIN AUTO: '+name+r'\n).*?(% END AUTO: '+name+r')'
  if re.search(pattern,s,re.S):s=re.sub(pattern,lambda m:m.group(1)+value+'\n'+m.group(2),s,flags=re.S)
  else:s=s.replace('\\input{'+name+'.tex}',value)
 p.write_text(s)
print('Inserted completed results into standalone LaTeX documents')
