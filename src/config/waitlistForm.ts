/**
 * Waitlist Signup Form Configuration
 *
 * This form configuration is used by the FormRenderer component to
 * capture waitlist signups - dogfooding NetPad's own form system.
 */

import { FormConfiguration } from '@/types/form';

export const waitlistFormConfig: FormConfiguration = {
  id: 'waitlist-signup-form',
  name: 'Join the Waitlist',
  description: 'Be among the first to experience NetPad',
  collection: 'waitlist', // Not actually used - we use custom submit handler
  database: 'netpad', // Not actually used - we use custom submit handler
  fieldConfigs: [
    // Required fields
    {
      path: 'email',
      label: 'Email address',
      type: 'email',
      included: true,
      required: true,
      placeholder: 'you@example.com',
    },
    {
      path: 'name',
      label: 'Your name',
      type: 'string',
      included: true,
      required: false,
      placeholder: 'John Smith',
    },

    // Company & Role
    {
      path: 'company',
      label: 'Company / Organization',
      type: 'string',
      included: true,
      required: false,
      placeholder: 'Acme Inc.',
      fieldWidth: 'half',
    },
    {
      path: 'role',
      label: 'Your role',
      type: 'select',
      included: true,
      required: false,
      placeholder: 'Select your role',
      fieldWidth: 'half',
      validation: {
        options: [
          'Developer',
          'Data Engineer',
          'Product Manager',
          'Executive',
          'Designer',
          'Other',
        ],
      },
    },

    // Use case
    {
      path: 'useCase',
      label: 'What would you like to build?',
      type: 'textarea',
      included: true,
      required: false,
      placeholder: 'Tell us about your use case - what problems are you trying to solve?',
    },

    // Discovery
    {
      path: 'howDidYouHear',
      label: 'How did you hear about NetPad?',
      type: 'select',
      included: true,
      required: false,
      placeholder: 'Select an option',
      validation: {
        options: [
          'Social Media (Twitter/LinkedIn)',
          'Colleague or Friend',
          'Google Search',
          'Conference or Event',
          'Blog or Article',
          'Podcast',
          'Other',
        ],
      },
    },

    // Team & Timeline
    {
      path: 'teamSize',
      label: 'Team size',
      type: 'select',
      included: true,
      required: false,
      placeholder: 'Select team size',
      fieldWidth: 'half',
      validation: {
        options: ['Just me', '2-5 people', '6-20 people', '21-100 people', '100+ people'],
      },
    },
    {
      path: 'timeline',
      label: 'When do you need a solution?',
      type: 'select',
      included: true,
      required: false,
      placeholder: 'Select timeline',
      fieldWidth: 'half',
      validation: {
        options: ['Right away', 'In 1-3 months', 'In 3-6 months', 'Just exploring'],
      },
    },

    // Interests (multi-select would be ideal but using checkboxes)
    {
      path: 'interests',
      label: 'What features interest you most?',
      type: 'tags',
      included: true,
      required: false,
      placeholder: 'Select features',
      validation: {
        tagSuggestions: [
          'Form Builder',
          'Workflows',
          'AI Features',
          'MongoDB Integration',
          'Automation',
          'Marketplace',
        ],
        allowCustomTags: false,
        maxTags: 6,
      },
    },
  ],
  theme: {
    preset: 'mongodb',
    primaryColor: '#00ED64',
    secondaryColor: '#001E2B',
    backgroundColor: 'transparent',
    textColor: '#ffffff',
    textSecondaryColor: 'rgba(255, 255, 255, 0.6)',
    errorColor: '#f44336',
    successColor: '#00ED64',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    spacing: 'comfortable',
    borderRadius: 8,
    inputStyle: 'outlined',
    buttonStyle: 'contained',
    mode: 'dark',
  },
};

// Map form values to API format
export function mapFormDataToApi(data: Record<string, any>) {
  // Map dropdown values to API enum values
  const roleMap: Record<string, string> = {
    Developer: 'developer',
    'Data Engineer': 'data_engineer',
    'Product Manager': 'product_manager',
    Executive: 'executive',
    Designer: 'designer',
    Other: 'other',
  };

  const howDidYouHearMap: Record<string, string> = {
    'Social Media (Twitter/LinkedIn)': 'social_media',
    'Colleague or Friend': 'colleague',
    'Google Search': 'search',
    'Conference or Event': 'event',
    'Blog or Article': 'blog',
    Podcast: 'podcast',
    Other: 'other',
  };

  const teamSizeMap: Record<string, string> = {
    'Just me': 'solo',
    '2-5 people': '2-5',
    '6-20 people': '6-20',
    '21-100 people': '21-100',
    '100+ people': '100+',
  };

  const timelineMap: Record<string, string> = {
    'Right away': 'immediately',
    'In 1-3 months': '1-3_months',
    'In 3-6 months': '3-6_months',
    'Just exploring': 'exploring',
  };

  const interestMap: Record<string, string> = {
    'Form Builder': 'forms',
    Workflows: 'workflows',
    'AI Features': 'ai',
    'MongoDB Integration': 'mongodb',
    Automation: 'automation',
    Marketplace: 'marketplace',
  };

  return {
    email: data.email,
    name: data.name || undefined,
    company: data.company || undefined,
    useCase: data.useCase || undefined,
    role: data.role ? roleMap[data.role] : undefined,
    howDidYouHear: data.howDidYouHear ? howDidYouHearMap[data.howDidYouHear] : undefined,
    howDidYouHearOther: data.howDidYouHear === 'Other' ? data.howDidYouHearOther : undefined,
    teamSize: data.teamSize ? teamSizeMap[data.teamSize] : undefined,
    timeline: data.timeline ? timelineMap[data.timeline] : undefined,
    interests: data.interests?.map((i: string) => interestMap[i] || i.toLowerCase()),
  };
}
