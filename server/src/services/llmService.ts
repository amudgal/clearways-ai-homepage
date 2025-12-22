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
   * Decide discovery strategy using LLM
   * Falls back to deterministic if LLM unavailable
   */
  async decideStrategy(context: {
    contractorName: string;
    rocNumber: string;
    city?: string;
    hasOfficialWebsite: boolean;
    rocData?: any;
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
            content: `You are a reasoning agent that decides the best strategy to discover contractor contact emails.
            
Your goal: Find verified email addresses for Arizona ROC contractors efficiently.

Available approaches:
- roc-first: Start with ROC official website, then search
- search-first: Start with web search, then verify
- hybrid: Use both ROC and search in parallel
- official-only: Only use official ROC website (fastest, most authoritative)

Return JSON with:
{
  "approach": "roc-first" | "search-first" | "hybrid" | "official-only",
  "searchQueries": ["query1", "query2", ...],
  "maxUrls": 10,
  "prioritySources": ["roc", "official-website", "linkedin", ...],
  "reasoning": "Brief explanation of why this strategy",
  "confidence": 0.85
}`,
          },
          {
            role: 'user',
            content: `Contractor: ${context.contractorName}
ROC Number: ${context.rocNumber}
City: ${context.city || 'unknown'}
Has official website from ROC: ${context.hasOfficialWebsite}
ROC Data available: ${context.rocData ? 'Yes' : 'No'}

Decide the best discovery strategy.`,
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
   * Generate intelligent search queries using LLM
   */
  async generateSearchQueries(context: {
    contractorName: string;
    rocNumber: string;
    city?: string;
    classification?: string;
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
            content: `Generate 3-5 effective web search queries to find contact information for an Arizona contractor.
Return JSON array of query strings: ["query1", "query2", ...]`,
          },
          {
            role: 'user',
            content: `Contractor: ${context.contractorName}
ROC: ${context.rocNumber}
City: ${context.city || 'Arizona'}
Classification: ${context.classification || 'General contractor'}

Generate search queries that will find their website, contact page, or email.`,
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

