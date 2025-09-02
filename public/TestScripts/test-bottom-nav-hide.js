// Test script for bottom navigation hide functionality
// This script tests bottom navigation hiding behavior

console.log('[TEST] Bottom nav hide test script loaded');

// Test bottom navigation hide functionality
function testBottomNavHide() {
  try {
    // Test if bottom nav functions exist
    if (typeof toggleBottomNav === 'function') {
      console.log('[TEST] toggleBottomNav function exists');
    } else {
      console.warn('[TEST] toggleBottomNav function not found');
    }
    
    // Test bottom navigation elements
    const bottomNav = document.querySelector('.bottom-nav');
    const mobileNav = document.querySelector('.mobile-nav');
    
    if (bottomNav) {
      console.log('[TEST] Bottom navigation found');
      
      // Test visibility toggle
      const isVisible = !bottomNav.classList.contains('hidden');
      console.log('[TEST] Bottom nav visibility:', isVisible ? 'visible' : 'hidden');
    } else {
      console.warn('[TEST] Bottom navigation not found');
    }
    
    if (mobileNav) {
      console.log('[TEST] Mobile navigation found');
    } else {
      console.warn('[TEST] Mobile navigation not found');
    }
    
    // Test scroll behavior for hiding nav
    let lastScrollTop = 0;
    window.addEventListener('scroll', function() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollDirection = scrollTop > lastScrollTop ? 'down' : 'up';
      
      console.log('[TEST] Scroll direction:', scrollDirection, 'Position:', scrollTop);
      lastScrollTop = scrollTop;
    });
    
    console.log('[TEST] Bottom nav hide test completed');
  } catch (error) {
    console.error('[TEST] Error in bottom nav hide test:', error);
  }
}

// Run test when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testBottomNavHide);
} else {
  testBottomNavHide();
}