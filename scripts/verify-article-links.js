#!/usr/bin/env node

/**
 * Script to verify external links in the IT Help Desk article
 * 
 * Usage: node scripts/verify-article-links.js
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const linksToVerify = [
  // GitHub links (should all be mrlynn/netpad-v3)
  {
    url: 'https://github.com/mrlynn/netpad-v3/blob/main/examples/it-helpdesk/templates/form.json',
    description: 'Form template JSON',
    expectedStatus: [200, 301, 302],
  },
  {
    url: 'https://github.com/mrlynn/netpad-v3/blob/main/examples/it-helpdesk/templates/workflow.json',
    description: 'Workflow template JSON',
    expectedStatus: [200, 301, 302],
  },
  {
    url: 'https://github.com/mrlynn/netpad-v3/blob/main/examples/it-helpdesk/templates/search-form.json',
    description: 'Search form template JSON',
    expectedStatus: [200, 301, 302],
  },
  {
    url: 'https://github.com/mrlynn/netpad-v3/tree/main/examples/it-helpdesk',
    description: 'IT Help Desk examples directory',
    expectedStatus: [200, 301, 302],
  },
  {
    url: 'https://github.com/mrlynn/netpad-v3/tree/main/packages/mcp-server',
    description: 'MCP Server package',
    expectedStatus: [200, 301, 302],
  },
  {
    url: 'https://github.com/mrlynn/netpad-v3',
    description: 'Main GitHub repository',
    expectedStatus: [200, 301, 302],
  },
  {
    url: 'https://github.com/mrlynn/netpad-v3/tree/main/examples',
    description: 'Examples directory',
    expectedStatus: [200, 301, 302],
  },
  
  // External links
  {
    url: 'https://netpad.io',
    description: 'NetPad homepage',
    expectedStatus: [200, 301, 302],
  },
  {
    url: 'https://docs.netpad.io',
    description: 'NetPad documentation',
    expectedStatus: [200, 301, 302],
  },
  
  // NPM packages
  {
    url: 'https://www.npmjs.com/package/@netpad/forms',
    description: '@netpad/forms NPM package',
    expectedStatus: [200, 301, 302],
  },
  {
    url: 'https://www.npmjs.com/package/@netpad/mcp-server',
    description: '@netpad/mcp-server NPM package',
    expectedStatus: [200, 301, 302],
  },
];

/**
 * Check if a URL is accessible
 */
function checkUrl(url, expectedStatus = [200]) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'HEAD',
      timeout: 10000,
      headers: {
        'User-Agent': 'NetPad-Article-Verification/1.0',
      },
    };

    const req = client.request(options, (res) => {
      const statusCode = res.statusCode;
      const isSuccess = expectedStatus.includes(statusCode) || statusCode < 400;
      
      resolve({
        url,
        status: statusCode,
        success: isSuccess,
        redirected: statusCode >= 300 && statusCode < 400,
        location: res.headers.location,
      });
    });

    req.on('error', (error) => {
      resolve({
        url,
        status: null,
        success: false,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        status: null,
        success: false,
        error: 'Request timeout',
      });
    });

    req.end();
  });
}

/**
 * Main verification function
 */
async function verifyLinks() {
  console.log('🔍 Verifying external links from IT Help Desk article...\n');
  
  const results = [];
  
  for (const link of linksToVerify) {
    process.stdout.write(`Checking ${link.description}... `);
    const result = await checkUrl(link.url, link.expectedStatus);
    results.push({ ...result, description: link.description });
    
    if (result.success) {
      console.log(`✅ ${result.status || 'OK'}`);
    } else {
      console.log(`❌ ${result.error || `Status: ${result.status}`}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Summary\n');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const redirected = results.filter(r => r.redirected);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  if (redirected.length > 0) {
    console.log(`↪️  Redirected: ${redirected.length}/${results.length}`);
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Links:');
    failed.forEach((result) => {
      console.log(`  - ${result.description}`);
      console.log(`    URL: ${result.url}`);
      console.log(`    Error: ${result.error || `Status: ${result.status}`}`);
    });
  }
  
  if (redirected.length > 0) {
    console.log('\n↪️  Redirected Links:');
    redirected.forEach((result) => {
      console.log(`  - ${result.description}`);
      console.log(`    From: ${result.url}`);
      console.log(`    To: ${result.location || 'Unknown'}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Exit with error code if any links failed
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run verification
verifyLinks().catch((error) => {
  console.error('Error running verification:', error);
  process.exit(1);
});
