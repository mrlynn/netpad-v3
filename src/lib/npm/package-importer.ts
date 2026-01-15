/**
 * npm Package Importer
 * 
 * Imports NetPad packages from npm registry into NetPad organizations
 */

import { fetchPackageVersion, downloadPackageTarball } from './registry-client';
import { InstallPackageResult } from '@/types/npm-package';
import { BundleExport } from '@/types/template';
import { importBundle } from '@/lib/templates/import-bundle';
import { createApplication, getApplication, updateApplication } from '@/lib/platform/applications';
import { Readable } from 'stream';

/**
 * Extract bundle.json from npm package tarball
 */
async function extractBundleFromTarball(tarball: Buffer): Promise<BundleExport> {
  // npm tarballs are gzipped tar files
  // We need to extract the dist/bundle.json file
  const tar = require('tar');
  let bundleJson: any = null;
  
  await new Promise<void>((resolve, reject) => {
    const stream = Readable.from(tarball);
    
    stream.pipe(
      tar.t({
        onentry: (entry: any) => {
          if (entry.path === 'package/dist/bundle.json' || entry.path.endsWith('/dist/bundle.json')) {
            let data = '';
            entry.on('data', (chunk: Buffer) => {
              data += chunk.toString('utf8');
            });
            entry.on('end', () => {
              try {
                bundleJson = JSON.parse(data);
              } catch (error: any) {
                reject(new Error(`Failed to parse bundle.json: ${error.message}`));
              }
            });
          }
        },
      })
    );
    
    stream.on('end', () => resolve());
    stream.on('error', reject);
  });
  
  if (!bundleJson) {
    throw new Error('bundle.json not found in package tarball');
  }
  
  return bundleJson;
}

/**
 * Resolve package dependencies
 */
async function resolveDependencies(
  dependencies: string[],
  installed: Set<string> = new Set()
): Promise<string[]> {
  const resolved: string[] = [];
  const toResolve = [...dependencies];
  
  while (toResolve.length > 0) {
    const dep = toResolve.shift()!;
    
    // Skip if already installed
    if (installed.has(dep)) {
      continue;
    }
    
    // Parse package name and version
    const match = dep.match(/^(@?[^@]+)@?(.+)?$/);
    if (!match) {
      console.warn(`[Package Importer] Invalid dependency format: ${dep}`);
      continue;
    }
    
    const [, packageName, version] = match;
    
    try {
      // Fetch package metadata
      const packageVersion = await fetchPackageVersion(
        packageName,
        version || 'latest'
      );
      
      if (!packageVersion || !packageVersion.netpad) {
        console.warn(`[Package Importer] Dependency ${dep} is not a NetPad package`);
        continue;
      }
      
      // Add to resolved
      resolved.push(dep);
      installed.add(dep);
      
      // Resolve nested dependencies
      const nestedDeps = packageVersion.netpad.dependencies || {};
      const allNestedDeps = [
        ...(nestedDeps.applications || []),
        ...(nestedDeps.plugins || []),
      ];
      
      for (const nestedDep of allNestedDeps) {
        if (!installed.has(nestedDep)) {
          toResolve.push(nestedDep);
        }
      }
    } catch (error) {
      console.error(`[Package Importer] Error resolving dependency ${dep}:`, error);
      // Continue with other dependencies
    }
  }
  
  return resolved;
}

/**
 * Import package from npm registry
 */
