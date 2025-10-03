import * as vscode from 'vscode';
import { startReviewHandler, toggleAutoReviewHandler, selectPersonaHandler, explainCodeHandler, showStatsHandler, generateTestsHandler, intelligentRefactorHandler, generateReadmeHandler } from './handlers';

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

  const startReviewDisposable = vscode.commands.registerCommand(
    'codecritter.start',
    () => startReviewHandler(context)
  );

  const toggleAutoReviewDisposable = vscode.commands.registerCommand(
    'codecritter.toggleAutoReview',
    toggleAutoReviewHandler
  );

  const selectPersonaDisposable = vscode.commands.registerCommand(
    'codecritter.selectPersona',
    selectPersonaHandler
  );

  const explainCodeDisposable = vscode.commands.registerCommand(
  'codecritter.explainCode',
  explainCodeHandler
  );

  const showStatsDisposable = vscode.commands.registerCommand(
  'codecritter.showStats',
  () => showStatsHandler(context)
  );

  const generateTestsDisposable = vscode.commands.registerCommand(
    'codecritter.generateTests',
    generateTestsHandler
  );
    const intelligentRefactorDisposable = vscode.commands.registerCommand(
    'codecritter.refactor',
    intelligentRefactorHandler
  );

  const generateReadmeDisposal = vscode.commands.registerCommand(
    'codecritter.generateReadme',
    generateReadmeHandler
  );

  context.subscriptions.push(
    startReviewDisposable,
    toggleAutoReviewDisposable,
    selectPersonaDisposable,
    personaStatusBarItem,
    explainCodeDisposable,
    showStatsDisposable,
    generateTestsDisposable,
    intelligentRefactorDisposable,
    generateReadmeDisposal
  );
}