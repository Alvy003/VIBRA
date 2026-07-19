const { withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Custom Expo Config Plugin to:
 * 1. Copy AudioDeviceModule.kt and AudioDevicePackage.kt to the android folder.
 * 2. Register the AudioDevicePackage in MainApplication.kt.
 *
 * Package name is derived dynamically from config.android.package so that
 * both the dev (com.vibra.mobile.dev) and production (com.vibra.mobile) builds
 * work without any hardcoded paths.
 */
module.exports = function withAudioDeviceModule(config) {
  return withMainApplication(config, (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const nativeSrcDir = path.join(projectRoot, 'plugins', 'native');

    // Derive the package name and directory from config (e.g. "com.vibra.mobile" or "com.vibra.mobile.dev")
    const androidPackage = config.android?.package || 'com.vibra.mobile';
    const packagePath = androidPackage.split('.').join(path.sep);
    const androidTargetDir = path.join(
      projectRoot,
      'android',
      'app',
      'src',
      'main',
      'java',
      packagePath
    );

    // Ensure target directory exists (though it should in prebuild)
    if (!fs.existsSync(androidTargetDir)) {
      fs.mkdirSync(androidTargetDir, { recursive: true });
    }

    // Helper: copy a .kt file and rewrite its package declaration to match the real package
    function copyAndRewrite(srcFile, destFile) {
      if (!fs.existsSync(srcFile)) return;
      let content = fs.readFileSync(srcFile, 'utf8');
      // Replace any hardcoded package declaration with the real one
      content = content.replace(
        /^package\s+[\w.]+/m,
        `package ${androidPackage}`
      );
      fs.writeFileSync(destFile, content, 'utf8');
    }

    // 1. Copy and rewrite AudioDeviceModule.kt
    copyAndRewrite(
      path.join(nativeSrcDir, 'AudioDeviceModule.kt'),
      path.join(androidTargetDir, 'AudioDeviceModule.kt')
    );

    // 2. Copy and rewrite AudioDevicePackage.kt
    copyAndRewrite(
      path.join(nativeSrcDir, 'AudioDevicePackage.kt'),
      path.join(androidTargetDir, 'AudioDevicePackage.kt')
    );

    // 3. Register in MainApplication.kt
    let contents = config.modResults.contents;
    const importStatement = `import ${androidPackage}.AudioDevicePackage`;
    const packageDeclaration = `package ${androidPackage}`;

    // Add the import below the package declaration if not already present
    if (!contents.includes(importStatement)) {
      contents = contents.replace(
        packageDeclaration,
        `${packageDeclaration}\n\nimport ${androidPackage}.AudioDevicePackage`
      );
    }

    // Add the package to getPackages() if not already present
    const searchString = 'PackageList(this).packages.apply {';
    if (contents.includes(searchString) && !contents.includes('add(AudioDevicePackage())')) {
      contents = contents.replace(
        searchString,
        `${searchString}\n              add(AudioDevicePackage())`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};
