// Test script for mobile navigation functionality
// This script tests mobile navigation features

console.log('[TEST] Mobile navigation test script loaded');

// Test mobile navigation functionality
function testMobileNavigation() {
  try {
    // Test if mobile navigation functions exist
    if (typeof navigateToChat === 'function') {
      console.log('[TEST] navigateToChat function exists');
    } else {
      console.warn('[TEST] navigateToChat function not found');
    }
    
    if (typeof navigateToChatList === 'function') {
      console.log('[TEST] navigateToChatList function exists');
    } else {
      console.warn('[TEST] navigateToChatList function not found');
    }
    
    if (typeof setupMobileNavigation === 'function') {
      console.log('[TEST] setupMobileNavigation function exists');
    } else {
      console.warn('[TEST] setupMobileNavigation function not found');
    }
    
    console.log('[TEST] Mobile navigation test completed');
  } catch (error) {
    console.error('[TEST] Error in mobile navigation test:', error);
  }
}

// Run test when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testMobileNavigation);
} else {
  testMobileNavigation();
}