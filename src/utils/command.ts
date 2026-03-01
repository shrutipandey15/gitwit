import * as vscode from 'vscode';
import { exec, execFile } from 'child_process';

export function executeCommand(command: string): Promise<string> {
  return new Promise((resolve) => {
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

export function executeGitCommit(message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return reject(new Error('No workspace folder found.'));
    }
    execFile('git', ['commit', '-m', message], { cwd: workspaceFolder }, (commitError) => {
      if (commitError) {
        return reject(new Error(`git commit failed: ${commitError.message}`));
      }
      resolve();
    });
  });
}