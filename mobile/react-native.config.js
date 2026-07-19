const IS_DEV = process.env.APP_VARIANT !== 'production';

module.exports = {
  project: {
    android: {
      packageName: IS_DEV ? 'com.vibra.mobile.dev' : 'com.vibra.mobile',
    },
  },
};
