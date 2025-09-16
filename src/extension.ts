import * as vscode from 'vscode';
import { registerCommands } from './commands/registerCommands';
import { setupProactiveCommitAssistant } from './git/git';
import { setupAutomatedReviewSystem } from './commands/handlers';

export const diagnosticCollection = vscode.languages.createDiagnosticCollection('codecritter');

export async function activate(context: vscode.ExtensionContext) {
  console.log('CodeCritter: Extension is now active!');

  console.log('CodeCritter: Registering commands...');
  registerCommands(context);
  console.log('CodeCritter: Commands registered.');

  console.log('CodeCritter: Setting up Proactive Commit Assistant...');
  await setupProactiveCommitAssistant(context);
  console.log('CodeCritter: Commit Assistant is active.');

  console.log('CodeCritter: Setting up Automated Review System...');
  await setupAutomatedReviewSystem(context);
  console.log('CodeCritter: Automated Review System is active.');
}

export function deactivate() {
  console.log('CodeCritter: Extension deactivated.');
}