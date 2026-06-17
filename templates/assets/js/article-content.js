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

  var lightGalleryRetryTimer = null;

  function isProbablyImageUrl(url) {
    if (!url) return false;
    try {
      var parsed = new URL(url, window.location.href);
      return /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(parsed.pathname + parsed.search);
    } catch {
      return /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(url);
    }
  }

  function shouldSkipLightGalleryImage(img) {
    if (!img) return true;

    var width = img.getAttribute('width');
    if (width && parseInt(width) < 50) return true;

    if (img.closest('.emoji') || img.closest('[data-type="emoji"]')) return true;
    if (img.closest('a[data-no-lightgallery], [data-no-lightgallery]')) return true;

    var src = img.currentSrc || img.getAttribute('src') || img.getAttribute('data-src');
    return !src;
  }

  function getLightGallerySrc(img) {
    return img.currentSrc || img.getAttribute('src') || img.getAttribute('data-src') || '';
  }

  function applyLightGalleryAttributes(link, img, src) {
    link.setAttribute('data-src', src);
    link.setAttribute('data-sky-lightgallery-item', 'true');
    if (!link.getAttribute('href')) link.setAttribute('href', src);
    if (!link.getAttribute('data-lg-size')) link.setAttribute('data-lg-size', '');
    if (!link.classList.contains('inline-block')) link.classList.add('inline-block');
    if (!link.classList.contains('max-w-full')) link.classList.add('max-w-full');

    var alt = img.getAttribute('alt');
    if (alt && !link.getAttribute('data-sub-html')) {
      link.setAttribute('data-sub-html', '<p>' + alt.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>');
    }
  }

  function prepareLightGalleryItems(content) {
    var preparedCount = 0;
    var images = content.querySelectorAll('img');

    images.forEach(function(img) {
      if (shouldSkipLightGalleryImage(img)) return;

      var src = getLightGallerySrc(img);
      if (!src) return;

      var existingLink = img.closest('a');
      if (existingLink) {
        var href = existingLink.getAttribute('href') || '';
        if (!href || href === '#' || isProbablyImageUrl(href) || href === src) {
          applyLightGalleryAttributes(existingLink, img, href && href !== '#' ? href : src);
          preparedCount++;
        }
        return;
      }

      var wrapper = document.createElement('a');
      wrapper.href = src;
      applyLightGalleryAttributes(wrapper, img, src);
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);
      preparedCount++;
    });

    return preparedCount;
  }

  function bindLightGallery(content) {
    if (!content || typeof window.lightGallery !== 'function') return false;
    if (content.getAttribute('lg-uid')) return true;
    if (!content.querySelector('a[data-src]')) return false;

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

    return true;
  }

  /**
   * LightGallery 灯箱初始化
   * 为文章内容中的图片添加点击放大功能。
   * 插件脚本使用 defer 加载，可能晚于文章模块执行，因此这里会短时重试等待 window.lightGallery。
   */
  function initLightGallery() {
    var content = document.getElementById('article-content');
    if (!content) return;

    prepareLightGalleryItems(content);

    if (bindLightGallery(content)) {
      if (lightGalleryRetryTimer) {
        clearTimeout(lightGalleryRetryTimer);
        lightGalleryRetryTimer = null;
      }
      content.removeAttribute('data-sky-lightgallery-attempts');
      return;
    }

    if (typeof window.lightGallery === 'function') return;

    var attempts = parseInt(content.getAttribute('data-sky-lightgallery-attempts') || '0', 10);
    if (attempts >= 50) return;

    content.setAttribute('data-sky-lightgallery-attempts', String(attempts + 1));
    if (lightGalleryRetryTimer) clearTimeout(lightGalleryRetryTimer);
    lightGalleryRetryTimer = setTimeout(initLightGallery, 100);
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

  document.addEventListener('sky:page-cleanup', function() {
    if (lightGalleryRetryTimer) {
      clearTimeout(lightGalleryRetryTimer);
      lightGalleryRetryTimer = null;
    }
  });

  // 暴露给全局（可选，供页面手动调用）
  window.initArticleContent = initArticleContent;

})(window, document);
