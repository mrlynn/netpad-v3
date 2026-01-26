/**
 * NetPad Google Forms Add-on
 *
 * This add-on allows users to export Google Forms definitions
 * and responses directly to NetPad.
 *
 * @see https://docs.netpad.io/integrations/google-forms
 */

// ============================================
// Constants
// ============================================

const NETPAD_API_BASE = 'https://netpad.io/api';
const PROPERTY_API_KEY = 'netpad_api_key';
const PROPERTY_ORG_ID = 'netpad_org_id';
const PROPERTY_DEFAULT_PROJECT = 'netpad_default_project';

// ============================================
// Add-on Lifecycle
// ============================================

/**
 * Runs when the add-on is installed
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Runs when the form is opened
 */
function onOpen(e) {
  FormApp.getUi()
    .createAddonMenu()
    .addItem('Export to NetPad', 'showExportSidebar')
    .addItem('Export Responses', 'showExportResponsesSidebar')
    .addSeparator()
    .addItem('Settings', 'showSettingsSidebar')
    .addToUi();
}

/**
 * Homepage trigger for Google Workspace Add-on card UI
 */
function onHomepage(e) {
  return createHomepageCard();
}

/**
 * Forms-specific homepage trigger
 */
function onFormsHomepage(e) {
  return createHomepageCard();
}

// ============================================
// Sidebar Functions
// ============================================

/**
 * Show the export sidebar
 */
function showExportSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('ExportSidebar')
    .setTitle('Export to NetPad')
    .setWidth(300);
  FormApp.getUi().showSidebar(html);
}

/**
 * Show the export responses sidebar
 */
function showExportResponsesSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('ExportResponsesSidebar')
    .setTitle('Export Responses')
    .setWidth(300);
  FormApp.getUi().showSidebar(html);
}

/**
 * Show the settings sidebar
 */
function showSettingsSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('SettingsSidebar')
    .setTitle('NetPad Settings')
    .setWidth(300);
  FormApp.getUi().showSidebar(html);
}

/**
 * Show settings (universal action)
 */
function showSettings(e) {
  return createSettingsCard();
}

// ============================================
// Card UI (for Workspace Add-on)
// ============================================

/**
 * Create the homepage card
 */
function createHomepageCard() {
  const form = FormApp.getActiveForm();
  const hasApiKey = !!getUserProperty(PROPERTY_API_KEY);

  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('NetPad Forms Exporter')
      .setImageUrl('https://netpad.io/logo-icon.png')
      .setImageStyle(CardService.ImageStyle.CIRCLE));

  if (!hasApiKey) {
    // Show setup section
    card.addSection(CardService.newCardSection()
      .setHeader('Setup Required')
      .addWidget(CardService.newTextParagraph()
        .setText('Connect your NetPad account to start exporting forms.'))
      .addWidget(CardService.newTextButton()
        .setText('Configure API Key')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('showSettings'))));
  } else if (form) {
    // Show form info and export options
    const itemCount = form.getItems().length;
    const responseCount = form.getResponses().length;

    card.addSection(CardService.newCardSection()
      .setHeader('Current Form')
      .addWidget(CardService.newKeyValue()
        .setTopLabel('Title')
        .setContent(form.getTitle() || 'Untitled Form'))
      .addWidget(CardService.newKeyValue()
        .setTopLabel('Questions')
        .setContent(String(itemCount)))
      .addWidget(CardService.newKeyValue()
        .setTopLabel('Responses')
        .setContent(String(responseCount))));

    card.addSection(CardService.newCardSection()
      .setHeader('Export Options')
      .addWidget(CardService.newTextButton()
        .setText('Export Form Definition')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('exportFormDefinition')))
      .addWidget(CardService.newTextButton()
        .setText('Export Responses')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('exportFormResponses'))));
  } else {
    card.addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('Open a Google Form to export it to NetPad.')));
  }

  return card.build();
}

/**
 * Create the settings card
 */
