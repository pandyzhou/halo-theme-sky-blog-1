/**
 * TOC 目录导航公共工具函数
 * 适用于 post、doc 等需要目录的页面
 */

/**
 * 构建动态目录树结构 - 基于相对层级
 * @param {Array} headingElements - 过滤后的标题元素列表
 * @param {number} minLevel - 最小层级（基准层级）
 * @returns {Array} 目录树数据
 */
export function buildDynamicTocTree(headingElements, minLevel) {
  const tocTree = [];
  const stack = [];

  headingElements.forEach((headingElement, headingIndex) => {
    // 为标题添加ID（如果没有的话）
    if (!headingElement.id) {
      headingElement.id = `heading-${headingIndex}`;
    }

    const absoluteLevel = parseInt(headingElement.tagName.charAt(1));
    const relativeLevel = absoluteLevel - minLevel;

    const tocItem = {
      id: headingElement.id,
      text: headingElement.textContent.trim(),
      absoluteLevel: absoluteLevel,
      relativeLevel: relativeLevel,
      element: headingElement,
      children: [],
    };

    // 清理栈，移除比当前级别高或相等的节点
    while (stack.length > 0 && stack[stack.length - 1].relativeLevel >= relativeLevel) {
      stack.pop();
    }

    // 添加到父节点或根节点
    if (stack.length === 0) {
      tocTree.push(tocItem);
    } else {
      stack[stack.length - 1].children.push(tocItem);
    }

    stack.push(tocItem);
  });

  return tocTree;
}

/**
 * 递归创建动态目录HTML结构
 * @param {Array} tocTree - 树形结构数据
 * @param {Object} options - 可选配置
 * @returns {HTMLElement} 生成的ol元素
 */
export function createDynamicTocHTML(tocTree, options = {}) {
  const {
    addTooltip = false,  // 是否添加 tooltip
    onClick = null       // 点击回调函数
  } = options;

  const ol = document.createElement('ol');
  ol.className = 'toc-list';

  tocTree.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'toc-item-wrapper';

    // 设置动态缩进级别
    li.style.setProperty('--toc-indent-multiplier', item.relativeLevel.toString());

    // 创建目录链接
    const linkElement = document.createElement('a');
    linkElement.href = `#${item.id}`;
    linkElement.textContent = item.text;
    linkElement.className = addTooltip ? 'toc-link tooltip tooltip-right' : 'toc-link';

    // 设置数据属性
    linkElement.setAttribute('data-relative-level', item.relativeLevel.toString());
    linkElement.setAttribute('data-absolute-level', item.absoluteLevel.toString());
    linkElement.setAttribute('data-heading-id', item.id);

    // 添加 tooltip
    if (addTooltip) {
      linkElement.setAttribute('data-tip', item.text);
    }

    // 添加点击事件
    if (onClick) {
      linkElement.addEventListener('click', (event) => {
        event.preventDefault();
        onClick(item.element, event);
      });
    }

    li.appendChild(linkElement);

    // 递归创建子节点
    if (item.children.length > 0) {
      const childrenOl = createDynamicTocHTML(item.children, options);
      li.appendChild(childrenOl);
    }

    ol.appendChild(li);
  });

  return ol;
}

/**
 * 平滑滚动到指定标题
 * @param {HTMLElement} headingElement - 目标标题元素
 * @param {number} offset - 偏移量（默认 80px，导航栏高度）
 */
export function smoothScrollToHeading(headingElement, offset = 80) {
  if (!headingElement) return;

  const targetPosition = headingElement.offsetTop - offset;

  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth'
  });
}

/**
 * 分析标题层级结构
 * @param {NodeList} headingElements - 所有标题元素
 * @returns {Object} 层级分析结果
 */
export function analyzeHeadingHierarchy(headingElements) {
  const headingArray = Array.from(headingElements);

  // 获取所有标题的级别
  const levels = headingArray.map(heading => parseInt(heading.tagName.charAt(1)));

  // 找到最小级别（最高级标题）
  const minLevel = Math.min(...levels);

  // 计算最大显示层级（最多显示3级）
  const maxDisplayLevel = minLevel + 2;

  // 过滤标题：只保留前3个相对层级
  const filteredHeadings = headingArray.filter(heading => {
    const level = parseInt(heading.tagName.charAt(1));
    return level <= maxDisplayLevel;
  });

  return {
    filteredHeadings,
    minLevel,
    maxDisplayLevel,
    totalLevels: levels.length > 0 ? Math.max(...levels) - minLevel + 1 : 0
  };
}
