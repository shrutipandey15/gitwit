import * as vscode from 'vscode';
import * as path from 'path';
import { WebviewManager } from '../webview/WebviewManager';
import { generateDocstring, generateReview } from '../ai/ai';
import { executeCommand } from '../git/git';
import { generateAutomatedReview } from '../ai/ai';
import { ReviewData } from '../types';
import { getAutoReviewWebviewContent } from '../webview/getWebviewContent';

let isReviewInProgress = false;
let lastReviewedContent = new Map<string, string>();

export async function startReviewHandler(context: vscode.ExtensionContext) {
  const panel = new WebviewManager(context);

  panel.onDidReceiveMessage(
    async (message) => {
      const config = vscode.workspace.getConfiguration('codecritter');

      switch (message.command) {
        case 'getApiKey':
          panel.postMessage({
            command: 'setApiKey',
            apiKey: config.get('apiKey'),
          });
          return;

        case 'getAutoReviewSettings':
          panel.postMessage({
            command: 'setAutoReviewSettings',
            autoReviewEnabled: config.get('autoReviewEnabled', true),
            reviewThreshold: config.get('reviewThreshold', 'medium'),
            commitAssistEnabled: config.get('commitAssistEnabled', true),
          });
          return;

        case 'saveAutoReviewSettings':
          try {
            await config.update(
              'autoReviewEnabled',
              message.autoReviewEnabled,
              vscode.ConfigurationTarget.Global
            );
            await config.update(
              'reviewThreshold',
              message.reviewThreshold,
              vscode.ConfigurationTarget.Global
            );
            await config.update(
              'commitAssistEnabled',
              message.commitAssistEnabled,
              vscode.ConfigurationTarget.Global
            );
            await config.update(
              'persona',
              message.persona,
              vscode.ConfigurationTarget.Global
            );

            vscode.window.showInformationMessage(
              'Auto Review settings saved successfully!'
            );
          } catch (error) {
            console.error('Failed to save auto review settings:', error);
            vscode.window.showErrorMessage(
              'Could not save auto review settings.'
            );
          }
          return;

        case 'saveApiKey':
          try {
            await config.update(
              'apiKey',
              message.apiKey,
              vscode.ConfigurationTarget.Global
            );
            vscode.window.showInformationMessage(
              'CodeCritter API Key saved successfully!'
            );
          } catch (error) {
            console.error('Failed to save API key:', error);
            vscode.window.showErrorMessage(
              'Could not save the API key. Please check the developer console for errors.'
            );
          }
          return;

        case 'review':
          try {
            const userApiKey = config.get('apiKey') as string;
            if (!userApiKey) {
              vscode.window.showWarningMessage(
                'Please set your Gemini API key in the CodeCritter settings first.'
              );
              return;
            }

            const reviewData = await generateReview(
              message.code,
              message.persona,
              userApiKey
            );

            panel.postMessage({
              command: 'displayReview',
              review: reviewData.review,
              productionRisk: reviewData.productionRisk,
            });
          } catch (error) {
            console.error('Error generating review:', error);
            vscode.window.showErrorMessage(
              `Failed to generate review: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`
            );
          }
          return;

        case 'generateDocstring':
          try {
            const userApiKey = config.get('apiKey') as string;
            if (!userApiKey) {
              vscode.window.showWarningMessage(
                'Please set your Gemini API key in the CodeCritter settings first.'
              );
              return;
            }

            const docstring = await generateDocstring(
              message.code,
              userApiKey
            );

            panel.postMessage({
              command: 'displayDocstring',
              docstring,
            });
          } catch (error) {
            console.error('Error generating docstring:', error);
            vscode.window.showErrorMessage(
              `Failed to generate docstring: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`
            );
          }
          return;
        case 'copyToClipboard':
          if (message.text) {
            await vscode.env.clipboard.writeText(message.text);
            vscode.window.showInformationMessage(
              'Review copied to clipboard!'
            );
          }
          return;
      }
    },
    undefined,
    context.subscriptions
  );
}

export async function toggleAutoReviewHandler() {
  const config = vscode.workspace.getConfiguration('codecritter');
  const currentSetting = config.get('autoReviewEnabled', true);
  await config.update(
    'autoReviewEnabled',
    !currentSetting,
    vscode.ConfigurationTarget.Global
  );

  vscode.window.showInformationMessage(
    `CodeCritter Auto Review ${!currentSetting ? 'Enabled' : 'Disabled'}`
  );
}

