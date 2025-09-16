import * as vscode from 'vscode';
import { registerCommands } from './commands/registerCommands';
import { onDidSaveTextDocumentHandler } from './commands/handlers';

export const diagnosticCollection = vscode.languages.createDiagnosticCollection('codecritter');

export async function activate(context: vscode.ExtensionContext) {
  console.log('CodeCritter: Extension is now active!');

  registerCommands(context);

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (document.uri.path.includes('/.git/')) return;
      onDidSaveTextDocumentHandler(document, context);
    })
  );
}

export function deactivate() {
  console.log('CodeCritter: Extension deactivated.');
}