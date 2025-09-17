import * as vscode from 'vscode';
import { registerCommands } from './commands/registerCommands';
import { onDidSaveTextDocumentHandler } from './commands/handlers';

export const diagnosticCollection = vscode.languages.createDiagnosticCollection('codecritter');

export async function activate(context: vscode.ExtensionContext) {
  try {
    console.log('CodeCritter: Extension is now active!');

    registerCommands(context);

    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.uri.path.includes('/.git/')) return;
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