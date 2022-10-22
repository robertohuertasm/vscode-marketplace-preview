import * as vscode from 'vscode';
import MarkdownIt from 'markdown-it';
import { ManifestData } from './manifestData';

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "vscode-marketplace-preview" is now active!',
  );

  let disposable = vscode.commands.registerCommand(
    'vscode-marketplace-preview.preview',
    async () => {
      await getReadmeAsHtml(context);
    },
  );

  context.subscriptions.push(disposable);
}

async function getReadmeAsHtml(context: vscode.ExtensionContext) {
  const fs = vscode.workspace.fs;
  const md = new MarkdownIt({ html: true, linkify: true });
  const root = vscode.workspace.workspaceFolders?.[0].uri;

  const readmeUri = vscode.Uri.joinPath(root!, 'README.md');
  const readme = await fs.readFile(readmeUri);
  const readmeStr = md.render(readme.toString());

  const editor = vscode.window.activeTextEditor;
  const data = editor?.document.getText();
  // Check to ensure that manifest file is not empty
  if (!data) {
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'preview',
    'Manifest Preview',
    vscode.ViewColumn.Two,
  );

  const manifest = new ManifestData(JSON.parse(data), root!, panel.webview);

  const cssPath = vscode.Uri.joinPath(
    context.extensionUri,
    'resources/template.css',
  )
    .with({ scheme: 'vscode-resource' })
    .toString();

  const templateUri = vscode.Uri.joinPath(
    context.extensionUri,
    'resources/template.html',
  );
  const template = await fs.readFile(templateUri);
  const templateStr = (await manifest.replace(template.toString()))
    .replace('${{markdown}}', readmeStr)
    .replace('${{cssPath}}', cssPath);

  panel.webview.html = templateStr;
}

// This method is called when your extension is deactivated
export function deactivate() {}
