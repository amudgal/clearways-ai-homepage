# Hybrid LLM Reasoning Setup

## Overview

The agent system uses a **hybrid approach**:
- **LLM for strategic decisions** (strategy selection, query generation, result interpretation)
- **Deterministic agents for execution** (ROC lookup, scraping, validation)

## Environment Variables

Add these to your `.env` file:

```bash
# OpenAI API Key (required for LLM reasoning)
OPENAI_API_KEY=sk-your-api-key-here

# Optional: Model selection (defaults to gpt-4o-mini for cost efficiency)
OPENAI_MODEL=gpt-4o-mini

# Optional: Enable/disable LLM reasoning (defaults to true if API key is present)
USE_LLM_REASONING=true
```

## How It Works

### 1. Strategy Decision (LLM or Deterministic)

When processing a contractor, the orchestrator decides the best discovery strategy:

**With LLM:**
```typescript
const strategy = await llmService.decideStrategy({
  contractorName: "ABC Construction",
  rocNumber: "123456",
  hasOfficialWebsite: true,
  city: "Phoenix"
});

// Returns:
// {
//   approach: "roc-first",
//   searchQueries: ["ABC Construction contact Phoenix", ...],
//   maxUrls: 10,
//   reasoning: "Official website available - prioritize authoritative source",
//   confidence: 0.85
// }
```

**Without LLM (fallback):**
```typescript
// Automatically falls back to deterministic logic
// Uses template-based queries and fixed strategy
```

### 2. Query Generation (LLM or Deterministic)

**With LLM:**
```typescript
const queries = await llmService.generateSearchQueries({
  contractorName: "ABC Construction",
  rocNumber: "123456",
  city: "Phoenix",
  classification: "General contractor"
});

// Returns contextual queries like:
// ["ABC Construction Phoenix contact", "ABC Construction ROC 123456", ...]
```

**Without LLM:**
```typescript
// Uses template: `"${name}" contact email ${city}`
```

### 3. Result Interpretation (LLM or Deterministic)

**With LLM:**
```typescript
const interpretation = await llmService.interpretResults({
  emailsFound: 3,
  confidenceScores: [85, 72, 45],
  sources: ["roc", "website", "linkedin"],
  highConfidenceCount: 1,
  mediumConfidenceCount: 1,
  lowConfidenceCount: 1
});

// Returns natural language explanation
```

**Without LLM:**
```typescript
// Returns structured explanation with fixed templates
```

## Cost Analysis

### Per Contractor Processing

| Component | LLM Calls | Cost (gpt-4o-mini) | Cost (gpt-4) |
|-----------|-----------|-------------------|--------------|
| Strategy Decision | 1 | ~$0.0001 | ~$0.01 |
| Query Generation | 0-1 | ~$0.0001 | ~$0.01 |
| Result Interpretation | 1 | ~$0.0001 | ~$0.01 |
| **Total per contractor** | **2-3** | **~$0.0003** | **~$0.03** |

### For 1000 Contractors

- **gpt-4o-mini**: ~$0.30
- **gpt-4**: ~$30
- **Deterministic (no LLM)**: $0

## Usage in Code

```typescript
import { ReasoningOrchestratorAgent } from './agents/orchestrator/ReasoningOrchestratorAgent';
import { EventEmitter } from 'events';

const context = {
  jobId: 'job-123',
  contractorInput: {
    rocNumber: '123456',
    contractorName: 'ABC Construction',
    city: 'Phoenix',
  },
  preferences: {
    useLLM: true, // Enable LLM reasoning
    excludedDomains: ['example.com'],
  },
  budgetRemaining: 1000,
  visitedDomains: new Set(),
  excludedDomains: new Set(),
};

const eventEmitter = new EventEmitter();
const orchestrator = new ReasoningOrchestratorAgent(context, eventEmitter);

// Listen to explanation events
eventEmitter.on('explanation', (event) => {
  console.log(`[${event.agent}] ${event.summary}`);
});

// Execute
const result = await orchestrator.execute();
```

## Fallback Behavior

The system **always falls back to deterministic** if:
- `OPENAI_API_KEY` is not set
- `useLLM: false` in preferences
- LLM API call fails
- Rate limit exceeded

This ensures the system **always works**, even without LLM.

## Testing

### Test with LLM:
```bash
export OPENAI_API_KEY=sk-your-key
npm run dev
```

### Test without LLM:
```bash
# Don't set OPENAI_API_KEY, or set USE_LLM_REASONING=false
npm run dev
```

## Monitoring

The orchestrator emits events you can monitor:

```typescript
eventEmitter.on('explanation', (event) => {
  if (event.level === 'info' && event.agent === 'ReasoningOrchestrator') {
    if (event.summary.includes('LLM reasoning enabled')) {
      console.log('✅ Using LLM reasoning');
    } else if (event.summary.includes('LLM not available')) {
      console.log('⚠️  Using deterministic fallback');
    }
  }
});
```

## Best Practices

1. **Start with deterministic** - Test your system works without LLM first
2. **Add LLM gradually** - Enable for specific use cases that need intelligence
3. **Monitor costs** - Track LLM usage and costs per job
4. **Set budget caps** - Use `preferences.budgetCap` to limit spending
5. **Use cheaper models** - `gpt-4o-mini` is 10x cheaper than `gpt-4` with similar quality for this use case

## Troubleshooting

### LLM not being used
- Check `OPENAI_API_KEY` is set
- Check `preferences.useLLM` is not `false`
- Check logs for "LLM reasoning enabled" message

### High costs
- Switch to `gpt-4o-mini` model
- Reduce number of contractors per job
- Set `budgetCap` in preferences

### LLM errors
- System automatically falls back to deterministic
- Check API key is valid
- Check rate limits

