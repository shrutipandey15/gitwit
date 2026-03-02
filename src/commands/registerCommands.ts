import * as vscode from 'vscode';
import {
  startReviewHandler,
  toggleAutoReviewHandler,
  selectPersonaHandler,
  explainCodeHandler,
  showStatsHandler,
  generateTestsHandler,
  intelligentRefactorHandler,
  generateReadmeHandler,
  fixIssueHandler,
  commitAssistHandler,
} from './handlers';
import { CodeCritterActionProvider } from './codeActionProvider';

export function registerCommands(context: vscode.ExtensionContext) {
  const personaStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  personaStatusBarItem.command = 'codecritter.selectPersona';

  const updateStatusBarItem = () => {
    const config = vscode.workspace.getConfiguration('codecritter');
    const persona = config.get('persona', 'Strict Tech Lead');
    personaStatusBarItem.text = `🤖 ${persona}`;
    personaStatusBarItem.tooltip = 'Select CodeCritter Persona';
    personaStatusBarItem.show();
  };

  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('codecritter.persona')) {
      updateStatusBarItem();
    }
  }));

  updateStatusBarItem();

  context.subscriptions.push(
    vscode.commands.registerCommand('codecritter.start', () => startReviewHandler(context)),
    vscode.commands.registerCommand('codecritter.toggleAutoReview', toggleAutoReviewHandler),
    vscode.commands.registerCommand('codecritter.selectPersona', selectPersonaHandler),
    vscode.commands.registerCommand('codecritter.explainCode', () => explainCodeHandler(context)),
    vscode.commands.registerCommand('codecritter.showStats', () => showStatsHandler(context)),
    vscode.commands.registerCommand('codecritter.generateTests', () => generateTestsHandler(context)),
    vscode.commands.registerCommand('codecritter.refactor', () => intelligentRefactorHandler(context)),
    vscode.commands.registerCommand('codecritter.generateReadme', () => generateReadmeHandler(context)),
    vscode.commands.registerCommand(
      'codecritter.fixIssue',
      (document: vscode.TextDocument, diagnostic: vscode.Diagnostic) =>
        fixIssueHandler(document, diagnostic, context)
    ),
    // Fix 2: commit assistant is now a dedicated command, not wired to onSave
    vscode.commands.registerCommand('codecritter.commitAssist', () => commitAssistHandler(context)),
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file' },
      new CodeCritterActionProvider(),
      { providedCodeActionKinds: CodeCritterActionProvider.providedCodeActionKinds }
    ),
    personaStatusBarItem,
  );
}
