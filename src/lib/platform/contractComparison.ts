/**
 * Contract Comparison Utilities
 *
 * Compares two contract versions to detect breaking changes.
 * Uses deterministic diff, not heuristics.
 */

import { ApplicationContract } from '@/types/application';
import { getApplicationContractByVersion } from './applicationContracts';

export interface BreakingChange {
  type:
    | 'removed-input'
    | 'removed-output'
    | 'removed-event'
    | 'removed-side-effect'
    | 'input-type-change'
    | 'output-type-change'
    | 'input-required-change'
    | 'output-guarantee-removed'
    | 'behavior-removed';
  component: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  migration?: string;
}

export interface Change {
  type:
    | 'added-input'
    | 'added-output'
    | 'added-event'
    | 'added-side-effect'
    | 'input-optional-change'
    | 'output-guarantee-added'
    | 'behavior-added';
  component: string;
  description: string;
}

export interface ContractComparison {
  fromVersion: string;
  toVersion: string;
  breakingChanges: BreakingChange[];
  nonBreakingChanges: Change[];
  additiveChanges: Change[];
  compatibility: 'compatible' | 'incompatible' | 'requires-migration';
  migrationGuide?: string;
}

/**
 * Compare two contract versions
 */
export async function compareContracts(
  orgId: string,
  applicationId: string,
  fromVersion: string,
  toVersion: string
): Promise<ContractComparison> {
  const fromContract = await getApplicationContractByVersion(orgId, applicationId, fromVersion);
  const toContract = await getApplicationContractByVersion(orgId, applicationId, toVersion);

  if (!fromContract) {
    throw new Error(`Contract not found for version ${fromVersion}`);
  }

  if (!toContract) {
    throw new Error(`Contract not found for version ${toVersion}`);
  }

  const breakingChanges: BreakingChange[] = [];
  const nonBreakingChanges: Change[] = [];
  const additiveChanges: Change[] = [];

  // Compare inputs
  compareInputs(fromContract.inputs, toContract.inputs, breakingChanges, nonBreakingChanges, additiveChanges);

  // Compare outputs
  compareOutputs(fromContract.outputs, toContract.outputs, breakingChanges, nonBreakingChanges, additiveChanges);

  // Compare side effects
  compareSideEffects(fromContract.sideEffects, toContract.sideEffects, breakingChanges, additiveChanges);

  // Compare events
  compareEvents(fromContract.events, toContract.events, breakingChanges, additiveChanges);

  // Compare behaviors
  compareBehaviors(fromContract.behaviors, toContract.behaviors, breakingChanges, additiveChanges);

  // Determine compatibility
  const compatibility: ContractComparison['compatibility'] =
    breakingChanges.length > 0
      ? 'incompatible'
      : nonBreakingChanges.length > 0
      ? 'requires-migration'
      : 'compatible';

  // Generate migration guide if there are breaking changes
  const migrationGuide =
    breakingChanges.length > 0
      ? generateMigrationGuide(breakingChanges, fromVersion, toVersion)
      : undefined;

  return {
    fromVersion,
    toVersion,
    breakingChanges,
    nonBreakingChanges,
    additiveChanges,
    compatibility,
    migrationGuide,
  };
}

/**
 * Compare input contracts
 */
