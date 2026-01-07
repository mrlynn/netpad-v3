'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  alpha,
  Tabs,
  Tab,
  Divider,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add,
  AutoAwesome,
  Folder,
  Storage,
  Lightbulb,
  NoteAdd,
  KeyboardArrowDown,
  Send,
  History,
} from '@mui/icons-material';
import { QuestionTypePicker } from './QuestionTypePicker';
import { FieldConfig } from '@/types/form';
import AIFormGeneratorDialog, { AIGenerationConnectionContext } from './AIFormGeneratorDialog';
import { useAIFormGenerator } from '@/hooks/useAI';

interface EmptyFormStateProps {
  onAddField: (field: FieldConfig) => void;
  onAddTemplate?: (fields: FieldConfig[], templateName: string) => void;
  onOpenLibrary: () => void;
  onConnectDatabase?: () => void;
  hasConnection: boolean;
  onAIGenerateWithConnection?: (fields: FieldConfig[], connectionContext?: AIGenerationConnectionContext) => void;
  onStartBlank?: () => void;
}

// Form templates for quick start - organized by category
const TEMPLATES = [
  // === BUSINESS & PROFESSIONAL ===
  {
    id: 'contact',
    name: 'Contact Form',
    description: 'Name, email, message',
    icon: '📧',
    category: 'business',
    fields: [
      { path: 'name', label: 'Your Name', type: 'string', included: true, required: true },
      { path: 'email', label: 'Email Address', type: 'email', included: true, required: true },
      { path: 'subject', label: 'Subject', type: 'string', included: true, required: false },
      { path: 'message', label: 'Message', type: 'string', included: true, required: true },
    ],
  },
  {
    id: 'application',
    name: 'Job Application',
    description: 'Resume & details',
    icon: '💼',
    category: 'business',
    fields: [
      { path: 'fullName', label: 'Full Name', type: 'string', included: true, required: true },
      { path: 'email', label: 'Email', type: 'email', included: true, required: true },
      { path: 'phone', label: 'Phone', type: 'string', included: true, required: true },
      { path: 'position', label: 'Position Applying For', type: 'string', included: true, required: true },
      { path: 'experience', label: 'Years of Experience', type: 'number', included: true, required: true },
      { path: 'coverLetter', label: 'Cover Letter', type: 'string', included: true, required: false },
    ],
  },
  {
    id: 'lead-capture',
    name: 'Lead Capture',
    description: 'Sales lead generation',
    icon: '🎯',
    category: 'business',
    fields: [
      { path: 'firstName', label: 'First Name', type: 'string', included: true, required: true },
      { path: 'lastName', label: 'Last Name', type: 'string', included: true, required: true },
      { path: 'email', label: 'Work Email', type: 'email', included: true, required: true },
      { path: 'company', label: 'Company Name', type: 'string', included: true, required: true },
      { path: 'jobTitle', label: 'Job Title', type: 'string', included: true, required: false },
      { path: 'companySize', label: 'Company Size', type: 'string', included: true, required: false },
      { path: 'interest', label: 'What are you interested in?', type: 'string', included: true, required: true },
    ],
  },
  {
    id: 'quote-request',
    name: 'Quote Request',
    description: 'Service pricing inquiry',
    icon: '💰',
    category: 'business',
    fields: [
      { path: 'contactName', label: 'Contact Name', type: 'string', included: true, required: true },
      { path: 'email', label: 'Email', type: 'email', included: true, required: true },
      { path: 'phone', label: 'Phone Number', type: 'string', included: true, required: true },
      { path: 'company', label: 'Company/Organization', type: 'string', included: true, required: false },
      { path: 'serviceType', label: 'Service Type', type: 'string', included: true, required: true },
      { path: 'projectDescription', label: 'Project Description', type: 'string', included: true, required: true },
      { path: 'budget', label: 'Budget Range', type: 'string', included: true, required: false },
      { path: 'timeline', label: 'Desired Timeline', type: 'string', included: true, required: false },
    ],
  },
  {
    id: 'newsletter-signup',
    name: 'Newsletter Signup',
    description: 'Email subscription',
    icon: '📰',
    category: 'business',
    fields: [
      { path: 'email', label: 'Email Address', type: 'email', included: true, required: true },
      { path: 'firstName', label: 'First Name', type: 'string', included: true, required: false },
      { path: 'interests', label: 'Topics of Interest', type: 'string', included: true, required: false },
      { path: 'consent', label: 'I agree to receive marketing emails', type: 'boolean', included: true, required: true },
    ],
  },

  // === EVENTS & REGISTRATION ===
  {
    id: 'registration',
    name: 'Event Registration',
    description: 'Attendee info',
    icon: '🎫',
    category: 'events',
    fields: [
      { path: 'firstName', label: 'First Name', type: 'string', included: true, required: true },
      { path: 'lastName', label: 'Last Name', type: 'string', included: true, required: true },
      { path: 'email', label: 'Email', type: 'email', included: true, required: true },
      { path: 'phone', label: 'Phone Number', type: 'string', included: true, required: false },
      { path: 'dietaryRestrictions', label: 'Dietary Restrictions', type: 'string', included: true, required: false },
    ],
  },
  {
    id: 'webinar-registration',
    name: 'Webinar Registration',
    description: 'Online event signup',
    icon: '💻',
    category: 'events',
    fields: [
      { path: 'fullName', label: 'Full Name', type: 'string', included: true, required: true },
      { path: 'email', label: 'Email', type: 'email', included: true, required: true },
      { path: 'company', label: 'Company', type: 'string', included: true, required: false },
      { path: 'role', label: 'Your Role', type: 'string', included: true, required: false },
      { path: 'questions', label: 'Questions for the Speaker', type: 'string', included: true, required: false },
      { path: 'timezone', label: 'Your Timezone', type: 'string', included: true, required: true },
    ],
  },
  {
    id: 'rsvp',
    name: 'RSVP Form',
    description: 'Event attendance',
    icon: '🎉',
    category: 'events',
    fields: [
      { path: 'name', label: 'Your Name', type: 'string', included: true, required: true },
      { path: 'email', label: 'Email', type: 'email', included: true, required: true },
      { path: 'attending', label: 'Will you be attending?', type: 'boolean', included: true, required: true },
      { path: 'guestCount', label: 'Number of Guests', type: 'number', included: true, required: false, validation: { min: 0, max: 10 } },
      { path: 'mealPreference', label: 'Meal Preference', type: 'string', included: true, required: false },
      { path: 'specialRequests', label: 'Special Requests', type: 'string', included: true, required: false },
    ],
  },
  {
    id: 'volunteer-signup',
    name: 'Volunteer Signup',
    description: 'Volunteer application',
    icon: '🤝',
    category: 'events',
    fields: [
      { path: 'fullName', label: 'Full Name', type: 'string', included: true, required: true },
      { path: 'email', label: 'Email', type: 'email', included: true, required: true },
      { path: 'phone', label: 'Phone', type: 'string', included: true, required: true },
      { path: 'availability', label: 'Availability', type: 'string', included: true, required: true },
      { path: 'skills', label: 'Skills & Experience', type: 'string', included: true, required: false },
      { path: 'interests', label: 'Areas of Interest', type: 'string', included: true, required: true },
      { path: 'emergencyContact', label: 'Emergency Contact', type: 'string', included: true, required: true },
    ],
  },

  // === FEEDBACK & SURVEYS ===
  {
    id: 'feedback',
    name: 'Feedback Survey',
    description: 'Rating & comments',
    icon: '⭐',
    category: 'feedback',
    fields: [
      { path: 'rating', label: 'How would you rate us?', type: 'number', included: true, required: true, validation: { min: 1, max: 5 } },
      { path: 'recommend', label: 'Would you recommend us?', type: 'boolean', included: true, required: true },
      { path: 'feedback', label: 'Any additional feedback?', type: 'string', included: true, required: false },
    ],
  },
  {
    id: 'nps-survey',
    name: 'NPS Survey',
    description: 'Net Promoter Score',
    icon: '📊',
    category: 'feedback',
    fields: [
      { path: 'score', label: 'How likely are you to recommend us? (0-10)', type: 'number', included: true, required: true, validation: { min: 0, max: 10 } },
      { path: 'reason', label: 'What is the primary reason for your score?', type: 'string', included: true, required: true },
      { path: 'improvements', label: 'What could we do better?', type: 'string', included: true, required: false },
      { path: 'followUp', label: 'May we contact you for follow-up?', type: 'boolean', included: true, required: false },
      { path: 'email', label: 'Email (optional)', type: 'email', included: true, required: false },
    ],
  },
  {
    id: 'customer-satisfaction',
    name: 'Customer Satisfaction',
    description: 'CSAT survey',
    icon: '😊',
    category: 'feedback',
    fields: [
      { path: 'overallSatisfaction', label: 'Overall Satisfaction (1-5)', type: 'number', included: true, required: true, validation: { min: 1, max: 5 } },
      { path: 'productQuality', label: 'Product Quality (1-5)', type: 'number', included: true, required: true, validation: { min: 1, max: 5 } },
      { path: 'customerService', label: 'Customer Service (1-5)', type: 'number', included: true, required: true, validation: { min: 1, max: 5 } },
      { path: 'valueForMoney', label: 'Value for Money (1-5)', type: 'number', included: true, required: true, validation: { min: 1, max: 5 } },
      { path: 'mostLiked', label: 'What did you like most?', type: 'string', included: true, required: false },
      { path: 'improvements', label: 'Suggestions for improvement', type: 'string', included: true, required: false },
    ],
  },
  {
    id: 'product-feedback',
    name: 'Product Feedback',
    description: 'Feature & bug reports',
    icon: '🔧',
    category: 'feedback',
    fields: [
      { path: 'feedbackType', label: 'Feedback Type', type: 'string', included: true, required: true },
      { path: 'feature', label: 'Feature/Area', type: 'string', included: true, required: true },
      { path: 'description', label: 'Description', type: 'string', included: true, required: true },
      { path: 'expectedBehavior', label: 'Expected Behavior', type: 'string', included: true, required: false },
      { path: 'actualBehavior', label: 'Actual Behavior', type: 'string', included: true, required: false },
      { path: 'priority', label: 'Priority Level', type: 'string', included: true, required: false },
      { path: 'email', label: 'Contact Email', type: 'email', included: true, required: false },
    ],
  },

  // === SUPPORT & SERVICE ===
  {
    id: 'support-ticket',
    name: 'Support Ticket',
    description: 'Help desk request',
    icon: '🎧',
    category: 'support',
    fields: [
      { path: 'name', label: 'Your Name', type: 'string', included: true, required: true },
      { path: 'email', label: 'Email', type: 'email', included: true, required: true },
      { path: 'category', label: 'Issue Category', type: 'string', included: true, required: true },
      { path: 'priority', label: 'Priority', type: 'string', included: true, required: true },
      { path: 'subject', label: 'Subject', type: 'string', included: true, required: true },
      { path: 'description', label: 'Description of Issue', type: 'string', included: true, required: true },
      { path: 'stepsToReproduce', label: 'Steps to Reproduce', type: 'string', included: true, required: false },
    ],
  },
  {
    id: 'appointment-booking',
    name: 'Appointment Booking',
    description: 'Schedule meetings',
    icon: '📅',
    category: 'support',
    fields: [
      { path: 'fullName', label: 'Full Name', type: 'string', included: true, required: true },
      { path: 'email', label: 'Email', type: 'email', included: true, required: true },
      { path: 'phone', label: 'Phone Number', type: 'string', included: true, required: true },
      { path: 'preferredDate', label: 'Preferred Date', type: 'date', included: true, required: true },
      { path: 'preferredTime', label: 'Preferred Time', type: 'string', included: true, required: true },
      { path: 'serviceType', label: 'Service Type', type: 'string', included: true, required: true },
      { path: 'notes', label: 'Additional Notes', type: 'string', included: true, required: false },
    ],
  },

  // === ORDERS & E-COMMERCE ===
  {
    id: 'order-form',
    name: 'Order Form',
    description: 'Product ordering',
    icon: '🛒',
    category: 'ecommerce',
    fields: [
      { path: 'customerName', label: 'Customer Name', type: 'string', included: true, required: true },
      { path: 'email', label: 'Email', type: 'email', included: true, required: true },
      { path: 'phone', label: 'Phone', type: 'string', included: true, required: true },
      { path: 'productName', label: 'Product', type: 'string', included: true, required: true },
      { path: 'quantity', label: 'Quantity', type: 'number', included: true, required: true, validation: { min: 1 } },
      { path: 'shippingAddress', label: 'Shipping Address', type: 'string', included: true, required: true },
      { path: 'specialInstructions', label: 'Special Instructions', type: 'string', included: true, required: false },
    ],
  },
  {
    id: 'return-request',
    name: 'Return Request',
    description: 'Product returns',
    icon: '📦',
    category: 'ecommerce',
    fields: [
      { path: 'orderNumber', label: 'Order Number', type: 'string', included: true, required: true },
      { path: 'customerEmail', label: 'Email Used for Order', type: 'email', included: true, required: true },
      { path: 'productName', label: 'Product to Return', type: 'string', included: true, required: true },
      { path: 'returnReason', label: 'Reason for Return', type: 'string', included: true, required: true },
      { path: 'condition', label: 'Product Condition', type: 'string', included: true, required: true },
      { path: 'preferredResolution', label: 'Preferred Resolution', type: 'string', included: true, required: true },
      { path: 'additionalComments', label: 'Additional Comments', type: 'string', included: true, required: false },
    ],
  },

  // === HEALTHCARE (ENCRYPTED) ===
  {
    id: 'patient-intake-encrypted',
    name: 'Patient Intake (Encrypted)',
    description: 'HIPAA-compliant with QE',
    icon: '🏥',
    category: 'healthcare',
    fields: [
      { path: 'firstName', label: 'First Name', type: 'string', included: true, required: true },
      { path: 'lastName', label: 'Last Name', type: 'string', included: true, required: true },
      { path: 'dateOfBirth', label: 'Date of Birth', type: 'date', included: true, required: true },
      { path: 'ssn', label: 'Social Security Number', type: 'string', included: true, required: true, validation: { pattern: '^\\d{3}-\\d{2}-\\d{4}$' }, encryption: { enabled: true, algorithm: 'Indexed', queryType: 'equality' } },
      { path: 'insuranceId', label: 'Insurance ID', type: 'string', included: true, required: true, encryption: { enabled: true, algorithm: 'Indexed', queryType: 'equality' } },
      { path: 'medicalHistory', label: 'Medical History', type: 'string', included: true, required: false, encryption: { enabled: true, algorithm: 'Unindexed' } },
      { path: 'allergies', label: 'Known Allergies', type: 'string', included: true, required: false },
      { path: 'emergencyContact', label: 'Emergency Contact Phone', type: 'string', included: true, required: true },
    ],
  },
  {
    id: 'health-screening',
    name: 'Health Screening',
    description: 'Medical questionnaire',
    icon: '🩺',
    category: 'healthcare',
    fields: [
      { path: 'fullName', label: 'Full Name', type: 'string', included: true, required: true },
      { path: 'dateOfBirth', label: 'Date of Birth', type: 'date', included: true, required: true },
      { path: 'symptoms', label: 'Current Symptoms', type: 'string', included: true, required: true },
      { path: 'symptomDuration', label: 'How long have you had these symptoms?', type: 'string', included: true, required: true },
      { path: 'medications', label: 'Current Medications', type: 'string', included: true, required: false },
      { path: 'recentTravel', label: 'Recent Travel (last 14 days)?', type: 'boolean', included: true, required: true },
      { path: 'exposureContact', label: 'Contact with sick individuals?', type: 'boolean', included: true, required: true },
      { path: 'additionalInfo', label: 'Additional Information', type: 'string', included: true, required: false },
    ],
  },

  // === FINANCE (ENCRYPTED) ===
  {
    id: 'financial-application-encrypted',
    name: 'Financial Application (Encrypted)',
    description: 'PCI-compliant with QE',
    icon: '🏦',
    category: 'finance',
    fields: [
      { path: 'fullName', label: 'Full Legal Name', type: 'string', included: true, required: true },
      { path: 'email', label: 'Email Address', type: 'email', included: true, required: true },
      { path: 'phone', label: 'Phone Number', type: 'string', included: true, required: true },
      { path: 'ssn', label: 'Social Security Number', type: 'string', included: true, required: true, validation: { pattern: '^\\d{3}-\\d{2}-\\d{4}$' }, encryption: { enabled: true, algorithm: 'Indexed', queryType: 'equality' } },
      { path: 'annualIncome', label: 'Annual Income ($)', type: 'number', included: true, required: true, encryption: { enabled: true, algorithm: 'Indexed', queryType: 'range' } },
      { path: 'employerName', label: 'Current Employer', type: 'string', included: true, required: true },
      { path: 'bankAccountNumber', label: 'Bank Account Number', type: 'string', included: true, required: true, encryption: { enabled: true, algorithm: 'Indexed', queryType: 'equality' } },
      { path: 'routingNumber', label: 'Routing Number', type: 'string', included: true, required: true, validation: { pattern: '^\\d{9}$' }, encryption: { enabled: true, algorithm: 'Unindexed' } },
    ],
  },
  {
    id: 'expense-report',
    name: 'Expense Report',
    description: 'Expense submission',
    icon: '🧾',
    category: 'finance',
    fields: [
      { path: 'employeeName', label: 'Employee Name', type: 'string', included: true, required: true },
      { path: 'employeeId', label: 'Employee ID', type: 'string', included: true, required: true },
      { path: 'department', label: 'Department', type: 'string', included: true, required: true },
      { path: 'expenseDate', label: 'Expense Date', type: 'date', included: true, required: true },
      { path: 'category', label: 'Expense Category', type: 'string', included: true, required: true },
      { path: 'amount', label: 'Amount ($)', type: 'number', included: true, required: true, validation: { min: 0 } },
      { path: 'description', label: 'Description', type: 'string', included: true, required: true },
      { path: 'businessPurpose', label: 'Business Purpose', type: 'string', included: true, required: true },
    ],
  },

  // === EDUCATION ===
  {
    id: 'course-enrollment',
    name: 'Course Enrollment',
    description: 'Student registration',
    icon: '🎓',
    category: 'education',
    fields: [
      { path: 'studentName', label: 'Student Name', type: 'string', included: true, required: true },
      { path: 'email', label: 'Email', type: 'email', included: true, required: true },
      { path: 'phone', label: 'Phone', type: 'string', included: true, required: false },
      { path: 'dateOfBirth', label: 'Date of Birth', type: 'date', included: true, required: true },
      { path: 'courseName', label: 'Course Name', type: 'string', included: true, required: true },
      { path: 'previousEducation', label: 'Previous Education', type: 'string', included: true, required: false },
      { path: 'specialNeeds', label: 'Special Accommodations Needed', type: 'string', included: true, required: false },
    ],
  },
  {
    id: 'scholarship-application',
    name: 'Scholarship Application',
    description: 'Financial aid request',
    icon: '📚',
    category: 'education',
    fields: [
      { path: 'fullName', label: 'Full Name', type: 'string', included: true, required: true },
      { path: 'email', label: 'Email', type: 'email', included: true, required: true },
      { path: 'phone', label: 'Phone', type: 'string', included: true, required: true },
      { path: 'currentSchool', label: 'Current School/University', type: 'string', included: true, required: true },
      { path: 'gpa', label: 'GPA', type: 'number', included: true, required: true, validation: { min: 0, max: 4 } },
      { path: 'fieldOfStudy', label: 'Field of Study', type: 'string', included: true, required: true },
      { path: 'financialNeed', label: 'Statement of Financial Need', type: 'string', included: true, required: true },
      { path: 'achievements', label: 'Academic/Extracurricular Achievements', type: 'string', included: true, required: true },
      { path: 'essay', label: 'Personal Essay', type: 'string', included: true, required: true },
    ],
  },

  // === REAL ESTATE ===
  {
    id: 'rental-application',
    name: 'Rental Application',
    description: 'Tenant application',
    icon: '🏠',
    category: 'realestate',
    fields: [
      { path: 'fullName', label: 'Full Legal Name', type: 'string', included: true, required: true },
      { path: 'email', label: 'Email', type: 'email', included: true, required: true },
      { path: 'phone', label: 'Phone', type: 'string', included: true, required: true },
      { path: 'currentAddress', label: 'Current Address', type: 'string', included: true, required: true },
      { path: 'employer', label: 'Current Employer', type: 'string', included: true, required: true },
      { path: 'monthlyIncome', label: 'Monthly Income ($)', type: 'number', included: true, required: true },
      { path: 'moveInDate', label: 'Desired Move-in Date', type: 'date', included: true, required: true },
      { path: 'occupants', label: 'Number of Occupants', type: 'number', included: true, required: true, validation: { min: 1 } },
      { path: 'pets', label: 'Do you have pets?', type: 'boolean', included: true, required: true },
      { path: 'references', label: 'Previous Landlord Reference', type: 'string', included: true, required: false },
    ],
  },
  {
    id: 'property-inquiry',
    name: 'Property Inquiry',
    description: 'Real estate interest',
    icon: '🏡',
    category: 'realestate',
    fields: [
      { path: 'name', label: 'Your Name', type: 'string', included: true, required: true },
      { path: 'email', label: 'Email', type: 'email', included: true, required: true },
      { path: 'phone', label: 'Phone', type: 'string', included: true, required: true },
      { path: 'propertyAddress', label: 'Property Address of Interest', type: 'string', included: true, required: true },
      { path: 'inquiryType', label: 'Are you looking to buy or rent?', type: 'string', included: true, required: true },
      { path: 'budget', label: 'Budget Range', type: 'string', included: true, required: false },
      { path: 'preApproved', label: 'Are you pre-approved for financing?', type: 'boolean', included: true, required: false },
      { path: 'bestTimeToContact', label: 'Best Time to Contact', type: 'string', included: true, required: false },
    ],
  },
];

