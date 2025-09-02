// Test script for input position adjustment functionality
// This script tests automatic input position adjustment when keyboard appears

console.log('[TEST] Input position adjustment test script loaded');

// Test input position adjustment functionality
function testInputPositionAdjustment() {
  try {
    // Test input elements that might need position adjustment
    const messageInput = document.getElementById('mensagem');
    const messageForm = document.getElementById('formEnvio');
    const chatArea = document.getElementById('mensagens');
    
    if (messageInput && messageForm) {
      console.log('[TEST] Message input and form found');
      
      messageInput.addEventListener('focus', function() {
        console.log('[TEST] Message input focused - testing position adjustment');
        
        // Get initial positions
        const inputRect = this.getBoundingClientRect();
        const formRect = messageForm.getBoundingClientRect();
        
        console.log('[TEST] Input position:', inputRect);
        console.log('[TEST] Form position:', formRect);
        
        // Test if input is in viewport
        const viewportHeight = window.innerHeight;
        const isInputVisible = inputRect.bottom <= viewportHeight;
        
        console.log('[TEST] Input visible in viewport:', isInputVisible);
        
        if (!isInputVisible) {
          console.log('[TEST] Input needs position adjustment');
          
          // Test scrolling to input
          this.scrollIntoView({ behavior: 'smooth', block: 'center' });
          console.log('[TEST] Attempted to scroll input into view');
        }
      });
      
      messageInput.addEventListener('blur', function() {
        console.log('[TEST] Message input blurred - checking position reset');
      });
    } else {
      console.warn('[TEST] Message input or form not found');
    }
    
    if (chatArea) {
      console.log('[TEST] Chat area found');
      
      // Test chat area adjustment when keyboard appears
      let initialChatHeight = chatArea.offsetHeight;
      
      window.addEventListener('resize', function() {
        const currentViewportHeight = window.innerHeight;
        const currentChatHeight = chatArea.offsetHeight;
        
        console.log('[TEST] Viewport height changed:', currentViewportHeight);
        console.log('[TEST] Chat area height:', currentChatHeight);
        
        if (currentChatHeight !== initialChatHeight) {
          console.log('[TEST] Chat area height adjusted for keyboard');
        }
      });
    } else {
      console.warn('[TEST] Chat area not found');
    }
    
    // Test bottom navigation adjustment
    const bottomNav = document.querySelector('.bottom-nav, .mobile-nav');
    if (bottomNav) {
      console.log('[TEST] Bottom navigation found - testing position adjustment');
      
      window.addEventListener('resize', function() {
        const navRect = bottomNav.getBoundingClientRect();
        const isNavVisible = navRect.top < window.innerHeight;
        
        console.log('[TEST] Bottom nav visible:', isNavVisible, 'Position:', navRect.top);
      });
    }
    
    console.log('[TEST] Input position adjustment test completed');
  } catch (error) {
    console.error('[TEST] Error in input position adjustment test:', error);
  }
}

// Run test when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testInputPositionAdjustment);
} else {
  testInputPositionAdjustment();
}