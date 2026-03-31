const fs = require('fs');

try {
  let code = fs.readFileSync('src/pages/Ide.tsx', 'utf8');

  // 1. Remove the text description below the memory diagram
  const textBelowRegex = /\{\/\* Text Below \*\/\}[\s\S]*?<\/div>\n\s*<\/div>\n\s*<\/div>/;
  const replacement1 = `</div>\n                  </div>\n                </div>`;
  code = code.replace(textBelowRegex, replacement1);

  // 2. Adjust the left container (memory layout container) so it doesn't scroll 
  // Change `overflow-y-auto` to `overflow-hidden` or remove it
  const layoutContainerRegex = /<div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto relative" id="memory-layout-container">/;
  const replacement2 = `<div className="flex-1 flex flex-col items-center justify-center p-4 relative" id="memory-layout-container">`;
  code = code.replace(layoutContainerRegex, replacement2);

  // 3. Fix SVG arrows alignment
  // Adjust the coordinates to point more accurately from the Stack block to the Stack View panel.
  // The left panel (diagram) is centered. The stack view is on the right.
  // Using relative SVG coordinates can be tricky across responsive screens.
  // Let's adjust the path to make it look better based on the image provided.
  const svgRegex = /\{\/\* Connecting Visual SVG \*\/\}[\s\S]*?<\/div>/;
  
  // Create a more robust visual connection using a flex container that naturally aligns with the elements.
  // We will position the SVG exactly between the two blocks.
  const newSvg = `{/* Connecting Visual SVG */}
                <div className="hidden lg:flex w-16 flex-shrink-0 items-center justify-center relative z-0">
                   <svg width="100%" height="100%" className="absolute inset-0" style={{ minHeight: '400px' }}>
                    <defs>
                      <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                      </marker>
                    </defs>
                    {/* Upper arrow: from top-right of Stack block to top-left of Stack View */}
                    <path d="M 0,120 L 64,50" stroke="#ef4444" strokeWidth="2" fill="none" markerEnd="url(#arrow-red)" />
                    {/* Lower arrow: from bottom-right of Stack block to bottom-left of Stack View */}
                    <path d="M 0,200 L 64,380" stroke="#ef4444" strokeWidth="2" fill="none" markerEnd="url(#arrow-red)" />
                  </svg>
                </div>`;
                
  code = code.replace(svgRegex, newSvg);

  fs.writeFileSync('src/pages/Ide.tsx', code);
  console.log('Ide.tsx layout adjusted successfully.');
} catch (err) {
  console.error('Error:', err);
}