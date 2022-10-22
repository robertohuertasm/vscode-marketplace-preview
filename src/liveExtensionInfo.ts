export interface Publisher {
  publisherId: string;
  publisherName: string;
  displayName: string;
  flags: string;
  domain: string;
  isDomainVerified: boolean;
}

export type Statistic = { statisticName: string; value: number };

export class Statistics {
  public install: number;
  public averageRating: number;
  public ratingCount: number;
  public trendingDaily: number;
  public trendingWeekly: number;
  public trendingMonthly: number;
  public updateCount: number;
  public weightedRating: number;
  public downloadCount: number;

  constructor(data: Statistic[]) {
    this.install = this.findStatistic(data, 'install');
    this.averageRating = this.findStatistic(data, 'averagerating');
    this.ratingCount = this.findStatistic(data, 'ratingcount');
    this.trendingDaily = this.findStatistic(data, 'trendingdaily');
    this.trendingWeekly = this.findStatistic(data, 'trendingweekly');
    this.trendingMonthly = this.findStatistic(data, 'trendingmonthly');
    this.updateCount = this.findStatistic(data, 'updateCount');
    this.weightedRating = this.findStatistic(data, 'weightedRating');
    this.downloadCount = this.findStatistic(data, 'downloadCount');
  }

  private findStatistic(data: Statistic[], statisticName: string): number {
    return data.find(stat => stat.statisticName === statisticName)?.value || 0;
  }
}

export class LiveExtensionInfo {
  public publisher: Publisher;
  public extensionId: string;
  public extensionName: string;
  public displayName: string;
  public flags: string;
  public lastUpdated: Date;
  public publishedDate: Date;
  public releaseDate: Date;
  public shortDescription: string;
  public statistics: Statistics;

  constructor(data: Record<string, any>) {
    this.publisher = data.publisher;
    this.extensionId = data.extensionId;
    this.extensionName = data.extensionName;
    this.displayName = data.displayName;
    this.flags = data.flags;
    this.lastUpdated = new Date(data.lastUpdated);
    this.publishedDate = new Date(data.publishedDate);
    this.releaseDate = new Date(data.releaseDate);
    this.shortDescription = data.shortDescription;
    this.statistics = new Statistics(data.statistics);
  }
}
