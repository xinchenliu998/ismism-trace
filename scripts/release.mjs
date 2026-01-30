#!/usr/bin/env node
/**
 * 一键发布：更新版本号、提交代码、创建 tag、推送到远程
 * 
 * 用法：
 *   pnpm release          # patch 版本（0.1.0 -> 0.1.1）
 *   pnpm release patch    # patch 版本
 *   pnpm release minor    # minor 版本（0.1.0 -> 0.2.0）
 *   pnpm release major    # major 版本（0.1.0 -> 1.0.0）
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const tauriDir = join(rootDir, 'src-tauri');
const tauriConfPath = join(tauriDir, 'tauri.conf.json');
const cargoTomlPath = join(tauriDir, 'Cargo.toml');
const appleProjectYmlPath = join(tauriDir, 'gen/apple/project.yml');
const appleInfoPlistPath = join(tauriDir, 'gen/apple/ismism-trace_iOS/Info.plist');

/** 将版本号同步到 tauri.conf.json、Cargo.toml、iOS project.yml 与 Info.plist（与 package.json 一致） */
function syncVersionToTauri(version) {
  const conf = JSON.parse(readFileSync(tauriConfPath, 'utf-8'));
  conf.version = version;
  writeFileSync(tauriConfPath, JSON.stringify(conf, null, 2) + '\n');

  let cargo = readFileSync(cargoTomlPath, 'utf-8');
  cargo = cargo.replace(/^version = "[^"]+"$/m, `version = "${version}"`);
  writeFileSync(cargoTomlPath, cargo);

  let yml = readFileSync(appleProjectYmlPath, 'utf-8');
  yml = yml.replace(/CFBundleShortVersionString: .+/g, `CFBundleShortVersionString: ${version}`);
  yml = yml.replace(/CFBundleVersion: "[^"]+"/g, `CFBundleVersion: "${version}"`);
  writeFileSync(appleProjectYmlPath, yml);

  let plist = readFileSync(appleInfoPlistPath, 'utf-8');
  plist = plist.replace(
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]+(<\/string>)/,
    `$1${version}$2`
  );
  plist = plist.replace(
    /(<key>CFBundleVersion<\/key>\s*<string>)[^<]+(<\/string>)/,
    `$1${version}$2`
  );
  writeFileSync(appleInfoPlistPath, plist);
}

