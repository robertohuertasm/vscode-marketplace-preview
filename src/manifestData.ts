/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import axios from 'axios';
import { LiveExtensionInfo } from './liveExtensionInfo';

type Badge = { url: string; href: string; description: string };

export class ManifestData {
  public name: string;
  public displayName: string;
  public version: string;
  public description: string;
  public publisher: string;
  public categories: string[];
  public tags: string[];
  public galleryBanner: {
    theme: string;
    color: string;
  };
  public preview: boolean;
  public imagePath: string;
  public license: string;
  public bugs: string;
  public homepage: string;
  public repository: string;
  public sponsor?: string;
  public isWeb: boolean;
  public author: { name: string; email: string };
  public pricing: string;
  public badges: Badge[];

  constructor(
    data: Record<string, any>,
    packageJsonUri: vscode.Uri,
    webView: vscode.Webview,
  ) {
    this.name = data.name || '';
    this.displayName = data.displayName || '';
    this.publisher = data.publisher || '';
    this.description = data.description || '';
    this.version = data.version || '';
    this.categories = data.categories || [];
    this.tags = data.keywords || [];
    this.galleryBanner = {
      theme: data.galleryBanner?.theme || 'light',
      color: data.galleryBanner?.color || '#ffffff',
    };
    this.license = data.license || '';
    this.repository = data.repository?.url || '';
    this.homepage = data.homepage || '';
    this.bugs = data.bugs?.url || '';
    this.preview = data.preview || '';
    this.sponsor = data.sponsor?.url;
    this.isWeb = !!data.browser;
    const onDiskPath = vscode.Uri.parse(
      packageJsonUri.toString().replace('package.json', data.icon || ''),
    );
    this.imagePath = webView.asWebviewUri(onDiskPath).toString();
    this.author = {
      name: data.author?.name || 'Roberto Huertas',
      email: data.author?.email || 'roberto.huertas@outlook.com',
    };
    this.pricing = data.pricing === 'Trial' ? 'Free Trial' : 'Free';
    this.badges = data.badges || [];
  }

  public async replace(template: string): Promise<string> {
    const liveInfo = await this.getLiveInfo();
    const nicePublisherName = liveInfo?.publisher.displayName || this.publisher;
    const domain = liveInfo?.publisher.domain || '';
    const isDomainVerified = liveInfo?.publisher.isDomainVerified || false;

    const content = template
      .replace(/\${{name}}/g, this.name)
      .replace(/\${{displayName}}/g, this.displayName)
      .replace(/\${{publisher}}/g, this.publisher)
      .replace(/\${{description}}/g, this.description)
      .replace(/\${{pricing}}/g, this.pricing)
      .replace(
        /\${{descriptionHTML}}/g,
        this.description.replace(/\S/g, '#32;'),
      )
      .replace(/\${{version}}/g, this.version)
      .replace(/\${{firstCategory}}/g, this.getFirstCategory())
      .replace(/\${{categories}}/g, this.getCategories())
      .replace(/\${{tags}}/g, this.getTags())
      .replace(/\${{sponsor}}/g, this.getSponsor())
      .replace(/\${{preview}}/g, this.getPreview())
      .replace(/\${{repositoryResource}}/g, this.getRepositoryResource())
      .replace(/\${{homepageResource}}/g, this.getHomepageResource())
      .replace(/\${{bugsResource}}/g, this.getBugsResource())
      .replace(/\${{badges}}/g, this.getBadges())
      .replace(/\${{repository}}/g, this.repository)
      .replace(/\${{nicePublisherName}}/g, nicePublisherName)
      .replace(/\${{backgroundColor}}/g, this.galleryBanner.color)
      .replace(/\${{theme}}/g, this.galleryBanner.theme)
      .replace(
        /\${{themeColor}}/g,
        this.galleryBanner.theme === 'light' ? '#000' : '#fff',
      )
      .replace(/\${{extensionIcon}}/g, this.imagePath)
      .replace(/\${{authorName}}/g, this.author.name)
      .replace(/\${{authorEmail}}/g, this.author.email)
      .replace(
        /\${{releaseDate}}/g,
        liveInfo?.releaseDate?.toLocaleString() || '6/1/2016, 2:23:28 AM',
      )
      .replace(
        /\${{lastUpdatedDate}}/g,
        liveInfo?.lastUpdated?.toLocaleString() || '10/16/2022, 1:19:18 AM',
      )
      .replace(
        /\${{installs}}/g,
        liveInfo?.statistics?.install.toLocaleString() || '12,155,306',
      )
      .replace(
        /\${{ratingCount}}/g,
        liveInfo?.statistics?.ratingCount.toLocaleString() || '418',
      )
      .replace(
        /\${{rawRepository}}/g,
        this.repository.replace('https://github.com/', ''),
      )
      .replace(
        /\${{verifiedDomain}}/g,
        isDomainVerified ? this.getVerified(nicePublisherName, domain) : '',
      )
      .replace(/\${{isWeb}}/g, this.isWeb ? `, Web` : '');
    return content;
  }

