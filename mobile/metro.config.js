const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
    "@shared": path.resolve(__dirname, "../shared"),
};

config.watchFolders = [
    path.resolve(__dirname, "../shared"),
];

config.resolver.sourceExts.push('sql');

module.exports = config;