function createSettingsCard() {
  const apiKey = getUserProperty(PROPERTY_API_KEY) || '';
  const orgId = getUserProperty(PROPERTY_ORG_ID) || '';

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('NetPad Settings'))
    .addSection(CardService.newCardSection()
      .setHeader('API Configuration')
      .addWidget(CardService.newTextParagraph()
        .setText('Enter your NetPad API key to connect your account. You can find your API key in NetPad under Settings > API Keys.'))
      .addWidget(CardService.newTextInput()
        .setFieldName('apiKey')
        .setTitle('API Key')
        .setValue(apiKey ? '********' + apiKey.slice(-4) : '')
        .setHint('Your NetPad API key'))
      .addWidget(CardService.newTextInput()
        .setFieldName('orgId')
        .setTitle('Organization ID')
        .setValue(orgId)
        .setHint('Your NetPad organization ID'))
      .addWidget(CardService.newTextButton()
        .setText('Save Settings')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('saveSettings'))))
    .build();
}

// ============================================
// Form Definition Extraction
// ============================================

/**
 * Get the complete form definition
 */
function getFormDefinition() {
  const form = FormApp.getActiveForm();
  if (!form) {
    throw new Error('No active form found');
  }

  const items = form.getItems();

  return {
    sourceId: form.getId(),
    sourcePlatform: 'google_forms',
    title: form.getTitle(),
    description: form.getDescription(),
    confirmationMessage: form.getConfirmationMessage(),
    isQuiz: form.isQuiz(),
    collectEmail: form.collectsEmail(),
    allowResponseEdits: form.canEditResponse(),
    limitOneResponse: form.isLimitOneResponsePerUser(),
    shuffleQuestions: form.getShuffleQuestions(),
    items: items.map(item => extractItemDefinition(item)),
    metadata: {
      editUrl: form.getEditUrl(),
      publishedUrl: form.getPublishedUrl(),
      summaryUrl: form.getSummaryUrl(),
      responseCount: form.getResponses().length,
      exportedAt: new Date().toISOString(),
      exportedBy: Session.getActiveUser().getEmail()
    }
  };
}

/**
 * Extract definition from a form item
 */
function extractItemDefinition(item) {
  const baseItem = {
    id: String(item.getId()),
    title: item.getTitle(),
    helpText: item.getHelpText(),
    type: item.getType().toString(),
    index: item.getIndex()
  };

  // Handle different item types
  switch (item.getType()) {
    case FormApp.ItemType.TEXT:
      return extractTextItem(item.asTextItem(), baseItem);

    case FormApp.ItemType.PARAGRAPH_TEXT:
      return extractParagraphItem(item.asParagraphTextItem(), baseItem);

    case FormApp.ItemType.MULTIPLE_CHOICE:
      return extractMultipleChoiceItem(item.asMultipleChoiceItem(), baseItem);

    case FormApp.ItemType.CHECKBOX:
      return extractCheckboxItem(item.asCheckboxItem(), baseItem);

    case FormApp.ItemType.LIST:
      return extractListItem(item.asListItem(), baseItem);

    case FormApp.ItemType.SCALE:
      return extractScaleItem(item.asScaleItem(), baseItem);

    case FormApp.ItemType.GRID:
      return extractGridItem(item.asGridItem(), baseItem);

    case FormApp.ItemType.CHECKBOX_GRID:
      return extractCheckboxGridItem(item.asCheckboxGridItem(), baseItem);

    case FormApp.ItemType.DATE:
      return extractDateItem(item.asDateItem(), baseItem);

    case FormApp.ItemType.TIME:
      return extractTimeItem(item.asTimeItem(), baseItem);

    case FormApp.ItemType.DATETIME:
      return extractDateTimeItem(item.asDateTimeItem(), baseItem);

    case FormApp.ItemType.DURATION:
      return extractDurationItem(item.asDurationItem(), baseItem);

    case FormApp.ItemType.PAGE_BREAK:
      return extractPageBreakItem(item.asPageBreakItem(), baseItem);

    case FormApp.ItemType.SECTION_HEADER:
      return extractSectionHeaderItem(item.asSectionHeaderItem(), baseItem);

    case FormApp.ItemType.IMAGE:
      return extractImageItem(item.asImageItem(), baseItem);

    case FormApp.ItemType.VIDEO:
      return extractVideoItem(item.asVideoItem(), baseItem);

    case FormApp.ItemType.FILE_UPLOAD:
      return extractFileUploadItem(item.asFileUploadItem(), baseItem);

    default:
      return baseItem;
  }
}

