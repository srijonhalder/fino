const webpack = require('webpack');

module.exports = function override(config) {
  // Shim @react-native-async-storage/async-storage with localStorage for web
  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...config.resolve.alias,
    '@react-native-async-storage/async-storage': require.resolve(
      './src/shims/asyncStorage.js'
    ),
  };

  // Some WalletConnect deps reference Node built-ins — provide fallbacks
  config.resolve.fallback = {
    ...config.resolve.fallback,
    stream: false,
    crypto: false,
  };

  return config;
};
