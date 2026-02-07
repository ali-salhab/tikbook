// Polyfill for Node < 20 where Array.prototype.toReversed is missing
if (!Array.prototype.toReversed) {
  Object.defineProperty(Array.prototype, 'toReversed', {
    value: function toReversed() {
      return this.slice().reverse();
    },
    writable: true,
    configurable: true
  });
}

const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];
module.exports = config;
