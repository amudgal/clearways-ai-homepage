// LLM Service for Strategic Reasoning
// Uses OpenAI for high-level strategy decisions while keeping execution deterministic

import OpenAI from 'openai';

export interface DiscoveryStrategy {
  approach: 'roc-first' | 'search-first' | 'hybrid' | 'official-only';
  searchQueries: string[];
  maxUrls: number;
  prioritySources: string[];
  reasoning: string;
  confidence: number;
}

export interface ResultInterpretation {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  confidenceExplanation: string;
}

export class LLMReasoningService {
  private client: OpenAI | null = null;
  private enabled: boolean = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.enabled = true;
      console.log('[LLM Service] OpenAI client initialized');
    } else {
      console.log('[LLM Service] OpenAI API key not found - LLM reasoning disabled');
    }
  }

  /**
   * Check if LLM service is available
   */
  isAvailable(): boolean {
    return this.enabled && this.client !== null;
  }

  /**
   * Decide discovery strategy using LLM based on ROC data
   * Falls back to deterministic if LLM unavailable
   */
  async decideStrategy(context: {
    contractorName: string;
    rocNumber: string;
    city?: string;
    hasOfficialWebsite: boolean;
    rocData?: {
      businessName?: string;
      website?: string;
      address?: string;
      phone?: string;
      classification?: string;
      licenseStatus?: string;
    };
  }): Promise<DiscoveryStrategy> {
    if (!this.isAvailable()) {
      return this.deterministicStrategy(context);
    }

    try {
      const response = await this.client!.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini', // Use cheaper model by default
        messages: [
          {
            role: 'system',
            content: `You are a reasoning agent that plans how to discover contractor email addresses from Arizona ROC contractor data.

Your goal: Analyze ROC contractor information and create a strategic plan to find their contact email.

IMPORTANT: The official Arizona ROC contractor search website is:
https://azroc.my.site.com/AZRoc/s/contractor-search

This is the authoritative source for ROC contractor information. You can search by ROC number to get:
- Contractor name, business name
- License status and classification
- Address and contact information
- Official website (if available)

Available approaches:
- roc-first: Start with ROC official website (https://azroc.my.site.com/AZRoc/s/contractor-search), then search other sources
- search-first: Start with web search using contractor details, then verify
- hybrid: Use both ROC website and web search in parallel
- official-only: Only use official ROC website (fastest, most authoritative)

ROC Data Analysis:
- ALWAYS prioritize the official ROC search site: https://azroc.my.site.com/AZRoc/s/contractor-search
- Use business name, contractor name, classification, and address to generate intelligent search queries
- If official website exists from ROC data, prioritize it
- Consider contractor type (e.g., "General Contractor", "Plumbing", "Electrical") when generating queries
- Use city/address information to narrow searches

Return JSON with:
{
  "approach": "roc-first" | "search-first" | "hybrid" | "official-only",
  "searchQueries": ["query1", "query2", ...],
  "maxUrls": 10,
  "prioritySources": ["roc-website", "official-website", "linkedin", "business-directories", ...],
  "reasoning": "Brief explanation of why this strategy based on ROC data",
  "confidence": 0.85
}`,
          },
          {
            role: 'user',
            content: `ROC Contractor Information:
- Contractor Name: ${context.contractorName}
- ROC Number: ${context.rocNumber}
- Business Name: ${context.rocData?.businessName || 'Not provided'}
- Official Website: ${context.rocData?.website || 'Not available'}
- Address: ${context.rocData?.address || context.city || 'Unknown'}
- Phone: ${context.rocData?.phone || 'Not provided'}
- Classification: ${context.rocData?.classification || 'Unknown'}
- License Status: ${context.rocData?.licenseStatus || 'Unknown'}

IMPORTANT: The official Arizona ROC contractor search is at:
https://azroc.my.site.com/AZRoc/s/contractor-search

You can search by ROC number ${context.rocNumber} to get complete contractor details.

Plan the best strategy to discover their email address. Consider:
1. First, query the official ROC site (https://azroc.my.site.com/AZRoc/s/contractor-search) using ROC number ${context.rocNumber}
2. If official website exists from ROC data, how to extract email from it
3. What search queries would be most effective given the contractor type and location
4. Which sources (LinkedIn, business directories, etc.) are most likely to have contact info for this type of contractor`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower = more deterministic
        max_tokens: 500,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from LLM');
      }

      const strategy = JSON.parse(content) as DiscoveryStrategy;
      
      // Validate and sanitize response
      if (!['roc-first', 'search-first', 'hybrid', 'official-only'].includes(strategy.approach)) {
        strategy.approach = 'roc-first';
      }
      if (!Array.isArray(strategy.searchQueries)) {
        strategy.searchQueries = this.generateDefaultQueries(context);
      }
      if (typeof strategy.maxUrls !== 'number' || strategy.maxUrls < 1 || strategy.maxUrls > 20) {
        strategy.maxUrls = 10;
      }

      console.log('[LLM Service] Strategy decided:', strategy.approach, strategy.reasoning);
      return strategy;
    } catch (error) {
      console.error('[LLM Service] Strategy decision failed, falling back to deterministic:', error);
      return this.deterministicStrategy(context);
    }
  }

  /**
   * Generate intelligent search queries using LLM based on ROC data
   */
  async generateSearchQueries(context: {
    contractorName: string;
    rocNumber: string;
    city?: string;
    classification?: string;
    businessName?: string;
    address?: string;
    phone?: string;
  }): Promise<string[]> {
    if (!this.isAvailable()) {
      return this.generateDefaultQueries(context);
    }

    try {
      const response = await this.client!.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Generate 3-5 effective web search queries to find contact email for an Arizona ROC contractor.

Use the ROC data to create intelligent, specific queries that will find:
- Their business website
- Contact pages
- Email addresses
- LinkedIn profiles
- Business directory listings

Return JSON with queries array: {"queries": ["query1", "query2", ...]}`,
          },
          {
            role: 'user',
            content: `ROC Contractor Details:
- Contractor Name: ${context.contractorName}
- Business Name: ${context.businessName || 'Not provided'}
- ROC Number: ${context.rocNumber}
- City/Location: ${context.city || context.address || 'Arizona'}
- Classification: ${context.classification || 'General contractor'}
- Phone: ${context.phone || 'Not provided'}

Generate search queries that will effectively find their contact email. Consider:
- Using business name if different from contractor name
- Including classification/type of contractor
- Using location to narrow results
- Variations that might find LinkedIn, directories, or contact pages`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 200,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from LLM');
      }

      const parsed = JSON.parse(content);
      const queries = parsed.queries || parsed.searchQueries || [];
      
      if (Array.isArray(queries) && queries.length > 0) {
        console.log('[LLM Service] Generated queries:', queries);
        return queries.slice(0, 5); // Limit to 5 queries
      }
      
      return this.generateDefaultQueries(context);
    } catch (error) {
      console.error('[LLM Service] Query generation failed, using defaults:', error);
      return this.generateDefaultQueries(context);
    }
  }

  /**
   * Interpret results and generate explanation
   */
  async interpretResults(results: {
    emailsFound: number;
    confidenceScores: number[];
    sources: string[];
    highConfidenceCount: number;
    mediumConfidenceCount: number;
    lowConfidenceCount: number;
  }): Promise<ResultInterpretation> {
    if (!this.isAvailable()) {
      return this.deterministicInterpretation(results);
    }

    try {
      const response = await this.client!.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Generate a user-friendly interpretation of email discovery results.
Return JSON with:
{
  "summary": "Brief summary (1-2 sentences)",
  "keyFindings": ["finding1", "finding2", ...],
  "recommendations": ["recommendation1", ...],
  "confidenceExplanation": "Why confidence is high/medium/low"
}`,
          },
          {
            role: 'user',
            content: `Found ${results.emailsFound} emails.
Confidence breakdown: ${results.highConfidenceCount} high, ${results.mediumConfidenceCount} medium, ${results.lowConfidenceCount} low.
Sources: ${results.sources.join(', ')}.
Average confidence: ${(results.confidenceScores.reduce((a, b) => a + b, 0) / results.confidenceScores.length).toFixed(1)}/100`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 300,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from LLM');
      }

      const interpretation = JSON.parse(content) as ResultInterpretation;
      console.log('[LLM Service] Generated interpretation');
      return interpretation;
    } catch (error) {
      console.error('[LLM Service] Interpretation failed, using deterministic:', error);
      return this.deterministicInterpretation(results);
    }
  }

  /**
   * Fallback: Deterministic strategy (public for orchestrator access)
   */
  deterministicStrategy(context: {
    contractorName: string;
    rocNumber: string;
    city?: string;
    hasOfficialWebsite: boolean;
  }): DiscoveryStrategy {
    const queries = this.generateDefaultQueries(context);
    
    return {
      approach: context.hasOfficialWebsite ? 'roc-first' : 'search-first',
      searchQueries: queries,
      maxUrls: 10,
      prioritySources: context.hasOfficialWebsite ? ['roc', 'official-website'] : ['search', 'directories'],
      reasoning: context.hasOfficialWebsite 
        ? 'Official website available from ROC - prioritize authoritative source'
        : 'No official website - use web search to discover contact information',
      confidence: 0.8,
    };
  }

  /**
   * Fallback: Default search queries (public for orchestrator access)
   */
  generateDefaultQueries(context: {
    contractorName: string;
    rocNumber: string;
    city?: string;
  }): string[] {
    const queries: string[] = [];
    const name = context.contractorName;
    const city = context.city || 'Arizona';
    
    queries.push(`"${name}" contact email ${city}`);
    queries.push(`"${name}" website ${city}`);
    queries.push(`Arizona ROC ${context.rocNumber} contractor`);
    
    if (city && city !== 'Arizona') {
      queries.push(`"${name}" ${city} contractor`);
    }
    
    return queries;
  }

  /**
   * Fallback: Deterministic interpretation (public for orchestrator access)
   */
  deterministicInterpretation(results: {
    emailsFound: number;
    confidenceScores: number[];
    sources: string[];
    highConfidenceCount: number;
    mediumConfidenceCount: number;
    lowConfidenceCount: number;
  }): ResultInterpretation {
    const avgConfidence = results.confidenceScores.length > 0
      ? results.confidenceScores.reduce((a, b) => a + b, 0) / results.confidenceScores.length
      : 0;

    return {
      summary: `Found ${results.emailsFound} email address${results.emailsFound !== 1 ? 'es' : ''} with ${results.highConfidenceCount} high confidence, ${results.mediumConfidenceCount} medium, and ${results.lowConfidenceCount} low confidence.`,
      keyFindings: [
        `Average confidence score: ${avgConfidence.toFixed(1)}/100`,
        `Sources: ${results.sources.join(', ')}`,
        results.highConfidenceCount > 0 ? `${results.highConfidenceCount} high-confidence emails found` : 'No high-confidence emails',
      ],
      recommendations: [
        results.highConfidenceCount > 0 
          ? 'High-confidence emails are ready to use'
          : 'Consider manual verification for medium-confidence emails',
        results.sources.length > 1 
          ? 'Multiple sources confirm email addresses'
          : 'Single source - consider additional verification',
      ],
      confidenceExplanation: avgConfidence >= 80
        ? 'High confidence due to multiple authoritative sources'
        : avgConfidence >= 50
        ? 'Medium confidence - some sources verified'
        : 'Low confidence - limited source verification',
    };
  }
}

