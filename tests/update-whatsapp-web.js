/**
 * Script para atualizar a biblioteca whatsapp-web.js para a versão correta
 * 
 * Este script:
 * 1. Verifica a versão atual instalada
 * 2. Instala a versão especificada no package.json
 * 3. Verifica se a atualização foi bem-sucedida
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Iniciando atualização da biblioteca whatsapp-web.js...');

// Função para verificar a versão instalada
function checkInstalledVersion() {
  try {
    // Verificar se o módulo está instalado
    const wwjsPath = require.resolve('whatsapp-web.js');
    console.log(`\nMódulo whatsapp-web.js encontrado em: ${wwjsPath}`);
    
    // Tentar obter a versão do package.json do módulo
    const modulePath = path.dirname(wwjsPath);
    const packageJsonPath = path.join(modulePath, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      console.log(`\nVersão instalada: ${packageJson.version}`);
      return packageJson.version;
    } else {
      console.log('\nArquivo package.json do módulo não encontrado.');
      return null;
    }
  } catch (error) {
    console.error('\nErro ao verificar a versão instalada:', error.message);
    return null;
  }
}

// Função para verificar a versão no package.json do projeto
function checkPackageJsonVersion() {
  try {
    const projectPackageJsonPath = path.join(process.cwd(), 'package.json');
    
    if (fs.existsSync(projectPackageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(projectPackageJsonPath, 'utf8'));
      
      if (packageJson.dependencies && packageJson.dependencies['whatsapp-web.js']) {
        console.log(`\nVersão especificada no package.json do projeto: ${packageJson.dependencies['whatsapp-web.js']}`);
        return packageJson.dependencies['whatsapp-web.js'];
      } else {
        console.log('\nwhatsapp-web.js não encontrado nas dependências do projeto.');
        return null;
      }
    } else {
      console.log('\nArquivo package.json do projeto não encontrado.');
      return null;
    }
  } catch (error) {
    console.error('\nErro ao verificar a versão no package.json:', error.message);
    return null;
  }
}

// Função para instalar a versão correta
function installCorrectVersion(version) {
  if (!version) {
    console.error('\nNão foi possível determinar a versão a ser instalada.');
    return false;
  }
  
  try {
    console.log(`\nInstalando whatsapp-web.js versão ${version}...`);
    execSync(`npm install whatsapp-web.js@${version}`, { stdio: 'inherit' });
    console.log('\nInstalação concluída.');
    return true;
  } catch (error) {
    console.error('\nErro ao instalar a versão correta:', error.message);
    return false;
  }
}

// Função para limpar o cache do npm
function clearNpmCache() {
  try {
    console.log('\nLimpando cache do npm...');
    execSync('npm cache clean --force', { stdio: 'inherit' });
    console.log('Cache limpo com sucesso.');
    return true;
  } catch (error) {
    console.error('\nErro ao limpar o cache do npm:', error.message);
    return false;
  }
}

// Função para verificar se a atualização foi bem-sucedida
function verifyUpdate(targetVersion) {
  const installedVersion = checkInstalledVersion();
  
  if (!installedVersion) {
    console.error('\nNão foi possível verificar a versão instalada após a atualização.');
    return false;
  }
  
  // Remover caracteres especiais como ^ ou ~ para comparação
  const cleanTargetVersion = targetVersion.replace(/[^0-9.]/g, '');
  
  if (installedVersion === cleanTargetVersion) {
    console.log(`\nAtualização bem-sucedida! Versão instalada: ${installedVersion}`);
    return true;
  } else {
    console.log(`\nA versão instalada (${installedVersion}) não corresponde à versão desejada (${cleanTargetVersion}).`);
    return false;
  }
}

// Executar atualização
console.log('==== ATUALIZAÇÃO DO WHATSAPP-WEB.JS ====');

const currentVersion = checkInstalledVersion();
const targetVersion = checkPackageJsonVersion();

if (currentVersion === targetVersion) {
  console.log('\nA versão instalada já corresponde à versão especificada no package.json.');
} else {
  console.log(`\nA versão instalada (${currentVersion}) é diferente da versão especificada no package.json (${targetVersion}).`);
  
  // Limpar cache do npm
  clearNpmCache();
  
  // Instalar versão correta
  if (installCorrectVersion(targetVersion)) {
    // Verificar se a atualização foi bem-sucedida
    verifyUpdate(targetVersion);
  }
}

console.log('\nProcesso de atualização concluído.');