# Reddit Calculator Demo - Raindrop Platform Showcase

A retro-style calculator application built to demonstrate the power of Claude Code and the Raindrop platform. This project was created in response to Reddit community requests and showcases rapid full-stack development using AI-powered tools.

## Architecture Overview

This project demonstrates a complete full-stack application built using:

- **Frontend**: Vanilla HTML, CSS, and JavaScript with retro calculator styling
- **Backend**: Raindrop platform with SQL database and REST API
- **Deployment**: Multi-project structure on Cloudflare Pages

## Raindrop Platform Integration

The backend API was built entirely using Raindrop's MCP (Model Context Protocol) endpoints through Claude Code, demonstrating:

### Database Configuration
- **SQL Database**: Automated schema generation with Prisma
- **Table Structure**: Calculations with expressions, results, timestamps, and user tracking
- **Indexing**: Optimized queries with timestamp and user_id indexes

### API Endpoints
- **POST /api/calculate**: Processes mathematical expressions with validation
- **GET /api/history**: Retrieves paginated calculation history with filtering
- **CORS Support**: Cross-origin requests enabled for frontend integration

### Security Features
- **Expression Validation**: Secure mathematical expression parsing without eval()
- **Input Sanitization**: Prevents injection attacks and validates mathematical syntax
- **Error Handling**: Comprehensive error responses with proper HTTP status codes

## Key Features

### Calculator Functionality
- **Basic Operations**: Addition, subtraction, multiplication, division
- **Expression Display**: Shows full mathematical expressions before calculation
- **Real-time History**: Global calculation history shared across all users
- **Auto-refresh**: Polls for new calculations every 3 seconds

### Performance Optimizations
- **Efficient Polling**: Visibility-aware updates (pauses when tab not active)
- **Lightweight UI**: Optimized CSS without resource-intensive animations
- **Database Indexing**: Fast queries on timestamped calculation history

## Project Structure

```
raindrop-demos-reddit/
├── calculator-front-end/     # Static web application
│   ├── index.html           # Calculator interface
│   ├── style.css            # Retro styling
│   └── script.js            # Calculator logic & API integration
├── calculator-api/          # Raindrop backend
│   ├── raindrop.manifest    # Platform configuration
│   ├── prisma/              # Database schema
│   └── src/api/index.ts     # REST API implementation
├── index.html               # Multi-project landing page
├── _redirects               # Cloudflare Pages routing
└── package.json             # Build configuration
```

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

### Calculate Endpoint
```http
POST /api/calculate
Content-Type: application/json

{
  "expression": "15 + 27 * 2",
  "user_id": "optional-user-id"
}
```

### History Endpoint
```http
GET /api/history?limit=10&offset=0&since=2024-01-01T00:00:00.000Z
```

## Deployment

The application is deployed using a multi-project structure on Cloudflare Pages:

- **Root URL**: Landing page showcasing all Reddit demos
- **Calculator**: Accessible at `/calculator` (redirects to `/calculator-front-end/`)
- **Clean URLs**: Configured redirects for user-friendly navigation

## Technology Stack

- **Platform**: Raindrop (LiquidMetal.ai)
- **Database**: SQLite with Prisma ORM
- **Frontend**: Vanilla JavaScript (ES6+)
- **Styling**: CSS3 with retro design system
- **Hosting**: Cloudflare Pages
- **Development**: Claude Code with MCP integration

## Live Demo

Experience the calculator at: [Your Cloudflare Pages URL]

This project demonstrates how AI-powered development tools can rapidly create production-ready applications with modern best practices and robust architecture.