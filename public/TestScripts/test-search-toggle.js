// Test script for search toggle functionality
// This script tests search box toggle and minimization features

console.log('[TEST] Search toggle test script loaded');

// Test search toggle functionality
function testSearchToggle() {
  try {
    // Test if search toggle functions exist
    if (typeof setupSearchToggle === 'function') {
      console.log('[TEST] setupSearchToggle function exists');
    } else {
      console.warn('[TEST] setupSearchToggle function not found');
    }
    
    // Test search elements
    const searchContainer = document.querySelector('.search-container');
    const searchBox = document.querySelector('.search-box');
    const searchInput = document.getElementById('buscaContato');
    
    if (searchContainer) {
      console.log('[TEST] Search container found');
    } else {
      console.warn('[TEST] Search container not found');
    }
    
    if (searchBox) {
      console.log('[TEST] Search box found');
    } else {
      console.warn('[TEST] Search box not found');
    }
    
    if (searchInput) {
      console.log('[TEST] Search input found');
      
      // Test search input functionality
      searchInput.addEventListener('focus', function() {
        console.log('[TEST] Search input focused');
      });
      
      searchInput.addEventListener('blur', function() {
        console.log('[TEST] Search input blurred');
      });
      
      searchInput.addEventListener('input', function() {
        console.log('[TEST] Search input changed:', this.value);
      });
    } else {
      console.warn('[TEST] Search input not found');
    }
    
    console.log('[TEST] Search toggle test completed');
  } catch (error) {
    console.error('[TEST] Error in search toggle test:', error);
  }
}

// Run test when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testSearchToggle);
} else {
  testSearchToggle();
}