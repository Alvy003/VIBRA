const { withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Custom Expo Config Plugin to:
 * 1. Copy AudioDeviceModule.kt and AudioDevicePackage.kt to the android folder.
 * 2. Register the AudioDevicePackage in MainApplication.kt.
 */
module.exports = function withAudioDeviceModule(config) {
  return withMainApplication(config, (config) => {
    // 1. Copy the files
    const projectRoot = config.modRequest.projectRoot;
    const nativeSrcDir = path.join(projectRoot, 'plugins', 'native');
    const androidTargetDir = path.join(
      projectRoot, 
      'android', 
      'app', 
      'src', 
      'main', 
      'java', 
      'com', 
      'vibra', 
      'mobile', 
      'dev'
    );

    // Ensure target directory exists (though it should in prebuild)
    if (!fs.existsSync(androidTargetDir)) {
      fs.mkdirSync(androidTargetDir, { recursive: true });
    }

    // Copy AudioDeviceModule.kt
    const moduleSrc = path.join(nativeSrcDir, 'AudioDeviceModule.kt');
    const moduleDest = path.join(androidTargetDir, 'AudioDeviceModule.kt');
    if (fs.existsSync(moduleSrc)) {
      fs.copyFileSync(moduleSrc, moduleDest);
    }

    // Copy AudioDevicePackage.kt
    const packageSrc = path.join(nativeSrcDir, 'AudioDevicePackage.kt');
    const packageDest = path.join(androidTargetDir, 'AudioDevicePackage.kt');
    if (fs.existsSync(packageSrc)) {
      fs.copyFileSync(packageSrc, packageDest);
    }

    // 2. Register in MainApplication.kt
    let contents = config.modResults.contents;

    // Add the import
    if (!contents.includes('import com.vibra.mobile.dev.AudioDevicePackage')) {
      contents = contents.replace(
        'package com.vibra.mobile.dev',
        'package com.vibra.mobile.dev\n\nimport com.vibra.mobile.dev.AudioDevicePackage'
      );
    }

    // Add the package to getPackages()
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
