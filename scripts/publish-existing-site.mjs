// Minimal fallback for an existing Sites source checkout when the bundled workflow is unavailable.
// Credential is accepted only in memory over stdin, never saved or printed.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const git='C:/Program Files/Git/cmd/git.exe';
const node=process.execPath;
const run=(command,args,cwd,env=process.env)=>new Promise((resolve,reject)=>{
 const p=spawn(command,args,{cwd,env,stdio:['ignore','pipe','pipe']});let output='';
 p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);
 p.on('error',reject);p.on('close',code=>code===0?resolve(output.trim()):reject(new Error(`${path.basename(command)} failed (${code}): ${output}`)));
});
console.log('READY_FOR_SITE_INPUT');
let input='';
process.stdin.setEncoding('utf8');
process.stdin.on('data',async chunk=>{
 input+=chunk;if(!input.includes('\n'))return;process.stdin.pause();
 try{
  const p=JSON.parse(input.split('\n')[0]),c=p.credential;
  if(c.auth_mode!=='http_extra_header'||!c.remote_url.startsWith('https://git.chatgpt-team.site/')||c.branch!=='main')throw Error('Unexpected existing source credential');
  const cwd=path.resolve(p.checkout),hosting=JSON.parse(fs.readFileSync(path.join(cwd,'.openai/hosting.json')));
  if(hosting.project_id!==p.project_id)throw Error('Project mismatch');
  const base=['-c',`safe.directory=${cwd.replaceAll('\\','/')}`];
  const head=await run(git,[...base,'rev-parse','HEAD'],cwd);
  if(head!==p.expected_head)throw Error('Publisher HEAD changed; inspect before continuing');
  await run(git,[...base,'add','--',...p.files],cwd);
  await run(git,[...base,'commit','-m','Correct observatory approach and finish arboretum avenue'],cwd);
  const sha=await run(git,[...base,'rev-parse','HEAD'],cwd);
  console.log('SOURCE_COMMIT',sha);
  await run(node,['node_modules/typescript/bin/tsc','--noEmit'],cwd);
  console.log(await run(node,['--max-old-space-size=4096','node_modules/vite/bin/vite.js','build','--config','vite.static.config.ts'],cwd));
  const env={...process.env,GIT_CONFIG_COUNT:'2',GIT_CONFIG_KEY_0:'safe.directory',GIT_CONFIG_VALUE_0:cwd.replaceAll('\\','/'),GIT_CONFIG_KEY_1:`http.${c.remote_url}.extraHeader`,GIT_CONFIG_VALUE_1:`Authorization: Bearer ${c.token}`,GIT_TERMINAL_PROMPT:'0'};
  await run(git,['push',c.remote_url,`HEAD:refs/heads/${c.branch}`],cwd,env);
  await run('C:/Program Files/Git/usr/bin/tar.exe',['--force-local','-czf',p.archive,'-C',cwd,'.openai/hosting.json','dist/client'],cwd);
  console.log('SITE_SOURCE_PUSHED_AND_PACKAGED',JSON.stringify({commit_sha:sha,archive:p.archive}));process.exit(0);
 }catch(e){console.error(e.message);process.exit(1);}
});
