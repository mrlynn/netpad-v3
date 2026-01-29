/**
 * Seed IT Helpdesk FAQs
 *
 * Creates example FAQs for IT Helpdesk forms to demonstrate the FAQ feature.
 *
 * Usage:
 *   node scripts/rag/seed-it-helpdesk-faqs.js <organizationId> <formId>
 *
 * Example:
 *   node scripts/rag/seed-it-helpdesk-faqs.js org_abc123 form_xyz789
 */

const { MongoClient } = require('mongodb');
const { nanoid } = require('nanoid');

// IT Helpdesk FAQ examples
const IT_HELPDESK_FAQS = [
  {
    question: "How do I reset my password?",
    answer: "You can reset your password using our self-service portal:\n\n1. Go to portal.company.com/reset\n2. Enter your email address\n3. Click the reset link sent to your email\n4. Create a new password (must be at least 12 characters with uppercase, lowercase, numbers, and symbols)\n\nIf you don't receive the email within 5 minutes, contact IT support at ext. 5555.",
    keywords: ["password", "reset", "login", "account", "forgot", "unlock"],
    category: "technical",
    tags: ["password", "security", "account-access"],
    priority: 10,
  },
  {
    question: "How do I request new software installation?",
    answer: "To request new software:\n\n1. Submit an IT Service Request form\n2. Select 'Software Installation' as the request type\n3. Provide the software name and business justification\n4. Your manager must approve the request\n5. IT will review for security and licensing\n6. Installation typically takes 2-3 business days after approval\n\nNote: All software must be approved before installation per IT security policy.",
    keywords: ["software", "install", "application", "program", "download"],
    category: "technical",
    tags: ["software", "installation", "approval"],
    priority: 8,
  },
  {
    question: "What are the IT support hours?",
    answer: "IT Support Hours:\n\n**Standard Support:**\n- Monday - Friday: 8:00 AM - 6:00 PM EST\n- Phone: ext. 5555\n- Email: support@company.com\n\n**After-Hours Emergency Support:**\n- Available 24/7 for critical issues only\n- Phone: 1-800-555-IT-HELP\n- Emergency criteria: system outages, security incidents, data loss\n\n**Response Times:**\n- Critical: 1 hour\n- High: 4 hours\n- Medium: 1 business day\n- Low: 3 business days",
    keywords: ["hours", "support", "contact", "phone", "email", "emergency"],
    category: "support",
    tags: ["hours", "contact", "sla"],
    priority: 9,
  },
  {
    question: "How do I connect to the VPN?",
    answer: "VPN Connection Instructions:\n\n**Windows:**\n1. Click the network icon in system tray\n2. Select 'CompanyVPN'\n3. Enter your network username and password\n4. Click Connect\n\n**Mac:**\n1. Open System Preferences → Network\n2. Select 'CompanyVPN'\n3. Click Connect\n4. Enter credentials when prompted\n\n**Troubleshooting:**\n- Ensure you're using latest VPN client (download from portal.company.com/vpn)\n- Check your internet connection\n- Try restarting your computer\n- Contact IT if issues persist\n\nFirst-time setup requires IT assistance - call ext. 5555.",
    keywords: ["vpn", "remote", "access", "connection", "work from home", "network"],
    category: "technical",
    tags: ["vpn", "remote-work", "network"],
    priority: 9,
  },
  {
    question: "How do I report a security incident or phishing email?",
    answer: "**IMPORTANT: Report security incidents immediately!**\n\n**For Phishing Emails:**\n1. Do NOT click any links or download attachments\n2. Click the 'Report Phishing' button in Outlook\n3. Or forward to security@company.com\n4. Delete the email\n\n**For Security Incidents:**\n1. Call Security Hotline: ext. 9911 (24/7)\n2. Do NOT turn off your computer\n3. Disconnect from network if instructed\n4. Document what happened\n\n**Report immediately if you:**\n- Clicked a suspicious link\n- Provided credentials on a fake site\n- Lost a device with company data\n- Noticed unauthorized account access\n\nBetter to report a false alarm than ignore a real threat!",
    keywords: ["security", "phishing", "incident", "hack", "breach", "suspicious", "malware"],
    category: "security",
    tags: ["security", "phishing", "incident-response"],
    priority: 10,
  },
  {
    question: "How do I request access to a shared folder or application?",
    answer: "To request access:\n\n1. Submit an IT Service Request\n2. Select 'Access Request' as type\n3. Specify:\n   - Resource name (folder path or application name)\n   - Access level needed (Read, Write, Admin)\n   - Business justification\n   - Duration needed\n4. Your manager must approve\n5. Resource owner will review\n6. Access granted within 1 business day after approvals\n\n**Access Review:**\nAll access is reviewed quarterly. Unused access may be revoked per security policy.\n\n**Temporary Access:**\nFor short-term needs (< 30 days), include end date in request.",
    keywords: ["access", "permission", "folder", "share", "drive", "application", "authorization"],
    category: "support",
    tags: ["access", "permissions", "security"],
    priority: 8,
  },
  {
    question: "What do I do if my computer won't start?",
    answer: "**Troubleshooting Steps:**\n\n1. **Check Power:**\n   - Verify power cable is connected\n   - Try different outlet\n   - Check battery charge (laptops)\n\n2. **Hard Restart:**\n   - Hold power button for 10 seconds\n   - Wait 30 seconds\n   - Press power button to restart\n\n3. **External Devices:**\n   - Disconnect all USB devices\n   - Try starting again\n\n4. **Still Not Working?**\n   - Call IT Support: ext. 5555\n   - Priority support for hardware issues\n   - Loaner equipment available same-day\n\n**For Laptops:**\n- Try connecting to external monitor\n- May be display issue, not computer failure",
    keywords: ["computer", "won't start", "boot", "power", "startup", "crash", "broken"],
    category: "troubleshooting",
    tags: ["hardware", "startup", "troubleshooting"],
    priority: 7,
  },
  {
    question: "How do I set up my email on my mobile device?",
    answer: "**Mobile Email Setup (iOS & Android):**\n\n**Automatic Setup (Recommended):**\n1. Install 'Outlook' app from app store\n2. Open app and tap 'Get Started'\n3. Enter your work email\n4. Sign in with your network credentials\n5. Done!\n\n**Manual Setup:**\n1. Go to Settings → Mail → Add Account\n2. Select 'Exchange'\n3. Enter:\n   - Email: yourname@company.com\n   - Server: mail.company.com\n   - Domain: COMPANY\n   - Username: your network username\n   - Password: your network password\n4. Enable Mail, Contacts, Calendar\n5. Save\n\n**Security:**\nMobile device must have passcode/biometric lock enabled per security policy.\n\n**Need Help?**\nContact IT Support ext. 5555 for setup assistance.",
    keywords: ["email", "mobile", "phone", "iphone", "android", "setup", "outlook"],
    category: "getting-started",
    tags: ["email", "mobile", "setup"],
    priority: 7,
  },
  {
    question: "How do I request a new computer or hardware?",
    answer: "**Hardware Request Process:**\n\n**Standard Refresh Cycle:**\n- Laptops: Every 3 years\n- Desktops: Every 4 years\n- You'll be notified automatically when eligible\n\n**Special Requests:**\n1. Submit IT Service Request\n2. Select 'Hardware Request'\n3. Provide:\n   - Equipment type and specs needed\n   - Business justification\n   - Budget code (check with your manager)\n4. Manager approval required\n5. IT will review and quote\n6. Order placed after budget approval\n7. Typical delivery: 2-3 weeks\n\n**Accessories:**\nMouse, keyboard, monitors, docking stations can be requested anytime.\n\n**Damaged Equipment:**\nImmediate replacement available - note in request form.",
    keywords: ["hardware", "computer", "laptop", "equipment", "new", "upgrade", "replace"],
    category: "support",
    tags: ["hardware", "procurement", "upgrade"],
    priority: 6,
  },
  {
    question: "What is our company's acceptable use policy for IT resources?",
    answer: "**Acceptable Use Policy Summary:**\n\n**Allowed:**\n- Work-related activities\n- Reasonable personal use during breaks\n- Professional communication\n- Approved cloud services\n\n**Prohibited:**\n- Installing unauthorized software\n- Accessing inappropriate content\n- Sharing credentials\n- Using personal cloud storage for work files\n- Circumventing security controls\n- Illegal activities\n\n**Email & Internet:**\n- No expectation of privacy\n- All activity may be monitored\n- No personal use of company email for external services\n\n**Consequences:**\nPolicy violations may result in:\n- Account suspension\n- Disciplinary action\n- Termination (serious violations)\n\n**Full Policy:**\nAvailable at: policies.company.com/it-acceptable-use\n\n**Questions?**\nContact IT Compliance at compliance@company.com",
    keywords: ["policy", "acceptable use", "rules", "guidelines", "allowed", "prohibited"],
    category: "compliance",
    tags: ["policy", "compliance", "acceptable-use"],
    priority: 5,
  },
  {
    question: "How do I print from my laptop?",
    answer: "**Printing Instructions:**\n\n**Install Printer:**\n1. Connect to VPN if working remotely\n2. Go to \\\\printserver\\printers\n3. Double-click your floor's printer\n4. Wait for driver installation\n5. Set as default if desired\n\n**Print a Document:**\n1. Open document\n2. File → Print\n3. Select printer\n4. Enter your badge code (for secure print)\n5. Go to printer and tap badge to release\n\n**Printer Locations:**\n- Floor 1: PR-FL1-01\n- Floor 2: PR-FL2-01, PR-FL2-02\n- Floor 3: PR-FL3-01\n\n**Issues?**\n- Check printer status at portal.company.com/print\n- Report jams/issues to facilities@company.com\n- For driver issues, contact IT ext. 5555",
    keywords: ["print", "printer", "driver", "install", "setup"],
    category: "getting-started",
    tags: ["printing", "setup"],
    priority: 6,
  },
  {
    question: "How do I join a Teams/Zoom meeting?",
    answer: "**Microsoft Teams:**\n1. Click meeting link in calendar invite\n2. Choose 'Join in browser' or 'Open in Teams app'\n3. Select audio/video settings\n4. Click 'Join now'\n\n**Zoom:**\n1. Click meeting link in invite\n2. Install Zoom if prompted (first time only)\n3. Enter meeting ID if needed\n4. Select audio options\n5. Join meeting\n\n**Best Practices:**\n- Join 2-3 minutes early\n- Mute when not speaking\n- Use headset for better audio\n- Test camera/mic before important meetings\n\n**Troubleshooting:**\n- Can't hear? Check system volume and meeting audio settings\n- Camera not working? Check browser permissions\n- Poor quality? Close other applications\n\n**Need Help?**\nTest your setup at portal.company.com/meeting-test",
    keywords: ["teams", "zoom", "meeting", "video", "conference", "call", "join"],
    category: "getting-started",
    tags: ["collaboration", "meetings", "teams"],
    priority: 7,
  },
];

