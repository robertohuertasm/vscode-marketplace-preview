import * as vscode from 'vscode';
import MarkdownIt from 'markdown-it';
import { ManifestData } from './manifestData';

let isWatcherActive = false;

export function activate(context: vscode.ExtensionContext) {
  const root = vscode.workspace.workspaceFolders?.[0].uri!;
  const readmeUri = vscode.Uri.joinPath(root, 'README.md');
  const packageJsonUri = vscode.Uri.joinPath(root, 'package.json');

  const command = vscode.commands.registerCommand(
    'vscode-marketplace-preview.preview',
    async () => {
      const panel = await getReadmeAsHtml(
        root,
        context.extensionUri,
        readmeUri,
        packageJsonUri,
      );
      if (panel && !isWatcherActive) {
        let activeWebPanel = panel;
        const packageJaonWatcher = vscode.workspace.createFileSystemWatcher(
          packageJsonUri.fsPath,
          true,
          false,
          true,
        );
        const readmeWatcher = vscode.workspace.createFileSystemWatcher(
          readmeUri.fsPath,
          true,
          false,
          true,
        );
        isWatcherActive = true;
        const watcherHandler = async () => {
          await getReadmeAsHtml(
            root,
            context.extensionUri,
            readmeUri,
            packageJsonUri,
            panel,
          );
        };

        context.subscriptions.push(
          packageJaonWatcher.onDidChange(watcherHandler),
          readmeWatcher.onDidChange(watcherHandler),
          panel.onDidDispose(() => {
            packageJaonWatcher.dispose();
            readmeWatcher.dispose();
            isWatcherActive = false;
          }),
        );
      }
    },
  );

  context.subscriptions.push(command);
}

async function getReadmeAsHtml(
  root: vscode.Uri,
  extensionUri: vscode.Uri,
  readmeUri: vscode.Uri,
  packageJsonUri: vscode.Uri,
  prevPanel?: vscode.WebviewPanel,
): Promise<vscode.WebviewPanel | undefined> {
  const fs = vscode.workspace.fs;
  const md = new MarkdownIt({ html: true, linkify: true });

  const readme = await fs.readFile(readmeUri);
  const readmeStr = md.render(readme.toString());

  const packageJson = await fs.readFile(packageJsonUri);

  const panel =
    prevPanel ??
    vscode.window.createWebviewPanel(
      'preview',
      'Manifest Preview',
      vscode.ViewColumn.Two,
    );

  const manifest = new ManifestData(
    JSON.parse(packageJson.toString()),
    root!,
    panel.webview,
  );

  const cssPath = vscode.Uri.joinPath(extensionUri, 'resources/template.css')
    .with({ scheme: 'vscode-resource' })
    .toString();

  const templateUri = vscode.Uri.joinPath(
    extensionUri,
    'resources/template.html',
  );
  const template = await fs.readFile(templateUri);
  const templateStr = (await manifest.replace(template.toString()))
    .replace('${{markdown}}', readmeStr)
    .replace('${{cssPath}}', cssPath);

  panel.webview.html = templateStr;

  return panel;
}

// This method is called when your extension is deactivated
export function deactivate() {}
