/**
 * Script para encontrar a versão 1.0 do whatsapp-web.js que está funcionando
 * 
 * Este script procura por:
 * 1. Instalações alternativas da biblioteca
 * 2. Versões específicas em diferentes diretórios
 * 3. Configurações diferentes entre as versões
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Iniciando busca pela versão 1.0 do whatsapp-web.js...');

// Função para procurar recursivamente por arquivos
function findFilesRecursive(dir, pattern, maxDepth = 5, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  
  let results = [];
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Ignorar node_modules aninhados para evitar busca excessiva
        if (file !== 'node_modules' || currentDepth === 0) {
          results = results.concat(findFilesRecursive(filePath, pattern, maxDepth, currentDepth + 1));
        }
      } else if (pattern.test(file)) {
        results.push(filePath);
      }
    }
  } catch (error) {
    // Ignorar erros de permissão ou outros erros ao ler diretórios
  }
  
  return results;
}

// Função para procurar por package.json com whatsapp-web.js
function findWhatsAppWebPackages() {
  console.log('\nProcurando por instalações da biblioteca whatsapp-web.js...');
  
  const rootDir = process.cwd();
  const packageJsonFiles = findFilesRecursive(rootDir, /package\.json$/, 5);
  const results = [];
  
  for (const packageJsonFile of packageJsonFiles) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, 'utf8'));
      
      // Verificar se é o package.json do whatsapp-web.js
      if (packageJson.name === 'whatsapp-web.js') {
        results.push({
          path: packageJsonFile,
          version: packageJson.version,
          isMainPackage: true
        });
      }
      // Verificar se tem whatsapp-web.js como dependência
      else if (packageJson.dependencies && packageJson.dependencies['whatsapp-web.js']) {
        results.push({
          path: packageJsonFile,
          version: packageJson.dependencies['whatsapp-web.js'],
          isMainPackage: false
        });
      }
    } catch (error) {
      // Ignorar erros ao ler ou analisar package.json
    }
  }
  
  return results;
}

// Função para procurar por arquivos de configuração da aplicação
function findAppConfigurations() {
  console.log('\nProcurando por arquivos de configuração da aplicação...');
  
  const rootDir = process.cwd();
  const jsFiles = findFilesRecursive(rootDir, /\.(js|json)$/, 3);
  const configFiles = [];
  
  for (const file of jsFiles) {
    // Ignorar node_modules e diretórios de teste
    if (file.includes('node_modules') || file.includes('test')) continue;
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Procurar por padrões de inicialização do cliente WhatsApp
      if (
        (content.includes('new Client') || content.includes('Client(')) &&
        (content.includes('whatsapp-web') || content.includes('whatsapp'))
      ) {
        configFiles.push({
          path: file,
          hasWebVersionCache: content.includes('webVersionCache'),
          hasLocalAuth: content.includes('LocalAuth'),
          hasRemoteAuth: content.includes('RemoteAuth'),
          hasNoAuth: content.includes('NoAuth')
        });
      }
    } catch (error) {
      // Ignorar erros ao ler arquivos
    }
  }
  
  return configFiles;
}

// Função para procurar por diretórios de sessão
function findSessionDirectories() {
  console.log('\nProcurando por diretórios de sessão...');
  
  const rootDir = process.cwd();
  const results = [];
  
  try {
    // Procurar por .wwebjs_auth
    const wwebjsAuthPath = path.join(rootDir, '.wwebjs_auth');
    if (fs.existsSync(wwebjsAuthPath) && fs.statSync(wwebjsAuthPath).isDirectory()) {
      const sessions = fs.readdirSync(wwebjsAuthPath);
      
      for (const session of sessions) {
        const sessionPath = path.join(wwebjsAuthPath, session);
        if (fs.statSync(sessionPath).isDirectory()) {
          results.push({
            path: sessionPath,
            name: session,
            type: 'wwebjs_auth'
          });
        }
      }
    }
    
    // Procurar por .wweb_auth (versão antiga)
    const wwebAuthPath = path.join(rootDir, '.wweb_auth');
    if (fs.existsSync(wwebAuthPath) && fs.statSync(wwebAuthPath).isDirectory()) {
      const sessions = fs.readdirSync(wwebAuthPath);
      
      for (const session of sessions) {
        const sessionPath = path.join(wwebAuthPath, session);
        if (fs.statSync(sessionPath).isDirectory()) {
          results.push({
            path: sessionPath,
            name: session,
            type: 'wweb_auth'
          });
        }
      }
    }
  } catch (error) {
    console.error('Erro ao procurar diretórios de sessão:', error.message);
  }
  
  return results;
}

// Função para verificar se existe uma versão 1.0.x específica
function findVersion10() {
  console.log('\nVerificando se existe a versão 1.0.x específica...');
  
  try {
    // Procurar em node_modules
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    const dirs = fs.readdirSync(nodeModulesPath);
    
    // Procurar por whatsapp-web.js ou versões aninhadas
    let found = [];
    
    // Verificar diretamente em node_modules
    if (dirs.includes('whatsapp-web.js')) {
      const wwjsPath = path.join(nodeModulesPath, 'whatsapp-web.js');
      const packageJsonPath = path.join(wwjsPath, 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const version = packageJson.version;
        
        if (version && version.startsWith('1.0.')) {
          found.push({
            path: wwjsPath,
            version: version,
            location: 'direct'
          });
        } else {
          found.push({
            path: wwjsPath,
            version: version,
            location: 'direct',
            isVersion10: false
          });
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
                found.push({
                  path: wwjsPath,
                  version: version,
                  location: `nested in ${dir}`
                });
              } else {
                found.push({
                  path: wwjsPath,
                  version: version,
                  location: `nested in ${dir}`,
                  isVersion10: false
                });
              }
            }
          }
        } catch (e) {
          // Ignorar erros ao ler diretórios aninhados
        }
      }
    });
    
    return found;
  } catch (error) {
    console.error('Erro ao verificar a versão 1.0.x:', error.message);
    return [];
  }
}

// Função para verificar diferenças entre versões
function compareVersions(versions) {
  if (versions.length <= 1) {
    console.log('\nNão há versões suficientes para comparação.');
    return;
  }
  
  console.log('\n==== COMPARAÇÃO ENTRE VERSÕES ====');
  
  for (let i = 0; i < versions.length; i++) {
    for (let j = i + 1; j < versions.length; j++) {
      const v1 = versions[i];
      const v2 = versions[j];
      
      console.log(`\nComparando ${v1.version} (${v1.location}) com ${v2.version} (${v2.location}):`);
      
      // Verificar diferenças nos arquivos principais
      try {
        const files1 = fs.readdirSync(v1.path);
        const files2 = fs.readdirSync(v2.path);
        
        const uniqueFiles1 = files1.filter(f => !files2.includes(f));
        const uniqueFiles2 = files2.filter(f => !files1.includes(f));
        
        if (uniqueFiles1.length > 0) {
          console.log(`Arquivos exclusivos em ${v1.version}: ${uniqueFiles1.join(', ')}`);
        }
        
        if (uniqueFiles2.length > 0) {
          console.log(`Arquivos exclusivos em ${v2.version}: ${uniqueFiles2.join(', ')}`);
        }
        
        // Verificar diferenças em arquivos comuns importantes
        const commonFiles = files1.filter(f => files2.includes(f));
        const importantFiles = ['index.js', 'Client.js', 'package.json'];
        
        for (const file of importantFiles) {
          if (commonFiles.includes(file)) {
            const file1Path = path.join(v1.path, file);
            const file2Path = path.join(v2.path, file);
            
            const stat1 = fs.statSync(file1Path);
            const stat2 = fs.statSync(file2Path);
            
            if (stat1.size !== stat2.size) {
              console.log(`Arquivo ${file} tem tamanhos diferentes: ${stat1.size} vs ${stat2.size} bytes`);
            }
          }
        }
      } catch (error) {
        console.error(`Erro ao comparar arquivos: ${error.message}`);
      }
    }
  }
}

// Executar busca
console.log('==== BUSCA POR VERSÃO 1.0 DO WHATSAPP-WEB.JS ====');

const packages = findWhatsAppWebPackages();
console.log('\nPacotes encontrados:');
packages.forEach(pkg => {
  console.log(`- ${pkg.path} (versão: ${pkg.version}, pacote principal: ${pkg.isMainPackage})`);
});

const configs = findAppConfigurations();
console.log('\nArquivos de configuração encontrados:');
configs.forEach(config => {
  console.log(`- ${config.path}`);
  console.log(`  webVersionCache: ${config.hasWebVersionCache}`);
  console.log(`  LocalAuth: ${config.hasLocalAuth}`);
  console.log(`  RemoteAuth: ${config.hasRemoteAuth}`);
  console.log(`  NoAuth: ${config.hasNoAuth}`);
});

const sessions = findSessionDirectories();
console.log('\nDiretórios de sessão encontrados:');
sessions.forEach(session => {
  console.log(`- ${session.path} (nome: ${session.name}, tipo: ${session.type})`);
});

const version10Instances = findVersion10();
console.log('\nInstâncias da biblioteca encontradas:');
version10Instances.forEach(instance => {
  console.log(`- ${instance.path} (versão: ${instance.version}, localização: ${instance.location})`);
});

// Comparar versões encontradas
if (version10Instances.length > 1) {
  compareVersions(version10Instances);
}

console.log('\n==== RESUMO ====');
console.log(`Total de pacotes encontrados: ${packages.length}`);
console.log(`Total de arquivos de configuração encontrados: ${configs.length}`);
console.log(`Total de diretórios de sessão encontrados: ${sessions.length}`);
console.log(`Total de instâncias da biblioteca encontradas: ${version10Instances.length}`);

const version10Found = version10Instances.some(instance => instance.version && instance.version.startsWith('1.0.'));
console.log(`Versão 1.0.x encontrada: ${version10Found ? 'Sim' : 'Não'}`);

console.log('\nBusca concluída.');