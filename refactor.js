const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function camelize(str) {
  return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

walkDir(path.join(__dirname, 'src/app'), (filePath) => {
  if (filePath.endsWith('.ts') && !filePath.endsWith('.spec.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if it has an inline template
    const templateMatch = content.match(/template:\s*`([\s\S]*?)`,?\s*(?:styles:|})/);
    const templateMatchSingle = content.match(/template:\s*'([\s\S]*?)',?\s*(?:styles:|})/);
    const templateMatchDouble = content.match(/template:\s*"([\s\S]*?)",?\s*(?:styles:|})/);
    
    let templateContent = '';
    let hasTemplate = false;
    
    if (templateMatch) {
      templateContent = templateMatch[1];
      content = content.replace(/template:\s*`[\s\S]*?`,?/, `templateUrl: './${path.basename(filePath).replace('.ts', '.html')}',`);
      hasTemplate = true;
    } else if (templateMatchSingle) {
      templateContent = templateMatchSingle[1];
      content = content.replace(/template:\s*'[\s\S]*?',?/, `templateUrl: './${path.basename(filePath).replace('.ts', '.html')}',`);
      hasTemplate = true;
    } else if (templateMatchDouble) {
      templateContent = templateMatchDouble[1];
      content = content.replace(/template:\s*"[\s\S]*?",?/, `templateUrl: './${path.basename(filePath).replace('.ts', '.html')}',`);
      hasTemplate = true;
    }
    
    if (!hasTemplate) return;

    // Check if it has inline styles
    let styleContent = '';
    const styleMatch = content.match(/styles:\s*\[([\s\S]*?)\]/);
    if (styleMatch) {
      styleContent = styleMatch[1].replace(/`/g, '').trim(); // simplistic but works for our empty []
      content = content.replace(/styles:\s*\[[\s\S]*?\]/, `styleUrl: './${path.basename(filePath).replace('.ts', '.css')}'`);
    } else {
      // If no styles array but has template, let's inject styleUrl after templateUrl
      content = content.replace(/templateUrl:\s*'(.*?)'(,?)/, `templateUrl: '$1',\n  styleUrl: './${path.basename(filePath).replace('.ts', '.css')}'$2`);
    }
    
    // Remove trailing comma from last property in @Component to avoid trailing comma issues though angular compiler might not care
    
    // Determine Component Class Name
    const classMatch = content.match(/export class (\w+)/);
    const className = classMatch ? classMatch[1] : 'UnknownComponent';

    // Write new files
    const htmlPath = filePath.replace('.ts', '.html');
    const cssPath = filePath.replace('.ts', '.css');
    const specPath = filePath.replace('.ts', '.spec.ts');
    
    fs.writeFileSync(htmlPath, templateContent.trim());
    fs.writeFileSync(cssPath, styleContent);
    
    const specContent = `import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ${className} } from './${path.basename(filePath).replace('.ts', '')}';

describe('${className}', () => {
  let component: ${className};
  let fixture: ComponentFixture<${className}>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [${className}]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(${className});
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
`;
    fs.writeFileSync(specPath, specContent);
    fs.writeFileSync(filePath, content);
    
    console.log(`Refactored ${filePath}`);
  }
});
