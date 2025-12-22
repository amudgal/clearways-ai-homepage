# Adding LLM to Reasoning Agent (Optional)

## Quick Answer

**Current implementation: NO LLM needed** - Uses deterministic rule-based logic.

**If you want LLM reasoning:** Add it as an optional enhancement for strategic decisions.

## How to Add LLM (If Needed)

### 1. Install LLM SDK

```bash
cd server
npm install openai  # or @anthropic-ai/sdk
```

### 2. Create LLM Service

```typescript
// server/src/services/llmService.ts
import OpenAI from 'openai';

export class LLMReasoningService {
  private client: OpenAI;
  
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  /**
   * Decide discovery strategy using LLM
   */
  async decideStrategy(context: {
    contractorName: string;
    rocNumber: string;
    hasOfficialWebsite: boolean;
    city?: string;
  }): Promise<{
    approach: 'roc-first' | 'search-first' | 'hybrid';
    searchQueries: string[];
    maxUrls: number;
    reasoning: string;
  }> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini', // Cheaper option
      messages: [{
        role: 'system',
        content: `You are a reasoning agent that decides how to discover contractor contact emails.
        Return JSON with: approach, searchQueries (array), maxUrls (number), reasoning (string).`
      }, {
        role: 'user',
        content: `Contractor: ${context.contractorName}, ROC: ${context.rocNumber}, 
        Has official website: ${context.hasOfficialWebsite}, City: ${context.city || 'unknown'}`
      }],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower = more deterministic
    });
    
    return JSON.parse(response.choices[0].message.content || '{}');
  }
  
  /**
   * Generate explanation for results
   */
  async generateExplanation(results: {
    emailsFound: number;
    confidenceScores: number[];
    sources: string[];
  }): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: 'Generate a concise, user-friendly explanation of email discovery results.'
      }, {
        role: 'user',
        content: `Found ${results.emailsFound} emails. Confidence: ${results.confidenceScores.join(', ')}. 
        Sources: ${results.sources.join(', ')}.`
      }],
      temperature: 0.5,
    });
    
    return response.choices[0].message.content || '';
  }
}
```

### 3. Make LLM Optional in Orchestrator

```typescript
// server/src/agents/orchestrator/ReasoningOrchestratorAgent.ts
import { LLMReasoningService } from '../../services/llmService';

export class ReasoningOrchestratorAgent extends BaseAgent {
  private llmService?: LLMReasoningService;
  
  constructor(
    context: AgentContext,
    // ... other agents
    useLLM: boolean = false
  ) {
    super(context);
    
    if (useLLM && process.env.OPENAI_API_KEY) {
      this.llmService = new LLMReasoningService();
    }
  }
  
  async execute(): Promise<AgentResult> {
    // Decide strategy
    let strategy;
    if (this.llmService) {
      // LLM-enhanced strategy
      strategy = await this.llmService.decideStrategy({
        contractorName: this.context.contractorInput.contractorName,
        rocNumber: this.context.contractorInput.rocNumber,
        hasOfficialWebsite: !!contractorEntity?.officialWebsite,
        city: this.context.contractorInput.city,
      });
    } else {
      // Deterministic strategy (current)
      strategy = this.deterministicStrategy();
    }
    
    // Execute strategy (same for both)
    // ... rest of execution
  }
  
  private deterministicStrategy() {
    // Current fixed logic
    return {
      approach: 'roc-first' as const,
      searchQueries: [
        `"${this.context.contractorInput.contractorName}" contact email Arizona`,
        `"${this.context.contractorInput.contractorName}" website`
      ],
      maxUrls: 10,
      reasoning: 'Standard discovery approach'
    };
  }
}
```

### 4. Environment Variable

```bash
# .env
OPENAI_API_KEY=sk-...  # Optional - only if using LLM
USE_LLM_REASONING=false  # Feature flag
```

## Cost Analysis

**Per contractor processing:**

| Approach | LLM Calls | Cost | Speed |
|----------|-----------|------|-------|
| Deterministic | 0 | $0.00 | Fast |
| LLM Strategy | 1-2 | $0.01-0.05 | Medium |
| Full LLM | 5-10 | $0.05-0.20 | Slow |

**For 1000 contractors:**
- Deterministic: $0
- LLM Strategy: $10-50
- Full LLM: $50-200

## Recommendation

**For contractor email discovery: Start without LLM**

The deterministic approach works well because:
1. ROC data is authoritative
2. Search patterns are predictable
3. Email validation has clear rules
4. Cost-effective at scale

**Add LLM only if:**
- You need more intelligent query generation
- Results need better interpretation
- You want natural language explanations
- You're handling edge cases that need reasoning

## Current Architecture (No LLM)

```
ReasoningOrchestratorAgent (Deterministic)
    ↓
    Fixed sequence:
    1. ROC Lookup
    2. Search (template queries)
    3. Scrape (top 10 URLs)
    4. Validate (fixed rubric)
    5. Return results
```

This is **fast, predictable, and cost-effective** - perfect for structured data discovery tasks.

