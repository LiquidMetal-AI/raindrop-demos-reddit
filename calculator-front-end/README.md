# Retro Calculator

A vintage-style calculator web application with real-time calculation history across all users.

## Features

- 🎨 **Retro Design**: Authentic vintage calculator appearance with LCD-style display
- 🔢 **Full Calculator**: Basic arithmetic operations (+, -, ×, ÷)
- 📱 **Responsive**: Works on desktop, tablet, and mobile devices
- ⌨️ **Keyboard Support**: Full keyboard input support
- 📊 **Live History**: Real-time calculation history from all users
- 🚀 **Modern Tech**: Vanilla JavaScript with clean, maintainable code

## Quick Start

1. Open `index.html` in your browser
2. Start calculating! The interface works with both mouse and keyboard
3. Watch the history panel for calculations from all users

## Keyboard Shortcuts

- **Numbers**: 0-9
- **Operators**: +, -, *, /
- **Decimal**: .
- **Equals**: Enter or =
- **Clear**: Escape (AC)
- **Backspace**: Backspace

## Backend API Requirements

The calculator front-end is designed to integrate with a backend API. Below are the detailed requirements:

### 1. Calculate Endpoint

**Endpoint**: `POST /api/calculate`

**Request Body**:
```json
{
  "expression": "125 + 75",
  "user_id": "optional-user-identifier",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Response**:
```json
{
  "result": 200,
  "expression": "125 + 75",
  "success": true,
  "error": null,
  "calculation_id": "unique-calculation-id"
}
```

**Error Response**:
```json
{
  "result": null,
  "expression": "10 / 0",
  "success": false,
  "error": "Division by zero",
  "calculation_id": null
}
```

### 2. History Endpoint

**Endpoint**: `GET /api/history`

**Query Parameters**:
- `limit`: number (default: 50, max: 100)
- `offset`: number (default: 0)
- `user_filter`: string (optional)

**Response**:
```json
{
  "calculations": [
    {
      "id": "calculation-id",
      "expression": "125 + 75",
      "result": 200,
      "timestamp": "2024-01-01T12:00:00Z",
      "user_id": "anonymized-user-id"
    }
  ],
  "total_count": 1500,
  "has_more": true
}
```

### 3. History Polling Updates

**Endpoint**: `GET /api/history` (with timestamp filtering)

**Additional Query Parameters for Polling**:
- `since`: ISO timestamp (to get only new calculations since last check)

**Usage**: The front-end polls this endpoint every 3 seconds to get new calculations from all users, providing a real-time-like experience without WebSocket complexity.

## Backend Implementation Requirements

### Database Schema

```sql
-- Calculations table
CREATE TABLE calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expression TEXT NOT NULL,
    result DECIMAL(20,10) NOT NULL,
    user_id VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_calculations_timestamp ON calculations(timestamp DESC);
CREATE INDEX idx_calculations_user_id ON calculations(user_id);
```

### Security Considerations

1. **Input Validation**: Validate mathematical expressions to prevent code injection
2. **Rate Limiting**: Implement rate limiting to prevent abuse (e.g., 100 calculations per minute per IP)
3. **CORS**: Configure CORS headers for browser compatibility
4. **Expression Sanitization**: Only allow safe mathematical operations

### Error Handling

The backend should handle:
- Division by zero
- Invalid mathematical expressions
- Extremely large numbers
- Malformed requests
- Database connection errors

### Performance Optimization

1. **Connection Pooling**: Use connection pooling for database connections
2. **Caching**: Cache recent calculations for faster history retrieval
3. **Indexing**: Proper database indexing for timestamp-based queries
4. **Polling Optimization**: Efficient timestamp-based queries to minimize data transfer during polling

## Development Notes

### Current Implementation

- The calculator currently uses mock calculations for demonstration
- Sample history data is displayed to show the UI
- All API integration points are clearly commented in the code

### File Structure

```
calculator/
├── index.html          # Main HTML structure
├── style.css           # Retro styling and responsive design
├── script.js           # Calculator logic and API integration
└── README.md           # This documentation
```

### Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 16+

### Next Steps for Backend Integration

1. Implement the three required API endpoints
2. Set up WebSocket server for real-time updates
3. Replace mock functions in `script.js` with actual API calls
4. Add error handling and loading states
5. Implement user identification (optional)
6. Add calculation persistence and history management

### Testing

To test the calculator:
1. Verify all calculator operations work correctly
2. Test keyboard and mouse input
3. Check responsive design on different screen sizes
4. Validate error handling for edge cases
5. Test WebSocket connection stability (once implemented)

## Contributing

When adding new features:
1. Maintain the retro design aesthetic
2. Ensure keyboard accessibility
3. Add comprehensive error handling
4. Update API documentation
5. Test across different browsers and devices