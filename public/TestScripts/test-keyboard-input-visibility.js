// Test script for keyboard input visibility functionality
// This script tests input visibility when virtual keyboard appears

console.log('[TEST] Keyboard input visibility test script loaded');

// Test keyboard input visibility functionality
function testKeyboardInputVisibility() {
  try {
    // Test input elements
    const messageInput = document.getElementById('mensagem');
    const searchInput = document.getElementById('buscaContato');
    const allInputs = document.querySelectorAll('input, textarea');
    
    console.log('[TEST] Found', allInputs.length, 'input elements');
    
    if (messageInput) {
      console.log('[TEST] Message input found');
      
      messageInput.addEventListener('focus', function() {
        console.log('[TEST] Message input focused - checking visibility');
        const rect = this.getBoundingClientRect();
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
        console.log('[TEST] Message input visible:', isVisible, 'Position:', rect);
      });
    } else {
      console.warn('[TEST] Message input not found');
    }
    
    if (searchInput) {
      console.log('[TEST] Search input found');
      
      searchInput.addEventListener('focus', function() {
        console.log('[TEST] Search input focused - checking visibility');
        const rect = this.getBoundingClientRect();
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
        console.log('[TEST] Search input visible:', isVisible, 'Position:', rect);
      });
    } else {
      console.warn('[TEST] Search input not found');
    }
    
    // Test viewport changes affecting input visibility
    let initialViewportHeight = window.innerHeight;
    
    window.addEventListener('resize', function() {
      const currentHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      
      if (heightDifference > 150) {
        console.log('[TEST] Keyboard opened - checking input positions');
        
        allInputs.forEach((input, index) => {
          if (document.activeElement === input) {
            const rect = input.getBoundingClientRect();
            const isVisible = rect.top >= 0 && rect.bottom <= currentHeight;
            console.log('[TEST] Active input', index, 'visibility:', isVisible);
          }
        });
      }
    });
    
    console.log('[TEST] Keyboard input visibility test completed');
  } catch (error) {
    console.error('[TEST] Error in keyboard input visibility test:', error);
  }
}

// Run test when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testKeyboardInputVisibility);
} else {
  testKeyboardInputVisibility();
}