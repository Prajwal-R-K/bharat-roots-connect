# 🎯 Setup Checklist - Relationship Analyzer

## Before You Start

- [ ] MongoDB is running
- [ ] Neo4j database is running
- [ ] You have a Google account (for Gemini API key)

## Setup Steps

### 1. Get Gemini API Key
- [ ] Go to https://makersuite.google.com/app/apikey
- [ ] Sign in with Google account
- [ ] Click "Create API Key"
- [ ] Copy the API key (starts with `AIzaSy...`)

### 2. Configure Environment
- [ ] Open `bharat-roots-connect/.env` file
- [ ] Find line: `GEMINI_API_KEY=your_gemini_api_key_here`
- [ ] Paste your actual API key
- [ ] Save the file

### 3. Install Dependencies (if needed)
- [ ] Open terminal in `bharat-roots-connect` directory
- [ ] Run: `npm install` (dependencies already installed)

### 4. Start the Application
- [ ] **Terminal 1**: Run `npm run server`
- [ ] Wait for "✅ Gemini API initialized successfully"
- [ ] **Terminal 2**: Run `npm run dev`
- [ ] Open http://localhost:5173

## Testing

### Basic Functionality
- [ ] Navigate to Family Tree page
- [ ] Scroll down to "Relationship Analyzer" section
- [ ] Verify two dropdowns are visible
- [ ] Verify "Find Relationship" button is visible

### Test Case 1: Valid Analysis
- [ ] Select first person from dropdown
- [ ] Select different person from second dropdown
- [ ] Click "Find Relationship"
- [ ] Wait for loading indicator
- [ ] Verify analysis result appears
- [ ] Read the relationship explanation

### Test Case 2: Same Person
- [ ] Select same person in both dropdowns
- [ ] Verify button is disabled
- [ ] Or verify error message appears

### Test Case 3: Multiple Analyses
- [ ] Complete one analysis
- [ ] Click "Reset" button
- [ ] Select different people
- [ ] Click "Find Relationship" again
- [ ] Verify new result appears

### Test Case 4: No Relationship
- [ ] Select two unconnected people (if available)
- [ ] Click "Find Relationship"
- [ ] Verify message: "No direct relationship path found"

## Troubleshooting

### Issue: "Gemini API is not initialized"
- [ ] Check `.env` file has correct API key
- [ ] Restart the server (`npm run server`)
- [ ] Check server console for initialization message

### Issue: "Failed to load family members"
- [ ] Verify Neo4j is running
- [ ] Check Neo4j connection in `src/lib/neo4j/connection.ts`
- [ ] Ensure family tree has members

### Issue: Button stays disabled
- [ ] Verify two different people are selected
- [ ] Check browser console for errors
- [ ] Refresh the page

### Issue: Analysis takes too long
- [ ] First request may be slower (cold start)
- [ ] Check internet connection
- [ ] Verify Gemini API key is valid

## Verification

### Server Console Should Show:
```
✅ Connected to MongoDB
✅ Gemini API initialized successfully
🚀 Socket.IO server running on port 3001
```

### Browser Should Show:
- Relationship Analyzer card below family tree
- Two populated dropdown menus
- Enabled "Find Relationship" button (when valid)
- No console errors

## Success Criteria

- [ ] ✅ Server starts without errors
- [ ] ✅ Gemini API initializes successfully
- [ ] ✅ Component renders on Family Tree page
- [ ] ✅ Dropdowns populate with family members
- [ ] ✅ Can select two different people
- [ ] ✅ Analysis completes in 3-6 seconds
- [ ] ✅ Result displays in readable format
- [ ] ✅ Can perform multiple analyses
- [ ] ✅ Error messages are clear and helpful

## Optional: Advanced Testing

### Mobile Testing
- [ ] Open on mobile device or use browser dev tools
- [ ] Verify responsive layout
- [ ] Test dropdown interactions
- [ ] Verify button is accessible

### Error Scenarios
- [ ] Stop Neo4j and verify error handling
- [ ] Use invalid API key and verify error message
- [ ] Test with empty family tree

### Performance
- [ ] Time the analysis (should be 3-6 seconds)
- [ ] Try with complex family trees
- [ ] Test multiple rapid requests

## Documentation

- [ ] Read `QUICK_START.md` for quick reference
- [ ] Review `RELATIONSHIP_ANALYZER_README.md` for details
- [ ] Check `IMPLEMENTATION_SUMMARY.md` for technical info

## Support

If you encounter issues:

1. **Check Console Logs**: Look for error messages
2. **Review Documentation**: See README files
3. **Verify Setup**: Go through checklist again
4. **Check API Key**: Ensure it's valid and active

## 🎉 You're Done!

Once all checkboxes are complete, your Relationship Analyzer is fully functional!

**Enjoy discovering family connections with AI! 🌳✨**

---

**Quick Links:**
- [Quick Start Guide](QUICK_START.md)
- [Full Documentation](RELATIONSHIP_ANALYZER_README.md)
- [Implementation Details](../.kiro/specs/gemini-relationship-analysis/IMPLEMENTATION_SUMMARY.md)
