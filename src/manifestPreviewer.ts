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

    const previewCommandSubs = vscode.commands.registerCommand(
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

    const activeEditorSubs = vscode.window.onDidChangeActiveTextEditor(
      this.checkEditorIsVscodePackageJson,
      this,
    );

    // initial check for active editor, just in case the extension is activated when a package.json file is already open.
    this.checkEditorIsVscodePackageJson();

    this.subscriptions.push(previewCommandSubs, activeEditorSubs);
  }

  private checkEditorIsVscodePackageJson(editor?: vscode.TextEditor): void {
    if (!editor) {
      editor = vscode.window.activeTextEditor;
    }
    const document = editor?.document;
    if (!document?.fileName.endsWith('package.json')) {
      return;
    }
    const isVSCodePackageJson = this.isVSCodePackageJson(document);
    vscode.commands.executeCommand(
      'setContext',
      'marketplacePreview.isVSCodePackageJson',
      isVSCodePackageJson,
    );
  }

  private isVSCodePackageJson(document: vscode.TextDocument): boolean {
    const packageJson = JSON.parse(document.getText()) as {
      engines?: { vscode?: string };
    };
    return !!packageJson.engines?.vscode;
  }

  private async readJsonFile(uri: vscode.Uri): Promise<Record<string, any>> {
    const str = await this.fileAsString(uri);
    return JSON.parse(str);
  }

  private async fileAsString(uri: vscode.Uri): Promise<string> {
    const fs = vscode.workspace.fs;
    const decoder = new TextDecoder();
    const str = await fs.readFile(uri);
    return decoder.decode(str);
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

    const panel =
      prevPanel ??
      vscode.window.createWebviewPanel(
        'preview',
        'Manifest Preview',
        vscode.ViewColumn.Two,
      );

    const packageJson = await this.readJsonFile(packageJsonUri);
    const manifest = new ManifestData(
      packageJson,
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

    const templateStr = await this.fileAsString(templateUri);
    const finalTemplateStr = (await manifest.replace(templateStr))
      .replace('${{markdown}}', readmeStr)
      .replace('${{cssPath}}', cssPath);

    panel.webview.html = finalTemplateStr;
    return panel;
  }

  private async getReadme(readmeUri: vscode.Uri): Promise<string | undefined> {
    try {
      const decodedStr = await this.fileAsString(readmeUri);
      const md = new MarkdownIt({ html: true, linkify: true });
      const readmeStr = md.render(decodedStr);
      return readmeStr;
    } catch (e) {
      console.warn(e);
      return undefined;
    }
  }
}
