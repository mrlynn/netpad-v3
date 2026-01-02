'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Container, Paper, Typography, Alert } from '@mui/material';
import { FormRenderer, FormConfiguration } from '@netpad/forms';

// Define the Employee Onboarding form configuration
const onboardingFormConfig: FormConfiguration = {
  name: 'Employee Onboarding',
  description: 'Complete your onboarding information',
  fieldConfigs: [
    // Page 1: Personal Information
    {
      path: '_section_personal',
      label: '',
      type: 'layout',
      included: true,
      layout: { type: 'section-header', title: 'Personal Information', subtitle: 'Tell us about yourself' },
    },
    {
      path: 'firstName',
      label: 'First Name',
      type: 'short_text',
      included: true,
      required: true,
      fieldWidth: 'half',
      placeholder: 'Enter your first name',
    },
    {
      path: 'lastName',
      label: 'Last Name',
      type: 'short_text',
      included: true,
      required: true,
      fieldWidth: 'half',
      placeholder: 'Enter your last name',
    },
    {
      path: 'email',
      label: 'Personal Email',
      type: 'email',
      included: true,
      required: true,
      placeholder: 'your.email@example.com',
      helpText: 'We\'ll use this to send you important updates',
    },
    {
      path: 'phone',
      label: 'Phone Number',
      type: 'phone',
      included: true,
      required: true,
      placeholder: '(555) 123-4567',
    },
    {
      path: 'dateOfBirth',
      label: 'Date of Birth',
      type: 'date',
      included: true,
      required: true,
    },

    // Page 2: Employment Details
    {
      path: '_section_employment',
      label: '',
      type: 'layout',
      included: true,
      layout: { type: 'section-header', title: 'Employment Details', subtitle: 'Information about your role' },
    },
    {
      path: 'department',
      label: 'Department',
      type: 'dropdown',
      included: true,
      required: true,
      options: [
        { label: 'Engineering', value: 'engineering' },
        { label: 'Product', value: 'product' },
        { label: 'Design', value: 'design' },
        { label: 'Marketing', value: 'marketing' },
        { label: 'Sales', value: 'sales' },
        { label: 'Human Resources', value: 'hr' },
        { label: 'Finance', value: 'finance' },
        { label: 'Operations', value: 'operations' },
      ],
    },
    {
      path: 'jobTitle',
      label: 'Job Title',
      type: 'short_text',
      included: true,
      required: true,
      placeholder: 'e.g., Software Engineer',
    },
    {
      path: 'startDate',
      label: 'Start Date',
      type: 'date',
      included: true,
      required: true,
    },
    {
      path: 'employmentType',
      label: 'Employment Type',
      type: 'multiple_choice',
      included: true,
      required: true,
      options: [
        { label: 'Full-time', value: 'full-time' },
        { label: 'Part-time', value: 'part-time' },
        { label: 'Contract', value: 'contract' },
        { label: 'Intern', value: 'intern' },
      ],
    },
    {
      path: 'workLocation',
      label: 'Work Location',
      type: 'multiple_choice',
      included: true,
      required: true,
      options: [
        { label: 'Remote', value: 'remote' },
        { label: 'Hybrid', value: 'hybrid' },
        { label: 'On-site', value: 'onsite' },
      ],
    },
    {
      path: 'officeLocation',
      label: 'Office Location',
      type: 'dropdown',
      included: true,
      options: [
        { label: 'New York, NY', value: 'nyc' },
        { label: 'San Francisco, CA', value: 'sf' },
        { label: 'Austin, TX', value: 'austin' },
        { label: 'Seattle, WA', value: 'seattle' },
        { label: 'London, UK', value: 'london' },
      ],
      conditionalLogic: {
        action: 'show',
        logicType: 'any',
        conditions: [
          { field: 'workLocation', operator: 'equals', value: 'hybrid' },
          { field: 'workLocation', operator: 'equals', value: 'onsite' },
        ],
      },
    },

    // Page 3: Emergency Contact & Preferences
    {
      path: '_section_emergency',
      label: '',
      type: 'layout',
      included: true,
      layout: { type: 'section-header', title: 'Emergency Contact', subtitle: 'Who should we contact in case of emergency?' },
    },
    {
      path: 'emergencyContact.name',
      label: 'Emergency Contact Name',
      type: 'short_text',
      included: true,
      required: true,
      placeholder: 'Full name',
    },
    {
      path: 'emergencyContact.relationship',
      label: 'Relationship',
      type: 'dropdown',
      included: true,
      required: true,
      options: [
        { label: 'Spouse/Partner', value: 'spouse' },
        { label: 'Parent', value: 'parent' },
        { label: 'Sibling', value: 'sibling' },
        { label: 'Friend', value: 'friend' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      path: 'emergencyContact.phone',
      label: 'Emergency Contact Phone',
      type: 'phone',
      included: true,
      required: true,
      placeholder: '(555) 123-4567',
    },
    {
      path: '_section_preferences',
      label: '',
      type: 'layout',
      included: true,
      layout: { type: 'section-header', title: 'Preferences', subtitle: 'Help us set up your workspace' },
    },
    {
      path: 'tshirtSize',
      label: 'T-Shirt Size',
      type: 'dropdown',
      included: true,
      options: [
        { label: 'XS', value: 'xs' },
        { label: 'S', value: 's' },
        { label: 'M', value: 'm' },
        { label: 'L', value: 'l' },
        { label: 'XL', value: 'xl' },
        { label: 'XXL', value: 'xxl' },
      ],
      helpText: 'For company swag!',
    },
    {
      path: 'dietaryRestrictions',
      label: 'Dietary Restrictions',
      type: 'checkboxes',
      included: true,
      options: [
        { label: 'Vegetarian', value: 'vegetarian' },
        { label: 'Vegan', value: 'vegan' },
        { label: 'Gluten-free', value: 'gluten-free' },
        { label: 'Kosher', value: 'kosher' },
        { label: 'Halal', value: 'halal' },
        { label: 'None', value: 'none' },
      ],
    },
    {
      path: 'bio',
      label: 'Short Bio',
      type: 'long_text',
      included: true,
      placeholder: 'Tell your new colleagues a bit about yourself...',
      helpText: 'This will be shared in our team directory',
      validation: {
        maxLength: 500,
      },
    },
    {
      path: 'agreeToTerms',
      label: 'I acknowledge that the information provided is accurate and I agree to the company policies',
      type: 'yes_no',
      included: true,
      required: true,
    },
  ],
  multiPage: {
    enabled: true,
    showProgressBar: true,
    pages: [
      {
        id: 'personal',
        title: 'Personal Info',
        description: 'Your basic information',
        fields: ['_section_personal', 'firstName', 'lastName', 'email', 'phone', 'dateOfBirth'],
      },
      {
        id: 'employment',
        title: 'Employment',
        description: 'Your role details',
        fields: ['_section_employment', 'department', 'jobTitle', 'startDate', 'employmentType', 'workLocation', 'officeLocation'],
      },
      {
        id: 'additional',
        title: 'Additional Info',
        description: 'Emergency contact & preferences',
        fields: [
          '_section_emergency',
          'emergencyContact.name',
          'emergencyContact.relationship',
          'emergencyContact.phone',
          '_section_preferences',
          'tshirtSize',
          'dietaryRestrictions',
          'bio',
          'agreeToTerms',
        ],
      },
    ],
  },
  submitButtonText: 'Complete Onboarding',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      // In a real app, you would send this to your backend
      console.log('Onboarding data submitted:', data);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate a fake submission ID and redirect to success page
      const submissionId = `ONB-${Date.now().toString(36).toUpperCase()}`;
      router.push(`/success?id=${submissionId}&name=${encodeURIComponent(data.firstName as string)}`);
    } catch (err) {
      setError('Failed to submit onboarding data. Please try again.');
      console.error(err);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: 4,
        background: 'linear-gradient(135deg, #001E2B 0%, #00303F 100%)',
      }}
    >
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold" textAlign="center">
            Employee Onboarding
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
            Welcome to the team! Please complete the following information.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <FormRenderer
            config={onboardingFormConfig}
            onSubmit={handleSubmit}
            mode="create"
          />
        </Paper>
      </Container>
    </Box>
  );
}
