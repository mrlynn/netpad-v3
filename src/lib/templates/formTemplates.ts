/**
 * Form Templates Index
 * 
 * This file imports all form template JSON files and exports them as a single array.
 * In Next.js, JSON imports are bundled at build time, making this efficient.
 * 
 * For client-side usage, this provides all templates without runtime file system access.
 */

import contactForm from './data/forms/business/contact-form.json';
import jobApplication from './data/forms/business/job-application.json';
import leadCapture from './data/forms/business/lead-capture.json';
import quoteRequest from './data/forms/business/quote-request.json';
import newsletterSignup from './data/forms/business/newsletter-signup.json';

import registration from './data/forms/events/registration.json';
import webinarRegistration from './data/forms/events/webinar-registration.json';
import rsvp from './data/forms/events/rsvp.json';
import volunteerSignup from './data/forms/events/volunteer-signup.json';

import feedback from './data/forms/feedback/feedback.json';
import npsSurvey from './data/forms/feedback/nps-survey.json';
import customerSatisfaction from './data/forms/feedback/customer-satisfaction.json';
import productFeedback from './data/forms/feedback/product-feedback.json';

import supportTicket from './data/forms/support/support-ticket.json';
import appointmentBooking from './data/forms/support/appointment-booking.json';

import orderForm from './data/forms/ecommerce/order-form.json';
import returnRequest from './data/forms/ecommerce/return-request.json';

import patientIntakeEncrypted from './data/forms/healthcare/patient-intake-encrypted.json';
import healthScreening from './data/forms/healthcare/health-screening.json';

import financialApplicationEncrypted from './data/forms/finance/financial-application-encrypted.json';
import expenseReport from './data/forms/finance/expense-report.json';

import courseEnrollment from './data/forms/education/course-enrollment.json';
import scholarshipApplication from './data/forms/education/scholarship-application.json';

import rentalApplication from './data/forms/realestate/rental-application.json';
import propertyInquiry from './data/forms/realestate/property-inquiry.json';

import customerSearch from './data/forms/search/customer-search.json';
import orderSearch from './data/forms/search/order-search.json';
import supportTicketSearch from './data/forms/search/support-ticket-search.json';

import type { FormTemplate } from './loader';

// Export all templates as an array
export const formTemplates: FormTemplate[] = [
  contactForm as FormTemplate,
  jobApplication as FormTemplate,
  leadCapture as FormTemplate,
  quoteRequest as FormTemplate,
  newsletterSignup as FormTemplate,
  registration as FormTemplate,
  webinarRegistration as FormTemplate,
  rsvp as FormTemplate,
  volunteerSignup as FormTemplate,
  feedback as FormTemplate,
  npsSurvey as FormTemplate,
  customerSatisfaction as FormTemplate,
  productFeedback as FormTemplate,
  supportTicket as FormTemplate,
  appointmentBooking as FormTemplate,
  orderForm as FormTemplate,
  returnRequest as FormTemplate,
  patientIntakeEncrypted as FormTemplate,
  healthScreening as FormTemplate,
  financialApplicationEncrypted as FormTemplate,
  expenseReport as FormTemplate,
  courseEnrollment as FormTemplate,
  scholarshipApplication as FormTemplate,
  rentalApplication as FormTemplate,
  propertyInquiry as FormTemplate,
  customerSearch as FormTemplate,
  orderSearch as FormTemplate,
  supportTicketSearch as FormTemplate,
];

// Export categories
export const templateCategories = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'events', label: 'Events', icon: '🎫' },
  { id: 'feedback', label: 'Feedback', icon: '⭐' },
  { id: 'support', label: 'Support', icon: '🎧' },
  { id: 'ecommerce', label: 'E-Commerce', icon: '🛒' },
  { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { id: 'finance', label: 'Finance', icon: '🏦' },
  { id: 'education', label: 'Education', icon: '🎓' },
  { id: 'realestate', label: 'Real Estate', icon: '🏠' },
  { id: 'search', label: 'Search Forms', icon: '🔍' },
];
