// Reasoning Orchestrator Agent - Hybrid Approach
// Uses LLM for strategic decisions, deterministic agents for execution

import { BaseAgent } from '../base/BaseAgent';
import { AgentResult, AgentContext, Entity, EmailCandidate, ExplanationEvent } from '../types';
import { LLMReasoningService, DiscoveryStrategy } from '../../services/llmService';
import { RocLookupAgent } from '../roc/RocLookupAgent';
import { BrowserSearchAgent, SearchQuery } from '../search/BrowserSearchAgent';
import { KnowledgeService } from '../../services/knowledgeService';
import { prisma } from '../../config/prisma';
// import { ScrapeExtractionAgent } from '../scrape/ScrapeExtractionAgent';
// import { EmailValidationAgent } from '../validation/EmailValidationAgent';
// import { ComplianceAgent } from '../compliance/ComplianceAgent';
// import { CostMeteringAgent } from '../cost/CostMeteringAgent';

export class ReasoningOrchestratorAgent extends BaseAgent {
  private llmService: LLMReasoningService;
  private useLLM: boolean;
  private rocLookup: RocLookupAgent;
  private browserSearch: BrowserSearchAgent;
  private knowledgeService: KnowledgeService;

  constructor(
    context: AgentContext,
    eventEmitter: any, // EventEmitter
  ) {
    super(context, eventEmitter);
    this.llmService = new LLMReasoningService();
    this.useLLM = context.preferences.useLLM !== false && this.llmService.isAvailable();
    this.rocLookup = new RocLookupAgent(context, eventEmitter);
    this.browserSearch = new BrowserSearchAgent(context, eventEmitter);
    this.knowledgeService = new KnowledgeService();

    if (this.useLLM) {
      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: 'LLM reasoning enabled - using hybrid approach',
      });
    } else {
      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: 'LLM not available - using deterministic approach',
      });
    }
  }

  async execute(): Promise<AgentResult> {
    try {
      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `Starting discovery for ${this.context.contractorInput.contractorName}`,
      });

      // Step 1: ROC Lookup (deterministic)
      const rocResult = await this.performROCLookup();
      if (!rocResult.success) {
        return {
          success: false,
          error: 'ROC lookup failed',
          cost: 0,
        };
      }

      const contractorEntity = rocResult.data as Entity;
      this.context.currentEntityId = contractorEntity.id;

      // Step 2: Decide Strategy (LLM or Deterministic)
      const strategy = await this.decideStrategy(contractorEntity);

      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `Strategy: ${strategy.approach} - ${strategy.reasoning}`,
        details: { strategy },
      });

      // Step 3: Execute Strategy (deterministic)
      const discoveryResult = await this.executeStrategy(strategy, contractorEntity);

      // Step 4: Validate Emails (deterministic)
      const validationResult = await this.validateEmails(discoveryResult.emails || []);

      // Step 5: Generate Interpretation (LLM or Deterministic)
      const interpretation = await this.interpretResults(validationResult);

      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'success',
        agent: 'ReasoningOrchestrator',
        summary: interpretation.summary,
        details: { interpretation },
      });

      return {
        success: true,
        data: {
          entity: contractorEntity,
          emails: validationResult.emails,
          interpretation,
          strategy: strategy.approach,
        },
        cost: discoveryResult.cost || 0,
      };
    } catch (error) {
      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'error',
        agent: 'ReasoningOrchestrator',
        summary: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        cost: 0,
      };
    }
  }

  /**
   * Step 1: ROC Lookup (Deterministic)
   */
  private async performROCLookup(): Promise<AgentResult> {
    // Use actual ROC lookup agent
    return await this.rocLookup.execute();
  }

  /**
   * Step 2: Decide Strategy using LLM based on ROC data (Hybrid - LLM or Deterministic)
   */
  private async decideStrategy(contractorEntity: Entity): Promise<DiscoveryStrategy> {
    // Extract city from address if available
    const city = contractorEntity.address 
      ? contractorEntity.address.split(',').find(part => part.trim().match(/^[A-Za-z\s]+$/))?.trim() || 
        contractorEntity.address.split(',')[0]?.trim()
      : this.context.contractorInput.city;

    if (this.useLLM) {
      // Use LLM for strategic decision based on ROC data
      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: 'Using LLM to plan email discovery strategy from ROC data',
      });

      return await this.llmService.decideStrategy({
        contractorName: contractorEntity.contractorName,
        rocNumber: contractorEntity.rocNumber,
        city: city,
        hasOfficialWebsite: !!contractorEntity.officialWebsite,
        rocData: {
          businessName: contractorEntity.businessName,
          website: contractorEntity.officialWebsite,
          address: contractorEntity.address,
          phone: contractorEntity.phone,
          classification: contractorEntity.classification,
          licenseStatus: contractorEntity.licenseStatus,
        },
      });
    } else {
      // Fallback to deterministic
      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: 'Using deterministic strategy (LLM not available)',
      });

      return this.llmService.deterministicStrategy({
        contractorName: contractorEntity.contractorName,
        rocNumber: contractorEntity.rocNumber,
        city: city,
        hasOfficialWebsite: !!contractorEntity.officialWebsite,
      });
    }
  }

  /**
   * Step 3: Execute Strategy (Deterministic)
   */
  private async executeStrategy(
    strategy: DiscoveryStrategy,
    contractorEntity: Entity
  ): Promise<{ emails: string[]; cost: number }> {
    const emails: string[] = [];
    let totalCost = 0;

    this.emitEvent({
      ts: new Date().toISOString(),
      level: 'info',
      agent: 'ReasoningOrchestrator',
      summary: `Executing ${strategy.approach} strategy`,
    });

    // Priority 0: Always use headless browser to search ROC website if ROC number is available
    if (contractorEntity.rocNumber) {
      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `Using headless browser to search ROC website for license ${contractorEntity.rocNumber}`,
      });

      // Create ROC-specific search query
      const rocSearchQueries: SearchQuery[] = [{
        query: contractorEntity.rocNumber,
        source: 'roc-website',
        expectedResults: 1,
      }];

      const rocBrowserSearch = new BrowserSearchAgent(this.context, this.eventEmitter, rocSearchQueries);
      const rocSearchResult = await rocBrowserSearch.execute();

      if (rocSearchResult.success && rocSearchResult.data?.results) {
        const rocResults = rocSearchResult.data.results as any[];
        this.emitEvent({
          ts: new Date().toISOString(),
          level: 'success',
          agent: 'BrowserSearch',
          summary: `ROC search completed via headless browser. Found ${rocResults.length} result(s)`,
        });

        // Extract any emails from ROC search results
        for (const result of rocResults) {
          if (result.snippet || result.title) {
            const extractedEmails = this.extractEmailsFromText(
              (result.snippet || '') + ' ' + (result.title || '')
            );
            emails.push(...extractedEmails);
          }
        }

        totalCost += rocSearchResult.cost || 0;
      } else {
        this.emitEvent({
          ts: new Date().toISOString(),
          level: 'warning',
          agent: 'BrowserSearch',
          summary: `ROC search via headless browser did not return results`,
        });
      }
    }

    // Priority 1: Official website (if available and strategy allows)
    if (contractorEntity.officialWebsite && 
        (strategy.approach === 'roc-first' || strategy.approach === 'official-only' || strategy.approach === 'hybrid')) {
      const officialEmails = await this.scrapeOfficialWebsite(contractorEntity.officialWebsite);
      emails.push(...officialEmails);
    }

    // Priority 2: Web search using headless browser automation (if strategy allows)
    if (strategy.approach === 'search-first' || strategy.approach === 'hybrid') {
      // Use BrowserSearchAgent for headless browser automation
      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `Using headless browser automation to perform searches`,
      });

      // Generate queries using LLM based on ROC data
      const queryStrings = this.useLLM
        ? await this.llmService.generateSearchQueries({
            contractorName: contractorEntity.contractorName,
            rocNumber: contractorEntity.rocNumber,
            city: contractorEntity.address?.split(',')[0] || this.context.contractorInput.city,
            classification: contractorEntity.classification,
            businessName: contractorEntity.businessName,
            address: contractorEntity.address,
            phone: contractorEntity.phone,
          })
        : strategy.searchQueries || [];

      // Convert query strings to SearchQuery objects for BrowserSearchAgent
      const searchQueries = queryStrings.map((query) => {
        // Determine source based on query content or use default
        let source: 'roc-website' | 'google' | 'bing' | 'linkedin' | 'business-directory' = 'google';
        
        if (query.toLowerCase().includes('roc') || query.toLowerCase().includes('license')) {
          source = 'roc-website';
        } else if (query.toLowerCase().includes('linkedin')) {
          source = 'linkedin';
        } else if (query.toLowerCase().includes('directory')) {
          source = 'business-directory';
        }

        return {
          query,
          source,
          expectedResults: Math.min(5, strategy.maxUrls || 10),
        };
      });

      // Create BrowserSearchAgent with custom queries
      const browserSearch = new BrowserSearchAgent(this.context, this.eventEmitter, searchQueries);

      // Perform browser-based searches
      const searchResult = await browserSearch.execute();
      
      if (searchResult.success && searchResult.data?.results) {
        const searchResults = searchResult.data.results as any[];
        
        this.emitEvent({
          ts: new Date().toISOString(),
          level: 'success',
          agent: 'BrowserSearch',
          summary: `Found ${searchResults.length} search results via headless browser`,
        });

        // Extract emails from search result snippets and titles
        for (const result of searchResults.slice(0, strategy.maxUrls || 10)) {
          if (result.snippet || result.title) {
            const extractedEmails = this.extractEmailsFromText(
              (result.snippet || '') + ' ' + (result.title || '')
            );
            emails.push(...extractedEmails);
          }
        }

        totalCost += searchResult.cost || 0;
      }
    }

    // Deduplicate emails
    const uniqueEmails = Array.from(new Set(emails));

    return {
      emails: uniqueEmails,
      cost: totalCost,
    };
  }

  /**
   * Scrape official website (Deterministic)
   */
  private async scrapeOfficialWebsite(url: string): Promise<string[]> {
    // TODO: Implement scraping agent
    this.emitEvent({
      ts: new Date().toISOString(),
      level: 'info',
      agent: 'ScrapeExtraction',
      summary: `Scraping official website: ${url}`,
    });

    // Mock implementation
    return [];
  }

  /**
   * Perform web search (Deterministic)
   */
  private async performWebSearch(query: string, maxUrls: number): Promise<string[]> {
    // TODO: Implement search and scrape agents
    this.emitEvent({
      ts: new Date().toISOString(),
      level: 'info',
      agent: 'SearchDiscovery',
      summary: `Searching: ${query}`,
    });

    // Mock implementation
    return [];
  }

  /**
   * Step 4: Validate Emails (Deterministic)
   */
  private async validateEmails(emails: string[]): Promise<{ emails: EmailCandidate[] }> {
    // TODO: Implement email validation agent
    this.emitEvent({
      ts: new Date().toISOString(),
      level: 'info',
      agent: 'EmailValidation',
      summary: `Validating ${emails.length} email addresses`,
    });

    const validatedEmails: EmailCandidate[] = [];
    const contractorEntity = this.context.currentEntityId 
      ? await this.getEntityById(this.context.currentEntityId)
      : null;

    for (const email of emails) {
      // Skip invalid emails
      if (!email || email === 'Not Found' || !email.includes('@')) {
        continue;
      }

      // TODO: Implement actual email validation
      const emailCandidate: EmailCandidate = {
        email,
        source: 'unknown',
        sourceUrl: '',
        confidence: 50, // Will be calculated by validation agent
        rationale: 'Validation pending',
        validationSignals: {
          mxRecordExists: false,
          smtpCheck: false,
          domainValid: true,
          formatValid: true,
          sourceAuthoritative: false,
          multipleSources: false,
        },
      };

      validatedEmails.push(emailCandidate);

      // Store successful email capture in knowledge base
      if (contractorEntity && emailCandidate.confidence >= 30) {
        await this.knowledgeService.storeEmailKnowledge({
          email: emailCandidate.email,
          rocNumber: contractorEntity.rocNumber,
          contractorName: contractorEntity.contractorName,
          confidence: emailCandidate.confidence,
          sources: [emailCandidate.source, ...(emailCandidate.validationSignals.multipleSources ? ['multiple'] : [])],
          validated: emailCandidate.validationSignals.mxRecordExists || emailCandidate.validationSignals.smtpCheck,
        });
      }
    }

    return {
      emails: validatedEmails,
    };
  }

  /**
   * Extract emails from text using regex
   */
  private extractEmailsFromText(text: string): string[] {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = text.match(emailRegex);
    return matches ? Array.from(new Set(matches)) : []; // Remove duplicates
  }

  /**
   * Helper to get entity by ID from database
   */
  private async getEntityById(entityId: string): Promise<Entity | null> {
    try {
      const entity = await prisma.entity.findUnique({
        where: { id: entityId },
      });

      if (!entity) {
        return null;
      }

      return {
        id: entity.id,
        rocNumber: entity.rocNumber || '',
        contractorName: entity.contractorName || '',
        officialWebsite: entity.officialWebsite || undefined,
        businessName: entity.businessName || undefined,
        address: entity.address || undefined,
        phone: entity.phone || undefined,
        classification: entity.classification || undefined,
        licenseStatus: entity.licenseStatus || undefined,
      };
    } catch (error) {
      console.error('[ReasoningOrchestrator] Failed to get entity:', error);
      return null;
    }
  }

  /**
   * Step 5: Interpret Results (Hybrid - LLM or Deterministic)
   */
  private async interpretResults(validationResult: { emails: EmailCandidate[] }): Promise<any> {
    const emails = validationResult.emails;
    const confidenceScores = emails.map(e => e.confidence);
    const sources = Array.from(new Set(emails.map(e => e.source)));

    const highConfidenceCount = confidenceScores.filter(s => s >= 80).length;
    const mediumConfidenceCount = confidenceScores.filter(s => s >= 50 && s < 80).length;
    const lowConfidenceCount = confidenceScores.filter(s => s < 50).length;

    if (this.useLLM) {
      return await this.llmService.interpretResults({
        emailsFound: emails.length,
        confidenceScores,
        sources,
        highConfidenceCount,
        mediumConfidenceCount,
        lowConfidenceCount,
      });
    } else {
      return this.llmService.deterministicInterpretation({
        emailsFound: emails.length,
        confidenceScores,
        sources,
        highConfidenceCount,
        mediumConfidenceCount,
        lowConfidenceCount,
      });
    }
  }
}

