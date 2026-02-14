#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, '../src/data/degrees.json');
const degrees = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const EN_SUFFIX = ' This programme prepares you for a wide range of professional paths.';
const IT_SUFFIX = ' Questo corso ti prepara per una varietà di percorsi professionali.';

degrees.forEach((d) => {
  if (d.description?.en && !d.description.en.endsWith(EN_SUFFIX)) d.description.en = (d.description.en.trim() + EN_SUFFIX).trim();
  if (d.description?.it && !d.description.it.endsWith(IT_SUFFIX)) d.description.it = (d.description.it.trim() + IT_SUFFIX).trim();
});

fs.writeFileSync(dataPath, JSON.stringify(degrees, null, 2) + '\n', 'utf8');
console.log('Doubled', degrees.length, 'degree descriptions.');
