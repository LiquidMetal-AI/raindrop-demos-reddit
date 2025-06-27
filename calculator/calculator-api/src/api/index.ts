import { Service } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';
import { DB, Calculation } from '../db/calculationsDb/types';

interface CalculateRequest {
  expression: string;
  user_id?: string;
}

interface CalculateResponse {
  result: number;
  expression: string;
  timestamp: string;
}

interface HistoryResponse {
  calculations: Array<{
    id: string;
    expression: string;
    result: number;
    timestamp: string;
    user_id?: string;
  }>;
  total: number;
  hasMore: boolean;
}

interface ErrorResponse {
  error: string;
  code: string;
}

export default class extends Service<Env> {
  async fetch(request: Request): Promise<Response> {
    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Route requests to appropriate handlers
      if (path === '/api/calculate' && request.method === 'POST') {
        return await this.handleCalculate(request, corsHeaders);
      } else if (path === '/api/history' && request.method === 'GET') {
        return await this.handleHistory(request, corsHeaders);
      } else {
        return new Response(
          JSON.stringify({ error: 'Not Found', code: 'NOT_FOUND' }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }
    } catch (error) {
      this.env.logger.error('Unexpected error:', { error: String(error) });
      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }
  }

  private async handleCalculate(
    request: Request,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    try {
      // Parse request body
      const body = await request.json() as CalculateRequest;
      
      // Validate input
      if (!body.expression || typeof body.expression !== 'string') {
        return this.errorResponse(
          'Expression is required and must be a string',
          'INVALID_INPUT',
          400,
          corsHeaders
        );
      }

      // Sanitize and validate the mathematical expression
      const sanitizedExpression = body.expression.trim();
      if (!this.isValidExpression(sanitizedExpression)) {
        return this.errorResponse(
          'Invalid mathematical expression',
          'INVALID_EXPRESSION',
          400,
          corsHeaders
        );
      }

      // Calculate the result
      let result: number;
      try {
        result = this.evaluateExpression(sanitizedExpression);
      } catch (error) {
        if (error instanceof Error && error.message.includes('division by zero')) {
          return this.errorResponse(
            'Division by zero is not allowed',
            'DIVISION_BY_ZERO',
            400,
            corsHeaders
          );
        }
        return this.errorResponse(
          'Invalid mathematical expression',
          'EVALUATION_ERROR',
          400,
          corsHeaders
        );
      }

      // Check for invalid results (NaN, Infinity)
      if (!isFinite(result)) {
        return this.errorResponse(
          'Calculation resulted in an invalid number',
          'INVALID_RESULT',
          400,
          corsHeaders
        );
      }

      const timestamp = new Date().toISOString();

      // Store in database
      const db = this.env.CALCULATIONS_DB;
      const id = crypto.randomUUID();
      await db
        .prepare('INSERT INTO Calculation (id, expression, result, timestamp, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(id, sanitizedExpression, result, timestamp, body.user_id || null, new Date().toISOString())
        .run();

      // Return successful response
      const response: CalculateResponse = {
        result,
        expression: sanitizedExpression,
        timestamp,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    } catch (error) {
      this.env.logger.error('Error in handleCalculate:', { error: String(error) });
      
      if (error instanceof SyntaxError) {
        return this.errorResponse(
          'Invalid JSON in request body',
          'INVALID_JSON',
          400,
          corsHeaders
        );
      }

      return this.errorResponse(
        'Internal server error',
        'INTERNAL_ERROR',
        500,
        corsHeaders
      );
    }
  }

  private async handleHistory(
    request: Request,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    try {
      const url = new URL(request.url);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100);
      const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
      const since = url.searchParams.get('since');
      const user_id = url.searchParams.get('user_id');

      const db = this.env.CALCULATIONS_DB;
      
      // Build query with optional filters
      let whereConditions: string[] = [];
      let queryParams: unknown[] = [];
      let countParams: unknown[] = [];

      // Apply since filter if provided
      if (since) {
        const sinceDate = new Date(since);
        if (isNaN(sinceDate.getTime())) {
          return this.errorResponse(
            'Invalid since parameter format. Use ISO 8601 format.',
            'INVALID_SINCE_FORMAT',
            400,
            corsHeaders
          );
        }
        whereConditions.push('timestamp > ?');
        queryParams.push(sinceDate.toISOString());
        countParams.push(sinceDate.toISOString());
      }

      // Apply user_id filter if provided
      if (user_id) {
        whereConditions.push('user_id = ?');
        queryParams.push(user_id);
        countParams.push(user_id);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      // Get total count for pagination info
      const countQuery = `SELECT COUNT(*) as count FROM Calculation ${whereClause}`;
      const totalResult = await db.prepare(countQuery).bind(...countParams).first<{ count: number }>();
      const total = totalResult?.count || 0;

      // Get paginated results ordered by timestamp descending (most recent first)
      const dataQuery = `SELECT * FROM Calculation ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
      const calculationsResult = await db.prepare(dataQuery).bind(...queryParams, limit, offset).all<Calculation>();
      const calculations = calculationsResult.results;

      const hasMore = offset + limit < total;

      const response: HistoryResponse = {
        calculations: calculations.map((calc) => ({
          id: calc.id,
          expression: calc.expression,
          result: calc.result,
          timestamp: calc.timestamp,
          user_id: calc.user_id || undefined,
        })),
        total,
        hasMore,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    } catch (error) {
      this.env.logger.error('Error in handleHistory:', { error: String(error) });
      return this.errorResponse(
        'Internal server error',
        'INTERNAL_ERROR',
        500,
        corsHeaders
      );
    }
  }

  private isValidExpression(expression: string): boolean {
    // Only allow numbers, basic operators, parentheses, and decimal points
    const allowedChars = /^[0-9+\-*/.() ]+$/;
    if (!allowedChars.test(expression)) {
      return false;
    }

    // Check for balanced parentheses
    let parenthesesCount = 0;
    for (const char of expression) {
      if (char === '(') parenthesesCount++;
      if (char === ')') parenthesesCount--;
      if (parenthesesCount < 0) return false;
    }
    if (parenthesesCount !== 0) return false;

    // Check for basic syntax issues
    if (expression.includes('//') || expression.includes('**')) {
      return false;
    }

    // Check for empty expression or only whitespace
    if (expression.trim().length === 0) {
      return false;
    }

    return true;
  }

  private evaluateExpression(expression: string): number {
    // Remove whitespace
    const cleanExpression = expression.replace(/\s/g, '');
    
    // Check for division by zero before evaluation
    if (this.hasDivisionByZero(cleanExpression)) {
      throw new Error('Division by zero detected');
    }

    // Use a safe mathematical expression evaluator
    // This is a simplified version - in production, consider using a proper math parser
    try {
      // Replace division operator and check for zero denominators
      const result = this.safeEval(cleanExpression);
      return result;
    } catch (error) {
      throw new Error('Expression evaluation failed');
    }
  }

  private hasDivisionByZero(expression: string): boolean {
    // Check for patterns like /0, /0.0, /(0), etc.
    const divisionByZeroPatterns = [
      /\/0(?![0-9.])/,  // /0 not followed by digits or decimal
      /\/0\.0+(?![0-9])/,  // /0.000... not followed by non-zero digit
      /\/\(0+\)/,  // /(0) or /(00) etc.
      /\/\(0\.0+\)/,  // /(0.000...)
    ];
    
    return divisionByZeroPatterns.some(pattern => pattern.test(expression));
  }

  private safeEval(expression: string): number {
    // This is a simplified safe evaluator for basic math expressions
    // It manually parses and evaluates the expression to avoid using eval()
    
    // Parse and evaluate using recursive descent parser
    const tokens = this.tokenize(expression);
    const result = this.parseExpression(tokens);
    
    if (tokens.length > 0) {
      throw new Error('Unexpected tokens remaining');
    }
    
    return result;
  }

  private tokenize(expression: string): string[] {
    const tokens: string[] = [];
    let current = '';
    
    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];
      
      if (char && '+-*/()'.includes(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        tokens.push(char!);
      } else if (char && char.match(/[0-9.]/)) {
        current += char;
      } else {
        throw new Error('Invalid character in expression');
      }
    }
    
    if (current) {
      tokens.push(current);
    }
    
    return tokens;
  }

  private parseExpression(tokens: string[]): number {
    let result = this.parseTerm(tokens);
    
    while (tokens.length > 0 && (tokens[0] === '+' || tokens[0] === '-')) {
      const operator = tokens.shift()!;
      const term = this.parseTerm(tokens);
      
      if (operator === '+') {
        result += term;
      } else {
        result -= term;
      }
    }
    
    return result;
  }

  private parseTerm(tokens: string[]): number {
    let result = this.parseFactor(tokens);
    
    while (tokens.length > 0 && (tokens[0] === '*' || tokens[0] === '/')) {
      const operator = tokens.shift()!;
      const factor = this.parseFactor(tokens);
      
      if (operator === '*') {
        result *= factor;
      } else {
        if (factor === 0) {
          throw new Error('Division by zero detected during evaluation');
        }
        result /= factor;
      }
    }
    
    return result;
  }

  private parseFactor(tokens: string[]): number {
    if (tokens.length === 0) {
      throw new Error('Unexpected end of expression');
    }
    
    const token = tokens.shift()!;
    
    if (token === '(') {
      const result = this.parseExpression(tokens);
      if (tokens.length === 0 || tokens.shift() !== ')') {
        throw new Error('Mismatched parentheses');
      }
      return result;
    }
    
    if (token === '-') {
      return -this.parseFactor(tokens);
    }
    
    if (token === '+') {
      return this.parseFactor(tokens);
    }
    
    const number = parseFloat(token);
    if (isNaN(number)) {
      throw new Error('Invalid number: ' + token);
    }
    
    return number;
  }

  private errorResponse(
    message: string,
    code: string,
    status: number,
    corsHeaders: Record<string, string>
  ): Response {
    const errorResponse: ErrorResponse = {
      error: message,
      code,
    };

    return new Response(JSON.stringify(errorResponse), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}
