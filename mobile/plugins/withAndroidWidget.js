const { withAppBuildGradle, withProjectBuildGradle, withAndroidManifest, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to set up Jetpack Glance and dependencies for Android Home Screen Widget support.
 */
module.exports = function withAndroidWidget(config) {
  // 1. Add app build.gradle compose settings and dependencies
  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Enable buildFeatures compose
    if (!contents.includes('buildFeatures { compose true }') && !contents.includes('compose true')) {
      const searchBlock = 'android {';
      contents = contents.replace(
        searchBlock,
        `android {\n    buildFeatures {\n        compose true\n    }`
      );

      // Apply Compose Compiler plugin (Required for Kotlin 2.0+)
      const applyPluginLine = 'apply plugin: "org.jetbrains.kotlin.android"';
      if (contents.includes(applyPluginLine) && !contents.includes('org.jetbrains.kotlin.plugin.compose')) {
        contents = contents.replace(
          applyPluginLine,
          `${applyPluginLine}\napply plugin: "org.jetbrains.kotlin.plugin.compose"`
        );
      }
    }

    // Add Glance dependencies
    const dependencyBlock = 'dependencies {';
    const glanceDeps = `
    implementation("androidx.glance:glance:1.1.0")
    implementation("androidx.glance:glance-appwidget:1.1.0")
    implementation("androidx.glance:glance-material3:1.1.0")
    `;
    if (!contents.includes('androidx.glance:glance')) {
      contents = contents.replace(dependencyBlock, `${dependencyBlock}${glanceDeps}`);
    }

    config.modResults.contents = contents;
    return config;
  });

  // 2. Add compose-compiler-gradle-plugin to the root build.gradle classpath
  config = withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    const classpathSearch = "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')";
    const composeClasspath = "    classpath('org.jetbrains.kotlin:compose-compiler-gradle-plugin:2.1.20')";

    if (contents.includes(classpathSearch) && !contents.includes('compose-compiler-gradle-plugin')) {
      contents = contents.replace(
        classpathSearch,
        `${classpathSearch}\n${composeClasspath}`
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  // 3. Add receiver configuration to AndroidManifest.xml and restore package attribute
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    if (!mainApplication.receiver) mainApplication.receiver = [];

    const androidPackage = config.android?.package || 'com.vibra.mobile';

    // Ensure root manifest tag has package attribute to support legacy autolinking parsers
    if (!config.modResults.manifest.$) {
      config.modResults.manifest.$ = {};
    }
    config.modResults.manifest.$['package'] = androidPackage;

    const hasReceiver = mainApplication.receiver.some(
      (r) => r.$['android:name'] === `${androidPackage}.widget.VibraWidgetProvider`
    );

    if (!hasReceiver) {
      mainApplication.receiver.push({
        $: {
          'android:name': `${androidPackage}.widget.VibraWidgetProvider`,
          'android:label': 'Vibra Player Widget',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/vibra_widget_info',
            },
          },
        ],
      });
    }

    return config;
  });

  // 4. Copy Kotlin files and register package in MainApplication.kt
  config = withMainApplication(config, (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const nativeSrcDir = path.join(projectRoot, 'plugins', 'native');
    const androidPackage = config.android?.package || 'com.vibra.mobile';
    const packagePath = androidPackage.split('.').join(path.sep);
    
    const widgetTargetDir = path.join(
      projectRoot,
      'android',
      'app',
      'src',
      'main',
      'java',
      packagePath,
      'widget'
    );

    if (!fs.existsSync(widgetTargetDir)) {
      fs.mkdirSync(widgetTargetDir, { recursive: true });
    }

    // Helper: copy a .kt file and rewrite its package declaration to match target package
    function copyAndRewrite(srcFile, destFile) {
      if (!fs.existsSync(srcFile)) return;
      let content = fs.readFileSync(srcFile, 'utf8');
      content = content.replace(
        /^package\s+[\w.]+/m,
        `package ${androidPackage}.widget`
      );
      // Replace references to R if any
      content = content.replace(
        /import\s+com\.vibra\.mobile\.R/g,
        `import ${androidPackage}.R`
      );
      fs.writeFileSync(destFile, content, 'utf8');
    }

    // Copy Widget Kotlin files
    copyAndRewrite(
      path.join(nativeSrcDir, 'VibraWidgetProvider.kt'),
      path.join(widgetTargetDir, 'VibraWidgetProvider.kt')
    );
    copyAndRewrite(
      path.join(nativeSrcDir, 'VibraWidget.kt'),
      path.join(widgetTargetDir, 'VibraWidget.kt')
    );
    copyAndRewrite(
      path.join(nativeSrcDir, 'VibraWidgetActions.kt'),
      path.join(widgetTargetDir, 'VibraWidgetActions.kt')
    );
    copyAndRewrite(
      path.join(nativeSrcDir, 'VibraWidgetModule.kt'),
      path.join(widgetTargetDir, 'VibraWidgetModule.kt')
    );
    copyAndRewrite(
      path.join(nativeSrcDir, 'VibraWidgetPackage.kt'),
      path.join(widgetTargetDir, 'VibraWidgetPackage.kt')
    );

    // Copy XML resource
    const resXmlDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');
    if (!fs.existsSync(resXmlDir)) {
      fs.mkdirSync(resXmlDir, { recursive: true });
    }
    const srcXml = path.join(nativeSrcDir, 'vibra_widget_info.xml');
    const destXml = path.join(resXmlDir, 'vibra_widget_info.xml');
    if (fs.existsSync(srcXml)) {
      fs.copyFileSync(srcXml, destXml);
    }

    // Copy Drawable resources
    const resDrawableDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'drawable');
    if (!fs.existsSync(resDrawableDir)) {
      fs.mkdirSync(resDrawableDir, { recursive: true });
    }
    const drawables = ['ic_sharp_play.xml', 'ic_sharp_pause.xml', 'ic_sharp_next.xml', 'ic_sharp_prev.xml'];
    for (const drawable of drawables) {
      const srcDrawable = path.join(nativeSrcDir, drawable);
      const destDrawable = path.join(resDrawableDir, drawable);
      if (fs.existsSync(srcDrawable)) {
        fs.copyFileSync(srcDrawable, destDrawable);
      }
    }

    // Copy Logo resource from assets to Android drawables
    const logoSrc = path.join(projectRoot, 'assets', 'images', 'vibra-white.png');
    const logoDest = path.join(resDrawableDir, 'ic_vibra_logo.png');
    if (fs.existsSync(logoSrc)) {
      fs.copyFileSync(logoSrc, logoDest);
    }


    // Register in MainApplication.kt
    let contents = config.modResults.contents;
    const importStatement = `import ${androidPackage}.widget.VibraWidgetPackage`;
    const packageDeclaration = `package ${androidPackage}`;

    if (!contents.includes(importStatement)) {
      contents = contents.replace(
        packageDeclaration,
        `${packageDeclaration}\n\nimport ${androidPackage}.widget.VibraWidgetPackage`
      );
    }

    const searchString = 'PackageList(this).packages.apply {';
    if (contents.includes(searchString) && !contents.includes('add(VibraWidgetPackage())')) {
      contents = contents.replace(
        searchString,
        `${searchString}\n              add(VibraWidgetPackage())`
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
};
