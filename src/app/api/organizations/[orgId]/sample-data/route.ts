import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { assertOrgPermission } from '@/lib/platform/permissions';
import { getOrgDb } from '@/lib/platform/db';
import { ObjectId } from 'mongodb';
import { checkFormLimit } from '@/lib/platform/billing';

// Helper functions for generating realistic analytics data
function randomDevice(): 'mobile' | 'desktop' | 'tablet' {
  const rand = Math.random();
  if (rand < 0.42) return 'desktop';
  if (rand < 0.82) return 'mobile';
  return 'tablet';
}

function randomBrowser(device: string): string {
  const browsers = device === 'mobile'
    ? ['Safari', 'Chrome Mobile', 'Samsung Internet', 'Firefox Mobile']
    : ['Chrome', 'Firefox', 'Safari', 'Edge'];
  return browsers[Math.floor(Math.random() * browsers.length)];
}

function randomOS(device: string): string {
  if (device === 'mobile') {
    return Math.random() > 0.4 ? 'iOS' : 'Android';
  }
  const desktop = ['Windows 11', 'Windows 10', 'macOS', 'Linux'];
  return desktop[Math.floor(Math.random() * desktop.length)];
}

function generateCompletionTime(fieldCount: number, completed: boolean): number {
  // Base time per field (15-45 seconds) plus some variance
  const baseTime = fieldCount * (15 + Math.random() * 30);
  // Incomplete submissions take less time
  if (!completed) {
    return Math.floor(baseTime * (0.2 + Math.random() * 0.5));
  }
  // Add some natural variance
  return Math.floor(baseTime * (0.8 + Math.random() * 0.4));
}

