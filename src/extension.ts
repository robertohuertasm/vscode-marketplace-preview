import * as vscode from 'vscode';
import { ManifestPreviewer } from './manifestPreviewer';

export function activate(context: vscode.ExtensionContext) {
  // vscode.window.showInformationMessage('Marketplace preview enabled');
  context.subscriptions.push(new ManifestPreviewer(context));
}

export function deactivate() {}
