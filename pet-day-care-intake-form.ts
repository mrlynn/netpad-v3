/**
 * Pet Day Care Intake Form
 * A comprehensive multi-page intake form for pet day care facilities
 *
 * Run with: npx tsx pet-day-care-intake-form.ts
 */

// ============================================================================
// Types
// ============================================================================

interface FormFieldOption {
  label: string;
  value: string;
}

interface FormFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  errorMessage?: string;
}

interface ConditionalLogicCondition {
  field: string;
  operator: string;
  value?: string | number | boolean;
}

interface ConditionalLogic {
  action: 'show' | 'hide';
  logicType: 'all' | 'any';
  conditions: ConditionalLogicCondition[];
}

interface FormField {
  path: string;
  label: string;
  type: string;
  included?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  fieldWidth?: 'full' | 'half' | 'third' | 'quarter';
  defaultValue?: unknown;
  conditionalLogic?: ConditionalLogic;
}

interface FormPage {
  id: string;
  title: string;
  description?: string;
  fields: string[];
}

interface MultiPageConfig {
  enabled: boolean;
  pages: FormPage[];
  showProgressBar?: boolean;
  showPageTitles?: boolean;
  allowSkip?: boolean;
  showReview?: boolean;
}

interface FormTheme {
  primaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  errorColor?: string;
  successColor?: string;
  borderRadius?: number;
  spacing?: 'compact' | 'comfortable' | 'spacious';
  inputStyle?: 'outlined' | 'filled' | 'standard';
  mode?: 'light' | 'dark';
}

interface FormConfig {
  name: string;
  slug?: string;
  description?: string;
  fieldConfigs: FormField[];
  submitButtonText?: string;
  successMessage?: string;
  theme?: FormTheme;
  multiPage?: MultiPageConfig;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  baseUrl: process.env.NETPAD_URL ?? 'https://api.netpad.io',
  apiKey: process.env.NETPAD_API_KEY ?? '',
  organizationId: process.env.NETPAD_ORG_ID ?? '',
  projectId: process.env.NETPAD_PROJECT_ID ?? ''
};

// ============================================================================
// Form Configuration
// ============================================================================

