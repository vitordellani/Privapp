/**
 * Script para comparar as versões da biblioteca whatsapp-web.js
 * 
 * Este script verifica:
 * 1. A versão atual instalada
 * 2. A versão especificada no package.json
 * 3. Diferenças entre as versões 1.0 e a atual
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Iniciando comparação de versões da biblioteca whatsapp-web.js...');

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
      console.log(`Autor: ${packageJson.author || 'Não especificado'}`);
      console.log(`Descrição: ${packageJson.description || 'Não especificada'}`);
      console.log(`Licença: ${packageJson.license || 'Não especificada'}`);
      
      // Verificar dependências
      console.log('\nDependências principais:');
      if (packageJson.dependencies) {
        console.log('- puppeteer:', packageJson.dependencies.puppeteer || 'Não especificada');
        console.log('- qrcode-terminal:', packageJson.dependencies['qrcode-terminal'] || 'Não especificada');
      } else {
        console.log('Nenhuma dependência encontrada.');
      }
      
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

// Função para verificar se existe a versão 1.0 instalada
function checkVersion10() {
  console.log('\nVerificando se existe a versão 1.0.x instalada...');
  
  try {
    // Verificar em node_modules
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    const dirs = fs.readdirSync(nodeModulesPath);
    
    // Procurar por whatsapp-web.js ou versões aninhadas
    let found = false;
    
    // Verificar diretamente em node_modules
    if (dirs.includes('whatsapp-web.js')) {
      const wwjsPath = path.join(nodeModulesPath, 'whatsapp-web.js');
      const packageJsonPath = path.join(wwjsPath, 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const version = packageJson.version;
        
        if (version && version.startsWith('1.0.')) {
          console.log(`Encontrada versão 1.0.x em node_modules/whatsapp-web.js: ${version}`);
          found = true;
        }
      }
    }
    
    // Procurar em dependências aninhadas
    dirs.forEach(dir => {
      const nestedNodeModules = path.join(nodeModulesPath, dir, 'node_modules');
      
      if (fs.existsSync(nestedNodeModules) && fs.statSync(nestedNodeModules).isDirectory()) {
        try {
          const nestedDirs = fs.readdirSync(nestedNodeModules);
          
          if (nestedDirs.includes('whatsapp-web.js')) {
            const wwjsPath = path.join(nestedNodeModules, 'whatsapp-web.js');
            const packageJsonPath = path.join(wwjsPath, 'package.json');
            
            if (fs.existsSync(packageJsonPath)) {
              const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
              const version = packageJson.version;
              
              if (version && version.startsWith('1.0.')) {
                console.log(`Encontrada versão 1.0.x em ${dir}/node_modules/whatsapp-web.js: ${version}`);
                found = true;
              }
            }
          }
        } catch (e) {
          // Ignorar erros ao ler diretórios aninhados
        }
      }
    });
    
    if (!found) {
      console.log('Nenhuma versão 1.0.x encontrada nos node_modules.');
    }
    
    return found;
  } catch (error) {
    console.error('Erro ao verificar a versão 1.0.x:', error.message);
    return false;
  }
}

// Função para verificar diferenças entre versões
function checkVersionDifferences(currentVersion) {
  console.log('\n==== DIFERENÇAS ENTRE VERSÕES ====');
  
  if (!currentVersion) {
    console.log('Não foi possível determinar a versão atual para comparação.');
    return;
  }
  
  // Verificar se é uma versão 1.x ou mais recente
  const isMajorVersion1 = currentVersion.startsWith('1.');
  const isMajorVersion2Plus = !isMajorVersion1;
  
  console.log(`\nVersão atual: ${currentVersion} (Major version: ${isMajorVersion1 ? '1' : '2+'})`);
  
  if (isMajorVersion2Plus) {
    console.log('\nMudanças significativas da versão 1.x para 2.x:');
    console.log('1. Possíveis alterações na API de autenticação');
    console.log('2. Possíveis alterações no tratamento de eventos');
    console.log('3. Possíveis alterações na detecção de conexão');
    console.log('4. Possíveis alterações no tratamento de QR code');
  }
  
  // Verificar arquivos de cliente
  try {
    const wwjsPath = require.resolve('whatsapp-web.js');
    const modulePath = path.dirname(wwjsPath);
    
    // Verificar arquivos principais
    console.log('\nArquivos principais:');
    const mainFiles = ['index.js', 'Client.js', 'WAState.js', 'util/Constants.js'];
    
    mainFiles.forEach(file => {
      const filePath = path.join(modulePath, file);
      if (fs.existsSync(filePath)) {
        console.log(`- ${file}: Presente`);
      } else {
        console.log(`- ${file}: Ausente`);
      }
    });
    
    // Verificar estratégias de autenticação
    console.log('\nEstratégias de autenticação:');
    const authFiles = ['authStrategies/LocalAuth.js', 'authStrategies/RemoteAuth.js', 'authStrategies/NoAuth.js'];
    
    authFiles.forEach(file => {
      const filePath = path.join(modulePath, file);
      if (fs.existsSync(filePath)) {
        console.log(`- ${file}: Presente`);
      } else {
        console.log(`- ${file}: Ausente`);
      }
    });
  } catch (error) {
    console.error('Erro ao verificar arquivos da biblioteca:', error.message);
  }
}

// Função para verificar a versão do WhatsApp Web
function checkWhatsAppWebVersion() {
  try {
    const wwjsPath = require.resolve('whatsapp-web.js');
    const modulePath = path.dirname(wwjsPath);
    const constantsPath = path.join(modulePath, 'util', 'Constants.js');
    
    if (fs.existsSync(constantsPath)) {
      const constants = fs.readFileSync(constantsPath, 'utf8');
      
      // Tentar encontrar a versão do WhatsApp Web
      const versionMatch = constants.match(/DEFAULT_WA_VERSION\s*=\s*['"](.*?)['"]/);
      if (versionMatch && versionMatch[1]) {
        console.log(`\nVersão padrão do WhatsApp Web: ${versionMatch[1]}`);
      } else {
        console.log('\nNão foi possível determinar a versão padrão do WhatsApp Web.');
      }
      
      // Verificar configuração de webVersionCache
      if (constants.includes('webVersionCache')) {
        console.log('A biblioteca suporta webVersionCache.');
      } else {
        console.log('A biblioteca não parece suportar webVersionCache.');
      }
    } else {
      console.log('\nArquivo de constantes não encontrado.');
    }
  } catch (error) {
    console.error('\nErro ao verificar a versão do WhatsApp Web:', error.message);
  }
}

// Executar verificações
console.log('==== VERIFICAÇÃO DE VERSÃO DO WHATSAPP-WEB.JS ====');
const installedVersion = checkInstalledVersion();
const packageJsonVersion = checkPackageJsonVersion();
const hasVersion10 = checkVersion10();
checkVersionDifferences(installedVersion);
checkWhatsAppWebVersion();

console.log('\n==== RESUMO ====');
console.log(`Versão instalada: ${installedVersion || 'Não determinada'}`);
console.log(`Versão no package.json: ${packageJsonVersion || 'Não determinada'}`);
console.log(`Versão 1.0.x encontrada: ${hasVersion10 ? 'Sim' : 'Não'}`);

if (installedVersion !== packageJsonVersion) {
  console.log('\nAVISO: A versão instalada é diferente da versão especificada no package.json!');
  console.log('Isso pode causar problemas de compatibilidade.');
}

console.log('\nVerificação de versão concluída.');