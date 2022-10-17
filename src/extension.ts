import * as vscode from 'vscode';
import * as MarkdownIt from 'markdown-it';

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "vscode-marketplace-preview" is now active!',
  );

  let disposable = vscode.commands.registerCommand(
    'vscode-marketplace-preview.helloWorld',
    async () => {
      const outputChannel = vscode.window.createOutputChannel(
        'Marketplace Preview',
      );
      await getReadmeAsHtml(outputChannel, context);
    },
  );

  context.subscriptions.push(disposable);
}

async function getReadmeAsHtml(
  outputChannel: vscode.OutputChannel,
  context: vscode.ExtensionContext,
) {
  const fs = vscode.workspace.fs;
  const md = new MarkdownIt({ html: true, linkify: true });
  const root = vscode.workspace.workspaceFolders?.[0].uri;

  const readmeUri = vscode.Uri.joinPath(root!, 'README.md');
  const readme = await fs.readFile(readmeUri);
  const readmeStr = md.render(readme.toString());

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
  const templateStr = template
    .toString()
    .replace('<!-- MARKDOWN-INSERT-->', readmeStr)
    .replace('{{cssPath}}', cssPath);

  const panel = vscode.window.createWebviewPanel(
    'preview',
    'Preview',
    vscode.ViewColumn.One,
  );
  panel.webview.html = templateStr;

  outputChannel.appendLine(readmeStr);
  // outputChannel.show();
}

// This method is called when your extension is deactivated
export function deactivate() {}
