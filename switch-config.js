/**
 * 🔄 Configuration Switcher for Claim Cipher
 * Run this script to easily switch between development and production configs
 */

const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, 'claim_cipher_app', 'config');

// HTML files that need config updates
const htmlFiles = [
    'claim_cipher_app/total-loss-forms.html',
    'claim_cipher_app/route-cypher.html',
    'claim_cipher_app/mileage-cypher.html',
    // Add other HTML files that use the API config
];

function switchToProduction() {
    console.log('🌐 Switching to PRODUCTION configuration...');
    
    // Update HTML files to use production config
    htmlFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Replace development config with production config
            content = content.replace(
                /<script src="config\/api-config\.js"><\/script>/g,
                `<script src="config/github-pages-env.js"></script>\n    <script src="config/api-config-production.js"></script>`
            );
            
            fs.writeFileSync(filePath, content);
            console.log(`✅ Updated ${file} for production`);
        }
    });
    
    console.log('🚀 Ready for GitHub Pages deployment!');
}

function switchToDevelopment() {
    console.log('💻 Switching to DEVELOPMENT configuration...');
    
    // Update HTML files to use development config
    htmlFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Replace production config with development config
            content = content.replace(
                /<script src="config\/github-pages-env\.js"><\/script>\s*<script src="config\/api-config-production\.js"><\/script>/g,
                '<script src="config/api-config.js"></script>'
            );
            
            fs.writeFileSync(filePath, content);
            console.log(`✅ Updated ${file} for development`);
        }
    });
    
    console.log('🔧 Ready for local development!');
}

// Command line interface
const command = process.argv[2];

switch (command) {
    case 'production':
    case 'prod':
        switchToProduction();
        break;
    case 'development':
    case 'dev':
        switchToDevelopment();
        break;
    default:
        console.log('🔄 Claim Cipher Configuration Switcher');
        console.log('');
        console.log('Usage:');
        console.log('  node switch-config.js production   # Switch to production config');
        console.log('  node switch-config.js development  # Switch to development config');
        console.log('');
        console.log('Current configs available:');
        console.log('  📁 config/api-config.js (development - your local key)');
        console.log('  📁 config/api-config-production.js (production - multi-user)');
        break;
}