function generateDateSpread(daysBack: number, count: number): Date[] {
  // Generate dates with a realistic distribution (more recent = more submissions)
  const dates: Date[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    // Weighted towards recent dates (exponential decay)
    const weight = Math.pow(Math.random(), 0.7); // More weight to recent
    const daysAgo = Math.floor(weight * daysBack);
    const date = new Date(now - (daysAgo * dayMs) - Math.random() * dayMs);
    dates.push(date);
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
}

// Generate field interaction data for drop-off analytics
function generateFieldInteractions(
  formId: string,
  fields: any[],
  submissionCount: number,
  abandonmentRate: number = 0.15
): any[] {
  const interactions: any[] = [];
  const totalSessions = Math.floor(submissionCount / (1 - abandonmentRate));
  const abandonedSessions = totalSessions - submissionCount;

  // Generate sessions - both completed and abandoned
  for (let s = 0; s < totalSessions; s++) {
    const sessionId = `session_${new ObjectId().toHexString()}`;
    const isCompleted = s >= abandonedSessions;
    const device = randomDevice();

    // Determine where user drops off if abandoned
    // Higher drop-off on longer/complex fields
    let dropOffIndex = fields.length;
    if (!isCompleted) {
      // Weight drop-off towards middle-to-end fields
      const weights = fields.map((f, i) => {
        // Complex fields have higher drop-off
        const complexity = f.type === 'textarea' ? 2 :
                          f.type === 'multiselect' ? 1.5 :
                          f.required ? 1.2 : 1;
        // Later fields have higher drop-off (funnel effect)
        const position = 1 + (i / fields.length) * 0.5;
        return complexity * position;
      });
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let rand = Math.random() * totalWeight;
      for (let i = 0; i < weights.length; i++) {
        rand -= weights[i];
        if (rand <= 0) {
          dropOffIndex = i;
          break;
        }
      }
    }

    // Generate interaction for each field up to drop-off
    let cumulativeTime = 0;
    const startTime = Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000;

    for (let f = 0; f <= Math.min(dropOffIndex, fields.length - 1); f++) {
      const field = fields[f];
      const isLastField = f === dropOffIndex && !isCompleted;

      // Time spent on field (longer for text areas, shorter for selects)
      const baseTime = field.type === 'textarea' ? 25000 :
                       field.type === 'text' ? 12000 :
                       field.type === 'email' ? 15000 :
                       field.type === 'select' ? 5000 :
                       field.type === 'multiselect' ? 10000 :
                       field.type === 'number' ? 8000 : 10000;

      const focusTime = Math.floor(baseTime * (0.5 + Math.random()));
      cumulativeTime += focusTime;

      interactions.push({
        formId,
        sessionId,
        fieldId: field.fieldId,
        fieldPath: field.fieldId,
        firstViewedAt: startTime + cumulativeTime - focusTime,
        firstFocusAt: startTime + cumulativeTime - focusTime + 500,
        lastBlurAt: startTime + cumulativeTime,
        totalFocusTime: focusTime,
        changeCount: Math.floor(Math.random() * 3) + 1,
        completed: !isLastField || isCompleted,
        validationErrors: isLastField && !isCompleted && Math.random() > 0.5 ? 1 : 0,
        deviceType: device,
        createdAt: new Date(startTime),
      });
    }
  }

  return interactions;
}

// Sample data generators with rich analytics metadata
const SAMPLE_DATASETS: Record<string, {
  form: any;
  generateSubmissions: (formId: string, fields: any[]) => { submissions: any[]; interactions: any[] };
}> = {
  'customer-feedback': {
    form: {
      title: 'Customer Feedback Survey',
      description: 'Help us improve by sharing your experience with our products.',
      status: 'published',
      fields: [
        { fieldId: 'name', type: 'text', label: 'Your Name', required: true },
        { fieldId: 'email', type: 'email', label: 'Email Address', required: true },
        { fieldId: 'product', type: 'select', label: 'Product', required: true, options: ['Widget Pro', 'Widget Basic', 'Widget Enterprise', 'Widget Starter'] },
        { fieldId: 'rating', type: 'number', label: 'Rating (1-5)', required: true, min: 1, max: 5 },
        { fieldId: 'satisfaction', type: 'select', label: 'Overall Satisfaction', required: true, options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'] },
        { fieldId: 'recommend', type: 'boolean', label: 'Would you recommend us?', required: true },
        { fieldId: 'comments', type: 'textarea', label: 'Additional Comments', required: false },
      ],
    },
    generateSubmissions: (formId: string, fields: any[]) => {
      const names = ['John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'David Wilson', 'Lisa Anderson', 'James Taylor', 'Jennifer Martinez', 'Robert Garcia', 'Maria Rodriguez', 'William Lee', 'Jessica White', 'Christopher Harris', 'Amanda Clark', 'Daniel Lewis'];
      const products = ['Widget Pro', 'Widget Basic', 'Widget Enterprise', 'Widget Starter'];
      const satisfaction = ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'];
      const comments = [
        'Great product, very satisfied with my purchase!',
        'Works well but could use more features.',
        'Excellent customer support team.',
        'Good value for the price point.',
        'Some minor bugs but overall good experience.',
        'Exceeded my expectations completely!',
        'Would love to see mobile app support added.',
        'Easy to use and intuitive interface.',
        'Fast delivery and great packaging.',
        'The documentation could be improved.',
        'Best product in its category.',
        'Solid performance, no complaints.',
        '',
        '',
        '',
      ];

      const submissionCount = 150;
      const dates = generateDateSpread(30, submissionCount);

      const submissions = dates.map((date, i) => {
        const rating = Math.floor(Math.random() * 3) + 3; // 3-5 mostly (positive bias)
        const satIndex = rating >= 4 ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3) + 2;
        const device = randomDevice();
        const startTime = new Date(date.getTime() - generateCompletionTime(fields.length, true) * 1000);

        return {
          submissionId: `sub_${new ObjectId().toHexString()}`,
          formId,
          formVersion: 1,
          status: 'submitted',
          data: {
            name: names[Math.floor(Math.random() * names.length)],
            email: `user${i + 1}@example.com`,
            product: products[Math.floor(Math.random() * products.length)],
            rating,
            satisfaction: satisfaction[satIndex],
            recommend: rating >= 4 ? Math.random() > 0.1 : Math.random() > 0.6,
            comments: comments[Math.floor(Math.random() * comments.length)],
          },
          submittedAt: date,
          startedAt: startTime,
          completedAt: date,
          completionTime: Math.floor((date.getTime() - startTime.getTime()) / 1000),
          metadata: {
            source: 'sample-data',
            deviceType: device,
            browser: randomBrowser(device),
            os: randomOS(device),
            userAgent: `Mozilla/5.0 (${device === 'mobile' ? 'iPhone' : 'Windows NT 10.0'})`,
          },
        };
      });

      const interactions = generateFieldInteractions(formId, fields, submissionCount, 0.12);

      return { submissions, interactions };
    },
  },
  'event-registration': {
    form: {
      title: 'Tech Conference 2025 Registration',
      description: 'Register for our annual technology conference featuring industry leaders.',
      status: 'published',
      fields: [
        { fieldId: 'fullName', type: 'text', label: 'Full Name', required: true },
        { fieldId: 'email', type: 'email', label: 'Work Email', required: true },
        { fieldId: 'company', type: 'text', label: 'Company', required: true },
        { fieldId: 'jobTitle', type: 'text', label: 'Job Title', required: true },
        { fieldId: 'ticketType', type: 'select', label: 'Ticket Type', required: true, options: ['Standard ($299)', 'VIP ($599)', 'Student ($99)'] },
        { fieldId: 'sessions', type: 'multiselect', label: 'Preferred Sessions', required: true, options: ['Opening Keynote', 'AI & ML Workshop', 'Cloud Architecture', 'DevOps Best Practices', 'Security Summit', 'Networking Lunch'] },
        { fieldId: 'dietaryRestrictions', type: 'select', label: 'Dietary Restrictions', required: false, options: ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Kosher', 'Halal'] },
        { fieldId: 'specialRequests', type: 'textarea', label: 'Special Requests', required: false },
      ],
    },
    generateSubmissions: (formId: string, fields: any[]) => {
      const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Drew', 'Riley', 'Quinn', 'Blake', 'Avery', 'Sam', 'Jamie', 'Reese', 'Parker', 'Skyler'];
      const lastNames = ['Chen', 'Lee', 'Patel', 'Kim', 'Singh', 'Garcia', 'Williams', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson'];
      const companies = ['TechCorp', 'DataFlow Inc', 'CloudNine Systems', 'DevOps Pro', 'AI Solutions', 'StartupXYZ', 'BigData Co', 'CodeMasters', 'InnovateTech', 'DigitalFirst', 'ByteWorks', 'StreamLine', 'QuantumLeap', 'NexGen Labs'];
      const titles = ['Software Engineer', 'Senior Developer', 'Product Manager', 'Data Scientist', 'DevOps Engineer', 'CTO', 'VP Engineering', 'Tech Lead', 'Solutions Architect', 'Developer Advocate', 'Engineering Manager', 'Full Stack Developer'];
      const tickets = ['Standard ($299)', 'VIP ($599)', 'Student ($99)'];
      const sessions = ['Opening Keynote', 'AI & ML Workshop', 'Cloud Architecture', 'DevOps Best Practices', 'Security Summit', 'Networking Lunch'];
      const dietary = ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Kosher', 'Halal'];
      const specialRequests = [
        'Wheelchair accessibility needed',
        'Prefer front row seating',
        'Need power outlet for laptop',
        'Attending with colleague - please seat together',
        '',
        '',
        '',
        '',
      ];

      const submissionCount = 247;
      const dates = generateDateSpread(60, submissionCount);

      const submissions = dates.map((date, i) => {
        const device = randomDevice();
        const startTime = new Date(date.getTime() - generateCompletionTime(fields.length, true) * 1000);
        const ticketType = tickets[Math.random() < 0.6 ? 0 : Math.random() < 0.8 ? 1 : 2];

        // VIP attendees select more sessions
        const sessionCount = ticketType.includes('VIP') ? 4 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 3);
        const selectedSessions = [...sessions].sort(() => Math.random() - 0.5).slice(0, Math.min(sessionCount, sessions.length));

        return {
          submissionId: `sub_${new ObjectId().toHexString()}`,
          formId,
          formVersion: 1,
          status: 'submitted',
          data: {
            fullName: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
            email: `attendee${i + 1}@${companies[Math.floor(Math.random() * companies.length)].toLowerCase().replace(/\s/g, '')}.com`,
            company: companies[Math.floor(Math.random() * companies.length)],
            jobTitle: titles[Math.floor(Math.random() * titles.length)],
            ticketType,
            sessions: selectedSessions,
            dietaryRestrictions: dietary[Math.floor(Math.random() * dietary.length)],
            specialRequests: specialRequests[Math.floor(Math.random() * specialRequests.length)],
          },
          submittedAt: date,
          startedAt: startTime,
          completedAt: date,
          completionTime: Math.floor((date.getTime() - startTime.getTime()) / 1000),
          metadata: {
            source: 'sample-data',
            deviceType: device,
            browser: randomBrowser(device),
            os: randomOS(device),
          },
        };
      });

      const interactions = generateFieldInteractions(formId, fields, submissionCount, 0.18);

      return { submissions, interactions };
    },
  },
  'order-intake': {
    form: {
      title: 'Product Order Form',
      description: 'Order products from our catalog with secure checkout.',
      status: 'published',
      fields: [
        { fieldId: 'customerName', type: 'text', label: 'Customer Name', required: true },
        { fieldId: 'email', type: 'email', label: 'Email', required: true },
        { fieldId: 'phone', type: 'text', label: 'Phone Number', required: true },
        { fieldId: 'product', type: 'select', label: 'Product', required: true, options: ['Laptop Pro ($1,299)', 'Desktop Elite ($999)', 'Monitor 27" ($449)', 'Keyboard Mechanical ($149)', 'Mouse Wireless ($79)', 'Headset Pro ($199)'] },
        { fieldId: 'quantity', type: 'number', label: 'Quantity', required: true, min: 1, max: 100 },
        { fieldId: 'shippingAddress', type: 'textarea', label: 'Shipping Address', required: true },
        { fieldId: 'paymentMethod', type: 'select', label: 'Payment Method', required: true, options: ['Credit Card', 'PayPal', 'Bank Transfer', 'Invoice (Net 30)'] },
        { fieldId: 'priority', type: 'select', label: 'Shipping Priority', required: true, options: ['Standard (5-7 days)', 'Express (2-3 days)', 'Overnight'] },
        { fieldId: 'giftWrap', type: 'boolean', label: 'Gift Wrap (+$5)', required: false },
        { fieldId: 'notes', type: 'textarea', label: 'Order Notes', required: false },
      ],
    },
    generateSubmissions: (formId: string, fields: any[]) => {
      const companies = ['Acme Corp', 'Global Tech Solutions', 'Local Business LLC', 'Small Shop Inc', 'Enterprise Holdings', 'Startup Ventures', 'Family Store', 'Pro Services Group', 'Digital Agency Co', 'Consulting Partners', 'Retail Dynamics', 'Office Supplies Plus'];
      const products = ['Laptop Pro ($1,299)', 'Desktop Elite ($999)', 'Monitor 27" ($449)', 'Keyboard Mechanical ($149)', 'Mouse Wireless ($79)', 'Headset Pro ($199)'];
      const payments = ['Credit Card', 'PayPal', 'Bank Transfer', 'Invoice (Net 30)'];
      const priorities = ['Standard (5-7 days)', 'Express (2-3 days)', 'Overnight'];
      const streets = ['Main St', 'Oak Ave', 'Business Park Dr', 'Commerce Blvd', 'Industrial Way', 'Tech Center Rd', 'Corporate Plaza', 'Market St'];
      const cities = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA', 'Austin, TX', 'Seattle, WA'];

      const submissionCount = 312;
      const dates = generateDateSpread(90, submissionCount);

      const submissions = dates.map((date, i) => {
        const device = randomDevice();
        const startTime = new Date(date.getTime() - generateCompletionTime(fields.length, true) * 1000);
        const product = products[Math.floor(Math.random() * products.length)];
        const isHighValue = product.includes('Laptop') || product.includes('Desktop');

        return {
          submissionId: `sub_${new ObjectId().toHexString()}`,
          formId,
          formVersion: 1,
          status: 'submitted',
          data: {
            customerName: companies[Math.floor(Math.random() * companies.length)],
            email: `orders${i + 1}@${companies[Math.floor(Math.random() * companies.length)].toLowerCase().replace(/\s/g, '').replace(/[^a-z]/g, '')}.com`,
            phone: `(${String(Math.floor(Math.random() * 900) + 100)}) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
            product,
            quantity: isHighValue ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 20) + 1,
            shippingAddress: `${Math.floor(Math.random() * 9999) + 1} ${streets[Math.floor(Math.random() * streets.length)]}\n${cities[Math.floor(Math.random() * cities.length)]} ${String(Math.floor(Math.random() * 90000) + 10000)}`,
            paymentMethod: isHighValue && Math.random() > 0.5 ? 'Invoice (Net 30)' : payments[Math.floor(Math.random() * payments.length)],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            giftWrap: Math.random() > 0.85,
            notes: Math.random() > 0.7 ? 'Please include receipt in package.' : '',
          },
          submittedAt: date,
          startedAt: startTime,
          completedAt: date,
          completionTime: Math.floor((date.getTime() - startTime.getTime()) / 1000),
          metadata: {
            source: 'sample-data',
            deviceType: device,
            browser: randomBrowser(device),
            os: randomOS(device),
          },
        };
      });

      // Higher abandonment rate for order forms (payment hesitation)
      const interactions = generateFieldInteractions(formId, fields, submissionCount, 0.25);

      return { submissions, interactions };
    },
  },
  'job-application': {
    form: {
      title: 'Job Application',
      description: 'Apply for open positions at our company.',
      status: 'published',
      fields: [
        { fieldId: 'name', type: 'text', label: 'Full Name', required: true },
        { fieldId: 'email', type: 'email', label: 'Email', required: true },
        { fieldId: 'phone', type: 'text', label: 'Phone', required: true },
        { fieldId: 'position', type: 'select', label: 'Position Applied For', required: true, options: ['Software Engineer', 'Senior Software Engineer', 'Product Manager', 'UX Designer', 'Data Analyst', 'DevOps Engineer', 'Marketing Manager', 'Sales Representative'] },
        { fieldId: 'experience', type: 'select', label: 'Years of Experience', required: true, options: ['0-2 years', '2-5 years', '5-10 years', '10+ years'] },
        { fieldId: 'education', type: 'select', label: 'Highest Education', required: true, options: ["High School", "Associate's", "Bachelor's", "Master's", 'PhD'] },
        { fieldId: 'skills', type: 'multiselect', label: 'Key Skills', required: true, options: ['JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'AWS', 'Leadership', 'Communication', 'Project Management'] },
        { fieldId: 'availability', type: 'select', label: 'Start Date Availability', required: true, options: ['Immediately', '2 weeks notice', '1 month', '2+ months'] },
        { fieldId: 'salary', type: 'text', label: 'Expected Salary Range', required: false },
        { fieldId: 'referral', type: 'boolean', label: 'Were you referred by an employee?', required: false },
        { fieldId: 'coverLetter', type: 'textarea', label: 'Cover Letter', required: false },
      ],
    },
    generateSubmissions: (formId: string, fields: any[]) => {
      const firstNames = ['Alice', 'Bob', 'Carol', 'Daniel', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Kate', 'Liam', 'Mia', 'Noah', 'Olivia', 'Peter', 'Quinn', 'Rachel', 'Steve', 'Tina'];
      const lastNames = ['Johnson', 'Smith', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark'];
      const positions = ['Software Engineer', 'Senior Software Engineer', 'Product Manager', 'UX Designer', 'Data Analyst', 'DevOps Engineer', 'Marketing Manager', 'Sales Representative'];
      const experience = ['0-2 years', '2-5 years', '5-10 years', '10+ years'];
      const education = ["High School", "Associate's", "Bachelor's", "Master's", 'PhD'];
      const allSkills = ['JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'AWS', 'Leadership', 'Communication', 'Project Management'];
      const availability = ['Immediately', '2 weeks notice', '1 month', '2+ months'];
      const coverLetters = [
        'I am excited to apply for this position. With my background in technology and passion for innovation, I believe I would be a valuable addition to your team. My experience has prepared me well for the challenges of this role.',
        'I am writing to express my strong interest in this opportunity. My skills and experience align well with the requirements, and I am confident I can contribute meaningfully to your organization.',
        'Thank you for considering my application. I have been following your company for some time and admire your commitment to excellence. I would be honored to join your team.',
        '',
        '',
      ];

      const submissionCount = 89;
      const dates = generateDateSpread(45, submissionCount);

      const submissions = dates.map((date, i) => {
        const device = randomDevice();
        const startTime = new Date(date.getTime() - generateCompletionTime(fields.length, true) * 1000);
        const position = positions[Math.floor(Math.random() * positions.length)];
        const expLevel = experience[Math.floor(Math.random() * experience.length)];

        // Senior positions have more experience
        const isSenior = position.includes('Senior') || position.includes('Manager');
        const actualExp = isSenior ? (Math.random() > 0.3 ? experience[2] : experience[3]) : expLevel;

        // Skills based on position
        const skillCount = 3 + Math.floor(Math.random() * 4);
        const positionSkills = position.includes('Engineer') || position.includes('DevOps')
          ? allSkills.filter(s => ['JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'AWS'].includes(s))
          : position.includes('Manager')
            ? allSkills.filter(s => ['Leadership', 'Communication', 'Project Management', 'SQL'].includes(s))
            : allSkills;
        const selectedSkills = [...positionSkills].sort(() => Math.random() - 0.5).slice(0, skillCount);

        // Salary expectations based on experience
        const baseSalary = actualExp === '0-2 years' ? 60000 : actualExp === '2-5 years' ? 85000 : actualExp === '5-10 years' ? 120000 : 150000;
        const salary = `$${Math.floor(baseSalary * (0.9 + Math.random() * 0.3)).toLocaleString()} - $${Math.floor(baseSalary * (1.1 + Math.random() * 0.3)).toLocaleString()}`;

        return {
          submissionId: `sub_${new ObjectId().toHexString()}`,
          formId,
          formVersion: 1,
          status: 'submitted',
          data: {
            name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
            email: `applicant${i + 1}@email.com`,
            phone: `(${String(Math.floor(Math.random() * 900) + 100)}) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
            position,
            experience: actualExp,
            education: isSenior ? (Math.random() > 0.5 ? "Master's" : "Bachelor's") : education[Math.floor(Math.random() * education.length)],
            skills: selectedSkills,
            availability: availability[Math.floor(Math.random() * availability.length)],
            salary,
            referral: Math.random() > 0.75,
            coverLetter: coverLetters[Math.floor(Math.random() * coverLetters.length)],
          },
          submittedAt: date,
          startedAt: startTime,
          completedAt: date,
          completionTime: Math.floor((date.getTime() - startTime.getTime()) / 1000),
          metadata: {
            source: 'sample-data',
            deviceType: device,
            browser: randomBrowser(device),
            os: randomOS(device),
          },
        };
      });

      // Moderate abandonment - cover letter field causes some drop-off
      const interactions = generateFieldInteractions(formId, fields, submissionCount, 0.22);

      return { submissions, interactions };
    },
  },
  'nps-survey': {
    form: {
      title: 'NPS Survey',
      description: 'How likely are you to recommend us to a friend or colleague?',
      status: 'published',
      fields: [
        { fieldId: 'nps_score', type: 'number', label: 'On a scale of 0-10, how likely are you to recommend us?', required: true, min: 0, max: 10 },
        { fieldId: 'feedback', type: 'textarea', label: 'What is the primary reason for your score?', required: false },
        { fieldId: 'improvement', type: 'textarea', label: 'What could we do to improve your experience?', required: false },
        { fieldId: 'customer_segment', type: 'select', label: 'Which best describes you?', required: true, options: ['Enterprise', 'SMB', 'Startup', 'Individual', 'Government'] },
        { fieldId: 'product_used', type: 'select', label: 'Which product/service are you rating?', required: true, options: ['Core Platform', 'Analytics Suite', 'API Services', 'Mobile App', 'Support Experience', 'Overall Experience'] },
        { fieldId: 'touchpoint', type: 'select', label: 'What prompted this survey?', required: true, options: ['Post-Purchase', 'Support Interaction', 'Quarterly Check-in', 'After Onboarding', 'Renewal', 'Feature Launch'] },
        { fieldId: 'follow_up_ok', type: 'boolean', label: 'May we follow up with you about your feedback?', required: false },
        { fieldId: 'email', type: 'email', label: 'Email (optional)', required: false },
      ],
    },
    generateSubmissions: (formId: string, fields: any[]) => {
      // NPS distribution: realistic spread with slight positive skew
      // Promoters (9-10): ~50%, Passives (7-8): ~30%, Detractors (0-6): ~20%
      const generateNpsScore = (): number => {
        const rand = Math.random();
        if (rand < 0.20) {
          // Detractors: 0-6 (weighted towards 5-6)
          return Math.floor(Math.random() * 4) + 3; // 3-6 mostly
        } else if (rand < 0.50) {
          // Passives: 7-8
          return Math.random() > 0.5 ? 7 : 8;
        } else {
          // Promoters: 9-10
          return Math.random() > 0.4 ? 10 : 9;
        }
      };

      const getNpsCategory = (score: number): string => {
        if (score >= 9) return 'Promoter';
        if (score >= 7) return 'Passive';
        return 'Detractor';
      };

      const segments = ['Enterprise', 'SMB', 'Startup', 'Individual', 'Government'];
      const products = ['Core Platform', 'Analytics Suite', 'API Services', 'Mobile App', 'Support Experience', 'Overall Experience'];
      const touchpoints = ['Post-Purchase', 'Support Interaction', 'Quarterly Check-in', 'After Onboarding', 'Renewal', 'Feature Launch'];

      // Feedback based on score
      const promoterFeedback = [
        'Excellent product! Has transformed how our team works.',
        'The support team is incredibly responsive and helpful.',
        'Best in class solution. We recommend it to everyone.',
        'Intuitive interface, powerful features, great value.',
        'Been using for 2 years and it keeps getting better.',
        'Exceeded all our expectations. A game changer.',
        '',
      ];

      const passiveFeedback = [
        'Good product overall, does what we need.',
        'Solid solution but could use some improvements.',
        'Works well but the learning curve was steep.',
        'Decent value for the price point.',
        'Meets our basic requirements.',
        '',
        '',
      ];

      const detractorFeedback = [
        'Had reliability issues recently.',
        'Support response times need improvement.',
        'Price increase was unexpected.',
        'Missing key features our team needs.',
        'Performance has been inconsistent.',
        'Documentation could be much better.',
        '',
      ];

      const improvements = [
        'More integrations with third-party tools.',
        'Better mobile app experience.',
        'Faster loading times.',
        'More customization options.',
        'Improved onboarding documentation.',
        'Lower pricing for small teams.',
        'More frequent feature updates.',
        'Better reporting and analytics.',
        '',
        '',
        '',
      ];

      const submissionCount = 250;
      const dates = generateDateSpread(60, submissionCount);

      const submissions = dates.map((date, i) => {
        const npsScore = generateNpsScore();
        const category = getNpsCategory(npsScore);
        const device = randomDevice();
        const startTime = new Date(date.getTime() - generateCompletionTime(fields.length, true) * 1000);

        // Select appropriate feedback based on score
        const feedbackPool = category === 'Promoter' ? promoterFeedback :
                            category === 'Passive' ? passiveFeedback : detractorFeedback;

        // Detractors more likely to want follow-up (to resolve issues)
        const followUpOk = category === 'Detractor' ? Math.random() > 0.3 :
                          category === 'Passive' ? Math.random() > 0.6 :
                          Math.random() > 0.7;

        return {
          submissionId: `sub_${new ObjectId().toHexString()}`,
          formId,
          formVersion: 1,
          status: 'submitted',
          data: {
            nps_score: npsScore,
            respondent_category: category, // Computed field for analytics
            feedback: feedbackPool[Math.floor(Math.random() * feedbackPool.length)],
            improvement: category !== 'Promoter' ? improvements[Math.floor(Math.random() * improvements.length)] : (Math.random() > 0.7 ? improvements[Math.floor(Math.random() * improvements.length)] : ''),
            customer_segment: segments[Math.floor(Math.random() * segments.length)],
            product_used: products[Math.floor(Math.random() * products.length)],
            touchpoint: touchpoints[Math.floor(Math.random() * touchpoints.length)],
            follow_up_ok: followUpOk,
            email: followUpOk ? `respondent${i + 1}@example.com` : '',
          },
          submittedAt: date,
          startedAt: startTime,
          completedAt: date,
          completionTime: Math.floor((date.getTime() - startTime.getTime()) / 1000),
          metadata: {
            source: 'sample-data',
            deviceType: device,
            browser: randomBrowser(device),
            os: randomOS(device),
            npsCategory: category, // Extra metadata for NPS analytics
          },
        };
      });

      // NPS surveys have low abandonment (simple, quick to complete)
      const interactions = generateFieldInteractions(formId, fields, submissionCount, 0.08);

      return { submissions, interactions };
    },
  },
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId } = await params;

    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    try {
      await assertOrgPermission(session.userId, orgId, 'create_forms');
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { datasetId } = body;

    if (!datasetId || !SAMPLE_DATASETS[datasetId]) {
      return NextResponse.json(
        { error: 'Invalid dataset ID' },
        { status: 400 }
      );
    }

    const dataset = SAMPLE_DATASETS[datasetId];

    // Get org database
    const db = await getOrgDb(orgId);
    if (!db) {
      return NextResponse.json(
        { error: 'Organization database not found' },
        { status: 404 }
      );
    }

    // Check form limit before creating
    const currentFormCount = await db.collection('forms').countDocuments({ organizationId: orgId });
    const limitCheck = await checkFormLimit(orgId, currentFormCount);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: limitCheck.reason || 'Maximum forms limit reached',
          code: 'LIMIT_EXCEEDED',
          usage: {
            current: limitCheck.current,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining,
          },
        },
        { status: 429 }
      );
    }

    // Create the form
    const formId = `form_${new ObjectId().toHexString()}`;
    const form = {
      formId,
      ...dataset.form,
      organizationId: orgId,
      createdBy: session.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Published 90 days ago
      settings: {
        theme: 'default',
        showProgressBar: true,
        submitButtonText: 'Submit',
      },
      isSampleData: true,
    };

    await db.collection('forms').insertOne(form);

    // Generate submissions with analytics data
    const { submissions, interactions } = dataset.generateSubmissions(formId, dataset.form.fields);

    // Insert submissions
    if (submissions.length > 0) {
      await db.collection('submissions').insertMany(submissions);
    }

    // Insert field interactions for drop-off analytics
    if (interactions.length > 0) {
      await db.collection('field_interactions').insertMany(interactions);
    }

    // Calculate and store pre-computed analytics summary
    const analyticsSummary = {
      formId,
      totalResponses: submissions.length,
      completionRate: Math.round((submissions.length / (submissions.length + interactions.filter(i => !i.completed).length * 0.1)) * 100) / 100,
      averageCompletionTime: Math.round(submissions.reduce((sum, s) => sum + (s.completionTime || 0), 0) / submissions.length),
      deviceBreakdown: {
        desktop: submissions.filter(s => s.metadata.deviceType === 'desktop').length,
        mobile: submissions.filter(s => s.metadata.deviceType === 'mobile').length,
        tablet: submissions.filter(s => s.metadata.deviceType === 'tablet').length,
      },
      lastUpdated: new Date(),
    };

    await db.collection('analytics_cache').insertOne(analyticsSummary);

    return NextResponse.json({
      success: true,
      formId,
      form: {
        title: form.title,
        description: form.description,
      },
      submissionCount: submissions.length,
      interactionCount: interactions.length,
      message: `Loaded ${submissions.length} submissions with analytics data. View the form analytics to see response trends, field performance, and drop-off analysis.`,
    });
  } catch (error: any) {
    console.error('[Sample Data API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load sample data' },
      { status: 500 }
    );
  }
}

// GET - List available sample datasets
export async function GET() {
  const datasets = Object.entries(SAMPLE_DATASETS).map(([id, data]) => ({
    id,
    name: data.form.title,
    description: data.form.description,
    fieldCount: data.form.fields.length,
    features: [
      'Response trends over time',
      'Device breakdown analytics',
      'Field drop-off analysis',
      'Completion rate tracking',
    ],
  }));

  return NextResponse.json({ datasets });
}