/**
 * Extract text item details
 */
function extractTextItem(item, baseItem) {
  return {
    ...baseItem,
    required: item.isRequired(),
    validation: extractTextValidation(item)
  };
}

/**
 * Extract paragraph item details
 */
function extractParagraphItem(item, baseItem) {
  return {
    ...baseItem,
    required: item.isRequired(),
    validation: extractParagraphValidation(item)
  };
}

/**
 * Extract multiple choice item details
 */
function extractMultipleChoiceItem(item, baseItem) {
  const choices = item.getChoices();
  return {
    ...baseItem,
    required: item.isRequired(),
    hasOtherOption: item.hasOtherOption(),
    showOtherOption: item.hasOtherOption(),
    choices: choices.map(choice => ({
      value: choice.getValue(),
      isCorrectAnswer: choice.isCorrectAnswer ? choice.isCorrectAnswer() : false,
      gotoPageId: choice.getGotoPage() ? String(choice.getGotoPage().getId()) : null,
      gotoPageAction: choice.getPageNavigationType() ? choice.getPageNavigationType().toString() : null
    }))
  };
}

/**
 * Extract checkbox item details
 */
function extractCheckboxItem(item, baseItem) {
  const choices = item.getChoices();
  return {
    ...baseItem,
    required: item.isRequired(),
    hasOtherOption: item.hasOtherOption(),
    choices: choices.map(choice => ({
      value: choice.getValue(),
      isCorrectAnswer: choice.isCorrectAnswer ? choice.isCorrectAnswer() : false
    })),
    validation: extractCheckboxValidation(item)
  };
}

/**
 * Extract list (dropdown) item details
 */
function extractListItem(item, baseItem) {
  const choices = item.getChoices();
  return {
    ...baseItem,
    required: item.isRequired(),
    choices: choices.map(choice => ({
      value: choice.getValue(),
      isCorrectAnswer: choice.isCorrectAnswer ? choice.isCorrectAnswer() : false,
      gotoPageId: choice.getGotoPage() ? String(choice.getGotoPage().getId()) : null,
      gotoPageAction: choice.getPageNavigationType() ? choice.getPageNavigationType().toString() : null
    }))
  };
}

/**
 * Extract scale item details
 */
function extractScaleItem(item, baseItem) {
  return {
    ...baseItem,
    required: item.isRequired(),
    lowerBound: item.getLowerBound(),
    upperBound: item.getUpperBound(),
    leftLabel: item.getLeftLabel(),
    rightLabel: item.getRightLabel()
  };
}

/**
 * Extract grid item details
 */
function extractGridItem(item, baseItem) {
  return {
    ...baseItem,
    required: item.isRequired(),
    rows: item.getRows(),
    columns: item.getColumns()
  };
}

/**
 * Extract checkbox grid item details
 */
function extractCheckboxGridItem(item, baseItem) {
  return {
    ...baseItem,
    required: item.isRequired(),
    rows: item.getRows(),
    columns: item.getColumns()
  };
}

/**
 * Extract date item details
 */
function extractDateItem(item, baseItem) {
  return {
    ...baseItem,
    required: item.isRequired(),
    includesYear: item.includesYear()
  };
}

/**
 * Extract time item details
 */
function extractTimeItem(item, baseItem) {
  return {
    ...baseItem,
    required: item.isRequired()
  };
}

/**
 * Extract datetime item details
 */
function extractDateTimeItem(item, baseItem) {
  return {
    ...baseItem,
    required: item.isRequired(),
    includesYear: item.includesYear()
  };
}

/**
 * Extract duration item details
 */
function extractDurationItem(item, baseItem) {
  return {
    ...baseItem,
    required: item.isRequired()
  };
}

/**
 * Extract page break item details
 */
function extractPageBreakItem(item, baseItem) {
  return {
    ...baseItem,
    pageNavigationType: item.getPageNavigationType().toString(),
    gotoPageId: item.getGoToPage() ? String(item.getGoToPage().getId()) : null
  };
}

/**
 * Extract section header item details
 */
function extractSectionHeaderItem(item, baseItem) {
  return baseItem;
}

/**
 * Extract image item details
 */