// Category definitions with labels and icons
const TEMPLATE_CATEGORIES = [
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
];

// Example prompts for quick start
const HERO_EXAMPLE_PROMPTS = [
  'Customer feedback form with rating and comments',
  'Event registration with name, email, and dietary restrictions',
  'Job application with resume upload and experience',
  'IT helpdesk ticket with issue category and priority',
  'Newsletter signup with email and interests',
];

// Storage key for recent prompts
const RECENT_PROMPTS_KEY = 'netpad_recent_ai_prompts';

export function EmptyFormState({
  onAddField,
  onAddTemplate,
  onOpenLibrary,
  onConnectDatabase,
  hasConnection,
  onAIGenerateWithConnection,
  onStartBlank,
}: EmptyFormStateProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Hero prompt state
  const [heroPrompt, setHeroPrompt] = useState('');
  const [showManualOptions, setShowManualOptions] = useState(false);
  const [recentPrompts, setRecentPrompts] = useState<string[]>([]);
  const [showRecentPrompts, setShowRecentPrompts] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // AI form generation hook
  const {
    data: generatedForm,
    loading: isGenerating,
    error: generateError,
    generateForm,
    reset: resetGeneration,
  } = useAIFormGenerator();

  // Load recent prompts from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_PROMPTS_KEY);
      if (stored) {
        setRecentPrompts(JSON.parse(stored).slice(0, 5));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save prompt to recent prompts
  const saveRecentPrompt = (prompt: string) => {
    try {
      const updated = [prompt, ...recentPrompts.filter(p => p !== prompt)].slice(0, 5);
      setRecentPrompts(updated);
      localStorage.setItem(RECENT_PROMPTS_KEY, JSON.stringify(updated));
    } catch {
      // Ignore localStorage errors
    }
  };

  // Handle hero prompt submission
  const handleHeroGenerate = async () => {
    if (!heroPrompt.trim() || isGenerating) return;

    saveRecentPrompt(heroPrompt.trim());

    await generateForm(heroPrompt.trim(), {}, {
      includeValidation: true,
      includeConditionalLogic: true,
    });
  };

  // Apply generated form
  useEffect(() => {
    if (generatedForm && generatedForm.fieldConfigs && generatedForm.fieldConfigs.length > 0) {
      if (onAddTemplate) {
        onAddTemplate(generatedForm.fieldConfigs, generatedForm.name || 'AI Generated Form');
      } else {
        generatedForm.fieldConfigs.forEach((field, index) => {
          setTimeout(() => {
            onAddField(field);
          }, index * 50);
        });
      }
      // Reset after applying
      setHeroPrompt('');
      resetGeneration();
    }
  }, [generatedForm, onAddField, onAddTemplate, resetGeneration]);

  // Handle Enter key in prompt input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleHeroGenerate();
    }
  };

  // Filter templates by selected category
  const filteredTemplates = selectedCategory === 'all'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === selectedCategory);

  const handleTemplateSelect = (template: typeof TEMPLATES[0]) => {
    const fields = template.fields.map(field => ({
      ...field,
      source: 'custom' as const,
    })) as FieldConfig[];

    if (onAddTemplate) {
      // Use batch template handler if available
      onAddTemplate(fields, template.name);
    } else {
      // Fallback to adding fields one by one (legacy behavior)
      fields.forEach((field, index) => {
        setTimeout(() => {
          onAddField(field);
        }, index * 10);
      });
    }
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        bgcolor: 'background.default',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 700,
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Hero AI Prompt Section */}
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            background: `linear-gradient(135deg, ${alpha('#00ED64', 0.15)} 0%, ${alpha('#00ED64', 0.03)} 100%)`,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* AI Icon */}
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              boxShadow: `0 4px 20px ${alpha('#00ED64', 0.3)}`,
              border: `2px solid ${alpha('#00ED64', 0.3)}`,
            }}
          >
            <AutoAwesome sx={{ color: '#00ED64', fontSize: 28 }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            What kind of form do you want to create?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Describe your form in plain English and AI will generate it for you
          </Typography>

          {/* Hero Prompt Input */}
          <Box sx={{ position: 'relative', maxWidth: 560, mx: 'auto' }}>
            <TextField
              ref={inputRef}
              fullWidth
              placeholder="e.g., Customer feedback form with rating and comments..."
              value={heroPrompt}
              onChange={(e) => setHeroPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              InputProps={{
                sx: {
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  pr: 1,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha('#00ED64', 0.3),
                    borderWidth: 2,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha('#00ED64', 0.5),
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00ED64',
                  },
                },
                startAdornment: (
                  <InputAdornment position="start">
                    <AutoAwesome sx={{ color: '#00ED64', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {recentPrompts.length > 0 && (
                        <Tooltip title="Recent prompts">
                          <IconButton
                            size="small"
                            onClick={() => setShowRecentPrompts(!showRecentPrompts)}
                            sx={{ color: 'text.secondary' }}
                          >
                            <History fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleHeroGenerate}
                        disabled={!heroPrompt.trim() || isGenerating}
                        sx={{
                          minWidth: 'auto',
                          px: 2,
                          background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #00CC55 0%, #00AA44 100%)',
                          },
                          '&.Mui-disabled': {
                            background: alpha('#00ED64', 0.3),
                          },
                        }}
                      >
                        {isGenerating ? (
                          <CircularProgress size={20} sx={{ color: 'white' }} />
                        ) : (
                          <Send sx={{ fontSize: 18 }} />
                        )}
                      </Button>
                    </Box>
                  </InputAdornment>
                ),
              }}
            />

            {/* Recent prompts dropdown */}
            <Collapse in={showRecentPrompts && recentPrompts.length > 0}>
              <Paper
                elevation={3}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 1,
                  zIndex: 10,
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary', fontWeight: 500 }}
                >
                  Recent prompts
                </Typography>
                {recentPrompts.map((prompt, index) => (
                  <Box
                    key={index}
                    onClick={() => {
                      setHeroPrompt(prompt);
                      setShowRecentPrompts(false);
                    }}
                    sx={{
                      px: 2,
                      py: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: alpha('#00ED64', 0.08),
                      },
                    }}
                  >
                    <Typography variant="body2" noWrap>
                      {prompt}
                    </Typography>
                  </Box>
                ))}
              </Paper>
            </Collapse>
          </Box>

          {/* Error message */}
          {generateError && (
            <Typography
              variant="body2"
              sx={{
                color: 'error.main',
                mt: 2,
                p: 1.5,
                bgcolor: alpha('#f44336', 0.1),
                borderRadius: 1,
                maxWidth: 560,
                mx: 'auto',
              }}
            >
              {generateError}
            </Typography>
          )}

          {/* Loading message */}
          {isGenerating && (
            <Typography
              variant="body2"
              sx={{
                color: '#00ED64',
                mt: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <AutoAwesome sx={{ fontSize: 16, animation: 'pulse 1.5s ease-in-out infinite' }} />
              Generating your form...
            </Typography>
          )}

          {/* Example prompts */}
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Try an example:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center' }}>
              {HERO_EXAMPLE_PROMPTS.map((example, index) => (
                <Chip
                  key={index}
                  label={example}
                  size="small"
                  variant="outlined"
                  onClick={() => setHeroPrompt(example)}
                  disabled={isGenerating}
                  sx={{
                    cursor: 'pointer',
                    borderColor: alpha('#00ED64', 0.3),
                    '&:hover': {
                      borderColor: '#00ED64',
                      bgcolor: alpha('#00ED64', 0.08),
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>

        {/* Divider with "or start manually" */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 3,
            py: 1.5,
            bgcolor: alpha('#000', 0.02),
            cursor: 'pointer',
            '&:hover': {
              bgcolor: alpha('#000', 0.04),
            },
          }}
          onClick={() => setShowManualOptions(!showManualOptions)}
        >
          <Divider sx={{ flex: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              or start manually
            </Typography>
            <KeyboardArrowDown
              sx={{
                fontSize: 18,
                color: 'text.secondary',
                transform: showManualOptions ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </Box>
          <Divider sx={{ flex: 1 }} />
        </Box>

        {/* Collapsible Manual Options */}
        <Collapse in={showManualOptions}>
          {/* Quick action buttons */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              p: 2,
              justifyContent: 'center',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Button
              variant="outlined"
              size="small"
              startIcon={<NoteAdd />}
              onClick={() => {
                if (onStartBlank) {
                  onStartBlank();
                }
              }}
              sx={{
                borderColor: alpha('#00ED64', 0.5),
                color: '#00ED64',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#00ED64',
                  bgcolor: alpha('#00ED64', 0.08),
                },
              }}
            >
              Start Blank
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Folder />}
              onClick={onOpenLibrary}
              sx={{
                borderColor: 'divider',
                color: 'text.secondary',
                textTransform: 'none',
                '&:hover': {
                  borderColor: 'text.secondary',
                },
              }}
            >
              My Forms
            </Button>
            {onConnectDatabase && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Storage />}
                onClick={onConnectDatabase}
                sx={{
                  borderColor: hasConnection ? alpha('#00ED64', 0.5) : 'divider',
                  color: hasConnection ? '#00ED64' : 'text.secondary',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#00ED64',
                    bgcolor: alpha('#00ED64', 0.05),
                  },
                }}
              >
                {hasConnection ? 'Connected' : 'Connect DB'}
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<AutoAwesome />}
              onClick={() => setAiDialogOpen(true)}
              sx={{
                borderColor: 'divider',
                color: 'text.secondary',
                textTransform: 'none',
                '&:hover': {
                  borderColor: 'text.secondary',
                },
              }}
            >
              Advanced AI
            </Button>
          </Box>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="fullWidth"
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                minHeight: 48,
              },
              '& .Mui-selected': {
                color: '#00ED64',
              },
              '& .MuiTabs-indicator': {
                bgcolor: '#00ED64',
              },
            }}
          >
            <Tab
              icon={<Add sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Add Questions"
            />
            <Tab
              icon={<AutoAwesome sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Templates"
            />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ minHeight: 300 }}>
            {activeTab === 0 && (
            <Box
              sx={{
                height: 400,
                overflowY: 'auto',
                '&::-webkit-scrollbar': {
                  width: 6,
                },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: 'divider',
                  borderRadius: 3,
                },
              }}
            >
              <QuestionTypePicker onSelect={onAddField} />
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: 400 }}>
              {/* Category Filter Chips */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.75,
                  p: 1.5,
                  pb: 1,
                  overflowX: 'auto',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  flexShrink: 0,
                  '&::-webkit-scrollbar': {
                    height: 4,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: 'divider',
                    borderRadius: 2,
                  },
                }}
              >
                {TEMPLATE_CATEGORIES.map((cat) => {
                  const count = cat.id === 'all'
                    ? TEMPLATES.length
                    : TEMPLATES.filter(t => t.category === cat.id).length;
                  return (
                    <Chip
                      key={cat.id}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                          <Box
                            component="span"
                            sx={{
                              ml: 0.5,
                              px: 0.75,
                              py: 0.125,
                              borderRadius: 1,
                              bgcolor: selectedCategory === cat.id
                                ? alpha('#fff', 0.2)
                                : alpha('#000', 0.08),
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {count}
                          </Box>
                        </Box>
                      }
                      onClick={() => setSelectedCategory(cat.id)}
                      sx={{
                        height: 32,
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        bgcolor: selectedCategory === cat.id
                          ? '#00ED64'
                          : 'transparent',
                        color: selectedCategory === cat.id
                          ? '#000'
                          : 'text.primary',
                        border: '1px solid',
                        borderColor: selectedCategory === cat.id
                          ? '#00ED64'
                          : 'divider',
                        fontWeight: selectedCategory === cat.id ? 600 : 400,
                        '&:hover': {
                          bgcolor: selectedCategory === cat.id
                            ? '#00ED64'
                            : alpha('#00ED64', 0.08),
                          borderColor: '#00ED64',
                        },
                        '& .MuiChip-label': {
                          px: 1,
                        },
                      }}
                    />
                  );
                })}
              </Box>

              {/* Scrollable Template Grid */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: 2,
                  '&::-webkit-scrollbar': {
                    width: 6,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: 'divider',
                    borderRadius: 3,
                  },
                }}
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {filteredTemplates.map((template) => (
                    <Paper
                      key={template.id}
                      elevation={0}
                      onClick={() => handleTemplateSelect(template)}
                      sx={{
                        flex: '1 1 calc(50% - 6px)',
                        minWidth: 180,
                        maxWidth: 'calc(50% - 6px)',
                        p: 1.5,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          borderColor: alpha('#00ED64', 0.5),
                          bgcolor: alpha('#00ED64', 0.03),
                          transform: 'translateY(-1px)',
                          boxShadow: `0 4px 12px ${alpha('#00ED64', 0.1)}`,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                        <Typography sx={{ fontSize: 24 }}>{template.icon}</Typography>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 600,
                              mb: 0.25,
                              fontSize: 13,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {template.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontSize: 11,
                            }}
                          >
                            {template.description}
                          </Typography>
                          <Chip
                            label={`${template.fields.length} fields`}
                            size="small"
                            sx={{
                              fontSize: 10,
                              height: 16,
                              mt: 0.75,
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>

                {filteredTemplates.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No templates in this category
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}

        </Box>
        </Collapse>
      </Paper>

      {/* AI Form Generator Dialog */}
      <AIFormGeneratorDialog
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        onGenerate={(form, connectionContext) => {
          // If connection context is provided, use the new handler that sets up the data source
          if (connectionContext && onAIGenerateWithConnection && form.fieldConfigs) {
            onAIGenerateWithConnection(form.fieldConfigs, connectionContext);
          } else if (form.fieldConfigs) {
            // Fall back to adding fields one by one
            form.fieldConfigs.forEach((field, index) => {
              setTimeout(() => {
                onAddField(field);
              }, index * 50);
            });
          }
          setAiDialogOpen(false);
        }}
      />
    </Box>
  );
}