  private async getLiveInfo(): Promise<LiveExtensionInfo | undefined> {
    try {
      const response = await axios.post(
        ` https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery`,
        {
          filters: [
            {
              criteria: [
                {
                  filterType: 7,
                  value: `${this.publisher}.${this.name}`,
                },
              ],
            },
          ],
          flags: 914,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json;api-version=3.0-preview.1',
          },
        },
      );
      const data = response.data.results[0].extensions[0];
      const info = new LiveExtensionInfo(data);
      return info;
    } catch (error) {
      console.warn(`Not able to get live extension information: ${error}`);
      return undefined;
    }
  }

  private getVerified(nicePublisherName: string, domain: string): string {
    return `<div class="ux-marketplace-verified-doamin-icon"><div class="verified-domain-icon"><i class="verified-domain-icon-background" role="presentation"></i><i class="verified-domain-icon-foreground" role="presentation" title="${nicePublisherName} has a verified ownership for the domain ${domain.replace(
      'https://',
      '',
    )}"></i></div></div>`;
  }

  private getPreview(): string {
    if (!this.preview) {
      return '';
    }
    return `<span class="ux-item-titleTag ${this.galleryBanner.theme}">Preview</span>`;
  }

  private getSponsor(): string {
    if (!this.sponsor) {
      return '';
    }
    return `<div><span class="divider"> | </span><a class="${this.galleryBanner.theme}" href="${this.sponsor}" target="_blank"><span class="ux-item-sponsor-heart-icon bowtie-icon bowtie-heart-icon " style="color:#D61B8C"></span><span class="ux-sponsor-text-icon " style="color:#ffffff">Sponsor</span></a></div>`;
  }

  private getFirstCategory(): string {
    return this.categories[0] || '';
  }

  private getCategories(): string {
    return this.categories
      .map(
        category =>
          `<a class="meta-data-list-link" href="/search?sortBy=Installs&amp;category=${category}&amp;target=VSCode" target="_blank" aria-label="${category} Category Click to search for more extensions having the ${category} Category" role="link">${category}</a>`,
      )
      .join('');
  }

  private getTags(): string {
    return this.tags
      .map(
        tag =>
          `<a class="meta-data-list-link"
          href="/search?term=tag%3A${tag}&amp;target=VSCode" target="_blank"
          aria-label="${tag} Tag Click to search for more extensions having the ${tag} Tag"
          role="link">${tag}</a>`,
      )
      .join('');
  }

  private getBugsResource(): string {
    if (!this.bugs) {
      return '';
    }
    return `<li><a href="${this.bugs}"
    target="_blank" rel="noreferrer noopener nofollow">Issues</a></li>`;
  }

  private getRepositoryResource(): string {
    if (!this.repository) {
      return '';
    }
    return `<li><a href="${this.repository}"
    target="_blank" rel="noreferrer noopener nofollow">Repository</a></li>`;
  }

  private getHomepageResource(): string {
    if (!this.homepage) {
      return '';
    }
    return `<li><a href="${this.homepage}"
    target="_blank" rel="noreferrer noopener nofollow">Homepage</a></li>`;
  }

  private getBadges(): string {
    if (!this.badges.length) {
      return '';
    }
    return `<div class="ux-section-badges">
    <ul>
    ${this.badges
      .map(
        b =>
          `<li><a class="badge" href="${b.href}" target="_blank" rel="noreferrer noopener nofollow"><img src="${b.url}" title="${b.description}" alt="${b.href}"></a></li>`,
      )
      .join('')}
    </ul>
  </div>`;
  }
}
