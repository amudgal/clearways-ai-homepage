// Google Custom Search API Service
// Uses Google's Programmable Search Engine (Custom Search JSON API)
// Documentation: https://developers.google.com/custom-search/v1/overview

// TEST: This log should appear when the file is loaded
console.log('✅ GoogleSearchApi.ts file loaded successfully');

import { SearchResult } from '../agents/search/BrowserSearchAgent';
import { apiCallTracker } from './apiCallTracker';

export interface GoogleSearchApiConfig {
  apiKey: string;
  searchEngineId: string; // CX parameter
}

export interface GoogleSearchApiResponse {
  items?: Array<{
    title: string;
    link: string;
    snippet?: string;
    displayLink?: string;
  }>;
  searchInformation?: {
    totalResults?: string;
    searchTime?: number;
  };
}

export class GoogleSearchApiService {
  private apiKey: string | null = null;
  private searchEngineId: string | null = null;
  private baseUrl = 'https://www.googleapis.com/customsearch/v1';

  constructor() {
    // Get API credentials from environment variables
    this.apiKey = process.env.GOOGLE_SEARCH_API_KEY || null;
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || null;

    if (this.apiKey && this.searchEngineId) {
      console.log('[GoogleSearchAPI] Service initialized with API credentials');
      console.log('[GoogleSearchAPI] CSE ID:', this.searchEngineId);
      console.log('[GoogleSearchAPI] API Key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'NOT SET');
    } else {
      console.log('[GoogleSearchAPI] Service not fully configured - missing API key or Search Engine ID');
      if (!this.apiKey) {
        console.log('[GoogleSearchAPI] Missing GOOGLE_SEARCH_API_KEY environment variable');
      }
      if (!this.searchEngineId) {
        console.log('[GoogleSearchAPI] Missing GOOGLE_SEARCH_ENGINE_ID environment variable');
      }
    }
  }

  /**
   * Check if the service is configured and available
   */
  isAvailable(): boolean {
    return !!(this.apiKey && this.searchEngineId);
  }

  /**
   * Perform a Google search using the Custom Search API
   * Returns both results and the actual query that was used (structured/cleaned)
   * @param query - The search query
   * @param maxResults - Maximum number of results to return
   * @param rocNumber - Optional ROC number for call tracking (to enforce limits)
   */
  async search(query: string, maxResults: number = 10, rocNumber?: string): Promise<{ results: SearchResult[]; actualQueryUsed: string }> {
    // CRITICAL: Check API call limit FIRST - before any processing
    // This prevents wasting time on query processing if we can't make calls
    if (rocNumber) {
      const stats = apiCallTracker.getStats(rocNumber);
      if (!apiCallTracker.canMakeCall(rocNumber)) {
        throw new Error(`API call limit reached for ROC ${rocNumber}. ${stats.totalCalls}/${stats.maxCalls} calls used. Please optimize queries or increase limit.`);
      }
      // Log current status
      console.log(`[GoogleSearchAPI] 🔍 Starting search for ROC ${rocNumber}. Current status: ${stats.totalCalls}/${stats.maxCalls} calls used, ${stats.remainingCalls} remaining`);
    }
    
    // CRITICAL: Clean query IMMEDIATELY upon entry - remove quotes and + signs
    // This ensures no matter where the query comes from, it's clean before processing
    const cleanedInputQuery = query
      .replace(/^["']+|["']+$/g, '') // Remove surrounding quotes
      .replace(/["']/g, '') // Remove all internal quotes
      .replace(/\s*\+\s*/g, ' ') // Remove + signs and surrounding spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // CRITICAL LOGGING - This should ALWAYS appear
    console.log('\n\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🚀 GOOGLE SEARCH API - SEARCH CALLED');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Raw input query: "${query}"`);
    console.log(`Cleaned input query: "${cleanedInputQuery}"`);
    console.log(`Has quotes? ${query.includes('"') || query.includes("'") ? 'YES ❌' : 'NO ✅'}`);
    console.log(`Has + signs? ${query.includes('+') ? 'YES ❌' : 'NO ✅'}`);
    console.log(`Max results: ${maxResults}`);
    console.log(`API Available: ${this.isAvailable()}`);
    console.log(`API Key set: ${!!this.apiKey}`);
    console.log(`CSE ID set: ${!!this.searchEngineId}`);
    if (this.searchEngineId) {
      console.log(`CSE ID: ${this.searchEngineId}`);
    }
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n\n');
    
    if (!this.isAvailable()) {
      console.error(`[GoogleSearchAPI] ❌ ERROR: Google Search API is not configured!`);
      console.error(`[GoogleSearchAPI]    Missing GOOGLE_SEARCH_API_KEY: ${!this.apiKey}`);
      console.error(`[GoogleSearchAPI]    Missing GOOGLE_SEARCH_ENGINE_ID: ${!this.searchEngineId}`);
      throw new Error('Google Search API is not configured. Please set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID environment variables.');
    }

    try {
      // Use cleaned query for all processing
      query = cleanedInputQuery;
      
      // INTELLIGENT QUERY STRUCTURING: Structure the query for better ordering
      // (company name, location, attributes) but WITHOUT quotes
      const structuredQuery = this.structureQuery(query);
      
      // Clean query is the same as input (already cleaned at entry)
      const cleanQuery = query;
      
      console.log(`[GoogleSearchAPI] 📝 QUERY PROCESSING:`);
      console.log(`[GoogleSearchAPI]    Original query: "${query}"`);
      console.log(`[GoogleSearchAPI]    Structured query: "${structuredQuery}"`);
      console.log(`[GoogleSearchAPI]    Cleaned query (no quotes): "${cleanQuery}"`);
      
      // CRITICAL: Prioritize clean query WITHOUT quotes first (broader search radius)
      // Google API works better with plain text queries without quotes
      // All queries should be without quotes for maximum search radius
      const allQueryVariations = [
        cleanQuery, // Clean version WITHOUT quotes FIRST (broader search - highest priority)
        structuredQuery, // Structured query (now also without quotes) - good ordering
        // Try simplified versions (all without quotes)
        cleanQuery.split(' ').slice(0, 5).join(' '), // First 5 words
        cleanQuery.split(' ').slice(0, 3).join(' '), // First 3 words
        // Try without common stop words
        cleanQuery.replace(/\b(contractor|email|contact|info|llc|llp|inc)\b/gi, '').trim(),
        // Try just business name + location if available
        cleanQuery.replace(/\b\d{6}\b/g, '').trim(), // Remove ROC numbers
      ].filter(q => q && q.length > 0); // Remove empty queries

      // CRITICAL: Limit the number of variations based on remaining API calls
      // If we only have 1 call remaining, only try 1 variation (the best one)
      // This prevents exceeding the limit
      let maxVariationsToTry = allQueryVariations.length;
      if (rocNumber) {
        const stats = apiCallTracker.getStats(rocNumber);
        maxVariationsToTry = Math.min(maxVariationsToTry, stats.remainingCalls);
        if (maxVariationsToTry <= 0) {
          throw new Error(`API call limit reached for ROC ${rocNumber}. ${stats.totalCalls}/${stats.maxCalls} calls used. Cannot make any more calls.`);
        }
        console.log(`[GoogleSearchAPI] 🔒 Limiting to ${maxVariationsToTry} variation(s) based on ${stats.remainingCalls} remaining API call(s)`);
      }
      
      const queryVariations = allQueryVariations.slice(0, maxVariationsToTry);

      let lastError: Error | null = null;
      let lastResponse: GoogleSearchApiResponse | null = null;

      for (let variationIndex = 0; variationIndex < queryVariations.length; variationIndex++) {
        const queryVariation = queryVariations[variationIndex];
        
        // CRITICAL: Check API call limit BEFORE making each API call
        // This is a double-check to ensure we don't exceed the limit
        if (rocNumber && !apiCallTracker.canMakeCall(rocNumber)) {
          const stats = apiCallTracker.getStats(rocNumber);
          console.warn(`[GoogleSearchAPI] ⚠️  API call limit reached (${stats.totalCalls}/${stats.maxCalls}) before trying variation ${variationIndex + 1}. Stopping query variations.`);
          break; // Stop trying more variations
        }
        
        try {
          // For site: operator queries, don't strip the site: part
          // Only strip quotes from quoted phrases, but preserve site: operator
          let finalQuery: string;
          if (queryVariation.includes('site:')) {
            // This is a site: operator query - preserve it as-is (no quotes to strip anyway)
            finalQuery = queryVariation.trim();
            console.log(`[GoogleSearchAPI] 🎯 Using site: operator query: "${finalQuery}"`);
          } else {
            // Regular query - strip quotes
            finalQuery = queryVariation.replace(/^["']+|["']+$/g, '').replace(/["']/g, '').trim();
          }
          
          const url = new URL(this.baseUrl);
          url.searchParams.set('key', this.apiKey!);
          url.searchParams.set('cx', this.searchEngineId!);
          url.searchParams.set('q', finalQuery); // Use finalQuery
          url.searchParams.set('num', Math.min(maxResults, 10).toString()); // API max is 10 per request
          // Remove fields parameter - it might be causing issues, let's get full response
          // url.searchParams.set('fields', 'items(title,link,snippet,displayLink),searchInformation');

          // Verify the query parameter is set correctly (no quotes, but site: operator preserved)
          const actualQueryParam = url.searchParams.get('q');
          
          // CRITICAL: Log the exact query string being sent to Google API
          console.log('\n\n');
          console.log('═══════════════════════════════════════════════════════════════');
          console.log('🔍 GOOGLE API QUERY STRING (BEING SENT NOW)');
          console.log('═══════════════════════════════════════════════════════════════');
          console.log(`Query (q parameter): "${actualQueryParam}"`);
          console.log(`Full API URL: ${url.toString().replace(/key=[^&]+/, 'key=***')}`);
          console.log(`Variation: ${variationIndex + 1}/${queryVariations.length} (${variationIndex === 0 ? 'CLEAN QUERY (NO QUOTES) - HIGHEST PRIORITY' : variationIndex === queryVariations.length - 1 ? 'STRUCTURED (LAST RESORT)' : 'fallback'})`);
          console.log(`Original variation: "${queryVariation}"`);
          console.log(`Final query sent: "${finalQuery}"`);
          console.log(`CSE ID: ${this.searchEngineId}`);
          console.log(`✅ VERIFICATION: Query has quotes? ${actualQueryParam?.includes('"') || actualQueryParam?.includes("'") ? 'YES ❌' : 'NO ✅'}`);
          console.log(`✅ Has site: operator? ${actualQueryParam?.includes('site:') ? 'YES ✅' : 'NO'}`);
          console.log('═══════════════════════════════════════════════════════════════');
          console.log('\n\n');
          
          if (actualQueryParam && (actualQueryParam.includes('"') || actualQueryParam.includes("'"))) {
            console.error(`[GoogleSearchAPI] ❌ ERROR: Query parameter still contains quotes! This will cause 0 results.`);
            console.error(`[GoogleSearchAPI] Original query: "${queryVariation}"`);
            console.error(`[GoogleSearchAPI] Cleaned query: "${finalQuery}"`);
            console.error(`[GoogleSearchAPI] Actual URL param: "${actualQueryParam}"`);
            // Force remove quotes from URL parameter
            const fixedQuery = actualQueryParam.replace(/^["']+|["']+$/g, '').replace(/["']/g, '').trim();
            url.searchParams.set('q', fixedQuery);
            console.log(`[GoogleSearchAPI] 🔧 FIXED: Query parameter now: "${fixedQuery}"`);
          }

          // CRITICAL: Record API call BEFORE making the request (to prevent exceeding limit)
          // This ensures every API call is counted, even if it fails or returns no results
          let apiCallRecorded = false;
          if (rocNumber) {
            // Reserve the API call slot before making the request
            if (apiCallTracker.canMakeCall(rocNumber)) {
              apiCallTracker.recordCall(rocNumber, finalQuery, 0); // Record with 0 results initially
              apiCallRecorded = true;
              const stats = apiCallTracker.getStats(rocNumber);
              console.log(`[GoogleSearchAPI] 📊 API Call Stats BEFORE request: ${stats.totalCalls}/${stats.maxCalls} calls used, ${stats.remainingCalls} remaining`);
            } else {
              console.warn(`[GoogleSearchAPI] ⚠️  Cannot make API call - limit reached. Skipping this variation.`);
              break; // Stop trying more variations
            }
          }

          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(`Google Search API error: ${response.status} ${response.statusText} - ${errorText}`);
            console.error(`[GoogleSearchAPI] ❌ API ERROR for query "${queryVariation}":`, {
              status: response.status,
              statusText: response.statusText,
              errorText: errorText,
              cseId: this.searchEngineId,
              note: 'If browser shows results but API fails, check: 1) CSE ID matches, 2) CSE is configured to search entire web (*), 3) API key has Custom Search API enabled'
            });
            // API call was already recorded, but it failed - update the history if needed
            // (The call is already counted, so we just continue to next variation)
            lastError = error;
            continue; // Try next variation
          }

          const data: GoogleSearchApiResponse = await response.json();
          lastResponse = data;

          // Parse total results
          const totalResults = data.searchInformation?.totalResults 
            ? parseInt(data.searchInformation.totalResults, 10) 
            : 0;

          // Log detailed response for debugging
          console.log(`[GoogleSearchAPI] API Response for "${finalQuery}":`, {
            totalResults: data.searchInformation?.totalResults || '0',
            totalResultsParsed: totalResults,
            searchTime: data.searchInformation?.searchTime || 'N/A',
            itemsCount: data.items?.length || 0,
            hasItems: !!data.items,
          });
          
          // CRITICAL: Log full response for first query to debug why API returns 0 when browser shows results
          if (queryVariation === cleanQuery) {
            console.log(`[GoogleSearchAPI] 🔍 FULL API RESPONSE (first query only):`, JSON.stringify(data, null, 2));
            if (data.items && data.items.length > 0) {
              console.log(`[GoogleSearchAPI] ✅ API returned ${data.items.length} items:`);
              data.items.forEach((item, idx) => {
                console.log(`[GoogleSearchAPI]   ${idx + 1}. ${item.title} - ${item.link}`);
              });
            } else {
              console.log(`[GoogleSearchAPI] ❌ API returned 0 items but totalResults=${totalResults}`);
              console.log(`[GoogleSearchAPI] This suggests:`);
              console.log(`  - CSE ID mismatch (API using different CSE than browser)`);
              console.log(`  - API configuration issue (CSE not configured for entire web)`);
              console.log(`  - Query format issue (though browser works with same query)`);
            }
          }

          if (data.items && data.items.length > 0) {
            // Success! Transform and return results
            // Note: Ad filtering and similarity scoring will be done by SearchResultFilterService
            const results: SearchResult[] = data.items.map((item) => ({
              url: item.link,
              title: item.title,
              snippet: item.snippet || '',
              relevanceScore: 0.8,
            }));

            console.log(`[GoogleSearchAPI] ✅ SUCCESS! Found ${results.length} results`);
            console.log(`[GoogleSearchAPI]    Query used: "${finalQuery}"`);
            console.log(`[GoogleSearchAPI]    Variation: ${variationIndex + 1}/${queryVariations.length} (${variationIndex === 0 ? 'CLEAN QUERY (NO QUOTES)' : 'fallback'})`);
            console.log(`[GoogleSearchAPI]    Original query: "${query}"`);
            
            // Update API call record with actual results count (call was already recorded before the request)
            if (rocNumber && apiCallRecorded) {
              apiCallTracker.updateLastCallResults(rocNumber, results.length);
              const stats = apiCallTracker.getStats(rocNumber);
              console.log(`[GoogleSearchAPI] 📊 API Call Stats for ROC ${rocNumber}: ${stats.totalCalls}/${stats.maxCalls} calls used, ${stats.remainingCalls} remaining`);
            }
            
            // Return results with the actual query used (clean query, not structured)
            return { results, actualQueryUsed: finalQuery };
          } else {
            // No items, but API call succeeded - log for debugging
            console.log(`[GoogleSearchAPI] ❌ No items in response for query: "${finalQuery}"`);
            
            // Update API call record with 0 results (call was already recorded before the request)
            if (rocNumber && apiCallRecorded) {
              // The call is already recorded with 0 results, which is correct
              const stats = apiCallTracker.getStats(rocNumber);
              console.log(`[GoogleSearchAPI] 📊 API Call Stats (no results): ${stats.totalCalls}/${stats.maxCalls} calls used, ${stats.remainingCalls} remaining`);
            }
            
            // Check if totalResults indicates there should be results
            if (totalResults > 0) {
              console.log(`[GoogleSearchAPI] ⚠️  Warning: API reports ${totalResults} total results but returned 0 items.`);
              console.log(`[GoogleSearchAPI] This may indicate:`);
              console.log(`  1. Pagination issue - results exist but not in first page`);
              console.log(`  2. Custom Search Engine configuration issue`);
              console.log(`  3. Query too specific - trying simpler variations...`);
            } else {
              console.log(`[GoogleSearchAPI] API reports 0 total results for this query variation.`);
            }
            
            // Log full response for debugging (only for first variation to avoid spam)
            if (finalQuery === cleanQuery) {
              console.log(`[GoogleSearchAPI] Full API response:`, JSON.stringify(data, null, 2));
            }
          }
        } catch (variationError) {
          console.error(`[GoogleSearchAPI] Error with query variation "${queryVariation}":`, variationError);
          lastError = variationError instanceof Error ? variationError : new Error(String(variationError));
          continue; // Try next variation
        }
      }

      // All variations failed or returned no results
      if (lastResponse) {
        console.log(`\n\n`);
        console.log(`═══════════════════════════════════════════════════════════════`);
        console.log(`❌ GOOGLE API: ALL QUERY VARIATIONS RETURNED 0 RESULTS`);
        console.log(`═══════════════════════════════════════════════════════════════`);
        console.log(`Last response:`, JSON.stringify(lastResponse, null, 2));
        console.log(`\nTroubleshooting:`);
        console.log(`  1. ✅ Check CSE Configuration:`);
        console.log(`     - Go to: https://programmablesearchengine.google.com/controlpanel/all`);
        console.log(`     - Find your CSE (ID: ${this.searchEngineId})`);
        console.log(`     - Click "Setup" → "Basics"`);
        console.log(`     - In "Sites to search", enter: * (asterisk to search entire web)`);
        console.log(`     - Save and wait 1-2 minutes for changes to propagate`);
        console.log(`  2. ✅ Verify Search Engine ID (CX): ${this.searchEngineId}`);
        console.log(`  3. ✅ Check API key has access to Custom Search API`);
        console.log(`  4. ✅ Try query manually: https://cse.google.com/cse?cx=${this.searchEngineId}&q=${encodeURIComponent(cleanQuery)}`);
        console.log(`  5. ✅ Check if query has quotes/`+` signs (should be clean): "${cleanQuery}"`);
        console.log(`═══════════════════════════════════════════════════════════════`);
        console.log(`\n\n`);
      }

      if (lastError) {
        throw lastError;
      }

      // No results found with any variation
      // Return the clean query that was attempted first (for logging)
      return { results: [], actualQueryUsed: cleanQuery };

      // Transform API response to SearchResult format
      const results: SearchResult[] = data.items.map((item) => ({
        url: item.link,
        title: item.title,
        snippet: item.snippet || '',
        relevanceScore: 0.8, // API results are generally relevant
      }));

      console.log(`[GoogleSearchAPI] Found ${results.length} results for query: "${query}"`);

      // If we need more than 10 results, make additional requests
      if (maxResults > 10 && data.searchInformation?.totalResults) {
        const totalResults = parseInt(data.searchInformation.totalResults, 10);
        const remainingResults = Math.min(maxResults - 10, totalResults - 10);
        
        if (remainingResults > 0) {
          // Make additional requests with start parameter (pagination)
          const additionalRequests = Math.ceil(remainingResults / 10);
          
          for (let i = 1; i <= additionalRequests; i++) {
            const startIndex = (i * 10) + 1;
            const numResults = Math.min(10, remainingResults - ((i - 1) * 10));
            
            try {
              const paginatedUrl = new URL(this.baseUrl);
              paginatedUrl.searchParams.set('key', this.apiKey!);
              paginatedUrl.searchParams.set('cx', this.searchEngineId!);
              paginatedUrl.searchParams.set('q', query);
              paginatedUrl.searchParams.set('num', numResults.toString());
              paginatedUrl.searchParams.set('start', startIndex.toString());
              paginatedUrl.searchParams.set('fields', 'items(title,link,snippet,displayLink)');

              // Add delay between requests to respect rate limits
              await new Promise(resolve => setTimeout(resolve, 1000));

              const paginatedResponse = await fetch(paginatedUrl.toString(), {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                },
              });

              if (paginatedResponse.ok) {
                const paginatedData: GoogleSearchApiResponse = await paginatedResponse.json();
                if (paginatedData.items) {
                  const paginatedResults: SearchResult[] = paginatedData.items.map((item) => ({
                    url: item.link,
                    title: item.title,
                    snippet: item.snippet || '',
                    relevanceScore: 0.8,
                  }));
                  results.push(...paginatedResults);
                }
              }
            } catch (error) {
              console.error(`[GoogleSearchAPI] Error fetching page ${i + 1}:`, error);
              // Continue with results we have
              break;
            }
          }
        }
      }

      return results.slice(0, maxResults);
    } catch (error) {
      console.error('[GoogleSearchAPI] Search error:', error);
      throw error;
    }
  }

  /**
   * Structure query by separating company name, location, and search attributes
   * Format 1 (with platform): Company Name site:platform.com
   * Format 2 (without platform): "Company Name" + "Location" + attribute
   * Example 1: Umbrella Assurance Co. LLC site:facebook.com
   * Example 2: "Umbrella Assurance Co. LLC" + "Glendale AZ" + contact
   */
  private structureQuery(query: string): string {
    // Remove existing quotes first
    let clean = query.replace(/^["']+|["']+$/g, '').replace(/["']/g, '').trim();
    
    // Platform/domain mappings for site: operator
    const platformDomains: { [key: string]: string } = {
      'facebook': 'facebook.com',
      'linkedin': 'linkedin.com',
      'nextdoor': 'nextdoor.com',
      'instagram': 'instagram.com',
      'twitter': 'twitter.com',
      'x.com': 'x.com',
      'youtube': 'youtube.com',
      'yellowpages': 'yellowpages.com',
      'whitepages': 'whitepages.com',
      'directory': 'yellowpages.com', // Default directory to yellowpages
    };
    
    // Check if query contains a platform/domain keyword
    let detectedPlatform: string | null = null;
    let platformDomain: string | null = null;
    
    for (const [platform, domain] of Object.entries(platformDomains)) {
      // Check if query contains the platform name (case-insensitive)
      const platformRegex = new RegExp(`\\b${platform}\\b`, 'gi');
      if (clean.match(platformRegex)) {
        detectedPlatform = platform;
        platformDomain = domain;
        break;
      }
    }
    
    // If platform detected, use site: operator format
    if (detectedPlatform && platformDomain) {
      // Remove platform keyword from query
      const queryWithoutPlatform = clean.replace(new RegExp(`\\b${detectedPlatform}\\b`, 'gi'), '').trim();
      
      // Extract company name (what's left after removing platform)
      const companyName = queryWithoutPlatform.replace(/\s+/g, ' ').trim();
      
      if (companyName) {
        // Format: Company Name site:platform.com
        const structured = `${companyName} site:${platformDomain}`;
        console.log(`[GoogleSearchAPI] Structured query (site: operator): "${query}" → "${structured}"`);
        return structured;
      }
    }
    
    // If no platform detected, use the original structured format
    // Common search attributes/keywords (these should NOT be in quotes)
    const searchAttributes = ['contact', 'email', 'phone', 'info', 'about', 'contractor'];
    
    // US State abbreviations (for location detection)
    const stateAbbreviations = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
    
    // Step 1: Extract search attributes first (they're usually at the end)
    let attributes: string[] = [];
    let queryWithoutAttributes = clean;
    
    for (const attr of searchAttributes) {
      const regex = new RegExp(`\\b${attr}\\b`, 'gi');
      if (queryWithoutAttributes.match(regex)) {
        attributes.push(attr);
        queryWithoutAttributes = queryWithoutAttributes.replace(regex, '').trim();
      }
    }
    
    // Step 2: Extract location (look for City + State or State or ZIP)
    let location = '';
    let remainingQuery = queryWithoutAttributes;
    
    // Pattern 1: City + State (e.g., "Glendale AZ", "Phoenix AZ")
    const cityStatePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+([A-Z]{2})\b/g;
    const cityStateMatch = remainingQuery.match(cityStatePattern);
    if (cityStateMatch && cityStateMatch.length > 0) {
      // Take the last match (usually the most specific location)
      location = cityStateMatch[cityStateMatch.length - 1];
      remainingQuery = remainingQuery.replace(new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
    } else {
      // Pattern 2: Just state abbreviation (e.g., "AZ", "CA")
      const statePattern = new RegExp(`\\b(${stateAbbreviations.join('|')})\\b`, 'gi');
      const stateMatch = remainingQuery.match(statePattern);
      if (stateMatch && stateMatch.length > 0) {
        location = stateMatch[stateMatch.length - 1];
        remainingQuery = remainingQuery.replace(new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
      } else {
        // Pattern 3: ZIP code
        const zipPattern = /\b\d{5}(?:-\d{4})?\b/g;
        const zipMatch = remainingQuery.match(zipPattern);
        if (zipMatch && zipMatch.length > 0) {
          location = zipMatch[zipMatch.length - 1];
          remainingQuery = remainingQuery.replace(new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
        }
      }
    }
    
    // Step 3: What's left should be the company/business name
    const companyName = remainingQuery.replace(/\s+/g, ' ').trim();
    
    // Build structured query WITHOUT quotes (Google API works better with plain text)
    // Format: Company Name Location attribute (no quotes, just proper ordering)
    const parts: string[] = [];
    
    if (companyName) {
      parts.push(companyName); // NO QUOTES - Google API prefers plain text
    }
    
    if (location) {
      parts.push(location); // NO QUOTES - Google API prefers plain text
    }
    
    // Add attributes without quotes (e.g., "email", "contact", "about" should be plain text)
    if (attributes.length > 0) {
      parts.push(...attributes);
    }
    
    // If we couldn't structure it well (no company name or location), just return cleaned query
    if (parts.length === 0 || (!companyName && !location)) {
      return clean;
    }
    
    const structured = parts.join(' '); // Join with spaces, no quotes
    console.log(`[GoogleSearchAPI] Structured query (NO QUOTES): "${query}" → "${structured}"`);
    return structured;
  }

  /**
   * Get API quota information (if available)
   */
  getQuotaInfo(): { dailyLimit?: number; remainingQueries?: number } {
    // Note: The API doesn't provide quota info in the response
    // You would need to check Google Cloud Console
    return {};
  }
}

