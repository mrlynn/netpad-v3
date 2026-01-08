/**
 * NetPad Workflow Embed SDK
 *
 * Lightweight script for embedding and executing NetPad workflows on any website.
 *
 * Usage:
 *
 * 1. Include the script:
 *    <script src="https://www.netpad.io/workflow-embed.js"></script>
 *
 * 2. Execute a workflow:
 *    NetPad.executeWorkflow('workflow-slug', { payload: { data: 'value' } })
 *      .then(result => console.log('Execution ID:', result.executionId));
 *
 * 3. Check execution status:
 *    NetPad.getExecutionStatus('execution-id')
 *      .then(status => console.log('Status:', status.status));
 *
 * 4. Embed execution UI (if available):
 *    NetPad.embedExecution('container-id', 'execution-id', { theme: 'dark' });
 *
 * Options:
 *   - token: string - Optional execution token for authentication
 *   - theme: 'light' | 'dark' | 'auto' (default: 'auto')
 *   - hideHeader: boolean (default: false)
 *   - hideBranding: boolean (default: false)
 *   - onStatusChange: function(status) - callback when execution status changes
 *   - onComplete: function(result) - callback when execution completes
 *   - onError: function(error) - callback on error
 */

(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.NetPad && window.NetPad.executeWorkflow) return;

  var BASE_URL = (function() {
    // Try to get base URL from script src
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      if (src && src.indexOf('workflow-embed.js') !== -1) {
        return src.replace(/\/workflow-embed\.js.*$/, '');
      }
    }
    // Fallback to current domain or production
    return window.location.origin || 'https://www.netpad.io';
  })();

  /**
   * Execute a workflow
   */
  function executeWorkflow(workflowSlug, options) {
    options = options || {};
    var payload = options.payload || {};
    var token = options.token;

    return fetch(BASE_URL + '/api/workflows/public/' + encodeURIComponent(workflowSlug) + '/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token,
        payload: payload,
      }),
    })
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        if (!data.success) {
          throw new Error(data.error || 'Workflow execution failed');
        }
        return data;
      });
  }

  /**
   * Get execution status
   */
  function getExecutionStatus(executionId, options) {
    options = options || {};
    var includeLogs = options.includeLogs || false;
    var url = BASE_URL + '/api/workflows/public/executions/' + encodeURIComponent(executionId);
    if (includeLogs) {
      url += '?logs=true';
    }

    return fetch(url)
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        if (!data.success) {
          throw new Error(data.error || 'Failed to get execution status');
        }
        return data;
      });
  }

  /**
   * Poll execution status until completion
   */
  function pollExecutionStatus(executionId, options) {
    options = options || {};
    var interval = options.interval || 1000; // Poll every second
    var maxAttempts = options.maxAttempts || 300; // Max 5 minutes
    var onStatusChange = options.onStatusChange;
    var onComplete = options.onComplete;
    var onError = options.onError;

    var attempts = 0;
    var pollInterval;

    function poll() {
      attempts++;
      if (attempts > maxAttempts) {
        if (onError) {
          onError(new Error('Execution status polling timeout'));
        }
        return;
      }

      getExecutionStatus(executionId, { includeLogs: false })
        .then(function(data) {
          var status = data.execution.status;

          if (onStatusChange) {
            onStatusChange(status, data.execution);
          }

          if (status === 'completed' || status === 'failed' || status === 'cancelled') {
            clearInterval(pollInterval);
            if (onComplete) {
              onComplete(data.execution);
            }
          }
        })
        .catch(function(error) {
          clearInterval(pollInterval);
          if (onError) {
            onError(error);
          }
        });
    }

    // Start polling
    poll(); // Immediate first check
    pollInterval = setInterval(poll, interval);

    // Return cleanup function
    return function() {
      clearInterval(pollInterval);
    };
  }

  /**
   * Build execution UI URL
   */
  function buildExecutionUrl(executionId, options) {
    var url = BASE_URL + '/workflows/executions/' + encodeURIComponent(executionId);
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
    params.push('embedded=true');

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return url;
  }

  /**
   * Create an iframe element for execution UI
   */
  function createExecutionIframe(executionId, options) {
    var iframe = document.createElement('iframe');
    iframe.src = buildExecutionUrl(executionId, options);
    iframe.style.border = 'none';
    iframe.style.width = options.width || '100%';
    iframe.style.height = options.height || '100%';
    iframe.style.minHeight = options.minHeight || '400px';
    iframe.style.borderRadius = options.borderRadius || '8px';
    iframe.style.display = 'block';
    iframe.setAttribute('title', 'NetPad Workflow Execution');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('data-netpad-workflow-iframe', executionId);

    return iframe;
  }

  /**
   * Embed execution UI
   */
  function embedExecution(containerOrId, executionId, options) {
    options = options || {};

    var container;
    if (typeof containerOrId === 'string') {
      container = document.getElementById(containerOrId);
    } else if (containerOrId instanceof HTMLElement) {
      container = containerOrId;
    }

    if (!container) {
      console.error('[NetPad Workflow] Container not found:', containerOrId);
      return null;
    }

    if (!executionId) {
      console.error('[NetPad Workflow] Execution ID is required');
      return null;
    }

    var iframe = createExecutionIframe(executionId, options);
    container.innerHTML = '';
    container.appendChild(iframe);

    // Set up message listener for iframe communication
    var handler = function(event) {
      if (event.origin !== BASE_URL) return;

      var data = event.data;
      if (!data || data.source !== 'netpad-workflow') return;
      if (data.executionId !== executionId) return;

      switch (data.type) {
        case 'loaded':
          if (options.onLoad) options.onLoad();
          break;

        case 'statusChange':
          if (options.onStatusChange) {
            options.onStatusChange(data.payload.status, data.payload);
          }
          break;

        case 'complete':
          if (options.onComplete) {
            options.onComplete(data.payload);
          }
          break;

        case 'error':
          if (options.onError) {
            options.onError(data.payload);
          }
          break;
      }
    };

    window.addEventListener('message', handler);

    return {
      iframe: iframe,
      destroy: function() {
        window.removeEventListener('message', handler);
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      },
      reload: function() {
        iframe.src = buildExecutionUrl(executionId, options);
      },
    };
  }

  // Expose the API
  if (!window.NetPad) {
    window.NetPad = {};
  }

  window.NetPad.executeWorkflow = executeWorkflow;
  window.NetPad.getExecutionStatus = getExecutionStatus;
  window.NetPad.pollExecutionStatus = pollExecutionStatus;
  window.NetPad.embedExecution = embedExecution;
  window.NetPad.workflowBaseUrl = BASE_URL;
})();
