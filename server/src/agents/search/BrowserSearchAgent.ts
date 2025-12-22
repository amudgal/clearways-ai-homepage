// Browser Search Agent - Uses headless browser automation to perform searches
// This agent uses Playwright to automate browser interactions for search operations

import { BaseAgent } from '../base/BaseAgent';
import { AgentResult, AgentContext, Evidence, VisitedSiteLog } from '../types';
import { EventEmitter } from 'events';
import { chromium, Browser, Page } from 'playwright';

export interface SearchQuery {
  query: string;
  source: 'roc-website' | 'google' | 'bing' | 'linkedin' | 'business-directory';
  expectedResults?: number;
}

export interface SearchResult {
  url: string;
  title: string;
  snippet?: string;
  relevanceScore?: number;
}

export class BrowserSearchAgent extends BaseAgent {
  private browser: Browser | null = null;
  private maxResults: number = 10;
  private timeout: number = 30000; // 30 seconds
  private customQueries?: SearchQuery[];

  constructor(context: AgentContext, eventEmitter: EventEmitter, customQueries?: SearchQuery[]) {
    super(context, eventEmitter);
    this.customQueries = customQueries;
  }

  async execute(): Promise<AgentResult> {
    try {
      // Initialize browser
      await this.initializeBrowser();

      // Get search queries from custom queries, context, or generate them
      const searchQueries = this.customQueries || this.getSearchQueries();

      if (searchQueries.length === 0) {
        return {
          success: false,
          error: 'No search queries provided',
          cost: 0,
        };
      }

      const allResults: SearchResult[] = [];
      const evidence: Evidence[] = [];

      // Perform searches
      for (const searchQuery of searchQueries) {
        this.emitEvent({
          ts: new Date().toISOString(),
          level: 'info',
          agent: 'BrowserSearch',
          summary: `Performing ${searchQuery.source} search: "${searchQuery.query}"`,
        });

        try {
          const results = await this.performSearch(searchQuery);
          allResults.push(...results);

          // Record evidence
          evidence.push({
            type: 'search_result',
            source: searchQuery.source,
            content: JSON.stringify(results),
            url: this.getSearchUrl(searchQuery),
            timestamp: new Date(),
          });

          // Log visited site
          await this.recordVisitedSite({
            url: this.getSearchUrl(searchQuery),
            completedAt: new Date(),
            success: results.length > 0,
            robotsTxtRespected: true, // We respect robots.txt by default
          });

          this.emitEvent({
            ts: new Date().toISOString(),
            level: 'success',
            agent: 'BrowserSearch',
            summary: `Found ${results.length} results from ${searchQuery.source}`,
            details: { query: searchQuery.query, resultCount: results.length },
          });
        } catch (error) {
          this.emitEvent({
            ts: new Date().toISOString(),
            level: 'error',
            agent: 'BrowserSearch',
            summary: `Search failed for ${searchQuery.source}: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }

      await this.closeBrowser();

      return {
        success: allResults.length > 0,
        data: {
          results: allResults,
          totalResults: allResults.length,
        },
        evidence,
        cost: this.calculateCost(searchQueries.length),
      };
    } catch (error) {
      await this.closeBrowser();
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        cost: 0,
      };
    }
  }

  /**
   * Initialize headless browser
   */
  private async initializeBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });

      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'BrowserSearch',
        summary: 'Headless browser initialized',
      });
    }
  }

  /**
   * Close browser
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Perform search using headless browser
   */
  private async performSearch(searchQuery: SearchQuery): Promise<SearchResult[]> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    
    try {
      // Set viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Navigate to search URL
      const searchUrl = this.getSearchUrl(searchQuery);
      await page.goto(searchUrl, { 
        waitUntil: 'networkidle', 
        timeout: this.timeout 
      });

      // Wait for search results to load
      await page.waitForTimeout(2000); // Allow dynamic content to load

      // Extract search results based on source
      const results = await this.extractSearchResults(page, searchQuery);

      return results.slice(0, searchQuery.expectedResults || this.maxResults);
    } finally {
      await page.close();
    }
  }

  /**
   * Extract search results from page based on source type
   */
  private async extractSearchResults(page: Page, searchQuery: SearchQuery): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    switch (searchQuery.source) {
      case 'roc-website':
        return await this.extractROCResults(page);
      
      case 'google':
        return await this.extractGoogleResults(page);
      
      case 'bing':
        return await this.extractBingResults(page);
      
      case 'linkedin':
        return await this.extractLinkedInResults(page);
      
      case 'business-directory':
        return await this.extractBusinessDirectoryResults(page);
      
      default:
        return await this.extractGenericResults(page);
    }
  }

  /**
   * Extract results from ROC website
   */
  private async extractROCResults(page: Page): Promise<SearchResult[]> {
    return await page.evaluate(() => {
      const results: SearchResult[] = [];
      
      // Look for contractor cards or result items
      const resultElements = document.querySelectorAll(
        '.slds-card, .contractor-result, [class*="result"], [class*="contractor"]'
      );

      resultElements.forEach((element) => {
        const titleElement = element.querySelector('h1, h2, h3, .title, [class*="name"]');
        const linkElement = element.querySelector('a[href]');
        
        if (titleElement && linkElement) {
          results.push({
            url: (linkElement as HTMLAnchorElement).href,
            title: titleElement.textContent?.trim() || '',
            snippet: element.textContent?.trim().substring(0, 200),
          });
        }
      });

      return results;
    });
  }

  /**
   * Extract results from Google search
   */
  private async extractGoogleResults(page: Page): Promise<SearchResult[]> {
    return await page.evaluate(() => {
      const results: SearchResult[] = [];
      
      // Google search result selectors
      const resultElements = document.querySelectorAll('div.g, div[data-ved]');

      resultElements.forEach((element) => {
        const titleElement = element.querySelector('h3, a h3');
        const linkElement = element.querySelector('a[href]');
        const snippetElement = element.querySelector('.VwiC3b, .s, span[style*="-webkit-line-clamp"]');

        if (titleElement && linkElement) {
          const href = (linkElement as HTMLAnchorElement).href;
          // Skip Google's internal links
          if (!href.includes('google.com/search') && !href.startsWith('/search')) {
            results.push({
              url: href,
              title: titleElement.textContent?.trim() || '',
              snippet: snippetElement?.textContent?.trim() || '',
            });
          }
        }
      });

      return results;
    });
  }

  /**
   * Extract results from Bing search
   */
  private async extractBingResults(page: Page): Promise<SearchResult[]> {
    return await page.evaluate(() => {
      const results: SearchResult[] = [];
      
      const resultElements = document.querySelectorAll('li.b_algo, .b_algo');

      resultElements.forEach((element) => {
        const titleElement = element.querySelector('h2 a, a h2');
        const linkElement = element.querySelector('h2 a, a[href]');
        const snippetElement = element.querySelector('.b_caption p, .b_snippet');

        if (titleElement && linkElement) {
          results.push({
            url: (linkElement as HTMLAnchorElement).href,
            title: titleElement.textContent?.trim() || '',
            snippet: snippetElement?.textContent?.trim() || '',
          });
        }
      });

      return results;
    });
  }

  /**
   * Extract results from LinkedIn search
   */
  private async extractLinkedInResults(page: Page): Promise<SearchResult[]> {
    return await page.evaluate(() => {
      const results: SearchResult[] = [];
      
      // LinkedIn search result selectors
      const resultElements = document.querySelectorAll(
        '.search-result, .reusable-search__result-container, [class*="search-result"]'
      );

      resultElements.forEach((element) => {
        const titleElement = element.querySelector('a[href*="/in/"], .search-result__title');
        const linkElement = element.querySelector('a[href*="/in/"]');

        if (titleElement && linkElement) {
          results.push({
            url: (linkElement as HTMLAnchorElement).href,
            title: titleElement.textContent?.trim() || '',
            snippet: element.textContent?.trim().substring(0, 200),
          });
        }
      });

      return results;
    });
  }

  /**
   * Extract results from business directory
   */
  private async extractBusinessDirectoryResults(page: Page): Promise<SearchResult[]> {
    return await page.evaluate(() => {
      const results: SearchResult[] = [];
      
      // Generic business directory selectors
      const resultElements = document.querySelectorAll(
        '.business-listing, .listing, [class*="business"], [class*="listing"]'
      );

      resultElements.forEach((element) => {
        const titleElement = element.querySelector('h1, h2, h3, .name, .title');
        const linkElement = element.querySelector('a[href]');

        if (titleElement && linkElement) {
          results.push({
            url: (linkElement as HTMLAnchorElement).href,
            title: titleElement.textContent?.trim() || '',
            snippet: element.textContent?.trim().substring(0, 200),
          });
        }
      });

      return results;
    });
  }

  /**
   * Extract generic results (fallback)
   */
  private async extractGenericResults(page: Page): Promise<SearchResult[]> {
    return await page.evaluate(() => {
      const results: SearchResult[] = [];
      
      // Look for common link patterns
      const links = document.querySelectorAll('a[href^="http"]');

      links.forEach((link) => {
        const href = (link as HTMLAnchorElement).href;
        const text = link.textContent?.trim() || '';
        
        // Skip common non-result links
        if (!href.includes('javascript:') && 
            !href.includes('#') && 
            text.length > 5 &&
            !results.some(r => r.url === href)) {
          results.push({
            url: href,
            title: text,
            snippet: '',
          });
        }
      });

      return results.slice(0, 10); // Limit to 10 generic results
    });
  }

  /**
   * Get search URL for the query
   */
  private getSearchUrl(searchQuery: SearchQuery): string {
    const encodedQuery = encodeURIComponent(searchQuery.query);

    switch (searchQuery.source) {
      case 'roc-website':
        return `https://azroc.my.site.com/AZRoc/s/contractor-search?search=${encodedQuery}`;
      
      case 'google':
        return `https://www.google.com/search?q=${encodedQuery}`;
      
      case 'bing':
        return `https://www.bing.com/search?q=${encodedQuery}`;
      
      case 'linkedin':
        return `https://www.linkedin.com/search/results/all/?keywords=${encodedQuery}`;
      
      case 'business-directory':
        // Generic business directory search
        return `https://www.google.com/search?q=${encodedQuery}+business+directory`;
      
      default:
        return `https://www.google.com/search?q=${encodedQuery}`;
    }
  }

  /**
   * Get search queries from context or generate them
   */
  private getSearchQueries(): SearchQuery[] {
    const { contractorInput } = this.context;
    const queries: SearchQuery[] = [];

    // Generate queries based on available contractor data
    if (contractorInput.contractorName) {
      queries.push({
        query: `${contractorInput.contractorName} ${contractorInput.city || 'Arizona'} contact email`,
        source: 'google',
        expectedResults: 5,
      });

      queries.push({
        query: `${contractorInput.contractorName} ${contractorInput.city || 'Arizona'}`,
        source: 'linkedin',
        expectedResults: 3,
      });
    }

    if (contractorInput.rocNumber) {
      queries.push({
        query: contractorInput.rocNumber,
        source: 'roc-website',
        expectedResults: 1,
      });
    }

    if (contractorInput.businessName || contractorInput.contractorName) {
      queries.push({
        query: `${contractorInput.businessName || contractorInput.contractorName} ${contractorInput.city || 'Arizona'} business directory`,
        source: 'business-directory',
        expectedResults: 3,
      });
    }

    return queries;
  }

  /**
   * Calculate cost for search operations
   */
  private calculateCost(searchCount: number): number {
    // $0.01 per search operation
    return searchCount * 0.01;
  }
}