function extractImageItem(item, baseItem) {
  return {
    ...baseItem,
    alignment: item.getAlignment().toString(),
    width: item.getWidth()
  };
}

/**
 * Extract video item details
 */
function extractVideoItem(item, baseItem) {
  return {
    ...baseItem,
    alignment: item.getAlignment().toString(),
    width: item.getWidth()
  };
}

/**
 * Extract file upload item details
 */
function extractFileUploadItem(item, baseItem) {
  return {
    ...baseItem,
    required: item.isRequired()
    // Note: File type restrictions and max files are not accessible via Apps Script API
  };
}

/**
 * Extract text validation rules
 */
function extractTextValidation(item) {
  try {
    const validation = item.getValidation();
    if (!validation) return null;

    // Text validation rules are not directly accessible
    // Return basic structure
    return {
      hasValidation: true
    };
  } catch (e) {
    return null;
  }
}

/**
 * Extract paragraph validation rules
 */
function extractParagraphValidation(item) {
  try {
    const validation = item.getValidation();
    if (!validation) return null;

    return {
      hasValidation: true
    };
  } catch (e) {
    return null;
  }
}

/**
 * Extract checkbox validation rules
 */
function extractCheckboxValidation(item) {
  try {
    const validation = item.getValidation();
    if (!validation) return null;

    return {
      hasValidation: true
    };
  } catch (e) {
    return null;
  }
}

// ============================================
// Form Responses Extraction
// ============================================

/**
 * Get form responses
 */
function getFormResponses(options) {
  const form = FormApp.getActiveForm();
  if (!form) {
    throw new Error('No active form found');
  }

  options = options || {};
  const limit = options.limit || 1000;
  const offset = options.offset || 0;

  const responses = form.getResponses();
  const items = form.getItems();

  // Build field mapping
  const fieldMap = {};
  items.forEach(item => {
    if (item.getType() !== FormApp.ItemType.PAGE_BREAK &&
        item.getType() !== FormApp.ItemType.SECTION_HEADER &&
        item.getType() !== FormApp.ItemType.IMAGE &&
        item.getType() !== FormApp.ItemType.VIDEO) {
      fieldMap[item.getId()] = {
        title: item.getTitle(),
        type: item.getType().toString()
      };
    }
  });

  // Extract responses
  const extractedResponses = responses.slice(offset, offset + limit).map(response => {
    const itemResponses = response.getItemResponses();
    const data = {};

    itemResponses.forEach(itemResponse => {
      const itemId = itemResponse.getItem().getId();
      data[itemId] = {
        fieldTitle: itemResponse.getItem().getTitle(),
        response: itemResponse.getResponse()
      };
    });

    return {
      responseId: response.getId(),
      timestamp: response.getTimestamp().toISOString(),
      respondentEmail: response.getRespondentEmail(),
      data: data
    };
  });

  return {
    formId: form.getId(),
    formTitle: form.getTitle(),
    totalResponses: responses.length,
    exportedCount: extractedResponses.length,
    offset: offset,
    fields: fieldMap,
    responses: extractedResponses
  };
}

// ============================================
// NetPad API Integration
// ============================================

/**
 * Export form definition to NetPad
 */
function exportFormDefinition() {
  const apiKey = getUserProperty(PROPERTY_API_KEY);
  const orgId = getUserProperty(PROPERTY_ORG_ID);

  if (!apiKey || !orgId) {
    return createErrorCard('Please configure your NetPad API key and organization in Settings.');
  }

  try {
    const formDef = getFormDefinition();

    const response = UrlFetchApp.fetch(NETPAD_API_BASE + '/integrations/google-forms/addon-import', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        organizationId: orgId,
        formDefinition: formDef,
        importType: 'definition'
      }),
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    const responseBody = JSON.parse(response.getContentText());

    if (statusCode >= 200 && statusCode < 300) {
      return createSuccessCard(
        'Form Exported Successfully',
        'Your form has been exported to NetPad.',
        responseBody.formUrl
      );
    } else {
      return createErrorCard(responseBody.error || 'Export failed. Please try again.');
    }
  } catch (e) {
    Logger.log('Export error: ' + e.toString());
    return createErrorCard('Export failed: ' + e.message);
  }
}

/**
 * Export form responses to NetPad
 */
