import { Pool } from "generic-pool";
import { Browser, NavigationOptions } from "puppeteer";
import * as sharp from "sharp";

import { IConfigAPI } from "../config.api";
import { LoggerService } from "./logger.service";

export class ImageRenderService {
  private readonly GOTO_OPTIONS: NavigationOptions;

  constructor(
    private readonly puppeteerPool: Pool<Browser>,
    private readonly logger: LoggerService,
    private readonly navigationOptions: NavigationOptions
  ) {
    this.GOTO_OPTIONS = {
      waitUntil: "domcontentloaded",
      timeout: 1000000,
      ...navigationOptions
    };
    this.logger.debug(`goto options ${JSON.stringify(this.GOTO_OPTIONS)}`);
  }

  public async screenshot(
    url: string,
    config: IConfigAPI = {}
  ): Promise<Buffer | boolean> {
    config = {
      viewPortWidth: 1080,
      viewPortHeight: 1080,
      isMobile: false,
      isFullPage: false,
      ...config
    };

    this.logger.debug(JSON.stringify(config));

    if (!config.width && !config.height) {
      config.width = 250;

      if (!config.isFullPage) {
        config.height = 250;
      }
    }

    let browser = await this.puppeteerPool.acquire();
    let page = await browser.newPage();
    try {
      await page.goto(url, this.GOTO_OPTIONS);
      await page.setViewport({
        width: config.viewPortWidth,
        height: config.viewPortHeight,
        isMobile: config.isMobile
      });
      let image = await page.screenshot({
        fullPage: config.isFullPage
      });
      image = await this.resize(image, config.width, config.height);
      await this.puppeteerPool.release(browser);

      return image;
    } catch (err) {
      this.logger.debug(JSON.stringify(err));
      browser.close().catch(() => {});
      page.close().catch(() => {});
      return false;
    }
  }

  private async resize(image, width: number, height: number) {
    return await sharp(image)
      .resize(width, height)
      .toBuffer();
  }
}