function compareInputs(
  from: ApplicationContract['inputs'],
  to: ApplicationContract['inputs'],
  breaking: BreakingChange[],
  nonBreaking: Change[],
  additive: Change[]
) {
  const fromKeys = new Set(Object.keys(from));
  const toKeys = new Set(Object.keys(to));

  // Check for removed inputs (BREAKING)
  for (const key of fromKeys) {
    if (!toKeys.has(key)) {
      breaking.push({
        type: 'removed-input',
        component: key,
        description: `Input '${key}' was removed`,
        impact: 'high',
        migration: `Update consumers to remove '${key}' from input`,
      });
    }
  }

  // Check for added inputs (NON-BREAKING if optional, BREAKING if required)
  for (const key of toKeys) {
    if (!fromKeys.has(key)) {
      const input = to[key];
      if (input.required) {
        breaking.push({
          type: 'input-required-change',
          component: key,
          description: `Required input '${key}' was added`,
          impact: 'high',
          migration: `Update consumers to provide '${key}' in input`,
        });
      } else {
        additive.push({
          type: 'added-input',
          component: key,
          description: `Optional input '${key}' was added`,
        });
      }
    } else {
      // Check for type changes (BREAKING)
      const fromInput = from[key];
      const toInput = to[key];
      if (fromInput.type !== toInput.type) {
        breaking.push({
          type: 'input-type-change',
          component: key,
          description: `Input '${key}' type changed from '${fromInput.type}' to '${toInput.type}'`,
          impact: 'high',
          migration: `Update consumers to provide '${key}' as type '${toInput.type}'`,
        });
      }

      // Check for required changes (BREAKING: optional → required)
      if (!fromInput.required && toInput.required) {
        breaking.push({
          type: 'input-required-change',
          component: key,
          description: `Input '${key}' changed from optional to required`,
          impact: 'high',
          migration: `Update consumers to always provide '${key}' in input`,
        });
      }

      // Check for required → optional (NON-BREAKING)
      if (fromInput.required && !toInput.required) {
        nonBreaking.push({
          type: 'input-optional-change',
          component: key,
          description: `Input '${key}' changed from required to optional`,
        });
      }
    }
  }
}

/**
 * Compare output contracts
 */
function compareOutputs(
  from: ApplicationContract['outputs'],
  to: ApplicationContract['outputs'],
  breaking: BreakingChange[],
  nonBreaking: Change[],
  additive: Change[]
) {
  const fromKeys = new Set(Object.keys(from));
  const toKeys = new Set(Object.keys(to));

  // Check for removed guaranteed outputs (BREAKING)
  for (const key of fromKeys) {
    if (!toKeys.has(key)) {
      if (from[key].guaranteed) {
        breaking.push({
          type: 'removed-output',
          component: key,
          description: `Guaranteed output '${key}' was removed`,
          impact: 'high',
          migration: `Update consumers to not rely on '${key}' output`,
        });
      }
    }
  }

  // Check for added outputs (NON-BREAKING)
  for (const key of toKeys) {
    if (!fromKeys.has(key)) {
      additive.push({
        type: 'added-output',
        component: key,
        description: `Output '${key}' was added`,
      });
    } else {
      // Check for type changes (BREAKING)
      const fromOutput = from[key];
      const toOutput = to[key];
      if (fromOutput.type !== toOutput.type) {
        breaking.push({
          type: 'output-type-change',
          component: key,
          description: `Output '${key}' type changed from '${fromOutput.type}' to '${toOutput.type}'`,
          impact: 'high',
          migration: `Update consumers to expect '${key}' as type '${toOutput.type}'`,
        });
      }

      // Check for guarantee changes
      if (fromOutput.guaranteed && !toOutput.guaranteed) {
        breaking.push({
          type: 'output-guarantee-removed',
          component: key,
          description: `Output '${key}' is no longer guaranteed`,
          impact: 'medium',
          migration: `Update consumers to handle cases where '${key}' may not be present`,
        });
      }

      if (!fromOutput.guaranteed && toOutput.guaranteed) {
        nonBreaking.push({
          type: 'output-guarantee-added',
          component: key,
          description: `Output '${key}' is now guaranteed`,
        });
      }
    }
  }
}

/**
 * Compare side effects
 */