function exportFormResponses() {
  const apiKey = getUserProperty(PROPERTY_API_KEY);
  const orgId = getUserProperty(PROPERTY_ORG_ID);

  if (!apiKey || !orgId) {
    return createErrorCard('Please configure your NetPad API key and organization in Settings.');
  }

  try {
    const responses = getFormResponses({ limit: 1000 });

    const response = UrlFetchApp.fetch(NETPAD_API_BASE + '/integrations/google-forms/addon-import', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        organizationId: orgId,
        formResponses: responses,
        importType: 'responses'
      }),
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    const responseBody = JSON.parse(response.getContentText());

    if (statusCode >= 200 && statusCode < 300) {
      return createSuccessCard(
        'Responses Exported Successfully',
        `${responses.exportedCount} responses have been exported to NetPad.`,
        responseBody.submissionsUrl
      );
    } else {
      return createErrorCard(responseBody.error || 'Export failed. Please try again.');
    }
  } catch (e) {
    Logger.log('Export error: ' + e.toString());
    return createErrorCard('Export failed: ' + e.message);
  }
}

// ============================================
// Settings Management
// ============================================

/**
 * Save settings from card form
 */
function saveSettings(e) {
  const formInput = e.formInput;

  if (formInput.apiKey && !formInput.apiKey.startsWith('*')) {
    setUserProperty(PROPERTY_API_KEY, formInput.apiKey);
  }

  if (formInput.orgId) {
    setUserProperty(PROPERTY_ORG_ID, formInput.orgId);
  }

  // Validate the credentials
  const apiKey = getUserProperty(PROPERTY_API_KEY);
  const orgId = getUserProperty(PROPERTY_ORG_ID);

  if (apiKey && orgId) {
    try {
      const response = UrlFetchApp.fetch(NETPAD_API_BASE + '/integrations/google-forms/validate', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({ organizationId: orgId }),
        muteHttpExceptions: true
      });

      if (response.getResponseCode() === 200) {
        return CardService.newActionResponseBuilder()
          .setNotification(CardService.newNotification()
            .setText('Settings saved and validated successfully!'))
          .setNavigation(CardService.newNavigation()
            .popToRoot()
            .updateCard(createHomepageCard()))
          .build();
      }
    } catch (e) {
      // Validation failed, but settings are saved
    }
  }

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText('Settings saved.'))
    .setNavigation(CardService.newNavigation()
      .popToRoot()
      .updateCard(createHomepageCard()))
    .build();
}

/**
 * Get settings for sidebar
 */
function getSettings() {
  return {
    apiKey: getUserProperty(PROPERTY_API_KEY) ? '********' : '',
    orgId: getUserProperty(PROPERTY_ORG_ID) || '',
    defaultProject: getUserProperty(PROPERTY_DEFAULT_PROJECT) || ''
  };
}

/**
 * Save settings from sidebar
 */
function saveSettingsFromSidebar(settings) {
  if (settings.apiKey && !settings.apiKey.startsWith('*')) {
    setUserProperty(PROPERTY_API_KEY, settings.apiKey);
  }
  if (settings.orgId) {
    setUserProperty(PROPERTY_ORG_ID, settings.orgId);
  }
  if (settings.defaultProject) {
    setUserProperty(PROPERTY_DEFAULT_PROJECT, settings.defaultProject);
  }
  return { success: true };
}

// ============================================
// Property Storage
// ============================================

/**
 * Get a user property
 */
function getUserProperty(key) {
  return PropertiesService.getUserProperties().getProperty(key);
}

/**
 * Set a user property
 */
function setUserProperty(key, value) {
  PropertiesService.getUserProperties().setProperty(key, value);
}

/**
 * Delete a user property
 */
function deleteUserProperty(key) {
  PropertiesService.getUserProperties().deleteProperty(key);
}

// ============================================
// Card Helpers
// ============================================

/**
 * Create an error card
 */
function createErrorCard(message) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('Error'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText(message))
      .addWidget(CardService.newTextButton()
        .setText('Go Back')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('onHomepage'))))
    .build();
}

/**
 * Create a success card
 */
