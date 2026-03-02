import * as vscode from 'vscode';
import { registerCommands } from './commands/registerCommands';
import { onDidSaveTextDocumentHandler } from './commands/handlers';

export const diagnosticCollection = vscode.languages.createDiagnosticCollection('codecritter');
export const reviewStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);

export async function activate(context: vscode.ExtensionContext) {
  try {
    console.log('CodeCritter: Extension is now active!');

    // Fix 1: one-time migration of plaintext API key from settings → SecretStorage
    const config = vscode.workspace.getConfiguration('codecritter');
    const legacyKey = config.get<string>('apiKey');
    if (legacyKey) {
      await context.secrets.store('codecritter.apiKey', legacyKey);
      await config.update('apiKey', undefined, vscode.ConfigurationTarget.Global);
      console.log('CodeCritter: Migrated API key from settings to SecretStorage.');
    }

    registerCommands(context);

    context.subscriptions.push(reviewStatusBar);

    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.uri.path.includes('/.git/')) { return; }
        onDidSaveTextDocumentHandler(document, context);
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`CodeCritter failed to activate: ${errorMessage}`);
    console.error('CodeCritter Activation Error:', error);
  }
}

export function deactivate() {
  console.log('CodeCritter: Extension deactivated.');
}
