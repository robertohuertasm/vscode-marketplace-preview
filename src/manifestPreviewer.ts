import MarkdownIt from 'markdown-it';
import * as vscode from 'vscode';
import { ManifestData } from './manifestData';

export class ManifestPreviewer extends vscode.Disposable {
  private isWatcherActive = false;
  private subscriptions: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    super(() => this.subscriptions.forEach(d => d.dispose()));

    const root = vscode.workspace.workspaceFolders?.[0].uri!;
    const readmeUri = vscode.Uri.joinPath(root, 'README.md');
    const packageJsonUri = vscode.Uri.joinPath(root, 'package.json');

    const command = vscode.commands.registerCommand(
      'vscode-marketplace-preview.preview',
      async () => {
        const panel = await this.preview(
          root,
          context.extensionUri,
          readmeUri,
          packageJsonUri,
        );
        if (panel && !this.isWatcherActive) {
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

          this.isWatcherActive = true;

          const watcherHandler = async () => {
            await this.preview(
              root,
              context.extensionUri,
              readmeUri,
              packageJsonUri,
              panel,
            );
          };

          packageJaonWatcher.onDidChange(watcherHandler);
          readmeWatcher.onDidChange(watcherHandler);

          this.subscriptions.push(
            panel.onDidDispose(() => {
              packageJaonWatcher.dispose();
              readmeWatcher.dispose();
              this.isWatcherActive = false;
            }),
          );
        }
      },
    );

    this.subscriptions.push(command);
  }

  private async preview(
    root: vscode.Uri,
    extensionUri: vscode.Uri,
    readmeUri: vscode.Uri,
    packageJsonUri: vscode.Uri,
    prevPanel?: vscode.WebviewPanel,
  ): Promise<vscode.WebviewPanel | undefined> {
    const fs = vscode.workspace.fs;
    const readmeStr = await this.getReadme(readmeUri);
    if (!readmeStr) {
      vscode.window.showErrorMessage(
        `The manifest cannot be previewed without a README.md file. Create a README.md file in the root of your project.`,
      );
      return;
    }

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

  private async getReadme(readmeUri: vscode.Uri): Promise<string | undefined> {
    try {
      const fs = vscode.workspace.fs;
      const readme = await fs.readFile(readmeUri);
      const md = new MarkdownIt({ html: true, linkify: true });
      const readmeStr = md.render(readme.toString());
      return readmeStr;
    } catch {
      return undefined;
    }
  }
}
