# 🔍 Troubleshooting Guide - Relationship Analyzer

## Current Issue: 500 Internal Server Error

You're getting a 500 error, which means the server is crashing when trying to process the relationship analysis request.

## ✅ Step-by-Step Fix

### Step 1: Restart the Server (CRITICAL!)

**You MUST restart the server after all the code changes:**

1. Go to the terminal running `npm run server`
2. Press `Ctrl + C` to stop it
3. Run `npm run server` again
4. Wait for these messages:
   ```
   ✅ Connected to MongoDB
   ✅ Gemini API initialized successfully
   🚀 Socket.IO server running on port 3001
   ```

### Step 2: Check Server Console

After restarting, look for any error messages in the server console. Common issues:

#### ❌ "Cannot find module"
**Problem**: Missing dependencies or wrong import paths
**Solution**: Run `npm install` in the bharat-roots-connect directory

#### ❌ "GEMINI_API_KEY is not defined"
**Problem**: .env file not loaded
**Solution**: 
- Check `.env` file exists
- Verify it contains: `GEMINI_API_KEY=AIzaSyDCg5qgj8iEOEjT1FiPWTY3_YJMIOL8soI`
- Restart server

#### ❌ "Neo4j connection error"
**Problem**: Can't connect to Neo4j database
**Solution**: 
- Make sure Neo4j is running
- Check connection details in `services/neo4j-relationship-service.js`

### Step 3: Test the Debug Endpoint

Open your browser and go to:
```
http://localhost:3001/api/relationship/status
```

You should see:
```json
{
  "geminiAvailable": true,
  "apiKeySet": true,
  "apiKeyLength": 39
}
```

If `geminiAvailable` is `false`:
- Server didn't restart properly
- API key is invalid
- Restart the server again

### Step 4: Check Browser Console

When you click "Find Relationship", check the browser console (F12) for:

#### Network Tab
- Click on the failed request
- Look at the "Response" tab
- Check if there's a `details` field with more info

#### Console Tab
- Look for the exact error message
- Copy the full error and check what it says

### Step 5: Test with Simple Data

Make sure you're testing with:
- ✅ Two different family members
- ✅ Family members that are connected in the tree
- ✅ At least 2 members in your family tree

## 🐛 Common Errors and Solutions

### Error: "Failed to fetch"
**Cause**: Server is not running or wrong port
**Fix**: 
1. Check server is running on port 3001
2. Check `npm run server` terminal for errors

### Error: "503 Service Unavailable"
**Cause**: Gemini API not initialized
**Fix**:
1. Check `.env` file has API key
2. Restart server
3. Look for "✅ Gemini API initialized successfully"

### Error: "500 Internal Server Error"
**Cause**: Server code is crashing
**Fix**:
1. **RESTART THE SERVER** (most common fix!)
2. Check server console for error details
3. Look for red error messages
4. Check the error stack trace

### Error: "404 Not Found"
**Cause**: One or both persons not in database
**Fix**:
1. Make sure both people exist in Neo4j
2. Check the familyId is correct
3. Verify userId values are valid

### Error: "No relationship path found"
**Cause**: People are not connected in the family tree
**Fix**:
1. This is expected if people aren't related
2. Add relationships using "Manage Relationships"
3. Make sure the family tree has connections

## 📋 Checklist Before Testing

- [ ] Server is running (`npm run server`)
- [ ] You see "✅ Gemini API initialized successfully"
- [ ] MongoDB is running
- [ ] Neo4j is running
- [ ] `.env` file has GEMINI_API_KEY
- [ ] You have 2+ family members in the tree
- [ ] Family members are connected with relationships

## 🔬 Advanced Debugging

### Check Server Logs

When you click "Find Relationship", the server console should show:

```
Executing Neo4j query: MATCH (a:User {userId: $personAId...
Finding relationship path between [personAId] and [personBId]
Found path with X nodes and Y relationships
```

If you don't see these logs:
- Request isn't reaching the server
- Check network tab in browser
- Verify URL is correct: `http://localhost:3001/api/relationship/analyze`

### Check Neo4j Connection

The server should connect to Neo4j on startup. Look for:
```
✅ Connected to MongoDB
```

If you see connection errors:
- Check Neo4j is running
- Verify credentials in `services/neo4j-relationship-service.js`

### Test Gemini API Directly

You can test if Gemini is working by checking the status endpoint:
```
http://localhost:3001/api/relationship/status
```

## 🆘 Still Not Working?

### Collect This Information:

1. **Server Console Output**
   - Copy the last 20 lines from server terminal
   - Look for any red error messages

2. **Browser Console Output**
   - Open DevTools (F12)
   - Go to Console tab
   - Copy any error messages

3. **Network Request Details**
   - Open DevTools (F12)
   - Go to Network tab
   - Click on the failed request
   - Copy the Response

4. **Environment Check**
   - Run: `node --version` (should be 14+)
   - Run: `npm --version`
   - Check if `.env` file exists
   - Check if `services/neo4j-relationship-service.js` exists

### Quick Reset

If nothing works, try this:

```bash
# Stop the server (Ctrl+C)

# Reinstall dependencies
npm install

# Restart server
npm run server

# In another terminal, restart frontend
npm run dev
```

## ✅ Success Indicators

When everything is working, you should see:

**Server Console:**
```
✅ Connected to MongoDB
✅ Gemini API initialized successfully
🚀 Socket.IO server running on port 3001
```

**When you click "Find Relationship":**
```
Executing Neo4j query: MATCH (a:User...
Finding relationship path between...
Found path with 2 nodes and 1 relationships
```

**Browser:**
- Beautiful card with relationship explanation
- No errors in console
- Analysis completes in 3-5 seconds

---

**Remember: The #1 fix is to RESTART THE SERVER after code changes!** 🔄
