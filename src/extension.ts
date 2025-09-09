import * as vscode from 'vscode';
import { registerCommands } from './commands/registerCommands';
import { setupProactiveCommitAssistant } from './git/git';
import { setupAutomatedReviewSystem } from './commands/handlers';

export const diagnosticCollection = vscode.languages.createDiagnosticCollection('codecritter');

export async function activate(context: vscode.ExtensionContext) {
  console.log('CodeCritter extension is now active!');

  registerCommands(context);
  await setupProactiveCommitAssistant(context);
  await setupAutomatedReviewSystem(context);
}

export function deactivate() {}