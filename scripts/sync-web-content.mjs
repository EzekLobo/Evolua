import {readFileSync,writeFileSync} from 'node:fs';
const source=new URL('../app/src/main/assets/study_content.json',import.meta.url);
const target=new URL('../web/content/metodologia.json',import.meta.url);
const parsed=JSON.parse(readFileSync(source,'utf8'));
writeFileSync(target,JSON.stringify(parsed,null,2)+'\n','utf8');
console.log('Conteúdo Android sincronizado com a Evolua web. Execute npm test para validar.');