function compareSideEffects(
  from: ApplicationContract['sideEffects'],
  to: ApplicationContract['sideEffects'],
  breaking: BreakingChange[],
  additive: Change[]
) {
  const fromSet = new Set(from.map((se) => `${se.type}:${se.target}`));
  const toSet = new Set(to.map((se) => `${se.type}:${se.target}`));

  // Check for removed side effects (BREAKING)
  for (const sideEffect of from) {
    const key = `${sideEffect.type}:${sideEffect.target}`;
    if (!toSet.has(key)) {
      breaking.push({
        type: 'removed-side-effect',
        component: sideEffect.target,
        description: `Side effect '${sideEffect.type}:${sideEffect.target}' was removed`,
        impact: 'medium',
        migration: `Update consumers to not rely on '${sideEffect.type}:${sideEffect.target}' side effect`,
      });
    }
  }

  // Check for added side effects (NON-BREAKING)
  for (const sideEffect of to) {
    const key = `${sideEffect.type}:${sideEffect.target}`;
    if (!fromSet.has(key)) {
      additive.push({
        type: 'added-side-effect',
        component: sideEffect.target,
        description: `Side effect '${sideEffect.type}:${sideEffect.target}' was added`,
      });
    }
  }
}

/**
 * Compare events
 */
function compareEvents(
  from: ApplicationContract['events'],
  to: ApplicationContract['events'],
  breaking: BreakingChange[],
  additive: Change[]
) {
  const fromSet = new Set(from.map((e) => e.name));
  const toSet = new Set(to.map((e) => e.name));

  // Check for removed events (BREAKING)
  for (const event of from) {
    if (!toSet.has(event.name)) {
      breaking.push({
        type: 'removed-event',
        component: event.name,
        description: `Event '${event.name}' was removed`,
        impact: 'high',
        migration: `Update consumers to not subscribe to '${event.name}' event`,
      });
    }
  }

  // Check for added events (NON-BREAKING)
  for (const event of to) {
    if (!fromSet.has(event.name)) {
      additive.push({
        type: 'added-event',
        component: event.name,
        description: `Event '${event.name}' was added`,
      });
    }
  }
}

/**
 * Compare behaviors
 */
function compareBehaviors(
  from: ApplicationContract['behaviors'],
  to: ApplicationContract['behaviors'],
  breaking: BreakingChange[],
  additive: Change[]
) {
  const fromSet = new Set(from.map((b) => b.workflowId));
  const toSet = new Set(to.map((b) => b.workflowId));

  // Check for removed behaviors (BREAKING)
  for (const behavior of from) {
    if (!toSet.has(behavior.workflowId)) {
      breaking.push({
        type: 'behavior-removed',
        component: behavior.workflowId,
        description: `Behavior '${behavior.workflowId}' (triggered by '${behavior.trigger}') was removed`,
        impact: 'high',
        migration: `Update consumers to not rely on '${behavior.workflowId}' behavior`,
      });
    }
  }

  // Check for added behaviors (NON-BREAKING)
  for (const behavior of to) {
    if (!fromSet.has(behavior.workflowId)) {
      additive.push({
        type: 'behavior-added',
        component: behavior.workflowId,
        description: `Behavior '${behavior.workflowId}' (triggered by '${behavior.trigger}') was added`,
      });
    }
  }
}

/**
 * Generate migration guide from breaking changes
 */
function generateMigrationGuide(
  breakingChanges: BreakingChange[],
  fromVersion: string,
  toVersion: string
): string {
  const lines: string[] = [
    `# Migration Guide: ${fromVersion} → ${toVersion}`,
    '',
    '## Breaking Changes',
    '',
    'The following breaking changes require updates to consumers:',
    '',
  ];

  breakingChanges.forEach((change, index) => {
    lines.push(`### ${index + 1}. ${change.component}`);
    lines.push(`**Type:** ${change.type}`);
    lines.push(`**Impact:** ${change.impact}`);
    lines.push(`**Description:** ${change.description}`);
    if (change.migration) {
      lines.push(`**Migration:** ${change.migration}`);
    }
    lines.push('');
  });

  lines.push('## Action Required');
  lines.push('');
  lines.push('1. Review all breaking changes above');
  lines.push('2. Update consumers to handle new contract');
  lines.push('3. Test thoroughly before deploying');
  lines.push('4. Consider backward compatibility if needed');

  return lines.join('\n');
}