export async function setupAutomatedReviewSystem(
  context: vscode.ExtensionContext
) {
  console.log('CodeCritter: Setting up automated code review system...');

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      const config = vscode.workspace.getConfiguration('codecritter');
      const autoReviewEnabled = config.get('autoReviewEnabled', true);
      const userApiKey = config.get('apiKey') as string;

      if (!autoReviewEnabled || !userApiKey || isReviewInProgress) {
        return;
      }

      // Skip certain file types
      if (shouldSkipFile(document)) {
        return;
      }

      const filePath = document.uri.fsPath;
      const currentContent = document.getText();

      // Check if content has actually changed since last review
      if (lastReviewedContent.get(filePath) === currentContent) {
        return;
      }

      console.log(
        `CodeCritter: Analyzing saved file: ${document.fileName}`
      );
      isReviewInProgress = true;

      try {
        // Get the specific changes for this file
        const relativeFilePath = vscode.workspace.asRelativePath(document.uri);
        const fileDiff = await executeCommand(
          `git diff HEAD -- "${relativeFilePath}"`
        );

        if (!fileDiff.trim()) {
          // If no diff, analyze the current content instead
          await performAutomatedReview(
            currentContent,
            document.fileName,
            userApiKey,
            config
          );
        } else {
          // Analyze the changes
          await performAutomatedReview(
            fileDiff,
            document.fileName,
            userApiKey,
            config,
            true
          );
        }

        lastReviewedContent.set(filePath, currentContent);
      } catch (error) {
        console.error(
          'CodeCritter: Failed to perform automated review:',
          error
        );
      } finally {
        isReviewInProgress = false;
      }
    })
  );
}

function shouldSkipFile(document: vscode.TextDocument): boolean {
  const fileName = document.fileName.toLowerCase();
  const skipExtensions = [
    '.json',
    '.md',
    '.txt',
    '.log',
    '.xml',
    '.yaml',
    '.yml',
  ];
  const skipPaths = [
    '/.git/',
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.vscode/',
  ];

  // Skip if it's in excluded paths
  if (skipPaths.some((path) => document.uri.path.includes(path))) {
    return true;
  }

  // Skip if it's an excluded file type
  if (skipExtensions.some((ext) => fileName.endsWith(ext))) {
    return true;
  }

  // Skip very large files (over 10KB)
  if (document.getText().length > 10000) {
    return true;
  }

  return false;
}

async function performAutomatedReview(
  content: string,
  fileName: string,
  apiKey: string,
  config: vscode.WorkspaceConfiguration,
  isDiff: boolean = false
) {
  try {
    const persona = config.get('persona', 'Strict Tech Lead');
    const reviewThreshold = config.get('reviewThreshold', 'medium'); // low, medium, high

    // Get automated review
    const reviewData = await generateAutomatedReview(
      content,
      persona,
      apiKey,
      isDiff
    );

    if (reviewData && shouldShowReview(reviewData, reviewThreshold)) {
      await showAutomatedReviewNotification(reviewData, fileName, persona);
    }
  } catch (error) {
    console.error('Error in automated review:', error);
  }
}

function shouldShowReview(reviewData: ReviewData, threshold: string): boolean {
  if (!reviewData.severity) return true;

  const severityLevels = { low: 1, medium: 2, high: 3 };
  const thresholdLevel =
    severityLevels[threshold as keyof typeof severityLevels] || 2;
  const reviewSeverity =
    severityLevels[reviewData.severity as keyof typeof severityLevels] || 2;

  return reviewSeverity >= thresholdLevel;
}

async function showAutomatedReviewNotification(
  reviewData: ReviewData,
  fileName: string,
  persona: string
) {
  const message = getAutoReviewMessage(persona, reviewData, fileName);

  const action = await vscode.window.showInformationMessage(
    message,
    { modal: false },
    'Show Details',
    'Ignore',
    'Disable Auto Review'
  );

  switch (action) {
    case 'Show Details':
      await showDetailedReview(reviewData, fileName);
      break;
    case 'Disable Auto Review':
      const config = vscode.workspace.getConfiguration('codecritter');
      await config.update(
        'autoReviewEnabled',
        false,
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage(
        "Auto Review disabled. Use 'CodeCritter: Toggle Auto Review' to re-enable."
      );
      break;
    case 'Ignore':
    default:
      // Do nothing
      break;
  }
}

async function showDetailedReview(reviewData: ReviewData, fileName: string) {
  const panel = vscode.window.createWebviewPanel(
    'codecritterAutoReview',
    `CodeCritter: ${fileName}`,
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = getAutoReviewWebviewContent(reviewData, fileName);
}

function getAutoReviewMessage(
  persona: string,
  reviewData: ReviewData,
  fileName: string
): string {
  const summary = reviewData.review?.summary || 'Code analysis complete';
  const shortFileName = path.basename(fileName);

  switch (persona) {
    case 'Supportive Mentor':
      return `Great work on ${shortFileName}! I noticed some areas where we could improve. ${summary.substring(
        0,
        100
      )}...`;
    case 'Sarcastic Reviewer':
      return `Well, well... ${shortFileName} could use some attention. ${summary.substring(
        0,
        100
      )}...`;
    case 'Code Poet':
      return `The code in ${shortFileName} has potential for greater elegance. ${summary.substring(
        0,
        100
      )}...`;
    case 'Paranoid Security Engineer':
      return `SECURITY SCAN: ${shortFileName} requires attention! ${summary.substring(
        0,
        100
      )}...`;
    case 'Strict Tech Lead':
    default:
      return `Code review for ${shortFileName}: ${summary.substring(
        0,
        100
      )}...`;
  }
}