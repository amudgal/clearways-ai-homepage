// Reasoning Orchestrator Agent - Hybrid Approach
// Uses LLM for strategic decisions, deterministic agents for execution

import { BaseAgent } from '../base/BaseAgent';
import { AgentResult, AgentContext, Entity, EmailCandidate, ExplanationEvent } from '../types';
import { LLMReasoningService, DiscoveryStrategy } from '../../services/llmService';
import { RocLookupAgent } from '../roc/RocLookupAgent';
import { BrowserSearchAgent, SearchQuery } from '../search/BrowserSearchAgent';
import { KnowledgeService } from '../../services/knowledgeService';
import { TribalKnowledgeService } from '../../services/tribalKnowledgeService';
import { queryPerformanceService } from '../../services/queryPerformanceService';
import { queryKnowledgeService, QueryContext } from '../../services/queryKnowledgeService';
import { excludedUrlService } from '../../services/excludedUrlService';
import { searchResultFilterService, BusinessSimilarityContext } from '../../services/searchResultFilterService';
import { processingTimeService } from '../../services/processingTimeService';
import { pageRelevanceService } from '../../services/pageRelevanceService';
import { apiCallTracker } from '../../services/apiCallTracker';
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
  private tribalKnowledgeService: TribalKnowledgeService;

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
    this.tribalKnowledgeService = new TribalKnowledgeService();

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

  /**
   * Helper: Emit event with ROC number always included in details
   */
  private emitEventWithROC(event: Partial<ExplanationEvent>, rocNumber?: string): void {
    const rocNumberToUse = rocNumber || this.context.contractorInput.rocNumber || 'unknown';
    const normalizedROC = rocNumberToUse.replace(/[^0-9]/g, '') || rocNumberToUse;
    
    this.emitEvent({
      ...event,
      details: {
        ...(event.details || {}),
        rocNumber: normalizedROC,
        rocNumberRaw: rocNumberToUse,
      },
    } as ExplanationEvent);
  }

  async execute(): Promise<AgentResult> {
    try {
      // Normalize ROC number early
      const rocNumberRaw = this.context.contractorInput.rocNumber || '';
      const rocNumberNormalized = rocNumberRaw.replace(/[^0-9]/g, '') || rocNumberRaw;
      const recordId = rocNumberNormalized || this.context.contractorInput.contractorName || `record-${Date.now()}`;

      // Initialize API call tracker for this ROC (max 10 calls per ROC)
      const maxApiCallsPerROC = (this.context.preferences.maxApiCallsPerROC as number) || 10;
      apiCallTracker.setMaxCallsPerROC(maxApiCallsPerROC);
      if (rocNumberNormalized) {
        apiCallTracker.reset(rocNumberNormalized); // Reset any previous count for this ROC
      }

      // Create time budget for this record (30 seconds default, configurable)
      const maxTimePerRecord = (this.context.preferences.maxTimePerRecord as number) || 30000; // 30 seconds
      processingTimeService.createBudget(recordId, maxTimePerRecord, 5000, 10000);

      // Check API call limit before starting
      if (rocNumberNormalized) {
        const apiStats = apiCallTracker.getStats(rocNumberNormalized);
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'info',
          agent: 'ReasoningOrchestrator',
          summary: `Starting discovery for ROC ${rocNumberNormalized || 'N/A'}${this.context.contractorInput.contractorName ? ` (${this.context.contractorInput.contractorName})` : ''}`,
          details: {
            maxTimePerRecord: `${maxTimePerRecord / 1000}s`,
            maxApiCalls: apiStats.maxCalls,
            remainingApiCalls: apiStats.remainingCalls,
          },
        }, rocNumberNormalized);
        
        if (apiStats.remainingCalls <= 0) {
          this.emitEventWithROC({
            ts: new Date().toISOString(),
            level: 'error',
            agent: 'ReasoningOrchestrator',
            summary: `API call limit already reached for ROC ${rocNumberNormalized}. Cannot proceed.`,
            details: {
              totalCalls: apiStats.totalCalls,
              maxCalls: apiStats.maxCalls,
            },
          }, rocNumberNormalized);
          return this.formatOutputSchema(runId, new Date(runStartTime), this.context.contractorInput, null, null, null, null, evidence, warnings, errors, totalCost);
        }
      } else {
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'info',
          agent: 'ReasoningOrchestrator',
          summary: `Starting discovery for ROC ${rocNumberNormalized || 'N/A'}${this.context.contractorInput.contractorName ? ` (${this.context.contractorInput.contractorName})` : ''}`,
          details: {
            maxTimePerRecord: `${maxTimePerRecord / 1000}s`,
          },
        }, rocNumberNormalized);
      }

      const runStartTime = Date.now();
      const runId = this.context.jobId || `run-${Date.now()}`;
      const warnings: string[] = [];
      const errors: string[] = [];
      const evidence: Array<{ url: string; title: string; snippet: string; retrieved_at: string }> = [];
      let totalCost = 0;

      // Helper to check time and emit warning if needed
      const checkTimeLimit = (operation: string): boolean => {
        if (processingTimeService.isTimeExceeded(recordId, 'record')) {
          const elapsed = processingTimeService.getElapsedTime(recordId);
          this.emitEventWithROC({
            ts: new Date().toISOString(),
            level: 'warning',
            agent: 'ReasoningOrchestrator',
            summary: `Time limit reached (${processingTimeService.formatTime(elapsed)}) - stopping ${operation}`,
            details: {
              elapsed: processingTimeService.formatTime(elapsed),
              maxTime: processingTimeService.formatTime(maxTimePerRecord),
            },
          }, rocNumberNormalized);
          warnings.push(`Time limit reached during ${operation}`);
          return true;
        }
        return false;
      };

      // Step 1: Query AZ ROC contractor search and extract license details with evidence
      if (checkTimeLimit('ROC lookup')) {
        return this.formatOutputSchema(runId, new Date(runStartTime), this.context.contractorInput, null, null, null, null, evidence, warnings, errors, totalCost);
      }

      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `Step 1: Querying AZ ROC contractor search for ROC ${rocNumberNormalized || 'N/A'}...`,
      }, rocNumberNormalized);

      processingTimeService.setCheckpoint(recordId, 'roc_lookup_start');
      const rocResult = await this.performROCLookup();
      processingTimeService.setCheckpoint(recordId, 'roc_lookup_end');
      if (!rocResult.success) {
        errors.push('ROC lookup failed');
        // Continue to next steps even if ROC lookup fails
      }

      const contractorEntity = rocResult.success ? (rocResult.data as Entity) : null;
      if (contractorEntity) {
        this.context.currentEntityId = contractorEntity.id;
        
        // Add ROC website as evidence
        evidence.push({
          url: 'https://azroc.my.site.com/AZRoc/s/contractor-search',
          title: 'AZ ROC Contractor Search',
          snippet: `License ${contractorEntity.rocNumber || 'N/A'}: ${contractorEntity.contractorName || 'N/A'} - ${contractorEntity.licenseStatus || 'Unknown Status'}`,
          retrieved_at: new Date().toISOString(),
        });
      }

      // Step 2: Discover the official business website and verified listings
      if (checkTimeLimit('web presence discovery')) {
        return this.formatOutputSchema(runId, new Date(runStartTime), this.context.contractorInput, contractorEntity, null, null, null, evidence, warnings, errors, totalCost);
      }

      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `Step 2: Discovering official business website and verified listings for ROC ${rocNumberNormalized || 'N/A'}...`,
      }, rocNumberNormalized);

      processingTimeService.setCheckpoint(recordId, 'web_presence_start');
      const webPresenceResult = contractorEntity 
        ? await this.discoverWebPresence(contractorEntity)
        : { officialWebsite: '', verifiedListings: [], cost: 0, evidence: [] };
      processingTimeService.setCheckpoint(recordId, 'web_presence_end');
      
      totalCost += webPresenceResult.cost || 0;
      evidence.push(...(webPresenceResult.evidence || []));

      // Step 3: Extract business contact channels (email/phone/website) with evidence
      if (checkTimeLimit('contact extraction')) {
        return this.formatOutputSchema(runId, new Date(runStartTime), this.context.contractorInput, contractorEntity, webPresenceResult, null, null, evidence, warnings, errors, totalCost);
      }

      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `Step 3: Extracting business contact channels for ROC ${rocNumberNormalized || 'N/A'}...`,
      }, rocNumberNormalized);

      processingTimeService.setCheckpoint(recordId, 'contact_extraction_start');
      const contactResult = contractorEntity
        ? await this.extractContactChannels(contractorEntity, webPresenceResult.officialWebsite || '')
        : { emails: [], phones: [], addresses: [], cost: 0, evidence: [] };
      processingTimeService.setCheckpoint(recordId, 'contact_extraction_end');
      
      totalCost += contactResult.cost || 0;
      evidence.push(...(contactResult.evidence || []));

      // Step 4: Collect review/rating summaries and themes with evidence
      if (checkTimeLimit('reviews collection')) {
        return this.formatOutputSchema(runId, new Date(runStartTime), this.context.contractorInput, contractorEntity, webPresenceResult, contactResult, null, evidence, warnings, errors, totalCost);
      }

      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `Step 4: Collecting review/rating summaries and themes for ROC ${rocNumberNormalized || 'N/A'}...`,
      }, rocNumberNormalized);

      processingTimeService.setCheckpoint(recordId, 'reviews_start');
      const reputationResult = contractorEntity
        ? await this.collectReviewsAndRatings(contractorEntity, webPresenceResult.officialWebsite || '')
        : { ratingSummary: [], reviewThemes: { positives: [], negatives: [] }, cost: 0, evidence: [] };
      processingTimeService.setCheckpoint(recordId, 'reviews_end');
      
      totalCost += reputationResult.cost || 0;
      evidence.push(...(reputationResult.evidence || []));

      // Step 5: Return a JSON object following OUTPUT_SCHEMA.md
      const finalElapsed = processingTimeService.getElapsedTime(recordId);
      processingTimeService.clearBudget(recordId);

      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'success',
        agent: 'ReasoningOrchestrator',
        summary: `Completed processing in ${processingTimeService.formatTime(finalElapsed)}`,
        details: {
          elapsed: processingTimeService.formatTime(finalElapsed),
          maxTime: processingTimeService.formatTime(maxTimePerRecord),
        },
      }, rocNumberNormalized);

      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `Step 5: Formatting output according to OUTPUT_SCHEMA.md for ROC ${rocNumberNormalized || 'N/A'}...`,
      }, rocNumberNormalized);

      const outputJson = this.formatOutputSchema({
        rocNumberRaw,
        rocNumberNormalized,
        contractorEntity,
        webPresence: webPresenceResult,
        contact: contactResult,
        reputation: reputationResult,
        evidence,
        warnings,
        errors,
        runId,
        runStartTime,
      });

      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'success',
        agent: 'ReasoningOrchestrator',
        summary: `Discovery completed successfully for ROC ${rocNumberNormalized || 'N/A'}`,
        details: { output: outputJson },
      }, rocNumberNormalized);

      // Return in both formats: new schema and legacy format for backward compatibility
      return {
        success: true,
        data: {
          // New OUTPUT_SCHEMA.md format
          outputSchema: outputJson,
          // Legacy format for backward compatibility
          entity: contractorEntity,
          emails: contactResult.emails || [],
          emailCandidates: (contactResult.emails || []).map((email: any) => ({
            email: email.email || email,
            source: email.source || 'unknown',
            sourceUrl: email.evidence_urls?.[0] || '',
            confidence: Math.round((email.confidence || 0) * 100), // Convert 0.0-1.0 to 0-100
            rationale: `Found via ${email.source || 'unknown'}`,
            validationSignals: {},
          })),
          interpretation: {
            summary: `Completed discovery for ROC ${rocNumberNormalized}`,
            notes: [],
          },
          strategy: '5-step-process',
          notes: [],
        },
        cost: totalCost,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const runStartTime = Date.now();
      const runId = this.context.jobId || `run-${Date.now()}`;
      const errors = [errorMessage];
      const warnings: string[] = [];

      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'error',
        agent: 'ReasoningOrchestrator',
        summary: `Error: ${errorMessage}`,
      });

      return {
        success: false,
        error: errorMessage,
        cost: 0,
        data: {
          outputSchema: this.formatOutputSchema({
            rocNumberRaw: this.context.contractorInput.rocNumber,
            rocNumberNormalized: this.context.contractorInput.rocNumber.replace(/[^0-9]/g, ''),
            contractorEntity: null,
            webPresence: { officialWebsite: '', verifiedListings: [], cost: 0, evidence: [] },
            contact: { emails: [], phones: [], addresses: [], cost: 0, evidence: [] },
            reputation: { ratingSummary: [], reviewThemes: { positives: [], negatives: [] }, cost: 0, evidence: [] },
            evidence: [],
            warnings,
            errors,
            runId,
            runStartTime,
          }),
        },
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

    // Parse address to extract city, state, zip
    const addressParts = this.parseAddress(contractorEntity.address);
    const parsedCity = contractorEntity.address?.split(',')[0]?.trim() || this.context.contractorInput.city || addressParts.city;
    const proprietorNames = this.extractProprietorNames(contractorEntity.contractorName || '');

    // Get tribal knowledge queries for planning
    const tribalQueries = await this.tribalKnowledgeService.generateQueriesFromKnowledge(
      contractorEntity.contractorName,
      contractorEntity.businessName,
      contractorEntity.rocNumber,
      parsedCity,
      contractorEntity.classification,
      contractorEntity.address,
      contractorEntity.phone
    );
    const tribalQueryStrings = tribalQueries.map(tq => tq.query);

    if (this.useLLM) {
      // Use LLM for strategic decision based on ROC data and tribal knowledge
      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `Using LLM to plan email discovery strategy from ROC data with all attributes${tribalQueryStrings.length > 0 ? ` and ${tribalQueryStrings.length} tribal knowledge query(ies)` : ''}`,
      });

      return await this.llmService.decideStrategy({
        contractorName: contractorEntity.contractorName,
        rocNumber: contractorEntity.rocNumber,
        city: parsedCity,
        state: addressParts.state || 'AZ',
        zip: addressParts.zip,
        hasOfficialWebsite: !!contractorEntity.officialWebsite,
        rocData: {
          businessName: contractorEntity.businessName,
          website: contractorEntity.officialWebsite,
          address: contractorEntity.address,
          phone: contractorEntity.phone,
          classification: contractorEntity.classification,
          licenseStatus: contractorEntity.licenseStatus,
        },
        tribalKnowledgeQueries: tribalQueries,
        proprietorNames: proprietorNames,
      }, tribalQueryStrings.length > 0 ? tribalQueryStrings : undefined);
    } else {
      // Fallback to deterministic
      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: 'Using deterministic strategy (LLM not available) with all attributes',
      });

      return this.llmService.deterministicStrategy({
        contractorName: contractorEntity.contractorName,
        rocNumber: contractorEntity.rocNumber,
        city: parsedCity,
        state: addressParts.state || 'AZ',
        zip: addressParts.zip,
        hasOfficialWebsite: !!contractorEntity.officialWebsite,
        rocData: {
          businessName: contractorEntity.businessName,
          website: contractorEntity.officialWebsite,
          address: contractorEntity.address,
          phone: contractorEntity.phone,
          classification: contractorEntity.classification,
          licenseStatus: contractorEntity.licenseStatus,
        },
        tribalKnowledgeQueries: tribalQueries,
        proprietorNames: proprietorNames,
      });
    }
  }

  /**
   * Execute structured search plan - implements hierarchical search strategy
   */
  private async executeStructuredSearchPlan(
    contractorEntity: Entity
  ): Promise<{ emails: string[]; emailSourceMap: Map<string, { source: string; sourceUrl: string }>; cost: number; depth: number; notes: string[] }> {
    // Generate strategy
    const strategy = await this.decideStrategy(contractorEntity);
    
    // Execute multi-level search
    const maxDepth = this.context.preferences.maxSearchDepth || 3;
    const searchResult = await this.executeMultiLevelSearch(strategy, contractorEntity, maxDepth);
    
    // Generate notes
    const notes: string[] = [];
    notes.push(`Searched ${searchResult.depth} level(s) with ${searchResult.emails.length} email(s) found`);
    notes.push(`Total cost: $${(searchResult.cost || 0).toFixed(4)}`);
    
    return {
      ...searchResult,
      notes,
    };
  }

  /**
   * Execute multi-level search - continues searching at deeper levels until email is found or max depth reached
   */
  private async executeMultiLevelSearch(
    strategy: DiscoveryStrategy,
    contractorEntity: Entity,
    maxDepth: number
  ): Promise<{ emails: string[]; emailSourceMap: Map<string, { source: string; sourceUrl: string }>; cost: number; depth: number }> {
    const allEmails: string[] = [];
    const allEmailSourceMaps = new Map<string, { source: string; sourceUrl: string }>();
    let totalCost = 0;
    let currentDepth = 1;
    
    // Track search counts per level (Level 2 and 3 have max 10 searches each)
    const searchCounts = new Map<number, number>(); // depth -> count
    const maxSearchesPerLevel = new Map<number, number>(); // depth -> max
    maxSearchesPerLevel.set(2, 10); // Level 2: max 10 searches
    maxSearchesPerLevel.set(3, 10); // Level 3: max 10 searches

    // Level 1: Initial search (roc-first approach)
    this.emitEventWithROC({
      ts: new Date().toISOString(),
      level: 'info',
      agent: 'ReasoningOrchestrator',
      summary: `Starting Level ${currentDepth} search (max depth: ${maxDepth}) for ROC ${contractorEntity.rocNumber || 'N/A'}`,
    }, contractorEntity.rocNumber);

    let levelResult = await this.executeStrategy(strategy, contractorEntity, currentDepth);
    allEmails.push(...levelResult.emails);
    totalCost += levelResult.cost;
    // Merge email source maps
    levelResult.emailSourceMap.forEach((value, key) => {
      allEmailSourceMaps.set(key, value);
    });

    // Check if we found emails or reached max depth
    const uniqueEmails = Array.from(new Set(allEmails));
    const rocNumberNormalized = contractorEntity.rocNumber?.replace(/[^0-9]/g, '') || contractorEntity.rocNumber || '';
    
    if (uniqueEmails.length > 0) {
      // Log API stats before returning
      if (rocNumberNormalized) {
        const finalApiStats = apiCallTracker.getStats(rocNumberNormalized);
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'info',
          agent: 'ReasoningOrchestrator',
          summary: `Search completed. API usage: ${finalApiStats.totalCalls}/${finalApiStats.maxCalls} calls (${finalApiStats.remainingCalls} remaining)`,
          details: {
            totalCalls: finalApiStats.totalCalls,
            maxCalls: finalApiStats.maxCalls,
            remainingCalls: finalApiStats.remainingCalls,
            successfulCalls: finalApiStats.successfulCalls,
            averageResults: finalApiStats.averageResults,
          },
        }, rocNumberNormalized);
      }
      
      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'success',
        agent: 'ReasoningOrchestrator',
        summary: `Found ${uniqueEmails.length} email(s) at Level ${currentDepth} - stopping search for ROC ${contractorEntity.rocNumber || 'N/A'}`,
      }, contractorEntity.rocNumber);
      return { emails: uniqueEmails, emailSourceMap: allEmailSourceMaps, cost: totalCost, depth: currentDepth };
    }

    // Continue to deeper levels if no email found
    while (currentDepth < maxDepth && uniqueEmails.length === 0) {
      currentDepth++;
      
      // Check API call limit before proceeding to next level
      if (rocNumberNormalized) {
        const apiStats = apiCallTracker.getStats(rocNumberNormalized);
        if (apiStats.remainingCalls <= 0) {
          this.emitEventWithROC({
            ts: new Date().toISOString(),
            level: 'warning',
            agent: 'ReasoningOrchestrator',
            summary: `API call limit reached (${apiStats.totalCalls}/${apiStats.maxCalls}). Stopping search at Level ${currentDepth} for ROC ${rocNumberNormalized}`,
            details: {
              totalCalls: apiStats.totalCalls,
              maxCalls: apiStats.maxCalls,
              currentDepth: currentDepth,
              maxDepth: maxDepth,
            },
          }, rocNumberNormalized);
          break; // Stop searching if API limit reached
        }
      }
      
      // Check search limit for this level
      const maxSearches = maxSearchesPerLevel.get(currentDepth);
      if (maxSearches && (searchCounts.get(currentDepth) || 0) >= maxSearches) {
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'warning',
          agent: 'ReasoningOrchestrator',
          summary: `Reached search limit (${maxSearches}) for Level ${currentDepth} - stopping search for ROC ${contractorEntity.rocNumber || 'N/A'}`,
        }, contractorEntity.rocNumber);
        break;
      }
      
      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `No emails found at Level ${currentDepth - 1}, continuing to Level ${currentDepth} (max: ${maxDepth}, search limit: ${maxSearches || 'unlimited'}) for ROC ${contractorEntity.rocNumber || 'N/A'}`,
      }, contractorEntity.rocNumber);

      // Generate more specific queries for deeper level
      const deeperStrategy = await this.generateDeeperLevelStrategy(contractorEntity, currentDepth, strategy);
      levelResult = await this.executeStrategy(deeperStrategy, contractorEntity, currentDepth, searchCounts, maxSearchesPerLevel);
      
      // Update search count for this level
      const currentCount = searchCounts.get(currentDepth) || 0;
      searchCounts.set(currentDepth, currentCount + 1);
      allEmails.push(...levelResult.emails);
      totalCost += levelResult.cost;
      // Merge email source maps
      levelResult.emailSourceMap.forEach((value, key) => {
        allEmailSourceMaps.set(key, value);
      });

      // Check again if we found emails
      const updatedUniqueEmails = Array.from(new Set(allEmails));
      if (updatedUniqueEmails.length > 0) {
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'success',
          agent: 'ReasoningOrchestrator',
          summary: `Found ${updatedUniqueEmails.length} email(s) at Level ${currentDepth} - stopping search for ROC ${contractorEntity.rocNumber || 'N/A'}`,
        }, contractorEntity.rocNumber);
        return { emails: updatedUniqueEmails, emailSourceMap: allEmailSourceMaps, cost: totalCost, depth: currentDepth };
      }
    }

    // Log final API call statistics (rocNumberNormalized already declared above)
    if (rocNumberNormalized) {
      const finalApiStats = apiCallTracker.getStats(rocNumberNormalized);
      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `Search completed. API usage: ${finalApiStats.totalCalls}/${finalApiStats.maxCalls} calls (${finalApiStats.remainingCalls} remaining)`,
        details: {
          totalCalls: finalApiStats.totalCalls,
          maxCalls: finalApiStats.maxCalls,
          remainingCalls: finalApiStats.remainingCalls,
          successfulCalls: finalApiStats.successfulCalls,
          averageResults: finalApiStats.averageResults,
          callHistory: finalApiStats.totalCalls > 0 ? apiCallTracker.getCallHistory(rocNumberNormalized).slice(-5) : [], // Last 5 calls
        },
      }, rocNumberNormalized);
    }
    
    if (currentDepth >= maxDepth) {
      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'warning',
        agent: 'ReasoningOrchestrator',
        summary: `Reached maximum search depth (${maxDepth}) without finding emails for ROC ${contractorEntity.rocNumber || 'N/A'}`,
      }, contractorEntity.rocNumber);
    }

    return { emails: Array.from(new Set(allEmails)), emailSourceMap: allEmailSourceMaps, cost: totalCost, depth: currentDepth };
  }

  /**
   * Generate strategy for deeper level searches with more specific queries
   */
  private async generateDeeperLevelStrategy(
    contractorEntity: Entity,
    depth: number,
    originalStrategy: DiscoveryStrategy
  ): Promise<DiscoveryStrategy> {
    // Parse address to extract city, state, zip
    const addressParts = this.parseAddress(contractorEntity.address);
    const parsedCity = contractorEntity.address?.split(',')[0]?.trim() || this.context.contractorInput.city || addressParts.city;
    const proprietorNames = this.extractProprietorNames(contractorEntity.contractorName || '');

    // At deeper levels, generate more specific and targeted queries
    const deeperQueries: string[] = [];

    // Level 2: More specific searches
    if (depth === 2) {
      if (contractorEntity.businessName) {
        deeperQueries.push(`${contractorEntity.businessName} contact email ${parsedCity} ${addressParts.state || 'AZ'}`);
        // Remove quotes to allow broader search - Google will search for words in any order
        deeperQueries.push(`${contractorEntity.businessName} email ${addressParts.zip || ''}`);
        deeperQueries.push(`${contractorEntity.businessName} ${contractorEntity.phone || ''} email`);
      }
      if (contractorEntity.contractorName) {
        // Remove quotes to allow broader search - Google will search for words in any order
        deeperQueries.push(`${contractorEntity.contractorName} email ${parsedCity} ${addressParts.state || 'AZ'}`);
        // Don't include classification - use business name + location instead
        if (contractorEntity.businessName && parsedCity) {
          deeperQueries.push(`${contractorEntity.businessName} ${parsedCity} ${addressParts.state || 'AZ'} contact`);
        } else if (contractorEntity.contractorName && parsedCity) {
          deeperQueries.push(`${contractorEntity.contractorName} ${parsedCity} ${addressParts.state || 'AZ'} contact`);
        }
      }
      if (proprietorNames.length > 0) {
        proprietorNames.forEach(name => {
          deeperQueries.push(`${name} ${contractorEntity.businessName || ''} email`);
          deeperQueries.push(`${name} ${parsedCity} ${addressParts.state || 'AZ'} contact`);
        });
      }
    }

    // Level 3+: Even more specific searches
    if (depth >= 3) {
      if (contractorEntity.businessName && contractorEntity.address) {
        // Remove quotes to allow broader search - Google will search for words in any order
        deeperQueries.push(`${contractorEntity.businessName} ${contractorEntity.address} email`);
        deeperQueries.push(`${contractorEntity.businessName} ${addressParts.zip || ''} ${addressParts.state || 'AZ'} contact info`);
      }
      if (contractorEntity.contractorName && contractorEntity.classification) {
        // Remove quotes to allow broader search - Google will search for words in any order
        deeperQueries.push(`${contractorEntity.contractorName} ${contractorEntity.classification} ${parsedCity} email`);
      }
      if (contractorEntity.phone) {
        deeperQueries.push(`${contractorEntity.phone} email contact`);
        deeperQueries.push(`phone ${contractorEntity.phone} ${contractorEntity.businessName || contractorEntity.contractorName} email`);
      }
      // Try variations with different formats
      if (contractorEntity.businessName) {
        const businessNameVariations = [
          contractorEntity.businessName.toLowerCase().replace(/\s+/g, ''),
          contractorEntity.businessName.toLowerCase().replace(/\s+/g, '-'),
          contractorEntity.businessName.toLowerCase().replace(/\s+/g, '.'),
        ];
        businessNameVariations.forEach(variation => {
          deeperQueries.push(`${variation} email ${parsedCity}`);
        });
      }
    }

    // Use LLM to generate additional queries if available
    if (this.useLLM && deeperQueries.length < 10) {
      try {
        const llmQueries = await this.llmService.generateSearchQueries({
          contractorName: contractorEntity.contractorName,
          rocNumber: contractorEntity.rocNumber,
          city: parsedCity,
          state: addressParts.state || 'AZ',
          zip: addressParts.zip,
          classification: contractorEntity.classification,
          businessName: contractorEntity.businessName,
          address: contractorEntity.address,
          phone: contractorEntity.phone,
          proprietorNames: proprietorNames,
        });
        deeperQueries.push(...llmQueries);
      } catch (error) {
        console.error('[ReasoningOrchestrator] Failed to generate LLM queries for deeper level:', error);
      }
    }

    // Get tribal knowledge queries for this level - ALWAYS include in all search levels
    const tribalQueries = await this.tribalKnowledgeService.generateQueriesFromKnowledge(
      contractorEntity.contractorName,
      contractorEntity.businessName,
      contractorEntity.rocNumber,
      parsedCity,
      contractorEntity.classification,
      contractorEntity.address,
      contractorEntity.phone
    );

    this.emitEvent({
      ts: new Date().toISOString(),
      level: 'info',
      agent: 'ReasoningOrchestrator',
      summary: `Level ${depth}: Loaded ${tribalQueries.length} tribal knowledge query(ies) for deeper search`,
      details: {
        queries: tribalQueries.map(tq => ({ query: tq.query.substring(0, 50), source: tq.source, priority: tq.priority })),
        depth: depth,
      },
    });

    // Include tribal knowledge queries FIRST (highest priority), then deeper queries
    // Store tribal queries with their metadata so they can be used properly in executeStrategy
    return {
      approach: 'search-first', // Always use search-first for deeper levels
      searchQueries: [...tribalQueries.map(tq => tq.query), ...deeperQueries], // Include tribal knowledge queries
      maxUrls: Math.min(10, 5 + depth * 2), // Increase URLs per level
      prioritySources: ['google', 'linkedin', 'business-directory', 'nextdoor'],
      reasoning: `Level ${depth} search: More specific queries targeting contractor and business details. Includes ${tribalQueries.length} tribal knowledge query(ies).`,
      confidence: 0.7 - (depth * 0.1), // Slightly lower confidence at deeper levels
      // Store tribal knowledge metadata for use in executeStrategy
      tribalKnowledgeQueries: tribalQueries, // Pass full tribal knowledge objects
    };
  }

  /**
   * Step 3: Execute Strategy (Deterministic) - Single level execution
   */
  private async executeStrategy(
    strategy: DiscoveryStrategy,
    contractorEntity: Entity,
    depth: number = 1,
    searchCounts?: Map<number, number>,
    maxSearchesPerLevel?: Map<number, number>
  ): Promise<{ emails: string[]; emailSourceMap: Map<string, { source: string; sourceUrl: string }>; cost: number }> {
    const emails: string[] = [];
    const emailToUrlMap = new Map<string, { url: string; domain: string; title?: string; source: string }>();
    let totalCost = 0;
    let searchesPerformed = 0;
    const maxSearches = maxSearchesPerLevel?.get(depth) || Infinity;

    this.emitEventWithROC({
      ts: new Date().toISOString(),
      level: 'info',
      agent: 'ReasoningOrchestrator',
      summary: `Executing ${strategy.approach} strategy (Level ${depth}) for ROC ${contractorEntity.rocNumber || 'N/A'}`,
    }, contractorEntity.rocNumber);

    // Priority 0: Always use headless browser to search ROC website if ROC number is available
    // Also search for associative company information using business name and contractor name
    if (contractorEntity.rocNumber) {
      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `Searching for ROC ${contractorEntity.rocNumber} and associative company information`,
      }, contractorEntity.rocNumber);

      // Create comprehensive ROC search queries - use multiple query formats for better results
      let rocSearchQueries: SearchQuery[] = [];
      
      // Query 1: Direct ROC number search
      if (contractorEntity.rocNumber) {
        rocSearchQueries.push({
          query: `ROC ${contractorEntity.rocNumber} Arizona contractor`,
          source: 'google',
          expectedResults: 5,
        });
      }

      // Query 2: Business name + ROC number (associative search)
      if (contractorEntity.businessName && contractorEntity.rocNumber) {
        rocSearchQueries.push({
          query: `${contractorEntity.businessName} ROC ${contractorEntity.rocNumber}`,
          source: 'google',
          expectedResults: 5,
        });
      }

      // Query 3: Contractor name + ROC number (associative search)
      if (contractorEntity.contractorName && contractorEntity.rocNumber) {
        rocSearchQueries.push({
          query: `${contractorEntity.contractorName} ROC ${contractorEntity.rocNumber} Arizona`,
          source: 'google',
          expectedResults: 5,
        });
      }

      // Query 4: Business name + location (associative company information)
      if (contractorEntity.businessName) {
        const addressParts = this.parseAddress(contractorEntity.address);
        const city = addressParts.city || this.context.contractorInput.city || '';
        const state = addressParts.state || 'AZ';
        
        if (city) {
          rocSearchQueries.push({
            query: `${contractorEntity.businessName} ${city} ${state} contractor`,
            source: 'google',
            expectedResults: 5,
          });
        }
      }

      // Query 5: Contractor name + location (associative company information)
      if (contractorEntity.contractorName) {
        const addressParts = this.parseAddress(contractorEntity.address);
        const city = addressParts.city || this.context.contractorInput.city || '';
        const state = addressParts.state || 'AZ';
        
        if (city) {
          rocSearchQueries.push({
            query: `${contractorEntity.contractorName} ${city} ${state} contractor`,
            source: 'google',
            expectedResults: 5,
          });
        }
      }

      if (rocSearchQueries.length > 0) {
        // Check API call limit before executing ROC searches
        const rocNumberNormalized = contractorEntity.rocNumber?.replace(/[^0-9]/g, '') || contractorEntity.rocNumber || '';
        if (rocNumberNormalized) {
          const apiStats = apiCallTracker.getStats(rocNumberNormalized);
          const googleQueries = rocSearchQueries.filter(q => q.source === 'google');
          
          if (googleQueries.length > 0 && apiStats.remainingCalls <= 0) {
            this.emitEventWithROC({
              ts: new Date().toISOString(),
              level: 'warning',
              agent: 'ReasoningOrchestrator',
              summary: `API call limit reached (${apiStats.totalCalls}/${apiStats.maxCalls}). Skipping ROC Google searches.`,
              details: {
                totalCalls: apiStats.totalCalls,
                maxCalls: apiStats.maxCalls,
                queriesSkipped: googleQueries.length,
              },
            }, rocNumberNormalized);
            // Filter out Google queries, keep only non-Google queries
            rocSearchQueries = rocSearchQueries.filter(q => q.source !== 'google');
          } else if (googleQueries.length > apiStats.remainingCalls) {
            // Limit Google queries to remaining API calls
            const limitedGoogleQueries = googleQueries.slice(0, apiStats.remainingCalls);
            const nonGoogleQueries = rocSearchQueries.filter(q => q.source !== 'google');
            rocSearchQueries = [...limitedGoogleQueries, ...nonGoogleQueries];
            
            this.emitEventWithROC({
              ts: new Date().toISOString(),
              level: 'info',
              agent: 'ReasoningOrchestrator',
              summary: `Limited ROC searches to ${rocSearchQueries.length} queries (${limitedGoogleQueries.length} Google, ${apiStats.remainingCalls} API calls remaining)`,
              details: {
                originalQueries: googleQueries.length + nonGoogleQueries.length,
                limitedQueries: rocSearchQueries.length,
                remainingApiCalls: apiStats.remainingCalls,
              },
            }, rocNumberNormalized);
          }
        }
        
        if (rocSearchQueries.length > 0) {
          const rocBrowserSearch = new BrowserSearchAgent(this.context, this.eventEmitter, rocSearchQueries);
          const rocSearchResult = await rocBrowserSearch.execute();

          if (rocSearchResult.success && rocSearchResult.data?.results) {
          const rawResults = rocSearchResult.data.results as any[];
          
          // Filter out ads and rank by business similarity
          const similarityContext: BusinessSimilarityContext = {
            businessName: contractorEntity.businessName,
            contractorName: contractorEntity.contractorName,
            city: this.parseAddress(contractorEntity.address).city,
            state: this.parseAddress(contractorEntity.address).state || 'AZ',
            classification: contractorEntity.classification,
            address: contractorEntity.address,
            phone: contractorEntity.phone,
            rocNumber: contractorEntity.rocNumber,
          };
          
          const filteredResults = searchResultFilterService.getTopResults(rawResults, similarityContext, 10);
          
          this.emitEventWithROC({
            ts: new Date().toISOString(),
            level: 'success',
            agent: 'BrowserSearch',
            summary: `ROC and associative search completed. Found ${rawResults.length} result(s), ${filteredResults.length} relevant business site(s) after filtering`,
            details: {
              queriesUsed: rocSearchQueries.length,
              rawResultsFound: rawResults.length,
              filteredResults: filteredResults.length,
              adsFiltered: rawResults.length - filteredResults.length,
              topResults: filteredResults.slice(0, 3).map(r => ({
                url: r.url,
                title: r.title,
                similarityScore: r.similarityScore,
                isBusinessSite: r.isBusinessSite,
                matchReason: r.businessMatchReason,
              })),
            },
          }, contractorEntity.rocNumber);

          // Extract any emails from filtered ROC search results (with relevance check and search limits)
          for (const result of filteredResults) {
            // Check search limit
            if (searchesPerformed >= maxSearches) {
              this.emitEventWithROC({
                ts: new Date().toISOString(),
                level: 'warning',
                agent: 'ReasoningOrchestrator',
                summary: `Reached search limit (${maxSearches}) for Level ${depth} - stopping result processing`,
              }, contractorEntity.rocNumber);
              break;
            }
            
            // Quick relevance check before processing
            const relevanceCheck = pageRelevanceService.checkRelevance(result, contractorEntity);
            if (relevanceCheck.shouldSkip) {
              continue; // Skip irrelevant pages
            }
            
            if (relevanceCheck.confidence < 20 && depth >= 2) {
              // For Level 2+, skip low-relevance results
              this.emitEventWithROC({
                ts: new Date().toISOString(),
                level: 'info',
                agent: 'ReasoningOrchestrator',
                summary: `Skipping low-relevance result (confidence: ${relevanceCheck.confidence}): ${result.url}`,
                details: { url: result.url, confidence: relevanceCheck.confidence, reasons: relevanceCheck.reasons },
              }, contractorEntity.rocNumber);
              continue;
            }
            
            searchesPerformed++;
            
            if (result.snippet || result.title) {
              const extractedEmails = this.extractEmailsFromText(
                (result.snippet || '') + ' ' + (result.title || '')
              );
              emails.push(...extractedEmails);
              
              // Track source for ROC/associative search emails
              for (const email of extractedEmails) {
                if (!emailToUrlMap.has(email)) {
                  emailToUrlMap.set(email, {
                    url: result.url || 'https://azroc.my.site.com/AZRoc/s/contractor-search',
                    domain: result.url ? new URL(result.url).hostname.replace('www.', '') : 'azroc.my.site.com',
                    title: result.title,
                    source: result.url?.includes('azroc') ? 'roc-website' : 'google',
                  });
                }
              }
            }
          }

          totalCost += rocSearchResult.cost || 0;
        } else {
          this.emitEventWithROC({
            ts: new Date().toISOString(),
            level: 'warning',
            agent: 'BrowserSearch',
            summary: `ROC and associative search did not return results. Will continue with other search strategies.`,
            details: {
              queriesAttempted: rocSearchQueries.length,
              note: 'This is not critical - will continue searching using other methods',
            },
          }, contractorEntity.rocNumber);
        }
      }
    } else {
      // If no ROC number, still try to get associative information using business/contractor name
      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `No ROC number available. Searching for associative company information using business name.`,
      });

      const associativeQueries: SearchQuery[] = [];
      
      if (contractorEntity.businessName) {
        const addressParts = this.parseAddress(contractorEntity.address);
        const city = addressParts.city || this.context.contractorInput.city || '';
        const state = addressParts.state || 'AZ';
        
        if (city) {
          associativeQueries.push({
            query: `${contractorEntity.businessName} ${city} ${state} contractor`,
            source: 'google',
            expectedResults: 5,
          });
        }
      }

      if (contractorEntity.contractorName) {
        const addressParts = this.parseAddress(contractorEntity.address);
        const city = addressParts.city || this.context.contractorInput.city || '';
        const state = addressParts.state || 'AZ';
        
        if (city) {
          associativeQueries.push({
            query: `${contractorEntity.contractorName} ${city} ${state} contractor`,
            source: 'google',
            expectedResults: 5,
          });
        }
      }

      if (associativeQueries.length > 0) {
        const associativeSearch = new BrowserSearchAgent(this.context, this.eventEmitter, associativeQueries);
        const associativeResult = await associativeSearch.execute();

        if (associativeResult.success && associativeResult.data?.results) {
          const rawResults = associativeResult.data.results as any[];
          
          // Filter out ads and rank by business similarity
          const similarityContext: BusinessSimilarityContext = {
            businessName: contractorEntity.businessName,
            contractorName: contractorEntity.contractorName,
            city: this.parseAddress(contractorEntity.address).city,
            state: this.parseAddress(contractorEntity.address).state || 'AZ',
            classification: contractorEntity.classification,
            address: contractorEntity.address,
            phone: contractorEntity.phone,
            rocNumber: contractorEntity.rocNumber,
          };
          
          const filteredResults = searchResultFilterService.getTopResults(rawResults, similarityContext, 10);
          
          this.emitEventWithROC({
            ts: new Date().toISOString(),
            level: 'success',
            agent: 'BrowserSearch',
            summary: `Associative company search found ${rawResults.length} result(s), ${filteredResults.length} relevant business site(s) after filtering`,
            details: {
              rawResults: rawResults.length,
              filteredResults: filteredResults.length,
              adsFiltered: rawResults.length - filteredResults.length,
            },
          });

          const associativeResults = filteredResults;
          for (const result of associativeResults) {
            // Check search limit
            if (searchesPerformed >= maxSearches) {
              break;
            }
            
            // Quick relevance check
            const relevanceCheck = pageRelevanceService.checkRelevance(result, contractorEntity);
            if (relevanceCheck.shouldSkip || (relevanceCheck.confidence < 20 && depth >= 2)) {
              continue;
            }
            
            searchesPerformed++;
            
            if (result.snippet || result.title) {
              const extractedEmails = this.extractEmailsFromText(
                (result.snippet || '') + ' ' + (result.title || '')
              );
              emails.push(...extractedEmails);
              
              for (const email of extractedEmails) {
                if (!emailToUrlMap.has(email)) {
                  emailToUrlMap.set(email, {
                    url: result.url || '',
                    domain: result.url ? new URL(result.url).hostname.replace('www.', '') : '',
                    title: result.title,
                    source: 'google',
                  });
                }
              }
            }
          }

          totalCost += associativeResult.cost || 0;
        }
      }
    }
    }

    // Priority 1: Official website (if available and strategy allows)
    if (contractorEntity.officialWebsite && 
        (strategy.approach === 'roc-first' || strategy.approach === 'official-only' || strategy.approach === 'hybrid')) {
      const officialEmails = await this.scrapeOfficialWebsite(contractorEntity.officialWebsite);
      emails.push(...officialEmails);
      
      // Track source for official website emails
      for (const email of officialEmails) {
        if (!emailToUrlMap.has(email)) {
          emailToUrlMap.set(email, {
            url: contractorEntity.officialWebsite,
            domain: new URL(contractorEntity.officialWebsite).hostname.replace('www.', ''),
            source: 'website',
          });
        }
      }
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

      // Parse address to extract city, state, zip
      const addressParts = this.parseAddress(contractorEntity.address);
      const parsedCity = contractorEntity.address?.split(',')[0]?.trim() || this.context.contractorInput.city || addressParts.city;
      
      // Priority 1: Get queries from knowledge base (highest success rate)
      const queryContext: QueryContext = {
        businessName: contractorEntity.businessName,
        contractorName: contractorEntity.contractorName,
        city: parsedCity,
        state: addressParts.state || 'AZ',
        zip: addressParts.zip,
        address: contractorEntity.address,
        phone: contractorEntity.phone,
        rocNumber: contractorEntity.rocNumber,
        classification: contractorEntity.classification,
        proprietorNames: this.extractProprietorNames(contractorEntity.contractorName),
        hasPhone: !!contractorEntity.phone,
        hasAddress: !!contractorEntity.address,
        hasWebsite: !!contractorEntity.officialWebsite,
      };

      const knowledgeBaseQueries = await queryKnowledgeService.generateQueriesFromKnowledge(
        queryContext,
        'google',
        5 // Get top 5 from knowledge base
      );

      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `Level ${depth}: Loaded ${knowledgeBaseQueries.length} query(ies) from knowledge base`,
        details: {
          queries: knowledgeBaseQueries.map(kbq => ({
            query: kbq.query.substring(0, 50),
            priority: kbq.priority,
            knowledgeId: kbq.knowledgeId,
          })),
          depth: depth,
        },
      });

      // Generate queries using LLM based on ROC data
      const llmQueries = this.useLLM
        ? await this.llmService.generateSearchQueries({
            contractorName: contractorEntity.contractorName,
            rocNumber: contractorEntity.rocNumber,
            city: parsedCity,
            state: addressParts.state || 'AZ',
            zip: addressParts.zip,
            classification: contractorEntity.classification,
            businessName: contractorEntity.businessName,
            address: contractorEntity.address,
            phone: contractorEntity.phone,
            proprietorNames: this.extractProprietorNames(contractorEntity.contractorName),
          })
        : strategy.searchQueries || [];

      // Get queries from tribal knowledge (admin-provided strategies) - ALWAYS include in ALL search levels
      // Parse address to extract city
      const city = contractorEntity.address?.split(',')[0]?.trim() || this.context.contractorInput.city;
      
      // Use tribal knowledge from strategy if available (for deeper levels), otherwise fetch fresh
      let tribalQueries = (strategy as any).tribalKnowledgeQueries;
      if (!tribalQueries || tribalQueries.length === 0) {
        tribalQueries = await this.tribalKnowledgeService.generateQueriesFromKnowledge(
          contractorEntity.contractorName,
          contractorEntity.businessName,
          contractorEntity.rocNumber,
          city,
          contractorEntity.classification,
          contractorEntity.address,
          contractorEntity.phone
        );
      }

      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `Level ${depth}: Loaded ${tribalQueries.length} query(ies) from tribal knowledge`,
        details: {
          queries: tribalQueries.map(tq => ({ query: tq.query.substring(0, 50), source: tq.source, priority: tq.priority })),
          depth: depth,
        },
      });

      // Combine queries: Knowledge base (highest priority), then tribal knowledge, then LLM queries, then strategy queries
      // Filter out duplicates
      const allQueryStrings = new Set<string>();
      const allQueries: Array<{ query: string; source: string; priority: number; knowledgeId: string | null }> = [];
      
      // 1. Knowledge base queries (highest priority - proven successful patterns)
      for (const kbq of knowledgeBaseQueries) {
        const queryLower = kbq.query.toLowerCase();
        if (!allQueryStrings.has(queryLower)) {
          allQueries.push({
            query: kbq.query,
            source: 'google',
            priority: kbq.priority, // Use knowledge base priority (based on success rate)
            knowledgeId: kbq.knowledgeId,
          });
          allQueryStrings.add(queryLower);
        }
      }
      
      // 2. Tribal knowledge queries
      for (const tq of tribalQueries) {
        const queryLower = tq.query.toLowerCase();
        if (!allQueryStrings.has(queryLower)) {
          allQueries.push({
            query: tq.query,
            source: tq.source,
            priority: tq.priority,
            knowledgeId: tq.knowledgeId,
          });
          allQueryStrings.add(queryLower);
        }
      }
      
      // 3. LLM queries
      for (const llmq of llmQueries) {
        const queryLower = llmq.toLowerCase();
        if (!allQueryStrings.has(queryLower)) {
          allQueries.push({
            query: llmq,
            source: 'google',
            priority: 30,
            knowledgeId: null,
          });
          allQueryStrings.add(queryLower);
        }
      }
      
      // 4. Strategy queries (fallback)
      const strategyQueriesFiltered = (strategy.searchQueries || []).filter(q => !allQueryStrings.has(q.toLowerCase()));
      for (const sq of strategyQueriesFiltered) {
        allQueries.push({
          query: sq,
          source: 'google',
          priority: 20,
          knowledgeId: null,
        });
      }

      // Sort by performance-weighted priority (queries that have worked before get higher priority)
      // This rewards successful queries and penalizes unsuccessful ones
      const sortedQueries = queryPerformanceService.sortQueriesByWeight(allQueries);
      
      // Limit queries based on remaining API calls (max 10 calls per ROC)
      const rocNumberNormalized = contractorEntity.rocNumber?.replace(/[^0-9]/g, '') || contractorEntity.rocNumber || '';
      let queriesToExecute = sortedQueries;
      
      if (rocNumberNormalized) {
        const apiStats = apiCallTracker.getStats(rocNumberNormalized);
        const remainingCalls = apiStats.remainingCalls;
        
        // Only execute queries that use Google API (count towards limit)
        // Filter to only Google queries and limit to remaining API calls
        const googleQueries = sortedQueries.filter(q => q.source === 'google');
        const nonGoogleQueries = sortedQueries.filter(q => q.source !== 'google');
        
        // Limit Google queries to remaining API calls
        const limitedGoogleQueries = googleQueries.slice(0, Math.max(0, remainingCalls));
        
        // Combine: limited Google queries + all non-Google queries (they don't count towards API limit)
        queriesToExecute = [...limitedGoogleQueries, ...nonGoogleQueries];
        
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'info',
          agent: 'ReasoningOrchestrator',
          summary: `Optimized query selection: ${queriesToExecute.length} queries selected (${limitedGoogleQueries.length} Google API calls, ${remainingCalls} remaining) for ROC ${rocNumberNormalized}`,
          details: {
            totalQueries: sortedQueries.length,
            googleQueries: googleQueries.length,
            limitedGoogleQueries: limitedGoogleQueries.length,
            nonGoogleQueries: nonGoogleQueries.length,
            remainingApiCalls: remainingCalls,
            maxApiCalls: apiStats.maxCalls,
            topQueries: queriesToExecute.slice(0, 5).map(q => ({
              query: q.query.substring(0, 50),
              priority: q.priority,
              source: q.source,
            })),
          },
        }, rocNumberNormalized);
        
        if (remainingCalls <= 0 && googleQueries.length > 0) {
          this.emitEventWithROC({
            ts: new Date().toISOString(),
            level: 'warning',
            agent: 'ReasoningOrchestrator',
            summary: `API call limit reached (${apiStats.totalCalls}/${apiStats.maxCalls}). Skipping Google queries, using only non-Google sources.`,
            details: {
              totalCalls: apiStats.totalCalls,
              maxCalls: apiStats.maxCalls,
              nonGoogleQueries: nonGoogleQueries.length,
            },
          }, rocNumberNormalized);
        }
      } else {
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'info',
          agent: 'ReasoningOrchestrator',
          summary: `Sorted ${sortedQueries.length} queries by performance weight (successful queries prioritized)`,
          details: {
            topQueries: sortedQueries.slice(0, 5).map(q => ({
              query: q.query.substring(0, 50),
              priority: q.priority,
              source: q.source,
            })),
          },
        }, contractorEntity.rocNumber);
      }

      // Convert to SearchQuery objects for BrowserSearchAgent (use optimized queries)
      let searchQueries: SearchQuery[] = queriesToExecute.map((item) => {
        // Use provided source from tribal knowledge if available, otherwise detect from query
        let source: 'roc-website' | 'google' | 'bing' | 'linkedin' | 'business-directory' | 'nextdoor' = 'google';
        
        // If source is already set (from tribal knowledge), use it - this takes priority
        if (item.source && (item.source === 'linkedin' || item.source === 'nextdoor' || item.source === 'bing' || item.source === 'business-directory' || item.source === 'directory' || item.source === 'roc-website')) {
          source = item.source as any;
          this.emitEventWithROC({
            ts: new Date().toISOString(),
            level: 'info',
            agent: 'ReasoningOrchestrator',
            summary: `Using tribal knowledge source: ${source} for query: "${item.query.substring(0, 50)}..." (ROC ${contractorEntity.rocNumber || 'N/A'})`,
          }, contractorEntity.rocNumber);
        } else {
          // Otherwise, detect source from query content
          if (item.query.toLowerCase().includes('roc') || item.query.toLowerCase().includes('license')) {
            source = 'roc-website';
          } else if (item.query.toLowerCase().includes('nextdoor') || item.query.includes('nextdoor.com')) {
            source = 'nextdoor';
          } else if (item.query.toLowerCase().includes('linkedin') || item.query.includes('linkedin.com')) {
            source = 'linkedin';
          } else if (item.query.toLowerCase().includes('directory')) {
            source = 'business-directory';
          } else {
            source = 'google'; // Default to Google
          }
        }

        return {
          query: item.query,
          source,
          expectedResults: Math.min(5, strategy.maxUrls || 10),
          metadata: item.knowledgeId ? { knowledgeId: item.knowledgeId } : undefined,
        };
      });

      // Check API call limit before executing searches
      const rocNumberForSearch = contractorEntity.rocNumber?.replace(/[^0-9]/g, '') || contractorEntity.rocNumber || '';
      if (rocNumberForSearch) {
        const apiStats = apiCallTracker.getStats(rocNumberForSearch);
        const googleQueries = searchQueries.filter(q => q.source === 'google');
        
        if (googleQueries.length > 0 && apiStats.remainingCalls <= 0) {
          this.emitEventWithROC({
            ts: new Date().toISOString(),
            level: 'warning',
            agent: 'ReasoningOrchestrator',
            summary: `API call limit reached (${apiStats.totalCalls}/${apiStats.maxCalls}). Skipping all Google searches for Level ${depth}.`,
            details: {
              totalCalls: apiStats.totalCalls,
              maxCalls: apiStats.maxCalls,
              queriesSkipped: googleQueries.length,
              depth: depth,
            },
          }, rocNumberForSearch);
          
          // Filter out Google queries, keep only non-Google queries
          searchQueries = searchQueries.filter(q => q.source !== 'google');
        } else if (googleQueries.length > apiStats.remainingCalls) {
          // Limit Google queries to remaining API calls
          const limitedGoogleQueries = googleQueries.slice(0, apiStats.remainingCalls);
          const nonGoogleQueries = searchQueries.filter(q => q.source !== 'google');
          searchQueries = [...limitedGoogleQueries, ...nonGoogleQueries];
          
          this.emitEventWithROC({
            ts: new Date().toISOString(),
            level: 'info',
            agent: 'ReasoningOrchestrator',
            summary: `Limited Level ${depth} searches to ${searchQueries.length} queries (${limitedGoogleQueries.length} Google, ${apiStats.remainingCalls} API calls remaining)`,
            details: {
              originalQueries: googleQueries.length + nonGoogleQueries.length,
              limitedQueries: searchQueries.length,
              remainingApiCalls: apiStats.remainingCalls,
              depth: depth,
            },
          }, rocNumberForSearch);
        }
      }
      
      if (searchQueries.length === 0) {
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'warning',
          agent: 'ReasoningOrchestrator',
          summary: `No queries to execute for Level ${depth} (all queries filtered due to API limit or other constraints)`,
          details: {
            depth: depth,
          },
        }, contractorEntity.rocNumber);
        
        // Create empty emailSourceMap for early return
        const emptyEmailSourceMap = new Map<string, { source: string; sourceUrl: string }>();
        return { emails, emailSourceMap: emptyEmailSourceMap, cost: totalCost };
      }

      // Create BrowserSearchAgent with custom queries
      const browserSearch = new BrowserSearchAgent(this.context, this.eventEmitter, searchQueries);

      // Perform browser-based searches
      const searchResult = await browserSearch.execute();
      
      if (searchResult.success && searchResult.data?.results) {
        const searchResults = searchResult.data.results as any[];
        
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'success',
          agent: 'BrowserSearch',
          summary: `Found ${searchResults.length} search results via headless browser for ROC ${contractorEntity.rocNumber || 'N/A'}`,
        }, contractorEntity.rocNumber);

        // Extract emails from search result snippets and titles
        // Track which URL each email came from for tribal knowledge creation
        // (emailToUrlMap is already declared at function level)
        
        for (let i = 0; i < Math.min(searchResults.length, strategy.maxUrls || 10); i++) {
          const result = searchResults[i];
          const searchQuery = searchQueries[i];
          
          if (result.snippet || result.title) {
            const extractedEmails = this.extractEmailsFromText(
              (result.snippet || '') + ' ' + (result.title || '')
            );
            emails.push(...extractedEmails);

            // Track email-to-URL mapping for all searches (to create tribal knowledge and track sources)
            if (result.url && extractedEmails.length > 0) {
              try {
                const urlObj = new URL(result.url);
                const domain = urlObj.hostname.replace('www.', '');
                const source = this.determineSourceFromUrl(result.url);
                for (const email of extractedEmails) {
                  if (!emailToUrlMap.has(email)) {
                    emailToUrlMap.set(email, {
                      url: result.url,
                      domain: domain,
                      title: result.title,
                      source: source,
                    });
                  }
                }
              } catch (e) {
                // Invalid URL, skip
              }
            } else if (extractedEmails.length > 0) {
              // No URL but emails found - use search source
              for (const email of extractedEmails) {
                if (!emailToUrlMap.has(email)) {
                  emailToUrlMap.set(email, {
                    url: '',
                    domain: '',
                    source: searchQuery.source || 'google',
                  });
                }
              }
            }

            // Record tribal knowledge usage if this query came from tribal knowledge
            if (searchQuery.metadata?.knowledgeId && extractedEmails.length > 0) {
              await this.tribalKnowledgeService.recordUsage(
                searchQuery.metadata.knowledgeId,
                this.context.jobId,
                contractorEntity.rocNumber || '',
                searchQuery.query,
                true,
                extractedEmails.length,
                { resultUrl: result.url, resultTitle: result.title }
              );

              // Record email found for this knowledge
              for (const email of extractedEmails) {
                await this.tribalKnowledgeService.recordEmailFound(
                  searchQuery.metadata.knowledgeId,
                  email,
                  result.url || '',
                  contractorEntity.rocNumber || ''
                );
              }
            }
          }

          // Record usage even if no emails found
          if (searchQuery.metadata?.knowledgeId) {
            await this.tribalKnowledgeService.recordUsage(
              searchQuery.metadata.knowledgeId,
              this.context.jobId,
              contractorEntity.rocNumber || '',
              searchQuery.query,
              false,
              0,
              { resultUrl: result.url, resultTitle: result.title }
            );
          }
        }

        // Create tribal knowledge entries for successful Google search results
        if (emailToUrlMap.size > 0) {
          await this.createWebsiteTribalKnowledge(emailToUrlMap, contractorEntity);
        }

        totalCost += searchResult.cost || 0;
      }
    }

    // Deduplicate emails and create source map
    const uniqueEmails = Array.from(new Set(emails));
    const emailSourceMap = new Map<string, { source: string; sourceUrl: string }>();
    
    // Map emails to their sources
    for (const email of uniqueEmails) {
      if (emailToUrlMap.has(email)) {
        const urlInfo = emailToUrlMap.get(email)!;
        emailSourceMap.set(email, {
          source: urlInfo.source || 'google',
          sourceUrl: urlInfo.url || '',
        });
      } else {
        // Default source if not found in map
        emailSourceMap.set(email, {
          source: 'google',
          sourceUrl: '',
        });
      }
    }

    return {
      emails: uniqueEmails,
      emailSourceMap,
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
    const contractorEntity = this.context.currentEntityId 
      ? await this.getEntityById(this.context.currentEntityId)
      : null;
    
    const rocNumber = contractorEntity?.rocNumber || this.context.contractorInput.rocNumber || '';
    this.emitEventWithROC({
      ts: new Date().toISOString(),
      level: 'info',
      agent: 'EmailValidation',
      summary: `Validating ${emails.length} email address(es) for ROC ${rocNumber || 'N/A'}`,
    }, rocNumber);

    const validatedEmails: EmailCandidate[] = [];

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
   * Helper function to parse address into components
   */
  private parseAddress(address?: string): { city?: string; state?: string; zip?: string } {
    if (!address) return {};
    
    const parts = address.split(',').map(p => p.trim());
    let city = '';
    let state = '';
    let zip = '';
    
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      const stateZipMatch = lastPart.match(/([A-Z]{2}|Arizona)\s*(\d{5}(?:-\d{4})?)?/i);
      if (stateZipMatch) {
        state = stateZipMatch[1].toUpperCase();
        if (state === 'ARIZONA') state = 'AZ';
        zip = stateZipMatch[2] || '';
      } else {
        const stateMatch = lastPart.match(/\b([A-Z]{2})\b/);
        if (stateMatch) state = stateMatch[1];
        const zipMatch = lastPart.match(/\b(\d{5}(?:-\d{4})?)\b/);
        if (zipMatch) zip = zipMatch[1];
      }
      
      if (parts.length >= 2) {
        city = parts[parts.length - 2];
      }
    }
    
    return { city: city || undefined, state: state || undefined, zip: zip || undefined };
  }

  /**
   * Helper function to extract proprietor names from contractor name
   */
  private extractProprietorNames(contractorName: string): string[] {
    if (!contractorName) return [];
    
    const names: string[] = [];
    const separators = [',', '&', 'and', 'AND'];
    let text = contractorName;
    
    for (const sep of separators) {
      if (text.includes(sep)) {
        const parts = text.split(sep).map(p => p.trim());
        names.push(...parts);
        break;
      }
    }
    
    if (names.length === 0) {
      const words = contractorName.trim().split(/\s+/);
      if (words.length >= 2) {
        names.push(words.slice(0, 2).join(' '));
      } else {
        names.push(contractorName);
      }
    }
    
    return names.filter(n => n.length > 0);
  }

  /**
   * Create tribal knowledge entries for websites that successfully yielded emails
   */
  private async createWebsiteTribalKnowledge(
    emailToUrlMap: Map<string, { url: string; domain: string; title?: string }>,
    contractorEntity: Entity
  ): Promise<void> {
    try {
      const { prisma } = await import('../config/prisma');
      
      for (const [email, urlInfo] of emailToUrlMap.entries()) {
        // Skip if domain is too generic (google.com, facebook.com, etc.)
        const genericDomains = ['google.com', 'facebook.com', 'linkedin.com', 'twitter.com', 'instagram.com', 'youtube.com'];
        if (genericDomains.some(d => urlInfo.domain.includes(d))) {
          continue;
        }

        // Create a search pattern with the domain
        // Pattern: "site:example.com {contractorName} email" or "{contractorName} email site:example.com"
        const patterns = [
          `site:${urlInfo.domain} {contractorName} email`,
          `site:${urlInfo.domain} {businessName} email`,
          `{contractorName} email site:${urlInfo.domain}`,
          `{businessName} email site:${urlInfo.domain}`,
        ];

        // Check if we already have a tribal knowledge entry for this domain
        const existingKnowledge = await prisma.agentTribalKnowledge.findFirst({
          where: {
            searchPattern: {
              contains: `site:${urlInfo.domain}`,
            },
            isActive: true,
          },
        });

        if (!existingKnowledge) {
          // Create new tribal knowledge entry
          try {
            await prisma.agentTribalKnowledge.create({
              data: {
                name: `Auto: ${urlInfo.domain} Email Search`,
                description: `Auto-generated from successful email discovery. Found email ${email} for ROC ${contractorEntity.rocNumber} at ${urlInfo.url}. Website: ${urlInfo.domain}`,
                category: 'search-strategy',
                searchPattern: patterns[0], // Use first pattern as primary
                sourceType: 'google', // Still using Google search, but with site: operator
                priority: 70, // High priority since it worked
                isActive: true,
                createdBy: 'system',
                exampleQueries: patterns.slice(0, 2), // Store first 2 patterns as examples
                metadata: {
                  domain: urlInfo.domain,
                  successfulEmail: email,
                  successfulUrl: urlInfo.url,
                  rocNumber: contractorEntity.rocNumber,
                  allPatterns: patterns, // Store all patterns for reference
                },
              },
            });

            this.emitEvent({
              ts: new Date().toISOString(),
              level: 'info',
              agent: 'TribalKnowledge',
              summary: `Auto-created tribal knowledge for ${urlInfo.domain} (found email: ${email})`,
            });
          } catch (error) {
            console.error(`[ReasoningOrchestrator] Failed to create tribal knowledge for ${urlInfo.domain}:`, error);
          }
        } else {
          // Update existing knowledge with this success
          await this.tribalKnowledgeService.recordEmailFound(
            existingKnowledge.id,
            email,
            urlInfo.url,
            contractorEntity.rocNumber || ''
          );
        }
      }
    } catch (error) {
      console.error('[ReasoningOrchestrator] Error creating website tribal knowledge:', error);
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

  /**
   * Helper: Scrape a page for emails
   */
  private async scrapePageForEmails(url: string, depth: number, contractorEntity?: Entity): Promise<string[]> {
    const emails: string[] = [];
    
    // Check if URL is excluded before attempting to scrape
    const isExcluded = await excludedUrlService.isExcluded(url);
    if (isExcluded) {
      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `Skipping excluded URL: ${url}`,
        details: { url, reason: 'URL is in exclusion list' },
      });
      return emails; // Return empty array for excluded URLs
    }
    
    // For Level 2+, do a quick relevance check before scraping
    if (depth >= 2 && contractorEntity) {
      // Create a minimal SearchResult for relevance check
      const mockResult = {
        url,
        title: '',
        snippet: '',
      };
      const relevanceCheck = pageRelevanceService.checkRelevance(mockResult, contractorEntity);
      
      if (relevanceCheck.shouldSkip || (relevanceCheck.confidence < 15 && depth >= 2)) {
        this.emitEvent({
          ts: new Date().toISOString(),
          level: 'info',
          agent: 'ReasoningOrchestrator',
          summary: `Skipping low-relevance page (confidence: ${relevanceCheck.confidence}): ${url}`,
          details: { url, confidence: relevanceCheck.confidence, reasons: relevanceCheck.reasons, depth },
        });
        return emails; // Skip scraping
      }
    }
    
    try {
      const playwright = require('playwright');
      const browser = await playwright.chromium.launch({
        headless: true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
        ],
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const page = await context.newPage();
      
      // Override navigator.webdriver
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      });

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Scroll to bottom to load dynamic content (especially footers)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);

      // Wait for footer if present
      try {
        await page.waitForSelector('footer, [class*="footer"], [id*="footer"]', { timeout: 5000 });
      } catch (e) {
        // Footer not found, continue
      }

      // Extract page content
      const pageContent = await page.content();
      const visibleText = await page.evaluate(() => document.body.innerText);
      
      // Extract emails from multiple sources
      const allTextSources = [
        visibleText,
        pageContent,
        ...(await page.$$eval('a[href^="mailto:"]', (links) => links.map(l => l.href.replace('mailto:', '')))),
        ...(await page.$$eval('[data-email], [data-contact-email]', (els) => els.map(el => el.getAttribute('data-email') || el.getAttribute('data-contact-email')).filter(Boolean))),
      ].filter(Boolean).join(' ');

      emails.push(...this.extractEmailsFromText(allTextSources));

      await browser.close();
      
      // If no emails found, record this as a failure for future exclusion
      if (emails.length === 0) {
        await excludedUrlService.recordFailure(url, 'no_emails', {
          depth,
          scrapedAt: new Date().toISOString(),
        });
        this.emitEvent({
          ts: new Date().toISOString(),
          level: 'info',
          agent: 'ReasoningOrchestrator',
          summary: `No emails found on ${url} - will exclude from future runs`,
          details: { url, depth },
        });
      }
    } catch (error) {
      console.error(`[ReasoningOrchestrator] Error scraping ${url}:`, error);
      
      // Record error as failure for future exclusion
      const errorMessage = error instanceof Error ? error.message : String(error);
      await excludedUrlService.recordFailure(url, 'error', {
        depth,
        error: errorMessage,
        scrapedAt: new Date().toISOString(),
      });
      
      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'warning',
        agent: 'ReasoningOrchestrator',
        summary: `Error scraping ${url} - will exclude from future runs`,
        details: { url, depth, error: errorMessage },
      });
    }
    return Array.from(new Set(emails));
  }

  /**
   * Helper: Check if a URL is likely the company website
   */
  private isLikelyCompanyWebsite(url: string, contractorEntity: Entity): boolean {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '').toLowerCase();
      const businessName = (contractorEntity.businessName || contractorEntity.contractorName || '').toLowerCase();
      
      if (!businessName) return false;
      
      const businessNameWords = businessName.split(/\s+/).filter(w => w.length > 2);
      
      // Check if business name words appear in domain
      const nameInDomain = businessNameWords.some(word => domain.includes(word));
      
      // Check if it matches official website
      if (contractorEntity.officialWebsite) {
        try {
          const officialDomain = new URL(contractorEntity.officialWebsite).hostname.replace('www.', '').toLowerCase();
          if (domain === officialDomain) {
            return true;
          }
        } catch (e) {
          // Invalid URL
        }
      }
      
      return nameInDomain;
    } catch (e) {
      return false;
    }
  }

  /**
   * Helper: Find related links on a page (contact, about, team, etc.)
   */
  private async findRelatedLinks(url: string): Promise<string[]> {
    const links: string[] = [];
    try {
      const playwright = require('playwright');
      const browser = await playwright.chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled'],
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });

      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Find links that might contain contact info
      const relatedLinkSelectors = [
        'a[href*="contact"]',
        'a[href*="about"]',
        'a[href*="team"]',
        'a[href*="staff"]',
        'a[href*="email"]',
        'a[href*="mailto"]',
      ];

      for (const selector of relatedLinkSelectors) {
        const foundLinks = await page.$$eval(selector, (els) => 
          els.map(el => (el as HTMLAnchorElement).href).filter(Boolean)
        );
        links.push(...foundLinks);
      }

      await browser.close();
    } catch (error) {
      console.error(`[ReasoningOrchestrator] Error finding related links on ${url}:`, error);
    }
    
    // Resolve relative URLs and filter duplicates
    let resolvedLinks: string[] = [];
    try {
      const baseUrl = new URL(url);
      resolvedLinks = Array.from(new Set(
        links.map(link => {
          try {
            return new URL(link, baseUrl).href;
          } catch {
            return null;
          }
        }).filter(Boolean) as string[]
      ));
    } catch {
      resolvedLinks = Array.from(new Set(links));
    }
    
    // Filter out excluded URLs
    const filteredLinks = await excludedUrlService.filterExcluded(resolvedLinks);
    
    if (filteredLinks.length < resolvedLinks.length) {
      const excludedCount = resolvedLinks.length - filteredLinks.length;
      this.emitEvent({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ReasoningOrchestrator',
        summary: `Filtered out ${excludedCount} excluded link(s) from related links on ${url}`,
        details: { url, totalLinks: resolvedLinks.length, filteredLinks: filteredLinks.length },
      });
    }
    
    return filteredLinks;
  }

  /**
   * Step 2: Discover the official business website and verified listings
   */
  private async discoverWebPresence(contractorEntity: Entity): Promise<{
    officialWebsite: string;
    verifiedListings: Array<{ type: string; url: string }>;
    cost: number;
    evidence: Array<{ url: string; title: string; snippet: string; retrieved_at: string }>;
  }> {
    const evidence: Array<{ url: string; title: string; snippet: string; retrieved_at: string }> = [];
    const verifiedListings: Array<{ type: string; url: string }> = [];
    let cost = 0;
    let officialWebsite = contractorEntity.officialWebsite || '';

    const addressParts = this.parseAddress(contractorEntity.address);
    const city = addressParts.city || this.context.contractorInput.city || '';
    const state = addressParts.state || 'AZ';

    this.emitEventWithROC({
      ts: new Date().toISOString(),
      level: 'info',
      agent: 'WebPresence',
      summary: `Discovering web presence for ${contractorEntity.businessName || contractorEntity.contractorName}`,
      details: {
        businessName: contractorEntity.businessName || contractorEntity.contractorName,
        city: city,
        state: state,
        existingWebsite: contractorEntity.officialWebsite || 'None',
      },
    }, contractorEntity.rocNumber);

    // Search for official website - always search even if we have one, to verify and find alternatives
    if (contractorEntity.businessName || contractorEntity.contractorName) {
      const businessName = contractorEntity.businessName || contractorEntity.contractorName || '';
      
      const searchQueries: SearchQuery[] = [
        {
          query: `${businessName} ${city} ${state} website`,
          source: 'google',
          expectedResults: 10,
        },
        {
          query: `${businessName} ${city} ${state} official site`,
          source: 'google',
          expectedResults: 10,
        },
        {
          query: `"${businessName}" ${city} ${state} contractor website`,
          source: 'google',
          expectedResults: 10,
        },
      ];

      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'WebPresence',
        summary: `Executing ${searchQueries.length} search query(ies) to find official website`,
        details: {
          queries: searchQueries.map(q => ({ query: q.query, source: q.source })),
        },
      }, contractorEntity.rocNumber);

      const browserSearch = new BrowserSearchAgent(this.context, this.eventEmitter, searchQueries);
      const searchResult = await browserSearch.execute();
      cost += searchResult.cost || 0;

      if (searchResult.success && searchResult.data?.results) {
        const rawResults = searchResult.data.results as any[];
        
        // Filter out ads and rank by business similarity
        const similarityContext: BusinessSimilarityContext = {
          businessName: contractorEntity.businessName,
          contractorName: contractorEntity.contractorName,
          city: city,
          state: state,
          classification: contractorEntity.classification,
          address: contractorEntity.address,
          phone: contractorEntity.phone,
          rocNumber: contractorEntity.rocNumber,
        };
        
        const filteredResults = searchResultFilterService.getTopResults(rawResults, similarityContext, 10);
        
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'info',
          agent: 'WebPresence',
          summary: `Received ${rawResults.length} search result(s), ${filteredResults.length} relevant business site(s) after filtering ads and ranking by similarity`,
          details: {
            rawResults: rawResults.length,
            filteredResults: filteredResults.length,
            adsFiltered: rawResults.length - filteredResults.length,
            topResults: filteredResults.slice(0, 5).map(r => ({
              url: r.url,
              title: r.title,
              similarityScore: r.similarityScore,
              isBusinessSite: r.isBusinessSite,
              matchReason: r.businessMatchReason,
              snippet: r.snippet?.substring(0, 100),
            })),
          },
        }, contractorEntity.rocNumber);
        
        const results = filteredResults;
        
        // Score and rank results to find the best official website
        const scoredResults = results.map(result => {
          let score = 0;
          const url = result.url || '';
          const domain = url ? new URL(url).hostname.replace('www.', '') : '';
          const businessNameLower = businessName.toLowerCase();
          const domainLower = domain.toLowerCase();
          
          // Higher score for domains containing business name
          if (domainLower.includes(businessNameLower.replace(/\s+/g, ''))) score += 10;
          if (domainLower.includes(businessNameLower.split(' ')[0])) score += 5;
          
          // Higher score for common business TLDs
          if (domainLower.endsWith('.com')) score += 3;
          if (domainLower.endsWith('.net') || domainLower.endsWith('.org')) score += 2;
          
          // Lower score for social media, directories, etc.
          if (domainLower.includes('facebook') || domainLower.includes('linkedin') || 
              domainLower.includes('yelp') || domainLower.includes('bbb')) score -= 5;
          
          // Higher score if title/snippet mentions business name
          const titleLower = (result.title || '').toLowerCase();
          const snippetLower = (result.snippet || '').toLowerCase();
          if (titleLower.includes(businessNameLower)) score += 3;
          if (snippetLower.includes(businessNameLower)) score += 2;
          
          return { ...result, score, domain };
        }).sort((a, b) => b.score - a.score);

        // Log top scored results
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'info',
          agent: 'WebPresence',
          summary: `Scored and ranked ${scoredResults.length} result(s)`,
          details: {
            topScoredResults: scoredResults.slice(0, 5).map(r => ({
              url: r.url,
              domain: r.domain,
              score: r.score,
              title: r.title,
              reason: r.score >= 10 ? 'Domain contains business name' : 
                      r.score >= 5 ? 'Domain contains business name word' :
                      r.score >= 3 ? 'Common business TLD' : 'Other',
            })),
          },
        }, contractorEntity.rocNumber);

        // Take the highest scoring result as official website
        const bestResult = scoredResults[0];
        if (bestResult && bestResult.score > 0 && bestResult.url) {
          officialWebsite = bestResult.url;
          evidence.push({
            url: bestResult.url,
            title: bestResult.title || 'Official Website',
            snippet: bestResult.snippet || `Found official website for ${businessName}`,
            retrieved_at: new Date().toISOString(),
          });
          
          this.emitEventWithROC({
            ts: new Date().toISOString(),
            level: 'success',
            agent: 'WebPresence',
            summary: `✅ Selected official website: ${bestResult.url}`,
            details: {
              url: bestResult.url,
              domain: bestResult.domain,
              score: bestResult.score,
              title: bestResult.title,
              snippet: bestResult.snippet,
              reason: `Highest score (${bestResult.score}) - ${bestResult.score >= 10 ? 'Domain contains business name' : bestResult.score >= 5 ? 'Domain contains business name word' : 'Other factors'}`,
            },
          }, contractorEntity.rocNumber);
        } else {
          this.emitEventWithROC({
            ts: new Date().toISOString(),
            level: 'warning',
            agent: 'WebPresence',
            summary: `No suitable official website found (all results scored <= 0)`,
            details: {
              totalResults: results.length,
              topScore: scoredResults[0]?.score || 0,
            },
          }, contractorEntity.rocNumber);
        }
      } else {
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'warning',
          agent: 'WebPresence',
          summary: `Website search returned no results`,
          details: {
            queriesAttempted: searchQueries.length,
            success: searchResult.success,
            error: searchResult.error,
          },
        }, contractorEntity.rocNumber);
      }

      // If no official website found, try probabilistic guessing based on similar businesses
      if (!officialWebsite && (contractorEntity.businessName || contractorEntity.contractorName)) {
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'info',
          agent: 'WebPresence',
          summary: `Attempting probabilistic website discovery using similar businesses in the region`,
          details: {
            strategy: 'Find similar businesses, analyze their website patterns, generate probabilistic guesses',
          },
        }, contractorEntity.rocNumber);

        const probabilisticWebsite = await this.findWebsiteBySimilarBusinesses(contractorEntity, city, state);
        if (probabilisticWebsite) {
          officialWebsite = probabilisticWebsite;
          evidence.push({
            url: probabilisticWebsite,
            title: 'Probabilistic Website Match',
            snippet: `Found using pattern matching from similar businesses in ${city}, ${state}`,
            retrieved_at: new Date().toISOString(),
          });
          
          this.emitEventWithROC({
            ts: new Date().toISOString(),
            level: 'success',
            agent: 'WebPresence',
            summary: `✅ Found probable website using similar business pattern: ${probabilisticWebsite}`,
            details: {
              url: probabilisticWebsite,
              method: 'probabilistic_pattern_matching',
              confidence: 'medium',
              note: 'Website pattern inferred from similar businesses in the same region',
            },
          }, contractorEntity.rocNumber);
        }
      }

      // If no official website found, try probabilistic guessing based on similar businesses
      if (!officialWebsite && (contractorEntity.businessName || contractorEntity.contractorName)) {
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'info',
          agent: 'WebPresence',
          summary: `Attempting probabilistic website discovery using similar businesses in the region`,
          details: {
            strategy: 'Find similar businesses, analyze their website patterns, generate probabilistic guesses',
          },
        }, contractorEntity.rocNumber);

        const probabilisticWebsite = await this.findWebsiteBySimilarBusinesses(contractorEntity, city, state);
        if (probabilisticWebsite) {
          officialWebsite = probabilisticWebsite;
          evidence.push({
            url: probabilisticWebsite,
            title: 'Probabilistic Website Match',
            snippet: `Found using pattern matching from similar businesses in ${city}, ${state}`,
            retrieved_at: new Date().toISOString(),
          });
          
          this.emitEventWithROC({
            ts: new Date().toISOString(),
            level: 'success',
            agent: 'WebPresence',
            summary: `✅ Found probable website using similar business pattern: ${probabilisticWebsite}`,
            details: {
              url: probabilisticWebsite,
              method: 'probabilistic_pattern_matching',
              confidence: 'medium',
              note: 'Website pattern inferred from similar businesses in the same region',
            },
          }, contractorEntity.rocNumber);
        }
      }
    }

    // Search for verified listings (Google Business, Yelp, BBB, LinkedIn, etc.)
    if (contractorEntity.businessName || contractorEntity.contractorName) {
      const businessName = contractorEntity.businessName || contractorEntity.contractorName || '';
      
      // Define platform queries with metadata for better tracking
      const platformQueries: Array<{ platform: string; query: SearchQuery; expectedDomain: string }> = [
        {
          platform: 'Yelp',
          query: {
            query: `${businessName} ${city} ${state} site:yelp.com`,
            source: 'google',
            expectedResults: 5,
          },
          expectedDomain: 'yelp.com',
        },
        {
          platform: 'BBB',
          query: {
            query: `${businessName} ${city} ${state} site:bbb.org`,
            source: 'google',
            expectedResults: 5,
          },
          expectedDomain: 'bbb.org',
        },
        {
          platform: 'Google Business',
          query: {
            query: `${businessName} ${city} ${state} "Google Business" OR "Google My Business"`,
            source: 'google',
            expectedResults: 5,
          },
          expectedDomain: 'google.com',
        },
        {
          platform: 'LinkedIn',
          query: {
            query: `${businessName} ${city} ${state} site:linkedin.com/company`,
            source: 'google',
            expectedResults: 5,
          },
          expectedDomain: 'linkedin.com',
        },
        {
          platform: 'Angi/HomeAdvisor',
          query: {
            query: `${businessName} ${city} ${state} site:angi.com OR site:homeadvisor.com`,
            source: 'google',
            expectedResults: 5,
          },
          expectedDomain: 'angi.com,homeadvisor.com',
        },
      ];

      const listingQueries: SearchQuery[] = platformQueries.map(pq => pq.query);

      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'WebPresence',
        summary: `Searching for verified listings on ${platformQueries.length} platform(s)`,
        details: {
          platforms: platformQueries.map(pq => ({
            platform: pq.platform,
            query: pq.query.query,
            expectedDomain: pq.expectedDomain,
          })),
        },
      }, contractorEntity.rocNumber);

      // Search each platform individually to get per-platform results
      const platformResults: Map<string, Array<{ url: string; title: string; snippet: string }>> = new Map();
      
      for (const platformQuery of platformQueries) {
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'info',
          agent: 'WebPresence',
          summary: `🔍 Checking ${platformQuery.platform}...`,
          details: {
            platform: platformQuery.platform,
            query: platformQuery.query.query,
            expectedDomain: platformQuery.expectedDomain,
          },
        }, contractorEntity.rocNumber);

        const platformSearch = new BrowserSearchAgent(this.context, this.eventEmitter, [platformQuery.query]);
        const platformResult = await platformSearch.execute();
        cost += platformResult.cost || 0;

        if (platformResult.success && platformResult.data?.results) {
          const results = platformResult.data.results as any[];
          const platformListings: Array<{ url: string; title: string; snippet: string }> = [];
          
          for (const result of results) {
            if (result.url) {
              const listingType = this.determineListingType(result.url);
              if (listingType) {
                platformListings.push({
                  url: result.url,
                  title: result.title || listingType,
                  snippet: result.snippet || '',
                });
              }
            }
          }

          platformResults.set(platformQuery.platform, platformListings);

          if (platformListings.length > 0) {
            this.emitEventWithROC({
              ts: new Date().toISOString(),
              level: 'success',
              agent: 'WebPresence',
              summary: `✅ ${platformQuery.platform}: Found ${platformListings.length} listing(s)`,
              details: {
                platform: platformQuery.platform,
                count: platformListings.length,
                listings: platformListings.map(l => ({
                  url: l.url,
                  title: l.title,
                  snippet: l.snippet?.substring(0, 150),
                })),
              },
            }, contractorEntity.rocNumber);
          } else {
            this.emitEventWithROC({
              ts: new Date().toISOString(),
              level: 'info',
              agent: 'WebPresence',
              summary: `❌ ${platformQuery.platform}: No listings found`,
              details: {
                platform: platformQuery.platform,
                query: platformQuery.query.query,
                resultsReceived: results.length,
                note: results.length > 0 ? 'Results found but none matched listing criteria' : 'No results returned',
              },
            }, contractorEntity.rocNumber);
          }
        } else {
          this.emitEventWithROC({
            ts: new Date().toISOString(),
            level: 'warning',
            agent: 'WebPresence',
            summary: `⚠️ ${platformQuery.platform}: Search failed`,
            details: {
              platform: platformQuery.platform,
              query: platformQuery.query.query,
              success: platformResult.success,
              error: platformResult.error,
            },
          }, contractorEntity.rocNumber);
        }
      }

      // Aggregate all verified listings from all platforms
      const seenUrls = new Set<string>();
      for (const [platform, listings] of platformResults.entries()) {
        for (const listing of listings) {
          if (!seenUrls.has(listing.url)) {
            seenUrls.add(listing.url);
            const listingType = this.determineListingType(listing.url);
            if (listingType) {
              verifiedListings.push({ type: listingType, url: listing.url });
              evidence.push({
                url: listing.url,
                title: listing.title,
                snippet: listing.snippet,
                retrieved_at: new Date().toISOString(),
              });
            }
          }
        }
      }
      
      // Summary by platform
      const platformSummary = Array.from(platformResults.entries()).map(([platform, listings]) => ({
        platform,
        count: listings.length,
        listings: listings.map(l => ({ url: l.url, title: l.title })),
      }));

      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'success',
        agent: 'WebPresence',
        summary: `✅ Verified listings search completed: ${verifiedListings.length} total listing(s) found`,
        details: {
          totalListings: verifiedListings.length,
          platformBreakdown: platformSummary,
          allListings: verifiedListings.map(l => ({
            type: l.type,
            url: l.url,
          })),
          summary: platformSummary.map(ps => `${ps.platform}: ${ps.count}`).join(', '),
        },
      }, contractorEntity.rocNumber);
    }

    // Final summary
    this.emitEventWithROC({
      ts: new Date().toISOString(),
      level: 'success',
      agent: 'WebPresence',
      summary: `Web presence discovery completed`,
      details: {
        officialWebsite: officialWebsite || 'Not found',
        verifiedListingsCount: verifiedListings.length,
        verifiedListings: verifiedListings,
        evidenceCount: evidence.length,
        totalCost: cost,
        summary: {
          websiteFound: !!officialWebsite,
          listingsFound: verifiedListings.length,
          platforms: verifiedListings.map(l => l.type),
        },
      },
    }, contractorEntity.rocNumber);

    return { officialWebsite, verifiedListings, cost, evidence };
  }

  /**
   * Find website by analyzing similar businesses in the same region
   * Uses probabilistic pattern matching to guess website URLs
   */
  private async findWebsiteBySimilarBusinesses(
    contractorEntity: Entity,
    city: string,
    state: string
  ): Promise<string | null> {
    const businessName = contractorEntity.businessName || contractorEntity.contractorName || '';
    if (!businessName || !city) {
      return null;
    }

    try {
      // Step 1: Find similar businesses in the same region
      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'WebPresence',
        summary: `Searching for similar businesses in ${city}, ${state} to analyze website patterns`,
        details: {
          targetBusiness: businessName,
          region: `${city}, ${state}`,
          strategy: 'Find businesses with similar names/classifications in same area',
        },
      }, contractorEntity.rocNumber);

      // Search for similar businesses (same classification/type in same city)
      const classification = contractorEntity.classification || '';
      const businessType = classification.split(' ')[0] || 'contractor'; // Extract business type from classification
      
      const similarBusinessQueries: SearchQuery[] = [
        {
          query: `${businessType} ${city} ${state} contractor`,
          source: 'google',
          expectedResults: 5, // Limit to top 5 results to prevent endless loops
        },
        {
          query: `${city} ${state} ${businessType} business`,
          source: 'google',
          expectedResults: 5, // Limit to top 5 results to prevent endless loops
        },
      ];

      const similarBusinessSearch = new BrowserSearchAgent(this.context, this.eventEmitter, similarBusinessQueries);
      const similarResult = await similarBusinessSearch.execute();

      if (!similarResult.success || !similarResult.data?.results) {
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'warning',
          agent: 'WebPresence',
          summary: `Could not find similar businesses for pattern analysis`,
        }, contractorEntity.rocNumber);
        return null;
      }

      const similarResults = similarResult.data.results as any[];
      
      // Step 2: Extract website patterns from similar businesses
      const websitePatterns: Array<{ url: string; domain: string; pattern: string; businessName: string }> = [];
      
      for (const result of similarResults.slice(0, 10)) {
        if (result.url) {
          try {
            const urlObj = new URL(result.url);
            const domain = urlObj.hostname.replace('www.', '');
            
            // Skip social media, directories, etc.
            if (domain.includes('facebook') || domain.includes('linkedin') || 
                domain.includes('yelp') || domain.includes('bbb') || 
                domain.includes('google') || domain.includes('bing')) {
              continue;
            }
            
            // Extract business name from title if available
            const resultBusinessName = result.title || '';
            
            // Generate pattern: how is business name converted to domain?
            if (resultBusinessName) {
              const nameWords = resultBusinessName.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 1 && !['llc', 'inc', 'corp', 'ltd', 'co', 'dba', 'the', 'and', 'or'].includes(w));
              
              if (nameWords.length > 0) {
                const domainWithoutTld = domain.split('.')[0];
                const pattern = this.detectDomainPattern(nameWords, domainWithoutTld);
                
                if (pattern) {
                  websitePatterns.push({
                    url: result.url,
                    domain: domain,
                    pattern: pattern,
                    businessName: resultBusinessName,
                  });
                }
              }
            }
          } catch (e) {
            // Invalid URL, skip
          }
        }
      }

      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'WebPresence',
        summary: `Analyzed ${websitePatterns.length} website pattern(s) from similar businesses`,
        details: {
          patternsFound: websitePatterns.length,
          samplePatterns: websitePatterns.slice(0, 3).map(p => ({
            business: p.businessName,
            domain: p.domain,
            pattern: p.pattern,
          })),
        },
      }, contractorEntity.rocNumber);

      if (websitePatterns.length === 0) {
        return null;
      }

      // Step 3: Generate probabilistic website guesses based on patterns
      const targetNameWords = businessName.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 1 && !['llc', 'inc', 'corp', 'ltd', 'co', 'dba', 'the', 'and', 'or'].includes(w));

      if (targetNameWords.length === 0) {
        return null;
      }

      // Find most common pattern
      const patternCounts = new Map<string, number>();
      websitePatterns.forEach(p => {
        patternCounts.set(p.pattern, (patternCounts.get(p.pattern) || 0) + 1);
      });
      const mostCommonPattern = Array.from(patternCounts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0];

      if (!mostCommonPattern) {
        return null;
      }

      // Generate domain guesses based on most common pattern
      const domainGuesses = this.generateDomainGuesses(targetNameWords, mostCommonPattern);
      
      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'WebPresence',
        summary: `Generated ${domainGuesses.length} probabilistic website guess(es)`,
        details: {
          patternUsed: mostCommonPattern,
          patternFrequency: patternCounts.get(mostCommonPattern),
          guesses: domainGuesses.slice(0, 5), // Show first 5
        },
      }, contractorEntity.rocNumber);

      // Step 4: Test each guess by checking if domain exists (limit to top 8 guesses to prevent endless loops)
      const maxGuessesToTest = 8;
      for (const domainGuess of domainGuesses.slice(0, maxGuessesToTest)) {
        const testUrl = `https://${domainGuess}`;
        
        try {
          // Quick check: try to fetch the domain
          const testResult = await this.testWebsiteExists(testUrl);
          if (testResult.exists) {
            this.emitEventWithROC({
              ts: new Date().toISOString(),
              level: 'success',
              agent: 'WebPresence',
              summary: `✅ Probabilistic guess verified: ${testUrl} exists`,
              details: {
                url: testUrl,
                method: 'probabilistic_pattern_matching',
                pattern: mostCommonPattern,
                confidence: 'medium',
                status: testResult.status,
              },
            }, contractorEntity.rocNumber);
            return testUrl;
          }
        } catch (e) {
          // Domain doesn't exist or not accessible, try next guess
        }
      }
      
      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'WebPresence',
        summary: `Tested ${Math.min(domainGuesses.length, maxGuessesToTest)} probabilistic guesses, none verified`,
        details: {
          guessesTested: Math.min(domainGuesses.length, maxGuessesToTest),
          totalGuesses: domainGuesses.length,
          pattern: mostCommonPattern,
        },
      }, contractorEntity.rocNumber);

      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'WebPresence',
        summary: `None of the probabilistic website guesses were verified`,
        details: {
          guessesTested: domainGuesses.length,
          pattern: mostCommonPattern,
        },
      }, contractorEntity.rocNumber);

      return null;
    } catch (error) {
      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'warning',
        agent: 'WebPresence',
        summary: `Error in probabilistic website discovery: ${error instanceof Error ? error.message : String(error)}`,
      }, contractorEntity.rocNumber);
      return null;
    }
  }

  /**
   * Detect domain pattern from business name words and domain
   * Returns pattern like: "concatenated", "hyphenated", "firstword-only", etc.
   */
  private detectDomainPattern(nameWords: string[], domainWithoutTld: string): string | null {
    if (nameWords.length === 0 || !domainWithoutTld) {
      return null;
    }

    const allWords = nameWords.join('');
    const firstWord = nameWords[0];
    
    // Pattern 1: All words concatenated (e.g., "abcconstruction")
    if (domainWithoutTld === allWords) {
      return 'concatenated';
    }
    
    // Pattern 2: Hyphenated (e.g., "abc-construction")
    if (domainWithoutTld.includes('-')) {
      const hyphenated = nameWords.join('-');
      if (domainWithoutTld === hyphenated) {
        return 'hyphenated';
      }
    }
    
    // Pattern 3: First word only (e.g., "abc")
    if (domainWithoutTld === firstWord) {
      return 'firstword-only';
    }
    
    // Pattern 4: First word + last word (e.g., "abcconstruction")
    if (nameWords.length >= 2) {
      const firstLast = firstWord + nameWords[nameWords.length - 1];
      if (domainWithoutTld === firstLast) {
        return 'first-last';
      }
    }
    
    // Pattern 5: Abbreviated (e.g., "abc" from "ABC Construction")
    if (domainWithoutTld.length <= firstWord.length + 3 && domainWithoutTld.startsWith(firstWord)) {
      return 'abbreviated';
    }

    return null;
  }

  /**
   * Generate domain guesses based on pattern
   */
  private generateDomainGuesses(nameWords: string[], pattern: string): string[] {
    const guesses: string[] = [];
    const tlds = ['com', 'net', 'org', 'biz'];
    
    if (nameWords.length === 0) {
      return guesses;
    }

    const allWords = nameWords.join('');
    const firstWord = nameWords[0];
    const lastWord = nameWords[nameWords.length - 1];

    switch (pattern) {
      case 'concatenated':
        tlds.forEach(tld => guesses.push(`${allWords}.${tld}`));
        break;
      case 'hyphenated':
        tlds.forEach(tld => guesses.push(`${nameWords.join('-')}.${tld}`));
        break;
      case 'firstword-only':
        tlds.forEach(tld => guesses.push(`${firstWord}.${tld}`));
        break;
      case 'first-last':
        if (nameWords.length >= 2) {
          tlds.forEach(tld => guesses.push(`${firstWord}${lastWord}.${tld}`));
        }
        break;
      case 'abbreviated':
        // Try first 3-5 characters
        const abbrev = allWords.substring(0, Math.min(5, allWords.length));
        tlds.forEach(tld => guesses.push(`${abbrev}.${tld}`));
        break;
    }

    // Also try common variations
    if (pattern !== 'hyphenated') {
      tlds.forEach(tld => guesses.push(`${nameWords.join('-')}.${tld}`));
    }
    if (pattern !== 'concatenated') {
      tlds.forEach(tld => guesses.push(`${allWords}.${tld}`));
    }

    return Array.from(new Set(guesses)); // Remove duplicates
  }

  /**
   * Test if a website exists by making a HEAD request
   */
  private async testWebsiteExists(url: string): Promise<{ exists: boolean; status?: number }> {
    try {
      const https = require('https');
      const http = require('http');
      const { URL } = require('url');
      
      return new Promise((resolve) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        const req = client.request({
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: urlObj.pathname,
          method: 'HEAD',
          timeout: 5000,
        }, (res: any) => {
          resolve({
            exists: res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302,
            status: res.statusCode,
          });
        });
        
        req.on('error', () => resolve({ exists: false }));
        req.on('timeout', () => {
          req.destroy();
          resolve({ exists: false });
        });
        
        req.end();
      });
    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * Step 3: Extract business contact channels (email/phone/website) with evidence
   */
  private async extractContactChannels(
    contractorEntity: Entity,
    officialWebsite: string
  ): Promise<{
    emails: Array<{ email: string; type: string; confidence: number; evidence_urls: string[] }>;
    phones: Array<{ phone: string; confidence: number; evidence_urls: string[] }>;
    addresses: Array<{ address: string; confidence: number; evidence_urls: string[] }>;
    cost: number;
    evidence: Array<{ url: string; title: string; snippet: string; retrieved_at: string }>;
  }> {
    const emails: Array<{ email: string; type: string; confidence: number; evidence_urls: string[] }> = [];
    const phones: Array<{ phone: string; confidence: number; evidence_urls: string[] }> = [];
    const addresses: Array<{ address: string; confidence: number; evidence_urls: string[] }> = [];
    const evidence: Array<{ url: string; title: string; snippet: string; retrieved_at: string }> = [];
    let cost = 0;
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    const seenAddresses = new Set<string>();

    this.emitEventWithROC({
      ts: new Date().toISOString(),
      level: 'info',
      agent: 'ContactExtraction',
      summary: `Extracting contact channels for ${contractorEntity.businessName || contractorEntity.contractorName}`,
    }, contractorEntity.rocNumber);

    // Priority 1: Scrape official website for contact information
    if (officialWebsite) {
      this.emitEventWithROC({
        ts: new Date().toISOString(),
        level: 'info',
        agent: 'ContactExtraction',
        summary: `Scraping official website for contact info: ${officialWebsite}`,
      }, contractorEntity.rocNumber);

      try {
        const websiteContacts = await this.scrapeWebsiteForContacts(officialWebsite);
        
        // Extract emails
        for (const email of websiteContacts.emails) {
          if (!seenEmails.has(email.toLowerCase())) {
            seenEmails.add(email.toLowerCase());
            emails.push({
              email: email,
              type: 'business',
              confidence: 0.9, // High confidence from official website
              evidence_urls: [officialWebsite],
            });
            evidence.push({
              url: officialWebsite,
              title: `Email found on official website: ${email}`,
              snippet: `Extracted from ${officialWebsite}`,
              retrieved_at: new Date().toISOString(),
            });
          }
        }

        // Extract phones
        for (const phone of websiteContacts.phones) {
          const normalizedPhone = phone.replace(/\D/g, '');
          if (!seenPhones.has(normalizedPhone)) {
            seenPhones.add(normalizedPhone);
            phones.push({
              phone: phone,
              confidence: 0.9, // High confidence from official website
              evidence_urls: [officialWebsite],
            });
            evidence.push({
              url: officialWebsite,
              title: `Phone found on official website: ${phone}`,
              snippet: `Extracted from ${officialWebsite}`,
              retrieved_at: new Date().toISOString(),
            });
          }
        }

        // Extract addresses
        for (const address of websiteContacts.addresses) {
          if (!seenAddresses.has(address.toLowerCase())) {
            seenAddresses.add(address.toLowerCase());
            addresses.push({
              address: address,
              confidence: 0.9, // High confidence from official website
              evidence_urls: [officialWebsite],
            });
            evidence.push({
              url: officialWebsite,
              title: `Address found on official website: ${address}`,
              snippet: `Extracted from ${officialWebsite}`,
              retrieved_at: new Date().toISOString(),
            });
          }
        }

        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'success',
          agent: 'ContactExtraction',
          summary: `Extracted ${websiteContacts.emails.length} email(s), ${websiteContacts.phones.length} phone(s), ${websiteContacts.addresses.length} address(es) from official website`,
        }, contractorEntity.rocNumber);
      } catch (error) {
        this.emitEventWithROC({
          ts: new Date().toISOString(),
          level: 'warning',
          agent: 'ContactExtraction',
          summary: `Failed to scrape official website: ${error instanceof Error ? error.message : String(error)}`,
        }, contractorEntity.rocNumber);
      }
    }

    // Priority 2: Use structured search plan to find emails from web searches
    this.emitEventWithROC({
      ts: new Date().toISOString(),
      level: 'info',
      agent: 'ContactExtraction',
      summary: `Performing web searches for additional contact information`,
    }, contractorEntity.rocNumber);

    const discoveryResult = await this.executeStructuredSearchPlan(contractorEntity);
    cost += discoveryResult.cost || 0;

    // Convert email candidates to OUTPUT_SCHEMA format
    const validationResult = await this.validateEmails(
      discoveryResult.emails || [],
      discoveryResult.emailSourceMap || new Map()
    );

    for (const candidate of validationResult.emails) {
      const emailLower = candidate.email.toLowerCase();
      if (!seenEmails.has(emailLower)) {
        seenEmails.add(emailLower);
        const emailType = candidate.sourceUrl && officialWebsite && candidate.sourceUrl.includes(new URL(officialWebsite).hostname) 
          ? 'business' 
          : 'general';
        const confidence = candidate.confidence / 100; // Convert 0-100 to 0.0-1.0
        
        emails.push({
          email: candidate.email,
          type: emailType,
          confidence,
          evidence_urls: candidate.sourceUrl ? [candidate.sourceUrl] : [],
        });

        if (candidate.sourceUrl) {
          evidence.push({
            url: candidate.sourceUrl,
            title: `Email: ${candidate.email}`,
            snippet: candidate.rationale || `Found via ${candidate.source}`,
            retrieved_at: new Date().toISOString(),
          });
        }
      }
    }

    // Priority 3: Extract from ROC data (high confidence, authoritative source)
    if (contractorEntity.phone) {
      const normalizedPhone = contractorEntity.phone.replace(/\D/g, '');
      if (!seenPhones.has(normalizedPhone)) {
        seenPhones.add(normalizedPhone);
        phones.push({
          phone: contractorEntity.phone,
          confidence: 1.0, // Highest confidence from ROC
          evidence_urls: ['https://azroc.my.site.com/AZRoc/s/contractor-search'],
        });
        evidence.push({
          url: 'https://azroc.my.site.com/AZRoc/s/contractor-search',
          title: `Phone from ROC: ${contractorEntity.phone}`,
          snippet: `Official ROC license record`,
          retrieved_at: new Date().toISOString(),
        });
      }
    }

    if (contractorEntity.address) {
      if (!seenAddresses.has(contractorEntity.address.toLowerCase())) {
        seenAddresses.add(contractorEntity.address.toLowerCase());
        addresses.push({
          address: contractorEntity.address,
          confidence: 1.0, // Highest confidence from ROC
          evidence_urls: ['https://azroc.my.site.com/AZRoc/s/contractor-search'],
        });
        evidence.push({
          url: 'https://azroc.my.site.com/AZRoc/s/contractor-search',
          title: `Address from ROC: ${contractorEntity.address}`,
          snippet: `Official ROC license record`,
          retrieved_at: new Date().toISOString(),
        });
      }
    }

    this.emitEventWithROC({
      ts: new Date().toISOString(),
      level: 'success',
      agent: 'ContactExtraction',
      summary: `Contact extraction completed: ${emails.length} email(s), ${phones.length} phone(s), ${addresses.length} address(es)`,
    }, contractorEntity.rocNumber);

    return { emails, phones, addresses, cost, evidence };
  }

  /**
   * Scrape website for contact information (emails, phones, addresses)
   */
  private async scrapeWebsiteForContacts(url: string): Promise<{
    emails: string[];
    phones: string[];
    addresses: string[];
  }> {
    const emails: string[] = [];
    const phones: string[] = [];
    const addresses: string[] = [];

    try {
      const playwright = require('playwright');
      const browser = await playwright.chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled'],
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });

      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for page to load
      await page.waitForTimeout(2000);

      // Extract page content
      const pageContent = await page.content();
      const visibleText = await page.evaluate(() => document.body.innerText);

      // Extract emails
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const emailMatches = visibleText.match(emailRegex) || [];
      emails.push(...emailMatches);

      // Extract mailto links
      const mailtoLinks = await page.$$eval('a[href^="mailto:"]', (links) => 
        links.map(l => l.href.replace('mailto:', '').split('?')[0])
      );
      emails.push(...mailtoLinks);

      // Extract phones (US format: (XXX) XXX-XXXX, XXX-XXX-XXXX, etc.)
      const phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})/g;
      const phoneMatches = visibleText.match(phoneRegex) || [];
      phones.push(...phoneMatches.map(p => p.trim()));

      // Extract addresses (look for patterns like "City, State ZIP" or "Street Address, City, State")
      const addressPatterns = [
        /(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Road|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Way|Circle|Cir)[,\s]+[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)/gi,
        /([A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)/gi,
      ];

      for (const pattern of addressPatterns) {
        const matches = visibleText.match(pattern) || [];
        addresses.push(...matches.map(a => a.trim()));
      }

      await browser.close();
    } catch (error) {
      console.error(`[ContactExtraction] Error scraping ${url}:`, error);
    }

    return {
      emails: Array.from(new Set(emails)),
      phones: Array.from(new Set(phones)),
      addresses: Array.from(new Set(addresses)),
    };
  }

  /**
   * Step 4: Collect review/rating summaries and themes with evidence
   */
  private async collectReviewsAndRatings(
    contractorEntity: Entity,
    officialWebsite: string
  ): Promise<{
    ratingSummary: Array<{ source: string; average: number; count: number; url: string }>;
    reviewThemes: { positives: string[]; negatives: string[] };
    cost: number;
    evidence: Array<{ url: string; title: string; snippet: string; retrieved_at: string }>;
  }> {
    const ratingSummary: Array<{ source: string; average: number; count: number; url: string }> = [];
    const reviewThemes = { positives: [] as string[], negatives: [] as string[] };
    const evidence: Array<{ url: string; title: string; snippet: string; retrieved_at: string }> = [];
    let cost = 0;

    if (!contractorEntity.businessName) {
      return { ratingSummary, reviewThemes, cost, evidence };
    }

    const addressParts = this.parseAddress(contractorEntity.address);
    const city = addressParts.city || this.context.contractorInput.city || '';

    // Search for reviews on Yelp, Google, BBB
    const reviewQueries: SearchQuery[] = [
      {
        query: `${contractorEntity.businessName} ${city} site:yelp.com reviews`,
        source: 'google',
        expectedResults: 3,
      },
      {
        query: `${contractorEntity.businessName} ${city} "Google reviews"`,
        source: 'google',
        expectedResults: 3,
      },
      {
        query: `${contractorEntity.businessName} ${city} site:bbb.org`,
        source: 'google',
        expectedResults: 3,
      },
    ];

    const reviewSearch = new BrowserSearchAgent(this.context, this.eventEmitter, reviewQueries);
    const reviewResult = await reviewSearch.execute();
    cost += reviewResult.cost || 0;

    if (reviewResult.success && reviewResult.data?.results) {
      const results = reviewResult.data.results as any[];
      for (const result of results) {
        if (result.url) {
          const source = this.determineListingType(result.url) || 'unknown';
          
          // Extract rating information from snippet (simplified - in production would scrape the page)
          const ratingMatch = result.snippet?.match(/(\d+\.?\d*)\s*(?:star|rating)/i);
          const countMatch = result.snippet?.match(/(\d+)\s*(?:review|rating)/i);
          
          if (ratingMatch || countMatch) {
            ratingSummary.push({
              source,
              average: ratingMatch ? parseFloat(ratingMatch[1]) : 0,
              count: countMatch ? parseInt(countMatch[1]) : 0,
              url: result.url,
            });
          }

          evidence.push({
            url: result.url,
            title: result.title || source,
            snippet: result.snippet || '',
            retrieved_at: new Date().toISOString(),
          });
        }
      }
    }

    return { ratingSummary, reviewThemes, cost, evidence };
  }

  /**
   * Step 5: Format output according to OUTPUT_SCHEMA.md
   */
  private formatOutputSchema(data: {
    rocNumberRaw: string;
    rocNumberNormalized: string;
    contractorEntity: Entity | null;
    webPresence: { officialWebsite: string; verifiedListings: Array<{ type: string; url: string }> };
    contact: { emails: any[]; phones: any[]; addresses: any[] };
    reputation: { ratingSummary: any[]; reviewThemes: { positives: string[]; negatives: string[] } };
    evidence: Array<{ url: string; title: string; snippet: string; retrieved_at: string }>;
    warnings: string[];
    errors: string[];
    runId: string;
    runStartTime: number;
  }): any {
    const entity = data.contractorEntity;
    const duration = Date.now() - data.runStartTime;

    return {
      input: {
        roc_number_raw: data.rocNumberRaw,
        roc_number_normalized: data.rocNumberNormalized,
      },
      primary: {
        contractor_name: entity?.contractorName || '',
        license_number: entity?.rocNumber || data.rocNumberNormalized,
        license_status: entity?.licenseStatus || '',
        classifications: entity?.classification ? [entity.classification] : [],
        business_address: entity?.address || '',
        phone: entity?.phone || '',
        discipline_summary: entity?.classification || '',
        source_url: 'https://azroc.my.site.com/AZRoc/s/contractor-search',
        retrieved_at: new Date().toISOString(),
      },
      web_presence: {
        official_website: data.webPresence.officialWebsite || '',
        company_linkedin: data.webPresence.verifiedListings.find(l => l.type === 'linkedin')?.url || '',
        other_profiles: data.webPresence.verifiedListings
          .filter(l => l.type !== 'linkedin')
          .map(l => ({ type: l.type, url: l.url })),
      },
      contact: {
        emails: data.contact.emails,
        phones: data.contact.phones,
        addresses: data.contact.addresses,
      },
      reputation: {
        rating_summary: data.reputation.ratingSummary,
        review_themes: data.reputation.reviewThemes,
      },
      evidence: data.evidence,
      warnings: data.warnings,
      errors: data.errors,
      run_metadata: {
        run_id: data.runId,
        created_at: new Date(data.runStartTime).toISOString(),
        duration_ms: duration,
      },
    };
  }

  /**
   * Helper: Determine listing type from URL
   */
  private determineListingType(url: string): string | null {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('yelp')) return 'yelp';
    if (urlLower.includes('bbb') || urlLower.includes('betterbusinessbureau')) return 'bbb';
    if (urlLower.includes('google') && urlLower.includes('business')) return 'google_business';
    if (urlLower.includes('linkedin')) return 'linkedin';
    if (urlLower.includes('angi') || urlLower.includes('homeadvisor')) return 'angi';
    if (urlLower.includes('thumbtack')) return 'thumbtack';
    if (urlLower.includes('houzz')) return 'houzz';
    return null;
  }
}

