/**
 * Patient Intake Template
 *
 * Pre-configured template for medical/healthcare patient intake conversations.
 */

import { ConversationTemplate } from './types';
import { ConversationTopic, ExtractionSchema } from '@/types/conversational';
import { DefaultPromptStrategy } from '../strategies/prompt';

/**
 * Patient Intake topics
 */
export const PATIENT_INTAKE_TOPICS: ConversationTopic[] = [
  {
    id: 'chief-complaint',
    name: 'Chief Complaint',
    description:
      'Understand the main reason for the visit - primary symptoms or concerns',
    priority: 'required',
    depth: 'deep',
    extractionField: 'chiefComplaint',
  },
  {
    id: 'symptom-details',
    name: 'Symptom Details',
    description:
      'Get detailed information about symptoms: duration, severity, triggers, what makes it better or worse',
    priority: 'required',
    depth: 'deep',
    extractionField: 'symptomDetails',
  },
  {
    id: 'medical-history',
    name: 'Relevant Medical History',
    description:
      'Any relevant medical history, current medications, or allergies',
    priority: 'important',
    depth: 'moderate',
    extractionField: 'medicalHistory',
  },
  {
    id: 'urgency-assessment',
    name: 'Urgency Assessment',
    description:
      'Assess the urgency of the situation to prioritize care appropriately',
    priority: 'required',
    depth: 'surface',
    extractionField: 'urgencyLevel',
  },
  {
    id: 'appointment-preferences',
    name: 'Appointment Preferences',
    description:
      'Preferred appointment times and any scheduling constraints',
    priority: 'optional',
    depth: 'surface',
    extractionField: 'appointmentPreferences',
  },
];

/**
 * Patient Intake extraction schema
 */
export const PATIENT_INTAKE_SCHEMA: ExtractionSchema[] = [
  {
    field: 'chiefComplaint',
    type: 'string',
    required: true,
    description: 'Primary reason for the visit',
    validation: { minLength: 10 },
    topicId: 'chief-complaint',
  },
  {
    field: 'symptomDetails',
    type: 'string',
    required: true,
    description: 'Detailed description of symptoms',
    validation: { minLength: 30 },
    topicId: 'symptom-details',
  },
  {
    field: 'symptomDuration',
    type: 'string',
    required: false,
    description: 'How long symptoms have been present',
  },
  {
    field: 'symptomSeverity',
    type: 'enum',
    required: false,
    description: 'Severity of symptoms',
    options: ['mild', 'moderate', 'severe'],
  },
  {
    field: 'medicalHistory',
    type: 'string',
    required: false,
    description: 'Relevant medical history',
    topicId: 'medical-history',
  },
  {
    field: 'currentMedications',
    type: 'array',
    required: false,
    description: 'List of current medications',
  },
  {
    field: 'allergies',
    type: 'array',
    required: false,
    description: 'Known allergies',
  },
  {
    field: 'urgencyLevel',
    type: 'enum',
    required: true,
    description: 'How urgent the situation appears',
    options: ['routine', 'soon', 'urgent', 'emergency'],
    topicId: 'urgency-assessment',
  },
  {
    field: 'appointmentPreferences',
    type: 'string',
    required: false,
    description: 'Preferred appointment times',
    topicId: 'appointment-preferences',
  },
];

/**
 * Patient Intake Template Definition
 */
export const patientIntakeTemplate: ConversationTemplate = {
  id: 'patient-intake',
  name: 'Patient Intake',
  description: 'Gather patient information for healthcare appointments',
  category: 'intake',
  icon: 'MedicalServices',
  version: '1.0.0',
  isBuiltIn: true,

  promptStrategy: new DefaultPromptStrategy(),

  defaultConfig: {
    objective:
      'Gather preliminary patient information to help healthcare providers prepare for the appointment and assess urgency.',
    context:
      'This is a healthcare patient intake conversation. Be empathetic, thorough, and respectful of patient privacy.',
    persona: {
      style: 'empathetic',
      tone: 'caring and professional',
      behaviors: [
        'Show empathy for health concerns',
        'Ask clarifying questions about symptoms',
        'Be thorough but not overwhelming',
        'Reassure patients while gathering information',
      ],
      restrictions: [
        'Do not provide medical advice or diagnoses',
        'Do not ask for sensitive information beyond what is needed',
        'Do not minimize patient concerns',
        'Recommend emergency services for severe symptoms',
      ],
    },
    conversationLimits: {
      maxTurns: 15,
      maxDuration: 25,
      minConfidence: 0.8,
    },
  },

  defaultTopics: PATIENT_INTAKE_TOPICS,
  defaultSchema: PATIENT_INTAKE_SCHEMA,

  metadata: {
    previewDescription:
      'Ideal for healthcare settings. Gathers chief complaint, symptom details, medical history, and urgency assessment.',
    useCases: [
      'Medical appointment intake',
      'Telehealth pre-screening',
      'Clinic check-in',
      'Healthcare surveys',
    ],
    tags: ['healthcare', 'medical', 'intake', 'patient'],
    estimatedDuration: 5,
    author: 'NetPad',
    updatedAt: new Date('2026-01-07'),
  },
};

export default patientIntakeTemplate;
