const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

// 모노레포 루트 경로
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/**
 * Metro configuration for React Native in monorepo
 * https://reactnative.dev/docs/metro
 */
const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    // 모노레포에서 node_modules 찾기
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    // 모노레포 패키지 심볼릭 링크 해결
    disableHierarchicalLookup: true,
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);



