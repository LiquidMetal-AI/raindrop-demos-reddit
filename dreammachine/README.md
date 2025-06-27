# Dream Machine API - Raindrop Platform Showcase

An AI-powered dream analysis and semantic search platform built to demonstrate the power of Claude Code and the Raindrop platform. This project was created in response to Reddit community requests and showcases rapid full-stack development using AI-powered tools.

## Architecture Overview

This project demonstrates a complete full-stack application built using:

- **Frontend**: Dream Archaeology interface with mystical design
- **Backend**: Raindrop platform with SQL database, AI models, and SmartBucket search
- **Deployment**: Multi-project structure on Cloudflare Pages

## Raindrop Platform Integration

The backend API was built entirely using Raindrop's MCP (Model Context Protocol) endpoints through Claude Code, demonstrating:

### Database Configuration
- **SQL Database**: Automated schema generation with Prisma
- **Table Structure**: Dreams with content, analysis, emotions, themes, and user tracking
- **Indexing**: Optimized queries for semantic search and filtering

### AI Integration
- **LLM Analysis**: Llama 70B model for dream interpretation and analysis
- **Semantic Search**: SmartBucket for finding similar dreams based on content
- **Dream Continuations**: AI-generated story extensions for dreams

### API Endpoints
- **POST /api/dreams**: Submit dreams for analysis and storage
- **GET /api/dreams**: Retrieve dreams with pagination and filtering
- **POST /api/dreams/search**: Semantic search for similar dreams
- **POST /api/dreams/continue**: Generate AI continuations for dreams
- **CORS Support**: Cross-origin requests enabled for frontend integration

### Security Features
- **Input Sanitization**: Prevents injection attacks and validates dream content
- **Content Filtering**: Appropriate content validation for dream submissions
- **Error Handling**: Comprehensive error responses with proper HTTP status codes

## Key Features

### Dream Analysis
- **AI Interpretation**: Advanced dream analysis using Llama 70B
- **Emotion Detection**: Automatic emotion classification and tagging
- **Theme Extraction**: Identifies recurring themes and symbols
- **Real-time Processing**: Fast analysis and storage of dream submissions

### Semantic Search
- **SmartBucket Integration**: Vector-based similarity search
- **Content Matching**: Finds dreams with similar themes and emotions
- **Contextual Relevance**: AI-powered relevance scoring
- **Cross-User Discovery**: Anonymous dream discovery across all users

### Dream Continuations
- **Story Generation**: AI-powered dream continuation narratives
- **Context Awareness**: Maintains dream themes and emotional tone
- **Creative Extensions**: Generates plausible dream progressions

## Raindrop Development Process

This project was built using Raindrop's MCP endpoints in the following sequence:

1. **Project Initialization**: Used `mcp__liquidmetal-staging__login` to establish development session
2. **Team Configuration**: Set up stakeholders using `mcp__liquidmetal-staging__set_team`
3. **PRD Creation**: Generated Product Requirements Document with `mcp__liquidmetal-staging__prd_step`
4. **Database Schema**: Created Prisma schema using `mcp__liquidmetal-staging__prisma_step`
5. **Documentation**: Retrieved component docs with `mcp__liquidmetal-staging__documentation_step`
6. **Code Generation**: Built API service using `mcp__liquidmetal-staging__code_step`
7. **Testing**: Validated functionality with `mcp__liquidmetal-staging__tests_step`
8. **Deployment**: Deployed to production using `mcp__liquidmetal-staging__deployment_step`

## API Specification

### Submit Dream
```http
POST /api/dreams
Content-Type: application/json

{
  "content": "I was flying over mountains covered in snow...",
  "user_id": "optional-user-id"
}
```

### Search Similar Dreams
```http
POST /api/dreams/search
Content-Type: application/json

{
  "query": "flying dreams with mountains",
  "limit": 10
}
```

### Generate Dream Continuation
```http
POST /api/dreams/continue
Content-Type: application/json

{
  "dream_id": "dream-uuid",
  "context": "Continue the flying dream..."
}
```

### Get Dreams
```http
GET /api/dreams?limit=10&offset=0&theme=flying&emotion=peaceful
```

## Technology Stack

- **Platform**: Raindrop (LiquidMetal.ai)
- **Database**: SQLite with Prisma ORM
- **AI Models**: Llama 70B for analysis and generation
- **Search**: SmartBucket for semantic similarity
- **Frontend**: Vanilla JavaScript with ethereal design
- **Hosting**: Cloudflare Pages
- **Development**: Claude Code with MCP integration

## Live Demo

Experience the Dream Machine at: https://raindrop-demos-reddit.pages.dev/dreammachine-app/

This project demonstrates how AI-powered development tools can rapidly create production-ready applications with advanced AI features, semantic search, and modern architecture.