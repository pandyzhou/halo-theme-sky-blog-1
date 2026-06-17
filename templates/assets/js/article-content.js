/**
 * 公共文章内容处理脚本
 * 适用于所有使用 #article-content 的页面（post、doc、page、about 等）
 * 
 * 使用方式：
 * 1. 在模板 <head> 中引入：<script th:src="@{/assets/js/article-content.js}"></script>
 * 2. 脚本会自动在 DOMContentLoaded 时初始化
 */

(function(window, document) {
  'use strict';

  /**
   * 图片懒加载设置
   * 跳过首屏前 N 张图片，后续图片添加 loading="lazy"
   */
  function setupContentLazyLoad() {
    const content = document.getElementById('article-content');
    if (!content) return;

    const images = content.querySelectorAll('img:not([loading])');
    const skipCount = 2; // 跳过前2张（首屏可能可见）

    images.forEach(function(img, index) {
      if (index >= skipCount) {
        img.setAttribute('loading', 'lazy');
      }
    });
  }

  /**
   * HTTPS 页面中归一化旧内容里的 HTTP 子资源地址。
   * 主要处理历史文章里保存的内网 Halo 地址，例如 http://192.168.x.x:8090/upload/...
   */
  function normalizeInsecureContentUrls() {
    if (window.location.protocol !== 'https:') return;

    const content = document.getElementById('article-content');
    if (!content) return;

    const localHostPattern = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;
    const mediaSelector = 'img[src], source[src], video[src], audio[src], iframe[src], embed[src]';

    function normalizeUrl(value) {
      if (!value || !/^http:\/\//i.test(value)) return value;

      try {
        const url = new URL(value);
        if (url.hostname === window.location.hostname || localHostPattern.test(url.hostname)) {
          return `${window.location.origin}${url.pathname}${url.search}${url.hash}`;
        }
        url.protocol = 'https:';
        return url.toString();
      } catch {
        return value.replace(/^http:\/\//i, 'https://');
      }
    }

    content.querySelectorAll(mediaSelector).forEach(function(el) {
      const next = normalizeUrl(el.getAttribute('src'));
      if (next && next !== el.getAttribute('src')) {
        el.setAttribute('src', next);
      }
    });

    content.querySelectorAll('[poster]').forEach(function(el) {
      const next = normalizeUrl(el.getAttribute('poster'));
      if (next && next !== el.getAttribute('poster')) {
        el.setAttribute('poster', next);
      }
    });

    content.querySelectorAll('[srcset]').forEach(function(el) {
      const srcset = el.getAttribute('srcset');
      if (!srcset || !srcset.includes('http://')) return;

      const normalized = srcset.split(',').map(function(part) {
        const trimmed = part.trim();
        const firstSpace = trimmed.search(/\s/);
        if (firstSpace === -1) return normalizeUrl(trimmed);
        return `${normalizeUrl(trimmed.slice(0, firstSpace))}${trimmed.slice(firstSpace)}`;
      }).join(', ');

      el.setAttribute('srcset', normalized);
    });
  }

  /**
   * 外部链接处理
   * 为外部链接添加 target="_blank" 和 rel="noopener noreferrer"
   */
  function setupExternalLinks() {
    const content = document.getElementById('article-content');
    if (!content) return;

    const links = content.querySelectorAll('a[href^="http"]');
    links.forEach(function(link) {
      if (!link.hostname.includes(window.location.hostname)) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  /**
   * Admonition 鼠标跟随发光效果
   */
  function initAdmonitionGlow() {
    const admonitions = document.querySelectorAll('#article-content .admonition');

    admonitions.forEach(function(admonition) {
      admonition.addEventListener('mouseenter', function() {
        admonition.style.setProperty('--glow-opacity', '1');
      });

      admonition.addEventListener('mouseleave', function() {
        admonition.style.setProperty('--glow-opacity', '0');
      });

      admonition.addEventListener('mousemove', function(e) {
        const rect = admonition.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        admonition.style.setProperty('--glow-x', x + 'px');
        admonition.style.setProperty('--glow-y', y + 'px');
      });
    });
  }

  /**
   * 移除可能的内联 blur 样式
   */
  function removeBlurStyles() {
    const content = document.getElementById('article-content');
    if (!content) return;

    const inlineStyles = content.querySelectorAll('style');
    inlineStyles.forEach(function(style) {
      if (style.textContent.includes('blur')) {
        style.remove();
      }
    });
  }

  /**
   * LightGallery 灯箱初始化
   * 为文章内容中的图片添加点击放大功能
   */
  function initLightGallery() {
    var content = document.getElementById('article-content');
    if (!content || typeof window.lightGallery !== 'function') return;

    // 已初始化则跳过
    if (content.getAttribute('lg-uid')) return;

    // 找到所有独立图片（不在 a 标签内）
    var images = content.querySelectorAll('img');
    var count = 0;

    images.forEach(function(img) {
      // 跳过已在链接中的图片
      if (img.closest('a')) return;
      // 跳过小图标（宽度 < 50px）
      var w = img.getAttribute('width');
      if (w && parseInt(w) < 50) return;
      // 跳过表情/emoji
      if (img.closest('.emoji') || img.closest('[data-type="emoji"]')) return;

      var src = img.getAttribute('src');
      if (!src) return;

      // 创建包裹链接
      var wrapper = document.createElement('a');
      wrapper.href = src;
      wrapper.setAttribute('data-src', src);
      wrapper.setAttribute('data-lg-size', '');
      wrapper.className = 'inline-block max-w-full';

      // 传递 alt 作为灯箱标题
      var alt = img.getAttribute('alt');
      if (alt) wrapper.setAttribute('data-sub-html', '<p>' + alt + '</p>');

      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);
      count++;
    });

    // 初始化 lightGallery
    if (count > 0) {
      window.lightGallery(content, {
        selector: 'a[data-src]',
        mode: 'lg-fade',
        speed: 300,
        download: false,
        counter: true,
        zoom: true,
        scale: 1,
        actualSize: true
      });
    }
  }

  /**
   * 初始化所有文章内容处理
   */
  function initArticleContent() {
    normalizeInsecureContentUrls();
    setupContentLazyLoad();
    setupExternalLinks();
    initAdmonitionGlow();
    removeBlurStyles();
    initLightGallery();
  }

  // 自动初始化
  document.addEventListener('DOMContentLoaded', function() {
    initArticleContent();
  });

  // 暴露给全局（可选，供页面手动调用）
  window.initArticleContent = initArticleContent;

})(window, document);