async function seedFAQs(organizationId, formId) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable not set');
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const dbName = `netpad_rag_${organizationId}`;
    const db = client.db(dbName);
    const collection = db.collection('rag_faqs');

    console.log(`📊 Database: ${dbName}`);
    console.log(`📦 Collection: rag_faqs`);
    console.log(`📝 Creating ${IT_HELPDESK_FAQS.length} IT Helpdesk FAQs...\n`);

    const faqs = IT_HELPDESK_FAQS.map((faq, index) => ({
      faqId: nanoid(),
      organizationId,
      formId, // Associate with specific form
      question: faq.question,
      answer: faq.answer,
      keywords: faq.keywords,
      questionEmbedding: new Array(1024).fill(0), // Placeholder - will be generated by API
      embeddingModel: 'pending', // Will be updated when embedding is generated
      category: faq.category,
      tags: faq.tags,
      status: 'draft', // Create as draft - you can publish via UI
      priority: faq.priority,
      viewCount: 0,
      clickCount: 0,
      helpfulCount: 0,
      notHelpfulCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      relatedFaqIds: [],
    }));

    const result = await collection.insertMany(faqs);
    console.log(`✅ Created ${result.insertedCount} FAQs\n`);

    console.log('📋 FAQ Categories:');
    const categories = {};
    faqs.forEach(faq => {
      categories[faq.category] = (categories[faq.category] || 0) + 1;
    });
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`   - ${cat}: ${count} FAQs`);
    });

    console.log('\n⚠️  Important Notes:');
    console.log('   1. All FAQs created with status: draft');
    console.log('   2. Embeddings are placeholder zeros');
    console.log('   3. To use in production:');
    console.log('      a. Edit each FAQ via the Knowledge Tab UI');
    console.log('      b. Save to generate real embeddings');
    console.log('      c. Change status to "published"\n');

    console.log('🎉 Done! Access these FAQs via:');
    console.log(`   - Knowledge Tab in Form Builder`);
    console.log(`   - API: GET /api/rag/faqs?formId=${formId}`);
    console.log(`   - Edit: PATCH /api/rag/faqs/{faqId}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node seed-it-helpdesk-faqs.js <organizationId> <formId>');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/rag/seed-it-helpdesk-faqs.js org_abc123 form_xyz789');
    console.log('');
    console.log('This will create 12 example IT Helpdesk FAQs in draft status.');
    process.exit(1);
  }

  const [organizationId, formId] = args;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Seed IT Helpdesk FAQs');
  console.log('═══════════════════════════════════════════════════════════\n');

  await seedFAQs(organizationId, formId);
}

main().catch(console.error);