export const formConfig: FormConfig = {
  name: "Pet Day Care Intake Form",
  slug: "pet-day-care-intake",
  description: "Complete this form to register your pet for day care services. We collect information about you, your pet, health details, emergency contacts, and care preferences.",
  submitButtonText: "Submit Registration",
  successMessage: "Thank you for registering your pet! We'll review your information and contact you within 24 hours to schedule your pet's first visit.",

  theme: {
    primaryColor: "#4CAF50",
    backgroundColor: "#FAFAFA",
    surfaceColor: "#FFFFFF",
    textColor: "#333333",
    borderRadius: 8,
    spacing: "comfortable",
    inputStyle: "outlined",
    mode: "light"
  },

  multiPage: {
    enabled: true,
    showProgressBar: true,
    showPageTitles: true,
    allowSkip: false,
    showReview: true,
    pages: [
      {
        id: "owner-info",
        title: "Owner Information",
        description: "Tell us about yourself so we can contact you about your pet",
        fields: [
          "ownerFirstName",
          "ownerLastName",
          "ownerEmail",
          "ownerPhone",
          "ownerAddress",
          "ownerCity",
          "ownerState",
          "ownerZip"
        ]
      },
      {
        id: "pet-info",
        title: "Pet Information",
        description: "Tell us about your furry friend",
        fields: [
          "petName",
          "petSpecies",
          "petBreed",
          "petAge",
          "petWeight",
          "petGender",
          "petSpayedNeutered",
          "petColor",
          "petMicrochipped",
          "microchipNumber"
        ]
      },
      {
        id: "health-info",
        title: "Health & Medical",
        description: "Help us understand your pet's health needs",
        fields: [
          "vetName",
          "vetPhone",
          "vaccinationsUpToDate",
          "rabiesExpiration",
          "distemperExpiration",
          "bordatellaExpiration",
          "medicalConditions",
          "medications",
          "allergies",
          "dietaryRestrictions"
        ]
      },
      {
        id: "emergency-care",
        title: "Emergency Contact & Care Preferences",
        description: "Provide emergency contact and care instructions",
        fields: [
          "emergencyContactName",
          "emergencyContactPhone",
          "emergencyContactRelation",
          "feedingInstructions",
          "feedingSchedule",
          "exercisePreferences",
          "behaviorNotes",
          "socializationLevel",
          "fearsTriggers",
          "specialInstructions"
        ]
      },
      {
        id: "agreement",
        title: "Agreement & Consent",
        description: "Review and provide your consent",
        fields: [
          "photoRelease",
          "medicalAuthorization",
          "liabilityWaiver",
          "termsAccepted",
          "ownerSignature",
          "signatureDate"
        ]
      }
    ]
  },

  fieldConfigs: [
    // ========== Page 1: Owner Information ==========
    {
      path: "ownerFirstName",
      label: "First Name",
      type: "short_text",
      required: true,
      placeholder: "Enter your first name",
      fieldWidth: "half",
      validation: {
        minLength: 2,
        maxLength: 50
      }
    },
    {
      path: "ownerLastName",
      label: "Last Name",
      type: "short_text",
      required: true,
      placeholder: "Enter your last name",
      fieldWidth: "half",
      validation: {
        minLength: 2,
        maxLength: 50
      }
    },
    {
      path: "ownerEmail",
      label: "Email Address",
      type: "email",
      required: true,
      placeholder: "you@example.com",
      helpText: "We'll use this to send updates about your pet",
      fieldWidth: "half"
    },
    {
      path: "ownerPhone",
      label: "Phone Number",
      type: "phone",
      required: true,
      placeholder: "(555) 123-4567",
      helpText: "Best number to reach you during the day",
      fieldWidth: "half"
    },
    {
      path: "ownerAddress",
      label: "Street Address",
      type: "short_text",
      required: true,
      placeholder: "123 Main Street",
      fieldWidth: "full"
    },
    {
      path: "ownerCity",
      label: "City",
      type: "short_text",
      required: true,
      placeholder: "City",
      fieldWidth: "half"
    },
    {
      path: "ownerState",
      label: "State",
      type: "dropdown",
      required: true,
      fieldWidth: "quarter",
      options: [
        { label: "Alabama", value: "AL" },
        { label: "Alaska", value: "AK" },
        { label: "Arizona", value: "AZ" },
        { label: "Arkansas", value: "AR" },
        { label: "California", value: "CA" },
        { label: "Colorado", value: "CO" },
        { label: "Connecticut", value: "CT" },
        { label: "Delaware", value: "DE" },
        { label: "Florida", value: "FL" },
        { label: "Georgia", value: "GA" },
        { label: "Hawaii", value: "HI" },
        { label: "Idaho", value: "ID" },
        { label: "Illinois", value: "IL" },
        { label: "Indiana", value: "IN" },
        { label: "Iowa", value: "IA" },
        { label: "Kansas", value: "KS" },
        { label: "Kentucky", value: "KY" },
        { label: "Louisiana", value: "LA" },
        { label: "Maine", value: "ME" },
        { label: "Maryland", value: "MD" },
        { label: "Massachusetts", value: "MA" },
        { label: "Michigan", value: "MI" },
        { label: "Minnesota", value: "MN" },
        { label: "Mississippi", value: "MS" },
        { label: "Missouri", value: "MO" },
        { label: "Montana", value: "MT" },
        { label: "Nebraska", value: "NE" },
        { label: "Nevada", value: "NV" },
        { label: "New Hampshire", value: "NH" },
        { label: "New Jersey", value: "NJ" },
        { label: "New Mexico", value: "NM" },
        { label: "New York", value: "NY" },
        { label: "North Carolina", value: "NC" },
        { label: "North Dakota", value: "ND" },
        { label: "Ohio", value: "OH" },
        { label: "Oklahoma", value: "OK" },
        { label: "Oregon", value: "OR" },
        { label: "Pennsylvania", value: "PA" },
        { label: "Rhode Island", value: "RI" },
        { label: "South Carolina", value: "SC" },
        { label: "South Dakota", value: "SD" },
        { label: "Tennessee", value: "TN" },
        { label: "Texas", value: "TX" },
        { label: "Utah", value: "UT" },
        { label: "Vermont", value: "VT" },
        { label: "Virginia", value: "VA" },
        { label: "Washington", value: "WA" },
        { label: "West Virginia", value: "WV" },
        { label: "Wisconsin", value: "WI" },
        { label: "Wyoming", value: "WY" }
      ]
    },
    {
      path: "ownerZip",
      label: "ZIP Code",
      type: "short_text",
      required: true,
      placeholder: "12345",
      fieldWidth: "quarter",
      validation: {
        pattern: "^\\d{5}(-\\d{4})?$",
        errorMessage: "Please enter a valid ZIP code"
      }
    },

    // ========== Page 2: Pet Information ==========
    {
      path: "petName",
      label: "Pet's Name",
      type: "short_text",
      required: true,
      placeholder: "What do you call your pet?",
      fieldWidth: "half"
    },
    {
      path: "petSpecies",
      label: "Species",
      type: "dropdown",
      required: true,
      fieldWidth: "half",
      options: [
        { label: "Dog", value: "dog" },
        { label: "Cat", value: "cat" },
        { label: "Other", value: "other" }
      ]
    },
    {
      path: "petBreed",
      label: "Breed",
      type: "short_text",
      required: true,
      placeholder: "e.g., Golden Retriever, Mixed",
      helpText: "If mixed, list the primary breeds",
      fieldWidth: "half"
    },
    {
      path: "petAge",
      label: "Age",
      type: "short_text",
      required: true,
      placeholder: "e.g., 2 years, 6 months",
      fieldWidth: "quarter"
    },
    {
      path: "petWeight",
      label: "Weight (lbs)",
      type: "number",
      required: true,
      placeholder: "Weight in pounds",
      fieldWidth: "quarter",
      validation: {
        min: 1,
        max: 300
      }
    },
    {
      path: "petGender",
      label: "Gender",
      type: "radio",
      required: true,
      fieldWidth: "half",
      options: [
        { label: "Male", value: "male" },
        { label: "Female", value: "female" }
      ]
    },
    {
      path: "petSpayedNeutered",
      label: "Spayed/Neutered?",
      type: "radio",
      required: true,
      fieldWidth: "half",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" }
      ]
    },
    {
      path: "petColor",
      label: "Color/Markings",
      type: "short_text",
      required: false,
      placeholder: "e.g., Black with white chest",
      fieldWidth: "half"
    },
    {
      path: "petMicrochipped",
      label: "Is your pet microchipped?",
      type: "radio",
      required: true,
      fieldWidth: "half",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" }
      ]
    },
    {
      path: "microchipNumber",
      label: "Microchip Number",
      type: "short_text",
      required: false,
      placeholder: "Enter microchip ID number",
      fieldWidth: "half",
      conditionalLogic: {
        action: "show",
        logicType: "all",
        conditions: [
          { field: "petMicrochipped", operator: "equals", value: "yes" }
        ]
      }
    },

    // ========== Page 3: Health & Medical ==========
    {
      path: "vetName",
      label: "Veterinarian/Clinic Name",
      type: "short_text",
      required: true,
      placeholder: "Name of your vet or clinic",
      fieldWidth: "half"
    },
    {
      path: "vetPhone",
      label: "Vet Phone Number",
      type: "phone",
      required: true,
      placeholder: "(555) 123-4567",
      fieldWidth: "half"
    },
    {
      path: "vaccinationsUpToDate",
      label: "Are all vaccinations up to date?",
      type: "radio",
      required: true,
      fieldWidth: "full",
      helpText: "We require proof of current vaccinations before the first visit",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No - I will provide updated records", value: "no" }
      ]
    },
    {
      path: "rabiesExpiration",
      label: "Rabies Vaccination Expiration",
      type: "date",
      required: true,
      fieldWidth: "third"
    },
    {
      path: "distemperExpiration",
      label: "Distemper/Parvo Expiration",
      type: "date",
      required: true,
      fieldWidth: "third"
    },
    {
      path: "bordatellaExpiration",
      label: "Bordetella Expiration",
      type: "date",
      required: true,
      fieldWidth: "third",
      helpText: "Required for dogs attending day care"
    },
    {
      path: "medicalConditions",
      label: "Medical Conditions",
      type: "long_text",
      required: false,
      placeholder: "List any medical conditions, past surgeries, or ongoing health issues",
      helpText: "Include conditions like diabetes, epilepsy, hip dysplasia, etc.",
      fieldWidth: "full"
    },
    {
      path: "medications",
      label: "Current Medications",
      type: "long_text",
      required: false,
      placeholder: "List all medications, dosages, and administration times",
      helpText: "We can administer medications for an additional fee",
      fieldWidth: "full"
    },
    {
      path: "allergies",
      label: "Allergies",
      type: "long_text",
      required: false,
      placeholder: "List any known allergies (food, environmental, medications)",
      fieldWidth: "half"
    },
    {
      path: "dietaryRestrictions",
      label: "Dietary Restrictions",
      type: "long_text",
      required: false,
      placeholder: "Special diet requirements or food restrictions",
      fieldWidth: "half"
    },

    // ========== Page 4: Emergency & Care Preferences ==========
    {
      path: "emergencyContactName",
      label: "Emergency Contact Name",
      type: "short_text",
      required: true,
      placeholder: "Full name",
      helpText: "Someone we can contact if we can't reach you",
      fieldWidth: "half"
    },
    {
      path: "emergencyContactPhone",
      label: "Emergency Contact Phone",
      type: "phone",
      required: true,
      placeholder: "(555) 123-4567",
      fieldWidth: "half"
    },
    {
      path: "emergencyContactRelation",
      label: "Relationship to You",
      type: "short_text",
      required: true,
      placeholder: "e.g., Spouse, Parent, Friend",
      fieldWidth: "half"
    },
    {
      path: "feedingInstructions",
      label: "Feeding Instructions",
      type: "long_text",
      required: false,
      placeholder: "Describe your pet's food type, amount, and any special instructions",
      helpText: "Include brand, amount, and any mixing instructions",
      fieldWidth: "full"
    },
    {
      path: "feedingSchedule",
      label: "Feeding Schedule",
      type: "checkbox",
      required: false,
      fieldWidth: "full",
      helpText: "Select all times your pet typically eats",
      options: [
        { label: "Morning (before 9am)", value: "morning" },
        { label: "Midday (11am-1pm)", value: "midday" },
        { label: "Afternoon (3-5pm)", value: "afternoon" },
        { label: "Evening (after 5pm)", value: "evening" },
        { label: "Free feeding", value: "free" }
      ]
    },
    {
      path: "exercisePreferences",
      label: "Exercise Level",
      type: "dropdown",
      required: true,
      fieldWidth: "half",
      options: [
        { label: "High - Loves to run and play constantly", value: "high" },
        { label: "Moderate - Enjoys regular activity with rest breaks", value: "moderate" },
        { label: "Low - Prefers calm activities and lounging", value: "low" },
        { label: "Limited - Has mobility issues or health restrictions", value: "limited" }
      ]
    },
    {
      path: "socializationLevel",
      label: "Socialization with Other Pets",
      type: "dropdown",
      required: true,
      fieldWidth: "half",
      options: [
        { label: "Very social - Loves all animals", value: "very_social" },
        { label: "Selective - Gets along with some pets", value: "selective" },
        { label: "Cautious - Needs slow introductions", value: "cautious" },
        { label: "Prefers solo - Better alone", value: "solo" }
      ]
    },
    {
      path: "behaviorNotes",
      label: "Behavior Notes",
      type: "long_text",
      required: false,
      placeholder: "Describe your pet's temperament, any behavioral concerns, or special needs",
      helpText: "Include information about resource guarding, separation anxiety, etc.",
      fieldWidth: "full"
    },
    {
      path: "fearsTriggers",
      label: "Known Fears or Triggers",
      type: "long_text",
      required: false,
      placeholder: "List things that scare or upset your pet (e.g., loud noises, men with hats, vacuums)",
      fieldWidth: "full"
    },
    {
      path: "specialInstructions",
      label: "Special Instructions",
      type: "long_text",
      required: false,
      placeholder: "Any other important information we should know about caring for your pet",
      fieldWidth: "full"
    },

    // ========== Page 5: Agreement & Consent ==========
    {
      path: "photoRelease",
      label: "Photo/Video Release",
      type: "checkbox",
      required: false,
      fieldWidth: "full",
      helpText: "We love sharing photos of our guests on social media!",
      options: [
        { label: "I give permission to photograph/video my pet for promotional purposes", value: "granted" }
      ]
    },
    {
      path: "medicalAuthorization",
      label: "Medical Authorization",
      type: "checkbox",
      required: true,
      fieldWidth: "full",
      options: [
        { label: "In case of emergency, I authorize the staff to seek veterinary care for my pet. I understand I am responsible for all veterinary costs incurred.", value: "authorized" }
      ]
    },
    {
      path: "liabilityWaiver",
      label: "Liability Waiver",
      type: "checkbox",
      required: true,
      fieldWidth: "full",
      options: [
        { label: "I understand that while every precaution is taken, I release the facility from liability for any injury, illness, or property damage that may occur during my pet's stay.", value: "accepted" }
      ]
    },
    {
      path: "termsAccepted",
      label: "Terms and Conditions",
      type: "checkbox",
      required: true,
      fieldWidth: "full",
      options: [
        { label: "I have read and agree to the facility's Terms and Conditions, including the cancellation policy and house rules.", value: "accepted" }
      ]
    },
    {
      path: "ownerSignature",
      label: "Owner Signature (Type Full Name)",
      type: "short_text",
      required: true,
      placeholder: "Type your full legal name as signature",
      helpText: "By typing your name, you are electronically signing this form",
      fieldWidth: "half"
    },
    {
      path: "signatureDate",
      label: "Date",
      type: "date",
      required: true,
      fieldWidth: "half",
      defaultValue: new Date().toISOString().split('T')[0]
    }
  ]
};

