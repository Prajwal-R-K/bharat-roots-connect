# Relationship Analyzer Feature

## Overview

The Relationship Analyzer is an AI-powered feature that helps users understand how two family members are related. It uses Google's Gemini AI to provide natural language explanations of family relationships based on data from your Neo4j family tree database.

## Features

- **Smart Selection**: Choose any two family members from dropdown menus
- **AI-Powered Analysis**: Uses Google Gemini to explain relationships in natural language
- **Path Visualization**: Shows the connection path between family members
- **Real-time Results**: Get instant relationship explanations
- **Error Handling**: Graceful handling of edge cases and errors

## Setup Instructions

### 1. Install Dependencies

The required package `@google/generative-ai` has already been installed. If you need to reinstall:

```bash
cd bharat-roots-connect
npm install @google/generative-ai
```

### 2. Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 3. Configure Environment Variables

1. Open the `.env` file in the `bharat-roots-connect` directory
2. Replace `your_gemini_api_key_here` with your actual API key:

```env
GEMINI_API_KEY=AIzaSy...your_actual_key_here
```

### 4. Start the Application

```bash
# Start the backend server
npm run server

# In a separate terminal, start the frontend
npm run dev
```

## Usage

1. Navigate to the **Family Tree** page in your application
2. Scroll down to find the **Relationship Analyzer** card
3. Select the first person from the "First Person" dropdown
4. Select the second person from the "Second Person" dropdown
5. Click the **"Find Relationship"** button
6. Wait a few seconds for the AI analysis
7. View the relationship explanation in the results card

## How It Works

### Backend Flow

1. **API Endpoint**: `/api/relationship/analyze` receives the request
2. **Neo4j Query**: Finds the shortest path between two people using Cypher
3. **Data Formatting**: Converts the path into a structured format
4. **Gemini AI**: Sends the path data to Gemini with a specialized prompt
5. **Response**: Returns the AI-generated explanation to the frontend

### Frontend Flow

1. **Component Load**: Fetches all family members from Neo4j
2. **User Selection**: Validates that two different people are selected
3. **API Call**: Sends request to backend with person IDs
4. **Display**: Shows loading state, then displays the analysis result

## Technical Details

### Files Created/Modified

**New Files:**
- `services/gemini-service.js` - Gemini API integration
- `src/lib/neo4j/relationship-analysis.ts` - Neo4j path queries
- `src/components/RelationshipAnalyzer.tsx` - Frontend component

**Modified Files:**
- `server.js` - Added `/api/relationship/analyze` endpoint
- `src/pages/FamilyTreeViewPage.tsx` - Integrated the component
- `.env.example` - Added GEMINI_API_KEY template
- `.env` - Added GEMINI_API_KEY configuration

### Neo4j Query

The feature uses the `shortestPath` algorithm to find the most direct relationship:

```cypher
MATCH (a:User {userId: $personAId, familyTreeId: $familyId})
MATCH (b:User {userId: $personBId, familyTreeId: $familyId})
MATCH path = shortestPath((a)-[*]-(b))
WHERE ALL(r IN relationships(path) WHERE type(r) IN ['PARENTS_OF', 'SIBLING', 'MARRIED_TO'])
RETURN nodes(path), relationships(path)
```

### Gemini Prompt Structure

The AI receives:
- Names and genders of both people
- The complete relationship path with node details
- Instructions to provide clear, concise explanations
- Context about relationship types (parent, sibling, spouse)

## Troubleshooting

### "Relationship analysis service is not configured"

**Problem**: The Gemini API key is not set or invalid.

**Solution**: 
1. Check that `.env` file exists in `bharat-roots-connect` directory
2. Verify the `GEMINI_API_KEY` is set correctly
3. Restart the server after updating the `.env` file

### "No relationship path found"

**Problem**: The two selected people are not connected in the family tree.

**Solution**: This is expected behavior. The people may be in different family trees or not yet connected. Add relationships between them using the "Manage Relationships" feature.

### "Failed to load family members"

**Problem**: Cannot connect to Neo4j database.

**Solution**:
1. Verify Neo4j is running
2. Check connection settings in `src/lib/neo4j/connection.ts`
3. Ensure the family tree has members

### API Rate Limiting

**Problem**: Too many requests to Gemini API.

**Solution**: 
- Gemini has generous free tier limits
- If you hit limits, wait a few minutes before trying again
- Consider upgrading to a paid plan for higher limits

## API Costs

- **Free Tier**: 60 requests per minute
- **Cost**: Free for most use cases
- **Monitoring**: Check usage at [Google AI Studio](https://makersuite.google.com/)

## Security Notes

- ✅ API key is stored in `.env` (not committed to git)
- ✅ All Gemini calls are made from backend only
- ✅ User data is validated before processing
- ✅ Only family tree data is sent to Gemini (no sensitive PII)

## Future Enhancements

Potential improvements for future versions:

1. **Path Visualization**: Highlight the relationship path in the family tree
2. **Multiple Paths**: Show alternative relationship routes
3. **Relationship History**: Save and display previous analyses
4. **Batch Analysis**: Analyze multiple relationships at once
5. **Export**: Download relationship explanations as PDF

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the console logs for detailed error messages
3. Verify all setup steps were completed correctly

## License

This feature is part of the Bharat Roots Connect application.
