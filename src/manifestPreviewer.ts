import MarkdownIt from 'markdown-it';
import { TextDecoder } from 'web-encoding';
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

    const decoder = new TextDecoder();
    const packageJson = await fs.readFile(packageJsonUri);
    const packageJsonStr = decoder.decode(packageJson);

    console.log(`packageJson: ${packageJsonStr}`);
    const panel =
      prevPanel ??
      vscode.window.createWebviewPanel(
        'preview',
        'Manifest Preview',
        vscode.ViewColumn.Two,
      );

    const manifest = new ManifestData(
      JSON.parse(packageJsonStr),
      root!,
      panel.webview,
    );

    const cssPath = panel.webview
      .asWebviewUri(vscode.Uri.joinPath(extensionUri, 'resources/template.css'))
      .toString();

    const templateUri = vscode.Uri.joinPath(
      extensionUri,
      'resources/template.html',
    );
    const template = await fs.readFile(templateUri);
    const templateStr = decoder.decode(template);
    const finalTemplateStr = (await manifest.replace(templateStr))
      .replace('${{markdown}}', readmeStr)
      .replace('${{cssPath}}', cssPath);

    panel.webview.html = finalTemplateStr;
    return panel;
  }

  private async getReadme(readmeUri: vscode.Uri): Promise<string | undefined> {
    try {
      const fs = vscode.workspace.fs;
      const readme = await fs.readFile(readmeUri);
      const decoder = new TextDecoder();
      const decodedStr = decoder.decode(readme);
      const md = new MarkdownIt({ html: true, linkify: true });
      const readmeStr = md.render(decodedStr);
      console.log(`readmeStr: ${readmeStr}`);
      return readmeStr;
    } catch (e) {
      console.warn(e);
      return undefined;
    }
  }
}
