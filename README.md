<div align="center">
<h1>
<img src="https://raw.githubusercontent.com/robertohuertasm/vscode-marketplace-preview/master/resources/images/logo_lean.png" alt="logo" width="250">

<b>Marketplace Preview</b>
</h1>

<h3>Easily preview how your <a href="https://code.visualstudio.com" target="_blank">Visual Studio Code</a> extension will look like in the marketplace</h3>
<br/>

[![Version](https://vsmarketplacebadge.apphb.com/version-short/robertohuertasm.vscode-marketplace-preview.svg?style=for-the-badge&colorA=252525&colorB=0079CC)](https://marketplace.visualstudio.com/items?itemName=robertohuertasm.vscode-marketplace-preview)
[![Installs](https://vsmarketplacebadge.apphb.com/installs-short/robertohuertasm.vscode-marketplace-preview.svg?style=for-the-badge&colorA=252525&colorB=0079CC)](https://marketplace.visualstudio.com/items?itemName=robertohuertasm.vscode-marketplace-preview)
[![Downloads](https://vsmarketplacebadge.apphb.com/downloads-short/robertohuertasm.vscode-marketplace-preview.svg?style=for-the-badge&colorA=252525&colorB=0079CC)](https://marketplace.visualstudio.com/items?itemName=robertohuertasm.vscode-marketplace-preview)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating/robertohuertasm.vscode-marketplace-preview.svg?style=for-the-badge&colorA=252525&colorB=0079CC)](https://marketplace.visualstudio.com/items?itemName=robertohuertasm.vscode-marketplace-preview)

<br/>

![demo](https://raw.githubusercontent.com/robertohuertasm/vscode-marketplace-preview/master/resources/images/demo.gif)

</div>

## Features

This extension will allow you to preview how your extension will look like in the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/vscode).

This can be very convenient as there no easy way to do that and most of the time you have to wait for your extension to be published to then realize that the readme didn't look as you expected.

## How it works?

The extension will only be enabled if a `package.json` file is present in your folder.

If that's the case, a new command will be available to you:

```sh
# Ctrl/Cmd+Shift+P or F1
Marketplace: Preview Manifest
```

> Bear in mind that this command will only be available when the `package.json` file is active on VSCode. Note that you will also neeed a `README.md` file for the content to be properly previewed.

Aside from the command, you will also see a new icon in the top left corner of your `package.json` file:

![icon](https://raw.githubusercontent.com/robertohuertasm/vscode-marketplace-preview/master/resources/images/docs_icon.png)

If you press it, you'll see that a new preview panel opens showing you a preview of how your extension would look like.

## Preview your changes

Once you have the `Preview Panel` opened, you'll be able to modify both your `package.json` and `README.md` files.

## Current limitations

The extension works both in the desktop and in the web but it has some limitations:

- It only works with `package.json` and `README.md` files placed in the root of your folder.
- You have to be sure that your `README.md` file is properly capitalized.
