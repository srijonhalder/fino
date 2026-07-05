const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
    });
}

// 1. Navbar.jsx - Let's just restore it cleanly
const navbarPath = path.join(srcDir, 'components', 'common', 'Navbar.jsx');
if (fs.existsSync(navbarPath)) {
    let content = fs.readFileSync(navbarPath, 'utf-8');
    
    // Fix the broken <div> injection issue... find where we did it and fix it
    content = content.replace(/\{!\s*isConnected \? \([\s\S]*?\{walletAddress\?.slice\(-4\)\}\s*<\/div>/, 
`{!isConnected ? (
              <button 
                onClick={connectWallet} 
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition"
              >
                Connect Freighter
              </button>
            ) : (
              <>
                <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 border flex items-center shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
                </div>`);
                
    // Fix any stray <div> errors by matching the exact replaced content
    fs.writeFileSync(navbarPath, content, 'utf-8');
}


walk(srcDir, (filePath) => {
    if (!filePath.endsWith('.jsx') && !filePath.endsWith('.js')) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Remove any wagmi, viem, rainbowkit imports
    content = content.replace(/import\s*[\s\S]*?\s*from\s*['"]wagmi['"];?\n?/g, '');
    content = content.replace(/import\s*[\s\S]*?\s*from\s*['"]viem['"];?\n?/g, '');
    content = content.replace(/import\s*[\s\S]*?\s*from\s*['"]@rainbow-me\/rainbowkit['"];?\n?/g, '');
    
    // Remove ethers leftover parsing
    content = content.replace(/import\s*\{\s*ethers\s*\}\s*from\s*['"]ethers['"];?\n?/g, '');
    content = content.replace(/ethers\.parseEther\((.*?)\)/g, '$1'); 
    content = content.replace(/ethers\.formatEther\((.*?)\)/g, '$1'); 

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Cleaned Imports:', filePath);
    }
});
