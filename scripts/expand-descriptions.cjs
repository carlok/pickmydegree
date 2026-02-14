#!/usr/bin/env node
/**
 * Replace the generic "This programme prepares you for a wide range of professional paths"
 * (and Italian equivalent) with longer, category-specific and degree-specific descriptions.
 */
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../src/data/degrees.json');
const degrees = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const EN_GENERIC = ' This programme prepares you for a wide range of professional paths.';
const IT_GENERIC = ' Questo corso ti prepara per una varietà di percorsi professionali.';

const CATEGORY_EXPANSIONS = {
  'Business & Law': {
    en: 'You will develop skills in analysis, strategy, and communication. Graduates often work in consulting, corporate management, finance, public administration, or legal and regulatory roles. The degree combines theory with practical projects and case studies.',
    it: 'Acquisirai competenze in analisi, strategia e comunicazione. I laureati lavorano spesso in consulenza, direzione aziendale, finanza, amministrazione pubblica o in ambito legale e normativo. Il corso unisce teoria, progetti pratici e casi studio.',
  },
  'Arts & Design': {
    en: 'The programme combines creative practice with technical and project skills. Career paths include design studios, cultural institutions, freelancing, media and production. You will build a portfolio and work on real briefs and collaborations.',
    it: 'Il corso unisce pratica creativa, competenze tecniche e di progetto. Gli sbocchi includono studi di design, istituzioni culturali, libera professione, media e produzione. Costruirai un portfolio e lavorerai su brief e collaborazioni reali.',
  },
  'Humanities': {
    en: 'You will develop critical thinking, research, and communication skills. Graduates find roles in education, publishing, cultural heritage, the public sector, and international organizations. The programme emphasises analysis of texts, contexts, and ideas.',
    it: 'Svilupperai pensiero critico, ricerca e comunicazione. I laureati lavorano in istruzione, editoria, patrimonio culturale, settore pubblico e organizzazioni internazionali. Il corso valorizza l’analisi di testi, contesti e idee.',
  },
  'STEM': {
    en: 'The programme combines theory, lab work, and real-world applications. Careers span industry R&D, healthcare, tech companies, research institutions, and innovation-driven sectors. You will gain both depth in your field and transferable analytical skills.',
    it: 'Il corso unisce teoria, laboratorio e applicazioni concrete. Gli sbocchi spaziano da R&D industriale, sanità, aziende tech, enti di ricerca e settori innovativi. Acquisirai competenze specialistiche e capacità analitiche trasferibili.',
  },
  'Social Sciences': {
    en: 'You will develop analytical and empirical skills for understanding society and policy. Graduates work in research, public policy, NGOs, market research, and public administration. The programme covers methods, data, and critical analysis of institutions and behaviour.',
    it: 'Svilupperai competenze analitiche ed empiriche per capire società e politiche. I laureati lavorano in ricerca, politiche pubbliche, ONG, ricerche di mercato e amministrazione pubblica. Il corso include metodi, dati e analisi critica di istituzioni e comportamenti.',
  },
  'Health & Medicine': {
    en: 'The programme prepares you for clinical, diagnostic, or therapeutic roles in healthcare. Graduates work in hospitals, clinics, public health, pharmaceutical and biotech sectors, or research. You will combine scientific rigour with patient-centred and evidence-based practice.',
    it: 'Il corso ti prepara per ruoli clinici, diagnostici o terapeutici nella sanità. I laureati lavorano in ospedali, cliniche, sanità pubblica, settore farmaceutico e biotech o in ricerca. Unirai rigore scientifico a pratica centrata sul paziente e basata su evidenze.',
  },
  'Education': {
    en: 'You will develop pedagogical, psychological, and organisational skills for teaching and education. Graduates work in schools, training, educational design, or policy. The programme combines theory with placements and reflective practice.',
    it: 'Svilupperai competenze pedagogiche, psicologiche e organizzative per l’insegnamento e l’educazione. I laureati lavorano in scuole, formazione, progettazione educativa o nelle politiche. Il corso unisce teoria, tirocini e pratica riflessiva.',
  },
};

// Fallback for any category not in the map
const DEFAULT_EXPANSION = {
  en: 'You will build strong analytical and professional skills. Graduates pursue careers in industry, public sector, research, or entrepreneurship depending on their specialisation and interests.',
  it: 'Acquisirai solide competenze analitiche e professionali. I laureati lavorano in industria, settore pubblico, ricerca o imprenditoria in base a specializzazione e interessi.',
};

function expandDescription(desc, generic, expansion) {
  if (!desc || typeof desc !== 'string') return desc;
  const idx = desc.indexOf(generic);
  if (idx === -1) return desc;
  const firstPart = desc.slice(0, idx).trim();
  return firstPart + ' ' + expansion;
}

let updated = 0;
degrees.forEach((d) => {
  const cat = d.category || 'STEM';
  const expansion = CATEGORY_EXPANSIONS[cat] || DEFAULT_EXPANSION;

  if (d.description?.en && d.description.en.includes(EN_GENERIC)) {
    let newEn = expandDescription(d.description.en, EN_GENERIC, expansion.en);
    const nameEn = d.name?.en || d.name?.it || 'this field';
    newEn += ` Graduates in ${nameEn} are well placed for roles that value both specialist knowledge and problem-solving.`;
    d.description.en = newEn;
    updated++;
  }
  if (d.description?.it && d.description.it.includes(IT_GENERIC)) {
    let newIt = expandDescription(d.description.it, IT_GENERIC, expansion.it);
    const nameIt = d.name?.it || d.name?.en || 'questo ambito';
    newIt += ` I laureati in ${nameIt} sono ben posizionati per ruoli che valorizzano conoscenza specialistica e capacità di problem solving.`;
    d.description.it = newIt;
  }
});

fs.writeFileSync(dataPath, JSON.stringify(degrees, null, 2) + '\n', 'utf8');
console.log('Expanded descriptions for', updated, 'degrees (generic sentence replaced with category-specific and degree-specific text).');
