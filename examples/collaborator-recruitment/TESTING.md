# Testing Guide - Collaborator Recruitment Application

This document provides test scenarios to validate the collaborator recruitment application works correctly.

## Prerequisites

- [ ] NetPad instance running locally or deployed
- [ ] MongoDB connection configured
- [ ] Email integration configured (or use mock for testing)
- [ ] Form seeded/imported and published
- [ ] Workflow activated

## Test Scenarios

### 1. Traditional Form Mode

#### 1.1 Basic Submission
**Steps:**
1. Navigate to `/collaborate`
2. Click "Form" toggle button
3. Fill in all required fields:
   - Name: "Test User"
   - Email: "test@example.com"
   - Lane: "Full-Stack Engineering"
   - Availability: "5-10 hrs/week"
   - Shipped: At least 100 characters describing a project
   - Why Interested: At least 50 characters
4. Click Submit

**Expected:**
- [ ] Form submits successfully
- [ ] Success message displayed
- [ ] Submission appears in MongoDB `collaborator_submissions`
- [ ] Email notification sent (check inbox or logs)

#### 1.2 Validation - Required Fields
**Steps:**
1. Try to submit form with empty required fields

**Expected:**
- [ ] Name field shows error if empty
- [ ] Email field shows error if empty/invalid
- [ ] Lane dropdown requires selection
- [ ] "Shipped" shows error if < 100 characters
- [ ] "Why Interested" shows error if < 50 characters

#### 1.3 Validation - Email Format
**Steps:**
1. Enter invalid email: "not-an-email"
2. Try to submit

**Expected:**
- [ ] Email validation error displayed
- [ ] Form does not submit

### 2. Conversational Mode

#### 2.1 Basic Conversation Flow
**Steps:**
1. Navigate to `/collaborate`
2. Ensure "Chat" toggle is selected (default)
3. Wait for AI welcome message
4. Respond with your name
5. Continue conversation, providing:
   - Email address
   - Area of interest
   - What you've built
   - Why you're interested
   - Availability

**Expected:**
- [ ] AI responds naturally to each message
- [ ] AI asks relevant follow-up questions
- [ ] Progress indicator shows topics being covered
- [ ] Conversation completes when sufficient info gathered
- [ ] Submission created with extracted data

#### 2.2 Transcript Capture
**Steps:**
1. Complete a full conversation (as in 2.1)
2. Check the submission in database

**Expected:**
- [ ] `conversationalData.transcript` contains all messages
- [ ] Each message has `role`, `content`, and `timestamp`
- [ ] `topicsCovered` shows which topics were addressed
- [ ] `overallConfidence` reflects extraction quality
- [ ] `turnCount` matches actual conversation length

#### 2.3 AI Persona Behavior
**Steps:**
1. Start conversation
2. Observe AI responses throughout

**Expected:**
- [ ] AI tone is friendly, not corporate
- [ ] AI asks one question at a time
- [ ] AI shows genuine curiosity about projects
- [ ] AI doesn't oversell the opportunity
- [ ] AI provides honest context about the collaboration

#### 2.4 Incomplete Conversation
**Steps:**
1. Start a conversation
2. Only provide name and email
3. Do not provide required info (shipped, why interested)
4. Wait or try to end conversation

**Expected:**
- [ ] AI continues trying to gather required information
- [ ] AI doesn't complete until minimum confidence reached
- [ ] If max turns reached, conversation ends gracefully

### 3. Mode Switching

#### 3.1 Switch from Chat to Form
**Steps:**
1. Start in Chat mode
2. Begin a conversation (provide name)
3. Click "Form" toggle

**Expected:**
- [ ] Mode switches to traditional form
- [ ] Previous conversation not carried over (clean slate)
- [ ] Form is empty and ready for input

#### 3.2 Switch from Form to Chat
**Steps:**
1. Start in Form mode
2. Fill in some fields
3. Click "Chat" toggle

**Expected:**
- [ ] Mode switches to conversational
- [ ] Form data not carried over
- [ ] Fresh conversation starts

### 4. Workflow Automation

#### 4.1 Email Notification
**Steps:**
1. Complete a submission (either mode)
2. Check owner email inbox

**Expected:**
- [ ] Email received within 1-2 minutes
- [ ] Subject includes candidate name and lane
- [ ] Body contains all submitted information
- [ ] Lane displayed as readable text (not enum value)
- [ ] Availability displayed as readable text
- [ ] Reply-to set to candidate's email

#### 4.2 MongoDB Storage
**Steps:**
1. Complete a submission
2. Query MongoDB: `db.collaborator_submissions.find().sort({submittedAt: -1}).limit(1)`

**Expected:**
- [ ] Document exists with all form fields
- [ ] `submittedAt` timestamp is accurate
- [ ] `status` is "new"
- [ ] `_meta` contains submission type metadata

### 5. Error Handling

#### 5.1 Network Error During Submission
**Steps:**
1. Fill out form
2. Disconnect network
3. Click Submit

**Expected:**
- [ ] Error message displayed
- [ ] Form data preserved
- [ ] Can retry after reconnecting

#### 5.2 AI Service Unavailable
**Steps:**
1. Start Chat mode
2. Disable OpenAI API key or mock failure
3. Send a message

**Expected:**
- [ ] Error message displayed
- [ ] User can switch to Form mode
- [ ] No crash or blank screen

### 6. Responsive Design

#### 6.1 Mobile View
**Steps:**
1. Open `/collaborate` on mobile device or responsive mode
2. Test both Chat and Form modes

**Expected:**
- [ ] Layout adapts to mobile width
- [ ] Mode toggle is accessible
- [ ] Chat bubbles readable
- [ ] Form fields usable
- [ ] Submit button accessible

#### 6.2 Dark/Light Theme
**Steps:**
1. Test page with system dark mode
2. Test page with system light mode

**Expected:**
- [ ] Colors adapt appropriately
- [ ] Text remains readable
- [ ] Form fields have proper contrast

### 7. Viewing Submissions

#### 7.1 Response List
**Steps:**
1. Create multiple submissions
2. Navigate to form responses in NetPad

**Expected:**
- [ ] All submissions listed
- [ ] Can sort by date
- [ ] Can filter by fields
- [ ] Submission type indicated (conversational vs form)

#### 7.2 Transcript Viewer
**Steps:**
1. Click on a conversational submission
2. Expand "Conversation Transcript"

**Expected:**
- [ ] Full conversation displayed
- [ ] Messages show role (User/Assistant)
- [ ] Timestamps displayed
- [ ] Topic coverage shown
- [ ] Confidence score displayed

## Performance Benchmarks

| Metric | Target | Notes |
|--------|--------|-------|
| Page load | < 2s | Initial `/collaborate` load |
| Form submission | < 1s | Traditional form submit |
| AI response | < 3s | First AI message after user input |
| SSE connection | Stable | No disconnects during conversation |

## Checklist Summary

### Before Release
- [ ] All required field validations work
- [ ] Conversational mode extracts data correctly
- [ ] Transcripts are captured when enabled
- [ ] Workflow triggers and completes
- [ ] Email notifications delivered
- [ ] Mobile responsive
- [ ] Error handling graceful

### Regression Testing
After any changes, re-test:
- [ ] Basic form submission
- [ ] Basic conversation completion
- [ ] Mode switching
- [ ] Transcript capture
- [ ] Email delivery