// 读取 package.json
const packageJsonPath = join(rootDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

// 解析当前版本
const currentVersion = packageJson.version;
const currentTag = `v${currentVersion}`;
const [major, minor, patch] = currentVersion.split('.').map(Number);

// 检查当前版本的 tag 是否已存在于远程
let currentTagIsRemote = false;

try {
  const remoteTags = execSync(`git ls-remote --tags origin ${currentTag}`, { 
    cwd: rootDir, 
    encoding: 'utf-8',
    stdio: 'pipe' 
  });
  if (remoteTags.trim()) {
    currentTagIsRemote = true;
  }
} catch (e) {
  // 远程不存在，说明当前版本还没发布
}

// 获取版本类型（patch/minor/major）
const versionType = process.argv[2] || 'patch';

// 决定使用哪个版本
let releaseVersion;
let tagName;

if (currentTagIsRemote) {
  // 当前版本已在远程存在，需要升级版本
  let newVersion;
  switch (versionType) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
  releaseVersion = newVersion;
  tagName = `v${newVersion}`;
  console.log(`当前版本: ${currentVersion}（已在远程发布）`);
  console.log(`新版本: ${releaseVersion} (${versionType})`);
  console.log(`Tag: ${tagName}`);
} else {
  // 当前版本在远程不存在，使用当前版本发布
  releaseVersion = currentVersion;
  tagName = currentTag;
  console.log(`当前版本: ${currentVersion}（未在远程发布）`);
  console.log(`使用当前版本发布`);
  console.log(`Tag: ${tagName}`);
}

console.log('');

// 检查是否有未提交的更改
try {
  const status = execSync('git status --porcelain', { 
    cwd: rootDir, 
    encoding: 'utf-8' 
  }).trim();
  
  if (status && !status.includes('package.json')) {
    console.warn('⚠️  警告: 工作区有未提交的更改');
    console.warn('   建议先提交或暂存这些更改');
    console.log('');
  }
} catch (error) {
  // git 命令失败，可能不在 git 仓库中
  console.error('❌ 错误: 不在 git 仓库中');
  process.exit(1);
}

// 记录提交前的状态，用于失败时回滚
let commitHashBefore = null;
let tagCreated = false;
let commitCreated = false;

try {
  // 获取当前 HEAD commit hash
  try {
    commitHashBefore = execSync('git rev-parse HEAD', { 
      cwd: rootDir, 
      encoding: 'utf-8',
      stdio: 'pipe' 
    }).trim();
  } catch (e) {
    // 可能是新仓库，没有 commit
  }

  // 1. 更新 package.json 及 Tauri/iOS 包信息（如果需要升级版本）
  if (currentTagIsRemote) {
    console.log('1. 更新 package.json 与 Tauri 包信息...');
    packageJson.version = releaseVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    syncVersionToTauri(releaseVersion);
    console.log(`   ✓ 版本已更新为 ${releaseVersion}`);
  } else {
    console.log('1. 检查 package.json...');
    console.log(`   ✓ 使用当前版本 ${releaseVersion}`);
  }

  // 2. 提交更改（如果需要升级版本）
  if (currentTagIsRemote) {
    console.log('2. 提交更改...');
    execSync(
      'git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/gen/apple/project.yml src-tauri/gen/apple/ismism-trace_iOS/Info.plist',
      { cwd: rootDir, stdio: 'inherit' }
    );
    execSync(`git commit -m "chore: bump version to ${releaseVersion}"`, { 
      cwd: rootDir, 
      stdio: 'inherit' 
    });
    commitCreated = true;
    console.log('   ✓ 代码已提交');
  } else {
    console.log('2. 跳过提交（使用当前版本）');
  }

  // 3. 检查并创建 tag
  console.log(`3. 创建 tag ${tagName}...`);
  
  // 检查 tag 是否已存在
  let tagExistsLocal = false;
  let tagExistsRemote = false;
  
  try {
    // 检查本地 tag
    execSync(`git rev-parse ${tagName}`, { 
      cwd: rootDir, 
      stdio: 'pipe' 
    });
    tagExistsLocal = true;
  } catch (e) {
    // 本地不存在
  }
  
  // 检查远程 tag
  try {
    const remoteTags = execSync(`git ls-remote --tags origin ${tagName}`, { 
      cwd: rootDir, 
      encoding: 'utf-8',
      stdio: 'pipe' 
    });
    if (remoteTags.trim()) {
      tagExistsRemote = true;
    }
  } catch (e) {
    // 远程不存在
  }
  
  // 处理 tag 存在的情况
  if (tagExistsRemote) {
    console.error(`   ❌ Tag ${tagName} 已存在于远程，无法覆盖`);
    console.error(`   请使用不同的版本号，或手动删除远程 tag 后重试`);
    throw new Error(`Tag ${tagName} 已存在于远程`);
  }
  
  if (tagExistsLocal) {
    // 本地存在但远程不存在，删除后重新创建（确保指向当前 commit）
    console.log(`   Tag ${tagName} 已存在于本地，删除后重新创建...`);
    execSync(`git tag -d ${tagName}`, { cwd: rootDir, stdio: 'inherit' });
  }
  
  // 创建 tag（如果使用当前版本发布且本地不存在，这里会创建）
  execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, { 
    cwd: rootDir, 
    stdio: 'inherit' 
  });
  tagCreated = true;
  console.log(`   ✓ Tag ${tagName} 已创建`);

  // 4. 推送代码和 tag
  console.log('4. 推送到远程...');
  execSync('git push', { cwd: rootDir, stdio: 'inherit' });
  execSync(`git push origin ${tagName}`, { cwd: rootDir, stdio: 'inherit' });
  console.log('   ✓ 已推送到远程');

  console.log('');
  console.log(`✅ 发布完成！`);
  console.log(`   GitHub Actions 将自动构建并创建 Release: ${tagName}`);
  
  // 尝试获取仓库信息
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { 
      cwd: rootDir, 
      encoding: 'utf-8' 
    }).trim();
    const match = remoteUrl.match(/github\.com[/:](.+?)(?:\.git)?$/);
    if (match) {
      const repo = match[1];
      console.log(`   查看进度: https://github.com/${repo}/actions`);
      console.log(`   Release: https://github.com/${repo}/releases/tag/${tagName}`);
    }
  } catch (e) {
    // 忽略错误
  }
} catch (error) {
  console.error('');
  console.error('❌ 发布失败:', error.message);
  console.error('');
  
  // 回滚操作
  console.log('🔄 正在回滚更改...');
  
  try {
    // 删除已创建的 tag（如果存在）
    if (tagCreated) {
      try {
        execSync(`git tag -d ${tagName}`, { 
          cwd: rootDir, 
          stdio: 'pipe' 
        });
        console.log(`   ✓ 已删除本地 tag ${tagName}`);
      } catch (e) {
        // tag 可能不存在或已删除
      }
    }
    
    // 回滚提交（如果已创建）
    if (commitCreated && commitHashBefore) {
      try {
        execSync(`git reset --soft ${commitHashBefore}`, { 
          cwd: rootDir, 
          stdio: 'pipe' 
        });
        console.log('   ✓ 已回滚提交');
        
        // 恢复 package.json 与 Tauri 包信息版本（如果之前升级了版本）
        if (currentTagIsRemote) {
          packageJson.version = currentVersion;
          writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
          syncVersionToTauri(currentVersion);
          console.log(`   ✓ 已恢复 package.json 与 Tauri 包信息版本为 ${currentVersion}`);
        }
        
        // 取消暂存
        execSync('git reset HEAD package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/gen/apple/project.yml src-tauri/gen/apple/ismism-trace_iOS/Info.plist', { 
          cwd: rootDir, 
          stdio: 'pipe' 
        });
      } catch (e) {
        console.error('   ⚠️  回滚提交失败，请手动检查:', e.message);
      }
    } else if (commitCreated) {
      // 如果没有之前的 commit hash，尝试撤销最后一次提交
      try {
        execSync('git reset --soft HEAD~1', { 
          cwd: rootDir, 
          stdio: 'pipe' 
        });
        console.log('   ✓ 已回滚提交');
        
        // 恢复 package.json 与 Tauri 包信息版本（如果之前升级了版本）
        if (currentTagIsRemote) {
          packageJson.version = currentVersion;
          writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
          syncVersionToTauri(currentVersion);
          console.log(`   ✓ 已恢复 package.json 与 Tauri 包信息版本为 ${currentVersion}`);
        }
      } catch (e) {
        console.error('   ⚠️  回滚提交失败，请手动检查:', e.message);
      }
    } else {
      // 只更新了 package.json 与 Tauri 包信息，恢复版本（如果之前升级了版本）
      if (currentTagIsRemote) {
        packageJson.version = currentVersion;
        writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
        syncVersionToTauri(currentVersion);
        console.log(`   ✓ 已恢复 package.json 与 Tauri 包信息版本为 ${currentVersion}`);
      }
    }
    
    console.log('');
    console.log('✅ 回滚完成');
  } catch (rollbackError) {
    console.error('   ❌ 回滚失败:', rollbackError.message);
    console.error('   请手动检查并修复：');
    console.error(`   - 检查 package.json、tauri.conf.json、Cargo.toml、gen/apple 内版本是否为 ${currentVersion}`);
    console.error(`   - 检查是否有未提交的更改`);
    if (tagCreated) {
      console.error(`   - 检查 tag ${tagName} 是否已删除`);
    }
  }
  
  process.exit(1);
}
