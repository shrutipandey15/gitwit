import * as vscode from 'vscode';
import { exec } from 'child_process';
import { GitExtensionExports } from '../types';
import { analyzeAndSuggestCommit } from '../ai/ai';

export function executeCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const workspaceFolder =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return resolve('');
    }

    exec(command, { cwd: workspaceFolder }, (error, stdout, stderr) => {
      if (error) {
        console.warn(`Warning executing command "${command}":`, stderr);
        resolve('');
        return;
      }
      resolve(stdout);
    });
  });
}

export async function setupProactiveCommitAssistant(
  context: vscode.ExtensionContext
) {
  console.log('CodeCritter: Setting up proactive commit assistant...');

  const gitExtension =
    vscode.extensions.getExtension<GitExtensionExports>('vscode.git');
  if (!gitExtension) {
    console.warn(
      'CodeCritter: VS Code Git extension not found. Proactive commit assistant is disabled.'
    );
    return;
  }
  await gitExtension.activate();
  console.log('CodeCritter: Git extension is active.');

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      console.log(`CodeCritter: File saved: ${document.uri.path}`);

      if (document.uri.path.includes('/.git/')) {
        console.log(
          'CodeCritter: Save was inside .git directory, ignoring.'
        );
        return;
      }

      const config = vscode.workspace.getConfiguration('codecritter');
      const userApiKey = config.get('apiKey') as string;
      const commitAssistEnabled = config.get('commitAssistEnabled', true);

      if (!userApiKey || !commitAssistEnabled) {
        return;
      }

      const stagedDiff = await executeCommand('git diff --staged');
      const unstagedDiff = await executeCommand('git diff');
      const fullDiff = (stagedDiff + '\n' + unstagedDiff).trim();

      if (!fullDiff) {
        console.log(
          'CodeCritter: No changes detected after running git diff command.'
        );
        return;
      }
      console.log('CodeCritter: Diff generated successfully via command line.');

      try {
        const analysis = await analyzeAndSuggestCommit(fullDiff, userApiKey);
        if (analysis.ready) {
          const persona = config.get('persona', 'Strict Tech Lead');
          const commitMessage = analysis.commitMessage;

          const message = getPopupMessage(persona, commitMessage);

          const userChoice = await vscode.window.showInformationMessage(
            message,
            { modal: true },
            'Commit',
            'Cancel'
          );

          if (userChoice === 'Commit') {
            const terminal =
              vscode.window.createTerminal('CodeCritter Commit');
            terminal.sendText(
              `git add . && git commit -m "${commitMessage}"`
            );
            terminal.show();
            vscode.window.showInformationMessage('Commit successful!');
          }
        } else {
          console.log(
            'CodeCritter: AI deemed changes NOT READY. Reason:',
            analysis.reason
          );
        }
      } catch (error) {
        console.error(
          'CodeCritter: Failed to analyze for commit on save:',
          error
        );
      }
    })
  );
}

function getPopupMessage(persona: string, commitMessage: string): string {
  const formattedCommit = `\n\n"${commitMessage}"`;
  switch (persona) {
    case 'Supportive Mentor':
      return `Looks like you've done some great work! I think it's ready to go. How about this commit message?${formattedCommit}`;
    case 'Sarcastic Reviewer':
      return `Oh, look, you actually finished something. I guess you can commit it. If you have to.${formattedCommit}`;
    case 'Code Poet':
      return `A beautiful composition of logic and form. This change is ready for the ages. Shall we use this message?${formattedCommit}`;
    case 'Paranoid Security Engineer':
      return `I've scanned for vulnerabilities and it seems... acceptable. For now. Commit with this message, and stay alert.${formattedCommit}`;
    case 'Strict Tech Lead':
    default:
      return `This change meets our standards. It's ready for commit. Use the following message.${formattedCommit}`;
  }
}