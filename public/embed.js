/**
 * NetPad Form Embed SDK
 *
 * Lightweight script for embedding NetPad forms on any website.
 *
 * Usage:
 *
 * 1. Include the script:
 *    <script src="https://www.netpad.io/embed.js"></script>
 *
 * 2. Add a container with data attributes:
 *    <div data-netpad-form="your-form-slug"></div>
 *
 * 3. Or use the JavaScript API:
 *    NetPad.embed('container-id', 'form-slug', { theme: 'dark' });
 *
 * Options:
 *   - theme: 'light' | 'dark' | 'auto' (default: 'auto')
 *   - hideHeader: boolean (default: false)
 *   - hideBranding: boolean (default: false)
 *   - height: string (default: '100%')
 *   - width: string (default: '100%')
 *   - onSubmit: function(data) - callback after form submission
 *   - onLoad: function() - callback when form is loaded
 *   - onError: function(error) - callback on error
 */

(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.NetPad) return;

  var BASE_URL = (function() {
    // Try to get base URL from script src
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      if (src && src.indexOf('embed.js') !== -1) {
        return src.replace(/\/embed\.js.*$/, '');
      }
    }
    // Fallback to current domain or production
    return window.location.origin || 'https://www.netpad.io';
  })();

  var defaultOptions = {
    theme: 'auto',
    hideHeader: false,
    hideBranding: false,
    height: '100%',
    width: '100%',
    minHeight: '400px'
  };

  /**
   * Build the iframe URL with query parameters
   */
  function buildFormUrl(formSlug, options) {
    var url = BASE_URL + '/forms/' + encodeURIComponent(formSlug);
    var params = [];

    if (options.theme && options.theme !== 'light') {
      params.push('theme=' + encodeURIComponent(options.theme));
    }
    if (options.hideHeader) {
      params.push('hideHeader=true');
    }
    if (options.hideBranding) {
      params.push('hideBranding=true');
    }
    // Mark as embedded for special handling
    params.push('embedded=true');

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return url;
  }

  /**
   * Create an iframe element for the form
   */
  function createIframe(formSlug, options) {
    var iframe = document.createElement('iframe');
    iframe.src = buildFormUrl(formSlug, options);
    iframe.style.border = 'none';
    iframe.style.width = options.width || '100%';
    iframe.style.height = options.height || '100%';
    iframe.style.minHeight = options.minHeight || '400px';
    iframe.style.borderRadius = options.borderRadius || '8px';
    iframe.style.display = 'block';
    iframe.setAttribute('title', 'NetPad Form');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('allow', 'camera; microphone; geolocation');
    iframe.setAttribute('data-netpad-iframe', formSlug);

    return iframe;
  }

  /**
   * Set up message listener for iframe communication
   */
  function setupMessageListener(iframe, formSlug, options) {
    var handler = function(event) {
      // Verify origin
      if (event.origin !== BASE_URL) return;

      var data = event.data;
      if (!data || data.source !== 'netpad-form') return;
      if (data.formSlug !== formSlug) return;

      switch (data.type) {
        case 'loaded':
          if (options.onLoad) options.onLoad();
          break;

        case 'submit':
          if (options.onSubmit) options.onSubmit(data.payload);
          break;

        case 'error':
          if (options.onError) options.onError(data.payload);
          break;

        case 'resize':
          // Auto-resize iframe based on content
          if (data.payload && data.payload.height && options.autoResize !== false) {
            iframe.style.height = data.payload.height + 'px';
          }
          break;
      }
    };

    window.addEventListener('message', handler);

    // Return cleanup function
    return function() {
      window.removeEventListener('message', handler);
    };
  }

  /**
   * Main embed function
   */
  function embed(containerOrId, formSlug, options) {
    var container;

    // Get container element
    if (typeof containerOrId === 'string') {
      container = document.getElementById(containerOrId);
    } else if (containerOrId instanceof HTMLElement) {
      container = containerOrId;
    }

    if (!container) {
      console.error('[NetPad] Container not found:', containerOrId);
      return null;
    }

    if (!formSlug) {
      console.error('[NetPad] Form slug is required');
      return null;
    }

    // Merge options with defaults
    var opts = {};
    for (var key in defaultOptions) {
      opts[key] = defaultOptions[key];
    }
    if (options) {
      for (var key in options) {
        opts[key] = options[key];
      }
    }

    // Create and insert iframe
    var iframe = createIframe(formSlug, opts);
    container.innerHTML = '';
    container.appendChild(iframe);

    // Set up message communication
    var cleanup = setupMessageListener(iframe, formSlug, opts);

    // Return control object
    return {
      iframe: iframe,
      destroy: function() {
        cleanup();
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      },
      reload: function() {
        iframe.src = buildFormUrl(formSlug, opts);
      },
      getFormUrl: function() {
        return buildFormUrl(formSlug, opts);
      }
    };
  }

  /**
   * Open form in a popup window
   */
  function popup(formSlug, options) {
    var opts = options || {};
    var width = opts.width || 600;
    var height = opts.height || 700;
    var left = (window.screen.width - width) / 2;
    var top = (window.screen.height - height) / 2;

    var url = buildFormUrl(formSlug, opts);
    var features = [
      'width=' + width,
      'height=' + height,
      'left=' + left,
      'top=' + top,
      'scrollbars=yes',
      'resizable=yes'
    ].join(',');

    return window.open(url, 'netpad-form-' + formSlug, features);
  }

  /**
   * Auto-initialize forms from data attributes
   */
  function autoInit() {
    var elements = document.querySelectorAll('[data-netpad-form]');

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var formSlug = el.getAttribute('data-netpad-form');

      // Skip if already initialized
      if (el.getAttribute('data-netpad-initialized')) continue;

      // Read options from data attributes
      var options = {
        theme: el.getAttribute('data-theme') || undefined,
        hideHeader: el.getAttribute('data-hide-header') === 'true',
        hideBranding: el.getAttribute('data-hide-branding') === 'true',
        height: el.getAttribute('data-height') || undefined,
        width: el.getAttribute('data-width') || undefined,
        minHeight: el.getAttribute('data-min-height') || undefined,
        autoResize: el.getAttribute('data-auto-resize') !== 'false'
      };

      embed(el, formSlug, options);
      el.setAttribute('data-netpad-initialized', 'true');
    }
  }

  // Expose the API
  window.NetPad = {
    embed: embed,
    popup: popup,
    init: autoInit,
    version: '1.0.0',
    baseUrl: BASE_URL
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  // Also watch for dynamically added elements
  if (window.MutationObserver) {
    var observer = new MutationObserver(function(mutations) {
      var shouldInit = false;
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
          shouldInit = true;
        }
      });
      if (shouldInit) {
        autoInit();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();
