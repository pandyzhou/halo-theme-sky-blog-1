/**
 * 简化版表情选择器
 * 修复点击隐藏功能
 */

// 常用表情数据
const EMOJI_DATA = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
  '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾',
  '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
  '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞',
  '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
  '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
  '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
  '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋',
  '🩸', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩',
  '🧓', '👴', '👵', '🙍', '🙎', '🙅', '🙆', '💁', '🙋', '🧏',
  '🙇', '🤦', '🤷', '👮', '🕵️', '💂', '👷', '🤴', '👸', '👳',
  '👲', '🧕', '🤵', '👰', '🤰', '🤱', '👼', '🎅', '🤶', '🦸',
];

// 表情选择器类
class EmojiSelector {
  constructor() {
    this.currentTarget = null;
    this.selectorElement = null;
    this.isVisible = false;
    this.globalClickHandler = null;
    this.init();
  }

  init() {
    this.createSelectorElement();
    this.bindEvents();
  }

  createSelectorElement() {
    const selector = document.createElement('div');
    selector.id = 'emoji-selector';
    selector.className = 'emoji-selector';
    selector.innerHTML = `
      <div class="emoji-selector-content">
        <div class="emoji-grid">
          ${EMOJI_DATA.map(emoji => `
            <button class="emoji-item" data-emoji="${emoji}" title="${emoji}">
              ${emoji}
            </button>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(selector);
    this.selectorElement = selector;
  }

  bindEvents() {
    // 表情选择事件
    this.selectorElement.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止冒泡
      
      if (e.target.classList.contains('emoji-item')) {
        const emoji = e.target.dataset.emoji;
        this.selectEmoji(emoji);
      }
    });
  }

  /**
   * 显示表情选择器
   */
  show(targetElement, triggerElement) {
    this.currentTarget = targetElement;
    this.isVisible = true;
    
    // 定位表情选择器
    this.positionSelector(triggerElement);
    
    // 显示选择器
    this.selectorElement.classList.add('show');
    
    // 添加全局点击监听（延迟添加，避免立即触发）
    setTimeout(() => {
      this.addGlobalClickListener();
    }, 100);
  }

  /**
   * 隐藏表情选择器
   */
  hide() {
    this.isVisible = false;
    this.selectorElement.classList.remove('show');
    this.currentTarget = null;
    
    // 移除全局点击监听
    this.removeGlobalClickListener();
  }

  /**
   * 添加全局点击监听
   */
  addGlobalClickListener() {
    if (this.globalClickHandler) {
      this.removeGlobalClickListener();
    }
    
    this.globalClickHandler = (e) => {
      // 如果表情选择器不可见，不处理
      if (!this.isVisible) return;
      
      // 如果点击的是表情选择器内部，不处理
      if (this.selectorElement.contains(e.target)) return;
      
      // 如果点击的是表情按钮，不处理
      if (e.target.closest('#emoji-trigger-btn')) return;
      
      // 点击其他任何地方都隐藏表情选择器
      this.hide();
    };
    
    // 使用捕获阶段确保事件能被正确处理
    document.addEventListener('click', this.globalClickHandler, true);
  }

  /**
   * 移除全局点击监听
   */
  removeGlobalClickListener() {
    if (this.globalClickHandler) {
      document.removeEventListener('click', this.globalClickHandler, true);
      this.globalClickHandler = null;
    }
  }

  /**
   * 定位表情选择器
   */
  positionSelector(triggerElement) {
    if (!triggerElement) return;

    const triggerRect = triggerElement.getBoundingClientRect();
    const selectorWidth = 320;
    const selectorHeight = 280;
    
    // 计算位置
    let left = triggerRect.left;
    let top = triggerRect.bottom + 8;
    
    // 防止超出右边界
    if (left + selectorWidth > window.innerWidth) {
      left = window.innerWidth - selectorWidth - 16;
    }
    
    // 防止超出左边界
    if (left < 16) {
      left = 16;
    }
    
    // 防止超出下边界
    if (top + selectorHeight > window.innerHeight) {
      top = triggerRect.top - selectorHeight - 8;
    }
    
    // 设置位置
    this.selectorElement.style.left = `${left}px`;
    this.selectorElement.style.top = `${top}px`;
  }

  /**
   * 选择表情
   */
  selectEmoji(emoji) {
    if (!this.currentTarget) return;

    // 获取光标位置
    const start = this.currentTarget.selectionStart || 0;
    const end = this.currentTarget.selectionEnd || 0;
    const value = this.currentTarget.value || '';

    // 插入表情
    const newValue = value.slice(0, start) + emoji + value.slice(end);
    this.currentTarget.value = newValue;

    // 设置新的光标位置
    const newCursorPos = start + emoji.length;
    this.currentTarget.setSelectionRange(newCursorPos, newCursorPos);

    // 触发input事件
    const inputEvent = new Event('input', { bubbles: true });
    this.currentTarget.dispatchEvent(inputEvent);

    // 聚焦到输入框
    this.currentTarget.focus();

    // 添加点击动画效果
    const clickedItem = this.selectorElement.querySelector(`[data-emoji="${emoji}"]`);
    if (clickedItem) {
      clickedItem.classList.add('clicked');
      setTimeout(() => {
        clickedItem.classList.remove('clicked');
      }, 150);
    }

    // 隐藏选择器
    this.hide();
  }

  /**
   * 销毁表情选择器
   */
  destroy() {
    this.removeGlobalClickListener();
    if (this.selectorElement) {
      this.selectorElement.remove();
    }
  }
}

// 全局表情选择器实例
let emojiSelectorInstance = null;

/**
 * 显示表情选择器的全局函数
 */
function showEmojiSelector(targetElement, triggerElement) {

  
  if (!emojiSelectorInstance) {
    emojiSelectorInstance = new EmojiSelector();
  }
  
  // 如果已经显示且目标相同，则隐藏
  if (emojiSelectorInstance.isVisible && emojiSelectorInstance.currentTarget === targetElement) {
    emojiSelectorInstance.hide();
  } else {
    // 否则显示选择器
    emojiSelectorInstance.show(targetElement, triggerElement);
  }
}

/**
 * 隐藏表情选择器的全局函数
 */
function hideEmojiSelector() {
  if (emojiSelectorInstance) {
    emojiSelectorInstance.hide();
  }
}

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  if (emojiSelectorInstance) {
    emojiSelectorInstance.destroy();
  }
});

// 导出全局函数
window.showEmojiSelector = showEmojiSelector;
window.hideEmojiSelector = hideEmojiSelector;
