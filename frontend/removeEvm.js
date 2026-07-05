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

walk(srcDir, (filePath) => {
    if (!filePath.endsWith('.jsx') && !filePath.endsWith('.js')) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Remove rainbowkit imports
    content = content.replace(/import\s*\{\s*ConnectButton\s*\}\s*from\s*['"]@rainbow-me\/rainbowkit['"];?\n?/g, '');
    
    // Replace <ConnectButton /> with a generic message or custom button based on useWallet context if possible, 
    // but the easiest is just removing it from random pages or replacing with a placeholder.
    // In Navbar, we'll replace it with a manual button.
    if (filePath.includes('Navbar.jsx')) {
        // If Navbar doesn't have useWallet, we might need to add it, but for now we'll just put a span if we can't.
        // Let's assume Navbar does NOT have useWallet or already does. Actually, we'll leave it out or replace with a generic button.
        content = content.replace(/<ConnectButton[\s\S]*?\/>/g, '<span className="text-primary-600 font-bold">Freighter Supported</span>');
    } else {
        content = content.replace(/<ConnectButton[\s\S]*?\/>/g, '');
    }

    // Remove ethers import
    content = content.replace(/import\s*\{\s*ethers\s*\}\s*from\s*['"]ethers['"];?\n?/g, '');
    content = content.replace(/ethers\.parseEther\((.*?)\)/g, '$1'); 
    content = content.replace(/ethers\.formatEther\((.*?)\)/g, '$1'); 

    // Fix VotingPanel BigInt issue
    if (filePath.includes('VotingPanel.jsx')) {
        content = content.replace(/BigInt\(/g, 'Number(');
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Cleaned:', filePath);
    }
});
