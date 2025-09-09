import * as vscode from 'vscode';
import { startReviewHandler, toggleAutoReviewHandler } from './handlers';

export function registerCommands(context: vscode.ExtensionContext) {
  const startReviewDisposable = vscode.commands.registerCommand(
    'codecritter.start',
    () => startReviewHandler(context)
  );

  const toggleAutoReviewDisposable = vscode.commands.registerCommand(
    'codecritter.toggleAutoReview',
    toggleAutoReviewHandler
  );

  context.subscriptions.push(
    startReviewDisposable,
    toggleAutoReviewDisposable
  );
}