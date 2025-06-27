import { Service } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';

interface DreamInput {
  content: string;
  title?: string;
  theme?: string;
}

interface DreamAnalysis {
  themes: string[];
  emotions: string[];
  symbols: string[];
  narrative_structure: string;
  psychological_insights: string[];
}

interface DreamRecord {
  id: string;
  content: string;
  title: string | null;
  theme: string | null;
  timestamp: string;
  analysis_results: string | null;
}

interface SimilarDream {
  id: string;
  title: string | null;
  content: string;
  similarity_score: number;
  shared_themes: string[];
}

interface ConstellationNode {
  id: string;
  title: string | null;
  theme: string | null;
  connections: number;
  timestamp: string;
}

export default class extends Service<Env> {
  private addCorsHeaders(response: Response): Response {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return response;
  }

  private createErrorResponse(message: string, status: number = 400): Response {
    return this.addCorsHeaders(
      new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' }
      })
    );
  }

  private createSuccessResponse(data: any, status: number = 200): Response {
    return this.addCorsHeaders(
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
      })
    );
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return this.addCorsHeaders(new Response(null, { status: 204 }));
    }

    try {
      // Route handling
      if (url.pathname === '/api/dreams') {
        if (method === 'POST') {
          return await this.submitDream(request);
        } else if (method === 'GET') {
          return await this.getDreams(request);
        }
      }

      if (url.pathname.startsWith('/api/dreams/')) {
        const pathParts = url.pathname.split('/');
        const dreamId = pathParts[3];

        if (!dreamId) {
          return this.createErrorResponse('Dream ID is required');
        }

        if (pathParts.length === 4 && method === 'GET') {
          return await this.getDreamDetails(dreamId);
        }

        if (pathParts[4] === 'similar' && method === 'GET') {
          return await this.getSimilarDreams(dreamId);
        }

        if (pathParts[4] === 'continue' && method === 'POST') {
          return await this.continueDream(dreamId, request);
        }
      }

      if (url.pathname === '/api/constellation' && method === 'GET') {
        return await this.getConstellation(request);
      }

      if (url.pathname === '/api/debug/seed' && method === 'POST') {
        return await this.seedDatabase(request);
      }

      return this.createErrorResponse('Endpoint not found', 404);

    } catch (error) {
      console.error('API Error:', error);
      return this.createErrorResponse('Internal server error', 500);
    }
  }

  private async submitDream(request: Request): Promise<Response> {
    try {
      const dreamInput = await request.json() as DreamInput;

      if (!dreamInput.content || dreamInput.content.trim().length === 0) {
        return this.createErrorResponse('Dream content is required');
      }

      // Generate unique ID
      const dreamId = crypto.randomUUID();

      // Analyze dream with Llama 70B
      const analysisPrompt = `Analyze this dream and provide insights. Respond ONLY with valid JSON in this exact format:

{
  "themes": ["freedom", "exploration"],
  "emotions": ["joy", "wonder"],
  "symbols": ["mountains", "flying"],
  "narrative_structure": "A liberating journey of self-discovery",
  "psychological_insights": ["desire for freedom", "escape from constraints"]
}

Dream to analyze: "${dreamInput.content}"

Remember: Return ONLY the JSON object, no other text.`;

      const analysisResponse = await this.env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
        messages: [{ role: 'user', content: analysisPrompt }]
      });

      let analysisResults: DreamAnalysis | null = null;
      try {
        console.log('Raw AI response:', analysisResponse);
        const responseText = typeof analysisResponse === 'object' && 'response' in analysisResponse 
          ? analysisResponse.response 
          : '';
        console.log('Extracted response text:', responseText);
        
        if (responseText) {
          // Try to extract JSON from the response if it contains extra text
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          const jsonText = jsonMatch ? jsonMatch[0] : responseText;
          console.log('JSON text to parse:', jsonText);
          analysisResults = JSON.parse(jsonText);
          console.log('Parsed analysis results:', analysisResults);
        }
      } catch (e) {
        console.error('Failed to parse AI analysis:', e);
        console.error('Raw response was:', analysisResponse);
        // Provide fallback analysis
        analysisResults = {
          themes: ['dream', 'unconscious'],
          emotions: ['mystery'],
          symbols: ['unknown'],
          narrative_structure: 'A symbolic journey through the unconscious mind',
          psychological_insights: ['The dream reveals hidden aspects of the psyche']
        };
      }

      // Store in SQL database
      await this.env.DREAMS_DB.prepare(
        "INSERT INTO Dreams (id, content, title, theme, timestamp, analysis_results) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(
        dreamId,
        dreamInput.content,
        dreamInput.title || null,
        dreamInput.theme || (analysisResults?.themes?.[0] || null),
        new Date().toISOString(),
        analysisResults ? JSON.stringify(analysisResults) : null
      ).run();

      // Store raw dream content in SmartBucket for semantic search with proper content type
      await this.env.DREAMS_BUCKET.put(dreamId, dreamInput.content, {
        httpMetadata: { contentType: 'text/plain' }
      });

      return this.createSuccessResponse({
        id: dreamId,
        message: 'Dream submitted successfully',
        analysis: analysisResults
      }, 201);

    } catch (error) {
      console.error('Submit dream error:', error);
      return this.createErrorResponse('Failed to submit dream', 500);
    }
  }

  private async getDreams(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '10')));
      const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0'));
      const since = url.searchParams.get('since');

      let dreams: DreamRecord[];
      
      if (since) {
        const result = await this.env.DREAMS_DB.prepare(
          "SELECT * FROM Dreams WHERE timestamp > ? ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        ).bind(since, limit, offset).all();
        dreams = result.results as unknown as DreamRecord[];
      } else {
        const result = await this.env.DREAMS_DB.prepare(
          "SELECT * FROM Dreams ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        ).bind(limit, offset).all();
        dreams = result.results as unknown as DreamRecord[];
      }

      return this.createSuccessResponse({
        dreams: dreams.map(dream => ({
          ...dream,
          analysis_results: dream.analysis_results ? JSON.parse(dream.analysis_results) : null
        })),
        pagination: {
          limit,
          offset,
          total: dreams.length
        }
      });

    } catch (error) {
      console.error('Get dreams error:', error);
      return this.createErrorResponse('Failed to retrieve dreams', 500);
    }
  }

  private async getDreamDetails(dreamId: string): Promise<Response> {
    try {
      const dream = await this.env.DREAMS_DB.prepare(
        "SELECT * FROM Dreams WHERE id = ?"
      ).bind(dreamId).first() as DreamRecord | null;

      if (!dream) {
        return this.createErrorResponse('Dream not found', 404);
      }

      return this.createSuccessResponse({
        ...dream,
        analysis_results: dream.analysis_results ? JSON.parse(dream.analysis_results) : null
      });

    } catch (error) {
      console.error('Get dream details error:', error);
      return this.createErrorResponse('Failed to retrieve dream details', 500);
    }
  }

  private async getSimilarDreams(dreamId: string): Promise<Response> {
    try {
      // First get the target dream
      const targetDream = await this.env.DREAMS_DB.prepare(
        "SELECT * FROM Dreams WHERE id = ?"
      ).bind(dreamId).first() as DreamRecord | null;

      if (!targetDream) {
        return this.createErrorResponse('Dream not found', 404);
      }

      // Use analyzed keywords for better semantic similarity
      const targetAnalysis = targetDream.analysis_results ? JSON.parse(targetDream.analysis_results) : null;
      let searchQuery = '';
      
      if (targetAnalysis) {
        const searchTerms = [
          ...(targetAnalysis.themes || []),
          ...(targetAnalysis.emotions || []),
          ...(targetAnalysis.symbols || [])
        ].filter(term => term).join(' ');
        searchQuery = `find dreams with themes and symbols: ${searchTerms}`;
      } else {
        // Fallback to content if no analysis available
        searchQuery = `find dreams similar to: ${targetDream.content}`;
      }

      const searchResults = await this.env.DREAMS_BUCKET.search({
        input: searchQuery,
        requestId: crypto.randomUUID()
      });

      // Get details for similar dreams from SQL  
      const similarDreamIds = searchResults.results
        .map((result: any) => result.source?.object || result.source)
        .filter((id: string) => id && id !== dreamId);

      if (similarDreamIds.length === 0) {
        return this.createSuccessResponse({ similar_dreams: [] });
      }

      let similarDreams: DreamRecord[] = [];
      if (similarDreamIds.length > 0) {
        const placeholders = similarDreamIds.map(() => '?').join(',');
        const result = await this.env.DREAMS_DB.prepare(
          `SELECT * FROM Dreams WHERE id IN (${placeholders})`
        ).bind(...similarDreamIds).all();
        similarDreams = result.results as unknown as DreamRecord[];
      }

      // Combine with similarity scores
      const enrichedSimilarDreams: SimilarDream[] = similarDreams.map(dream => {
        const result = searchResults.results.find((r: any) => (r.source?.object || r.source) === dream.id);
        const dreamAnalysis = dream.analysis_results ? JSON.parse(dream.analysis_results) : null;
        const targetAnalysis = targetDream.analysis_results ? JSON.parse(targetDream.analysis_results) : null;

        // Find shared themes
        const sharedThemes = dreamAnalysis?.themes?.filter((theme: string) => 
          targetAnalysis?.themes?.includes(theme)
        ) || [];

        return {
          id: dream.id,
          title: dream.title,
          content: dream.content,
          similarity_score: result?.score || 0,
          shared_themes: sharedThemes
        };
      }).sort((a, b) => b.similarity_score - a.similarity_score);

      return this.createSuccessResponse({ similar_dreams: enrichedSimilarDreams });

    } catch (error) {
      console.error('Get similar dreams error:', error);
      return this.createErrorResponse('Failed to find similar dreams', 500);
    }
  }

  private async continueDream(dreamId: string, request: Request): Promise<Response> {
    try {
      const body = await request.json().catch(() => ({})) as { direction?: string };
      const direction = body.direction || 'forward'; // forward, backward, or alternate

      // Get the original dream
      const dream = await this.env.DREAMS_DB.prepare(
        "SELECT * FROM Dreams WHERE id = ?"
      ).bind(dreamId).first() as DreamRecord | null;

      if (!dream) {
        return this.createErrorResponse('Dream not found', 404);
      }

      // Generate continuation with Llama 70B
      let continuationPrompt = '';
      switch (direction) {
        case 'backward':
          continuationPrompt = `Continue this dream by exploring what happened BEFORE this dream sequence. Provide a prequel that leads naturally into the original dream:

Original Dream: "${dream.content}"

Write a continuation that explores the events, thoughts, or experiences that led up to this dream. Keep the same tone and style.`;
          break;
        case 'alternate':
          continuationPrompt = `Continue this dream by taking it in a completely different direction. Explore what might have happened if the dream took an alternate path:

Original Dream: "${dream.content}"

Write an alternate continuation that branches off from a key moment in the original dream, taking it in a new and unexpected direction.`;
          break;
        default: // forward
          continuationPrompt = `Continue this dream by exploring what happens NEXT. Extend the narrative naturally:

Original Dream: "${dream.content}"

Write a continuation that picks up where this dream left off, maintaining the same tone, style, and dream logic.`;
      }

      const continuationResponse = await this.env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
        messages: [{ role: 'user', content: continuationPrompt }]
      });

      return this.createSuccessResponse({
        original_dream: {
          id: dream.id,
          content: dream.content,
          title: dream.title
        },
        continuation: {
          direction,
          content: typeof continuationResponse === 'object' && 'response' in continuationResponse 
            ? continuationResponse.response || ''
            : '',
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Continue dream error:', error);
      return this.createErrorResponse('Failed to generate dream continuation', 500);
    }
  }

  private async getConstellation(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const query = url.searchParams.get('query') || 'dreams and connections';
      const limit = Math.max(1, Math.min(50, parseInt(url.searchParams.get('limit') || '20')));

      // Use SmartBucket search to find thematically connected dreams
      const searchResults = await this.env.DREAMS_BUCKET.search({
        input: `find dreams related to: ${query}`,
        requestId: crypto.randomUUID()
      });

      if (searchResults.results.length === 0) {
        return this.createSuccessResponse({ constellation: [] });
      }

      // Get dream details from SQL
      const dreamIds = searchResults.results.map((result: any) => result.source?.object || result.source);
      let dreams: DreamRecord[] = [];
      if (dreamIds.length > 0) {
        const placeholders = dreamIds.map(() => '?').join(',');
        const result = await this.env.DREAMS_DB.prepare(
          `SELECT * FROM Dreams WHERE id IN (${placeholders})`
        ).bind(...dreamIds).all();
        dreams = result.results as unknown as DreamRecord[];
      }

      // Create constellation nodes with connection analysis
      const constellationNodes: ConstellationNode[] = dreams.map(dream => {
        const result = searchResults.results.find((r: any) => (r.source?.object || r.source) === dream.id);
        const analysisResults = dream.analysis_results ? JSON.parse(dream.analysis_results) : null;
        
        // Calculate connections based on shared themes with other dreams
        let connections = 0;
        if (analysisResults?.themes) {
          dreams.forEach(otherDream => {
            if (otherDream.id !== dream.id && otherDream.analysis_results) {
              const otherAnalysis = JSON.parse(otherDream.analysis_results);
              const sharedThemes = analysisResults.themes.filter((theme: string) =>
                otherAnalysis.themes?.includes(theme)
              );
              connections += sharedThemes.length;
            }
          });
        }

        return {
          id: dream.id,
          title: dream.title,
          theme: dream.theme,
          connections,
          timestamp: dream.timestamp
        };
      })
      .sort((a, b) => b.connections - a.connections)
      .slice(0, limit);

      return this.createSuccessResponse({
        constellation: constellationNodes,
        query_used: query,
        total_nodes: constellationNodes.length,
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get constellation error:', error);
      return this.createErrorResponse('Failed to generate dream constellation', 500);
    }
  }

  private async seedDatabase(request: Request): Promise<Response> {
    try {
      const sampleDreams = [
        {
          content: "I was flying over endless mountains, feeling completely free and weightless. The wind carried me higher and higher.",
          themes: ["freedom", "transcendence", "nature"],
          emotions: ["joy", "liberation", "wonder"],
          symbols: ["mountains", "flying", "wind"],
          narrative_structure: "A journey of liberation and spiritual ascension",
          psychological_insights: ["desire to escape earthly constraints", "spiritual growth"]
        },
        {
          content: "I found myself in a vast library with books that glowed and whispered secrets when I touched them.",
          themes: ["knowledge", "mystery", "discovery"],
          emotions: ["curiosity", "awe", "excitement"],
          symbols: ["library", "books", "light"],
          narrative_structure: "A quest for hidden knowledge and wisdom",
          psychological_insights: ["thirst for understanding", "unconscious wisdom seeking expression"]
        },
        {
          content: "I was swimming in an ocean that turned into stars, floating among galaxies and nebulae.",
          themes: ["transformation", "cosmos", "infinity"],
          emotions: ["wonder", "peace", "transcendence"],
          symbols: ["ocean", "stars", "transformation"],
          narrative_structure: "A cosmic transformation from earthly to celestial",
          psychological_insights: ["connection to the universal", "transcendence of limitations"]
        }
      ];

      for (const dream of sampleDreams) {
        const dreamId = crypto.randomUUID();
        const analysisResults = {
          themes: dream.themes,
          emotions: dream.emotions,
          symbols: dream.symbols,
          narrative_structure: dream.narrative_structure,
          psychological_insights: dream.psychological_insights
        };

        // Store in SQL database
        await this.env.DREAMS_DB.prepare(
          "INSERT INTO Dreams (id, content, title, theme, timestamp, analysis_results) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(
          dreamId,
          dream.content,
          null,
          dream.themes[0],
          new Date().toISOString(),
          JSON.stringify(analysisResults)
        ).run();

        // Store raw dream content in SmartBucket for semantic search with proper content type
        await this.env.DREAMS_BUCKET.put(dreamId, dream.content, {
          httpMetadata: { contentType: 'text/plain' }
        });
      }

      return this.createSuccessResponse({
        message: 'Database seeded successfully',
        dreams_added: sampleDreams.length
      });

    } catch (error) {
      console.error('Seed database error:', error);
      return this.createErrorResponse('Failed to seed database', 500);
    }
  }
}
