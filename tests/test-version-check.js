/**
 * Script para verificar a versão da biblioteca whatsapp-web.js
 * e comparar com a versão que está funcionando (v1.0)
 */

const fs = require('fs');
const path = require('path');
const { version } = require('whatsapp-web.js');

console.log('\n==== VERIFICAÇÃO DE VERSÃO DO WHATSAPP-WEB.JS ====');
console.log(`Versão instalada: ${version}`);

// Verificar package.json
try {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  console.log('\n==== INFORMAÇÕES DO PACKAGE.JSON ====');
  console.log(`Versão do whatsapp-web.js no package.json: ${packageJson.dependencies['whatsapp-web.js']}`);
  
  // Listar todas as dependências
  console.log('\nDependências relacionadas:');
  for (const [dep, ver] of Object.entries(packageJson.dependencies)) {
    if (dep.includes('whatsapp') || dep.includes('puppeteer') || dep.includes('qrcode')) {
      console.log(`- ${dep}: ${ver}`);
    }
  }
} catch (err) {
  console.error('Erro ao ler package.json:', err);
}

// Verificar node_modules
try {
  const wwjsPath = path.join(process.cwd(), 'node_modules', 'whatsapp-web.js');
  const wwjsPackageJsonPath = path.join(wwjsPath, 'package.json');
  
  if (fs.existsSync(wwjsPackageJsonPath)) {
    const wwjsPackageJson = JSON.parse(fs.readFileSync(wwjsPackageJsonPath, 'utf8'));
    
    console.log('\n==== INFORMAÇÕES DO NODE_MODULES ====');
    console.log(`Versão instalada no node_modules: ${wwjsPackageJson.version}`);
    console.log(`Descrição: ${wwjsPackageJson.description}`);
    console.log(`Autor: ${wwjsPackageJson.author}`);
    
    // Verificar dependências da biblioteca
    console.log('\nDependências da biblioteca:');
    for (const [dep, ver] of Object.entries(wwjsPackageJson.dependencies || {})) {
      console.log(`- ${dep}: ${ver}`);
    }
    
    // Verificar arquivos principais
    const mainFile = wwjsPackageJson.main;
    console.log(`\nArquivo principal: ${mainFile}`);
    
    // Verificar estrutura de diretórios
    console.log('\nEstrutura de diretórios:');
    const dirs = fs.readdirSync(wwjsPath).filter(f => fs.statSync(path.join(wwjsPath, f)).isDirectory());
    dirs.forEach(dir => console.log(`- ${dir}/`));
    
    // Verificar arquivos principais
    console.log('\nArquivos principais:');
    const files = fs.readdirSync(wwjsPath).filter(f => fs.statSync(path.join(wwjsPath, f)).isFile());
    files.forEach(file => console.log(`- ${file}`));
  } else {
    console.error('Biblioteca whatsapp-web.js não encontrada em node_modules');
  }
} catch (err) {
  console.error('Erro ao verificar node_modules:', err);
}

// Verificar se há múltiplas versões instaladas
console.log('\n==== VERIFICAÇÃO DE MÚLTIPLAS VERSÕES ====');
try {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  const dirs = fs.readdirSync(nodeModulesPath);
  
  const wwjsInstances = [];
  
  // Procurar por whatsapp-web.js em node_modules
  if (dirs.includes('whatsapp-web.js')) {
    wwjsInstances.push('node_modules/whatsapp-web.js');
  }
  
  // Procurar em dependências aninhadas
  dirs.forEach(dir => {
    const nestedNodeModules = path.join(nodeModulesPath, dir, 'node_modules');
    if (fs.existsSync(nestedNodeModules)) {
      try {
        const nestedDirs = fs.readdirSync(nestedNodeModules);
        if (nestedDirs.includes('whatsapp-web.js')) {
          wwjsInstances.push(`node_modules/${dir}/node_modules/whatsapp-web.js`);
        }
      } catch (e) {
        // Ignorar erros de permissão
      }
    }
  });
  
  if (wwjsInstances.length > 1) {
    console.log(`Encontradas ${wwjsInstances.length} instâncias da biblioteca:`);
    wwjsInstances.forEach(instance => {
      try {
        const packageJsonPath = path.join(process.cwd(), instance, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          console.log(`- ${instance}: v${packageJson.version}`);
        } else {
          console.log(`- ${instance}: versão desconhecida (package.json não encontrado)`);
        }
      } catch (e) {
        console.log(`- ${instance}: erro ao verificar versão`);
      }
    });
  } else if (wwjsInstances.length === 1) {
    console.log('Apenas uma instância da biblioteca encontrada.');
  } else {
    console.log('Nenhuma instância da biblioteca encontrada em node_modules.');
  }
} catch (err) {
  console.error('Erro ao verificar múltiplas versões:', err);
}

// Verificar se há uma versão 1.0 instalada
console.log('\n==== VERIFICAÇÃO DA VERSÃO 1.0 ====');
try {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  let v1Found = false;
  
  // Função recursiva para procurar versão 1.0
  function findV1(dir, depth = 0) {
    if (depth > 3) return; // Limitar profundidade da busca
    
    try {
      const files = fs.readdirSync(dir);
      
      if (files.includes('whatsapp-web.js')) {
        const wwjsDir = path.join(dir, 'whatsapp-web.js');
        const packageJsonPath = path.join(wwjsDir, 'package.json');
        
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          const version = packageJson.version;
          
          if (version && version.startsWith('1.0')) {
            console.log(`Encontrada versão 1.0: ${version} em ${wwjsDir}`);
            v1Found = true;
          }
        }
      }
      
      // Verificar subdiretórios node_modules
      if (files.includes('node_modules')) {
        findV1(path.join(dir, 'node_modules'), depth + 1);
      }
      
      // Verificar outros diretórios no mesmo nível
      if (depth === 0) {
        files.forEach(file => {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) {
            const nestedNodeModules = path.join(fullPath, 'node_modules');
            if (fs.existsSync(nestedNodeModules)) {
              findV1(nestedNodeModules, depth + 1);
            }
          }
        });
      }
    } catch (e) {
      // Ignorar erros de permissão
    }
  }
  
  findV1(nodeModulesPath);
  
  if (!v1Found) {
    console.log('Nenhuma versão 1.0.x encontrada no projeto.');
  }
} catch (err) {
  console.error('Erro ao verificar versão 1.0:', err);
}

console.log('\n==== VERIFICAÇÃO CONCLUÍDA ====');