function createSuccessCard(title, message, url) {
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText(message));

  if (url) {
    section.addWidget(CardService.newTextButton()
      .setText('Open in NetPad')
      .setOpenLink(CardService.newOpenLink()
        .setUrl(url)
        .setOpenAs(CardService.OpenAs.FULL_SIZE)));
  }

  section.addWidget(CardService.newTextButton()
    .setText('Done')
    .setOnClickAction(CardService.newAction()
      .setFunctionName('onHomepage')));

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle(title))
    .addSection(section)
    .build();
}

// ============================================
// Sidebar Data Functions
// ============================================

/**
 * Get form summary for sidebar display
 */
function getFormSummary() {
  const form = FormApp.getActiveForm();
  if (!form) {
    return null;
  }

  const items = form.getItems();
  const questionCount = items.filter(item =>
    item.getType() !== FormApp.ItemType.PAGE_BREAK &&
    item.getType() !== FormApp.ItemType.SECTION_HEADER &&
    item.getType() !== FormApp.ItemType.IMAGE &&
    item.getType() !== FormApp.ItemType.VIDEO
  ).length;

  return {
    id: form.getId(),
    title: form.getTitle(),
    description: form.getDescription(),
    questionCount: questionCount,
    responseCount: form.getResponses().length,
    editUrl: form.getEditUrl(),
    publishedUrl: form.getPublishedUrl()
  };
}

/**
 * Get list of organizations for the user
 */
function getOrganizations() {
  const apiKey = getUserProperty(PROPERTY_API_KEY);
  if (!apiKey) {
    return { success: false, error: 'API key not configured' };
  }

  try {
    const response = UrlFetchApp.fetch(NETPAD_API_BASE + '/user/organizations', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      return { success: true, organizations: JSON.parse(response.getContentText()) };
    } else {
      return { success: false, error: 'Failed to fetch organizations' };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Get list of projects for an organization
 */
function getProjects(orgId) {
  const apiKey = getUserProperty(PROPERTY_API_KEY);
  if (!apiKey) {
    return { success: false, error: 'API key not configured' };
  }

  try {
    const response = UrlFetchApp.fetch(NETPAD_API_BASE + '/orgs/' + orgId + '/projects', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      return { success: true, projects: JSON.parse(response.getContentText()) };
    } else {
      return { success: false, error: 'Failed to fetch projects' };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Export form to NetPad from sidebar
 */
function exportFormFromSidebar(options) {
  const apiKey = getUserProperty(PROPERTY_API_KEY);

  if (!apiKey) {
    return { success: false, error: 'API key not configured' };
  }

  try {
    const formDef = getFormDefinition();

    const response = UrlFetchApp.fetch(NETPAD_API_BASE + '/integrations/google-forms/addon-import', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        organizationId: options.organizationId,
        projectId: options.projectId,
        formDefinition: formDef,
        importType: 'definition',
        options: {
          createNewForm: options.createNewForm !== false,
          formName: options.formName
        }
      }),
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    const responseBody = JSON.parse(response.getContentText());

    if (statusCode >= 200 && statusCode < 300) {
      return {
        success: true,
        formId: responseBody.formId,
        formUrl: responseBody.formUrl,
        message: 'Form exported successfully'
      };
    } else {
      return {
        success: false,
        error: responseBody.error || 'Export failed'
      };
    }
  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Export responses to NetPad from sidebar
 */
function exportResponsesFromSidebar(options) {
  const apiKey = getUserProperty(PROPERTY_API_KEY);

  if (!apiKey) {
    return { success: false, error: 'API key not configured' };
  }

  try {
    const responses = getFormResponses({ limit: options.limit || 1000 });

    const response = UrlFetchApp.fetch(NETPAD_API_BASE + '/integrations/google-forms/addon-import', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        organizationId: options.organizationId,
        projectId: options.projectId,
        formId: options.netpadFormId,
        formResponses: responses,
        importType: 'responses'
      }),
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    const responseBody = JSON.parse(response.getContentText());

    if (statusCode >= 200 && statusCode < 300) {
      return {
        success: true,
        importedCount: responseBody.importedCount,
        submissionsUrl: responseBody.submissionsUrl,
        message: `${responseBody.importedCount} responses imported successfully`
      };
    } else {
      return {
        success: false,
        error: responseBody.error || 'Import failed'
      };
    }
  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
}
