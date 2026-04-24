const fs = require('fs');
const glob = require('glob');

const replacements = [
  { search: /#001a54/g, replace: 'latam-indigo/90' },
  { search: /bg-\[#002169\]/g, replace: 'bg-latam-indigo' },
  { search: /#002169/g, replace: '#1B0088' }
];

const files = [
  './components/SuggestionSection.tsx',
  './components/LATAMScheduleTable.tsx',
  './app/dashboard/admin/page.tsx',
  './app/dashboard/supervisor/page.tsx',
  './app/dashboard/employee/page.tsx',
  './app/register/page.tsx',
  './public/manifest.json'
];

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const r of replacements) {
      if (r.search.test(content)) {
        content = content.replace(r.search, r.replace);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  } catch(e) {
    console.error(`Error processing ${file}:`, e.message);
  }
}