export async function importFromNpm(
  packageName: string,
  version: string | undefined,
  orgId: string,
  projectId: string,
  options: {
    userId: string;
    overwriteExisting?: boolean;
    installDependencies?: boolean;
  }
): Promise<InstallPackageResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const installedDependencies: string[] = [];
  
  try {
    // Fetch package version
    const packageVersion = await fetchPackageVersion(
      packageName,
      version || 'latest'
    );
    
    if (!packageVersion) {
      return {
        success: false,
        version: version || 'latest',
        errors: [`Package ${packageName}@${version || 'latest'} not found`],
      };
    }
    
    if (!packageVersion.netpad) {
      return {
        success: false,
        version: packageVersion.version,
        errors: [`Package ${packageName} is not a NetPad package`],
      };
    }
    
    const netpad = packageVersion.netpad;
    
    // Resolve dependencies if requested
    if (options.installDependencies && netpad.dependencies) {
      const allDeps = [
        ...(netpad.dependencies.applications || []),
        ...(netpad.dependencies.plugins || []),
      ];
      
      if (allDeps.length > 0) {
        try {
          const resolvedDeps = await resolveDependencies(allDeps);
          installedDependencies.push(...resolvedDeps);
          
          // Install dependencies first (recursively)
          for (const dep of resolvedDeps) {
            const depMatch = dep.match(/^(@?[^@]+)@?(.+)?$/);
            if (depMatch) {
              const [, depName, depVersion] = depMatch;
              try {
                await importFromNpm(
                  depName,
                  depVersion,
                  orgId,
                  projectId,
                  {
                    userId: options.userId,
                    overwriteExisting: options.overwriteExisting,
                    installDependencies: true, // Recursive
                  }
                );
              } catch (error: any) {
                warnings.push(`Failed to install dependency ${dep}: ${error.message}`);
              }
            }
          }
        } catch (error: any) {
          warnings.push(`Failed to resolve dependencies: ${error.message}`);
        }
      }
    }
    
    // Download and extract package
    const tarball = await downloadPackageTarball(
      packageName,
      packageVersion.version
    );
    
    const bundle = await extractBundleFromTarball(tarball);
    
    // Import bundle based on type
    if (netpad.type === 'application') {
      // Import as application
      const importResult = await importBundle(
        orgId,
        projectId,
        bundle,
        {
          userId: options.userId,
          overwriteExisting: options.overwriteExisting || false,
          generateNewIds: true,
          preserveSlugs: false,
        }
      );
      
        // Create or update application entity
        const applicationId = netpad.applicationId || `app_${packageName.replace(/[@/-]/g, '_')}`;
        
        try {
          // Check if application already exists
          const existing = await getApplication(orgId, applicationId);
          
          if (existing) {
            if (options.overwriteExisting) {
              // Update existing application
              await updateApplication(orgId, applicationId, {
                name: netpad.name,
                description: netpad.description,
                version: packageVersion.version,
                tags: netpad.tags || [],
              });
              
              // Update forms and workflows to point to this application
              const { getOrgFormsCollection } = await import('@/lib/platform/db');
              const { getWorkflowsCollection } = await import('@/lib/workflow/db');
              
              const formsCollection = await getOrgFormsCollection(orgId);
              const workflowsCollection = await getWorkflowsCollection(orgId);
              
              // Update imported forms
              for (const form of importResult.imported.forms) {
                await formsCollection.updateOne(
                  { id: form.newId },
                  { $set: { applicationId } }
                );
              }
              
              // Update imported workflows
              for (const workflow of importResult.imported.workflows) {
                await workflowsCollection.updateOne(
                  { id: workflow.newId },
                  { $set: { applicationId } }
                );
              }
              
              return {
                success: true,
                version: packageVersion.version,
                applicationId,
                dependencies: {
                  installed: installedDependencies,
                  failed: warnings.map(w => ({ name: '', error: w })),
                },
              };
            } else {
              errors.push(`Application ${netpad.name} already exists. Use overwriteExisting=true to update.`);
            }
          } else {
            // Create new application
            const application = await createApplication({
              projectId,
              organizationId: orgId,
              name: netpad.name,
              description: netpad.description,
              slug: applicationId,
              version: packageVersion.version,
              tags: netpad.tags || [],
              createdBy: options.userId,
            });
            
            // Update forms and workflows to point to this application
            const { getOrgFormsCollection } = await import('@/lib/platform/db');
            const { getWorkflowsCollection } = await import('@/lib/workflow/db');
            
            const formsCollection = await getOrgFormsCollection(orgId);
            const workflowsCollection = await getWorkflowsCollection(orgId);
            
            // Update imported forms
            for (const form of importResult.imported.forms) {
              await formsCollection.updateOne(
                { id: form.newId },
                { $set: { applicationId: application.applicationId } }
              );
            }
            
            // Update imported workflows
            for (const workflow of importResult.imported.workflows) {
              await workflowsCollection.updateOne(
                { id: workflow.newId },
                { $set: { applicationId: application.applicationId } }
              );
            }
            
            // Update application with marketplace metadata
            await updateApplication(orgId, application.applicationId, {
              // Add marketplace metadata if needed
            });
            
            return {
              success: true,
              version: packageVersion.version,
              applicationId: application.applicationId,
              dependencies: {
                installed: installedDependencies,
                failed: warnings.map(w => ({ name: '', error: w })),
              },
            };
          }
        } catch (error: any) {
          errors.push(`Failed to create/update application: ${error.message}`);
        }
    } else if (netpad.type === 'plugin') {
      // TODO: Plugin import logic (Phase 3)
      return {
        success: false,
        version: packageVersion.version,
        errors: ['Plugin import not yet implemented'],
      };
    }
    
    return {
      success: errors.length === 0,
      version: packageVersion.version,
      dependencies: {
        installed: installedDependencies,
        failed: errors.map(e => ({ name: '', error: e })),
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      version: version || 'latest',
      errors: [error.message || 'Failed to import package'],
    };
  }
}