// ============================================================================
// API Functions
// ============================================================================

interface SubmitResult {
  success: boolean;
  submissionId?: string;
  error?: string;
}

/**
 * Submit form data to the NetPad API
 */
export async function submitForm(data: Record<string, unknown>): Promise<SubmitResult> {
  try {
    const response = await fetch(
      `${CONFIG.baseUrl}/api/forms/${formConfig.slug}/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.apiKey}`
        },
        body: JSON.stringify({ data })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const result = await response.json() as { submissionId: string };
    return { success: true, submissionId: result.submissionId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create the form in NetPad
 */
export async function createForm(): Promise<{ formId: string } | { error: string }> {
  try {
    const response = await fetch(`${CONFIG.baseUrl}/api/forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.apiKey}`
      },
      body: JSON.stringify({
        ...formConfig,
        organizationId: CONFIG.organizationId,
        projectId: CONFIG.projectId
      })
    });

    if (!response.ok) {
      return { error: await response.text() };
    }

    const result = await response.json() as { form: { formId: string } };
    return { formId: result.form.formId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log('🐾 Pet Day Care Intake Form');
  console.log('============================\n');
  console.log('Form Name:', formConfig.name);
  console.log('Slug:', formConfig.slug);
  console.log('Pages:', formConfig.multiPage?.pages.length);
  console.log('Total Fields:', formConfig.fieldConfigs.length);
  console.log('\nPages:');
  formConfig.multiPage?.pages.forEach((page, i) => {
    console.log(`  ${i + 1}. ${page.title} (${page.fields.length} fields)`);
  });

  console.log('\n📋 Form configuration exported successfully!');
  console.log('\nTo create this form in NetPad:');
  console.log('1. Set your environment variables:');
  console.log('   export NETPAD_URL="https://api.netpad.io"');
  console.log('   export NETPAD_API_KEY="your-api-key"');
  console.log('   export NETPAD_ORG_ID="your-org-id"');
  console.log('   export NETPAD_PROJECT_ID="your-project-id"');
  console.log('\n2. Uncomment the createForm() call below and run:');
  console.log('   npx tsx pet-day-care-intake-form.ts');

  // Uncomment to create the form:
  // const result = await createForm();
  // if ('error' in result) {
  //   console.error('Failed to create form:', result.error);
  // } else {
  //   console.log('✅ Form created with ID:', result.formId);
  // }
}

main().catch(console.error);

// Export for use as a module
export default formConfig;
