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
    const defaultReadmeUri = vscode.Uri.joinPath(root, 'README.md');
    const defaultPackageJsonUri = vscode.Uri.joinPath(root, 'package.json');

    // The command is always going to be launched when a package.json file is opened,
    // so for us to support any package.json file, regardless of the position in the workspace,
    // we can leverage the active text editor to get the package.json file uri.
    // The convention for README.md is that it should be in same folder as package.json

    const command = vscode.commands.registerCommand(
      'vscode-marketplace-preview.preview',
      async () => {
        // we'll use the default package.json and README.md if the active text editor is not a package.json file
        // that should not ever happen... but just in case.
        let readmeUri = defaultReadmeUri;
        let packageJsonUri = defaultPackageJsonUri;

        const editor = vscode.window.activeTextEditor;
        if (editor) {
          packageJsonUri = editor.document.uri;
          readmeUri = vscode.Uri.parse(
            packageJsonUri.toString().replace('package.json', 'README.md'),
          );
        }

        const panel = await this.preview(
          context.extensionUri,
          readmeUri,
          packageJsonUri,
        );
        if (panel && !this.isWatcherActive) {
          const packageJsonWatcher = vscode.workspace.createFileSystemWatcher(
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
              context.extensionUri,
              readmeUri,
              packageJsonUri,
              panel,
            );
          };

          packageJsonWatcher.onDidChange(watcherHandler);
          readmeWatcher.onDidChange(watcherHandler);

          this.subscriptions.push(
            panel.onDidDispose(() => {
              packageJsonWatcher.dispose();
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
    extensionUri: vscode.Uri,
    readmeUri: vscode.Uri,
    packageJsonUri: vscode.Uri,
    prevPanel?: vscode.WebviewPanel,
  ): Promise<vscode.WebviewPanel | undefined> {
    const fs = vscode.workspace.fs;
    const readmeStr = await this.getReadme(readmeUri);
    if (!readmeStr) {
      vscode.window.showErrorMessage(
        `The manifest cannot be previewed without a README.md file. Create a README.md file next to your package.json file on your project.`,
      );
      return;
    }

    const decoder = new TextDecoder();
    const packageJson = await fs.readFile(packageJsonUri);
    const packageJsonStr = decoder.decode(packageJson);

    const panel =
      prevPanel ??
      vscode.window.createWebviewPanel(
        'preview',
        'Manifest Preview',
        vscode.ViewColumn.Two,
      );

    const manifest = new ManifestData(
      JSON.parse(packageJsonStr),
      packageJsonUri,
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
      return readmeStr;
    } catch (e) {
      console.warn(e);
      return undefined;
    }
  }
}
