const {
  withAppBuildGradle,
  withAndroidManifest,
  withMainApplication,
} = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

module.exports = function withAndroidAuto(config) {

  // 1. Add media.MediaBrowserServiceCompat and MMKV dependency to app build.gradle
  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    const depMedia = `    implementation 'androidx.media:media:1.7.0'`;
    const depMmkv = `    implementation 'com.tencent:mmkv:1.3.9'`;
    if (!contents.includes('androidx.media:media')) {
      contents = contents.replace('dependencies {', `dependencies {\n${depMedia}`);
    }
    if (!contents.includes('com.tencent:mmkv')) {
      contents = contents.replace('dependencies {', `dependencies {\n${depMmkv}`);
    }
    config.modResults.contents = contents;
    return config;
  });

  // 2. Patch AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];
    const pkg = config.android?.package || 'com.vibra.mobile';

    // Remove the MediaBrowserService intent-filter from MusicService (was incorrectly placed), preserving MEDIA_BUTTON
    if (app.service) {
      app.service = app.service.map((svc) => {
        if (svc.$?.['android:name']?.includes('MusicService')) {
          if (svc['intent-filter']) {
            svc['intent-filter'] = svc['intent-filter'].map((filter) => {
              if (filter.action) {
                filter.action = filter.action.filter(
                  (a) => a.$?.['android:name'] !== 'android.media.browse.MediaBrowserService'
                );
              }
              return filter;
            }).filter((filter) => (filter.action || []).length > 0);
          }
        }
        return svc;
      });
    }

    // Add Android Auto metadata to the application level (required for Android Auto app discovery)
    if (!app['meta-data']) app['meta-data'] = [];
    const hasAutoMetadata = app['meta-data'].some(
      (m) => m.$?.['android:name'] === 'com.google.android.gms.car.application'
    );
    if (!hasAutoMetadata) {
      app['meta-data'].push({
        $: {
          'android:name': 'com.google.android.gms.car.application',
          'android:resource': '@xml/automotive_app_desc',
        },
      });
    }

    // Add VibraAutoService
    if (!app.service) app.service = [];
    const autoServiceName = `${pkg}.auto.VibraAutoService`;
    const hasAutoService = app.service.some(
      (s) => s.$?.['android:name'] === autoServiceName
    );

    if (!hasAutoService) {
      app.service.push({
        $: {
          'android:name':     autoServiceName,
          'android:exported': 'true',
        },
        'intent-filter': [{
          action: [{ $: { 'android:name': 'android.media.browse.MediaBrowserService' } }],
        }],
      });
    }

    // Add automotive uses-feature (non-required)
    if (!config.modResults.manifest['uses-feature']) {
      config.modResults.manifest['uses-feature'] = [];
    }
    const hasAutoFeature = config.modResults.manifest['uses-feature'].some(
      (f) => f.$?.['android:name'] === 'android.hardware.type.automotive'
    );
    if (!hasAutoFeature) {
      config.modResults.manifest['uses-feature'].push({
        $: {
          'android:name':     'android.hardware.type.automotive',
          'android:required': 'false',
        },
      });
    }

    return config;
  });

  // 3. Copy VibraAutoService.kt and automotive_app_desc.xml
  config = withMainApplication(config, (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const nativeSrcDir = path.join(projectRoot, 'plugins', 'native');
    const pkg = config.android?.package || 'com.vibra.mobile';
    const pkgPath = pkg.split('.').join(path.sep);

    // Target directory: android/app/src/main/java/<pkg>/auto/
    const autoTargetDir = path.join(
      projectRoot, 'android', 'app', 'src', 'main', 'java', pkgPath, 'auto'
    );
    if (!fs.existsSync(autoTargetDir)) {
      fs.mkdirSync(autoTargetDir, { recursive: true });
    }

    // Copy and rewrite package declaration
    const src = path.join(nativeSrcDir, 'VibraAutoService.kt');
    const dest = path.join(autoTargetDir, 'VibraAutoService.kt');
    if (fs.existsSync(src)) {
      let content = fs.readFileSync(src, 'utf8');
      content = content.replace(/^package\s+[\w.]+/m, `package ${pkg}.auto`);
      fs.writeFileSync(dest, content, 'utf8');
    }

    // Copy automotive_app_desc.xml to res/xml/
    const resXmlDir = path.join(
      projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml'
    );
    if (!fs.existsSync(resXmlDir)) fs.mkdirSync(resXmlDir, { recursive: true });
    const xmlSrc  = path.join(nativeSrcDir, 'automotive_app_desc.xml');
    const xmlDest = path.join(resXmlDir, 'automotive_app_desc.xml');
    if (fs.existsSync(xmlSrc)) fs.copyFileSync(xmlSrc, xmlDest);

    return config;
  });

  return config;
};
