import * as vscode from 'vscode';

export class CodeCritterActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    return context.diagnostics
      .filter(d => d.source === 'CodeCritter')
      .map(diagnostic => {
        const label = diagnostic.message.length > 60
          ? `Fix with CodeCritter: ${diagnostic.message.substring(0, 57)}...`
          : `Fix with CodeCritter: ${diagnostic.message}`;

        const action = new vscode.CodeAction(label, vscode.CodeActionKind.QuickFix);
        action.command = {
          command: 'codecritter.fixIssue',
          title: 'Fix with CodeCritter',
          arguments: [document, diagnostic],
        };
        action.diagnostics = [diagnostic];
        return action;
      });
  }
}
