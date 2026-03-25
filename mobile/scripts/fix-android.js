const fs = require('fs');
const path = require('path');

const androidPath = path.join(__dirname, '..', 'android');
const localPropertiesPath = path.join(androidPath, 'local.properties');

const sdkDir = 'C:\\\\Users\\\\alvys\\\\AppData\\\\Local\\\\Android\\\\Sdk';
const content = `sdk.dir=${sdkDir}\n`;

if (!fs.existsSync(androidPath)) {
    console.log('Android directory does not exist. Skipping local.properties creation.');
    process.exit(0);
}

try {
    fs.writeFileSync(localPropertiesPath, content);
    console.log(`Successfully created ${localPropertiesPath}`);
} catch (error) {
    console.error(`Failed to create ${localPropertiesPath}:`, error);
    process.exit(1);
}
