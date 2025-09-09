import * as vscode from 'vscode';
import { exec } from 'child_process';

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