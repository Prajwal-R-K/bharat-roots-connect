# Quick Start Guide - Relationship Analyzer

## 🚀 Get Started in 3 Steps

### Step 1: Get Your Gemini API Key (2 minutes)

1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key (starts with `AIzaSy...`)

### Step 2: Add API Key to .env File (1 minute)

1. Open `bharat-roots-connect/.env`
2. Find the line: `GEMINI_API_KEY=your_gemini_api_key_here`
3. Replace `your_gemini_api_key_here` with your actual key
4. Save the file

Example:
```env
GEMINI_API_KEY=AIzaSyABC123...your_actual_key
```

### Step 3: Start the Application (1 minute)

```bash
# Terminal 1: Start the backend
cd bharat-roots-connect
npm run server

# Terminal 2: Start the frontend
cd bharat-roots-connect
npm run dev
```

## ✅ Test It Out

1. Open http://localhost:5173 in your browser
2. Navigate to **Family Tree** page
3. Scroll down to **Relationship Analyzer**
4. Select two family members
5. Click **"Find Relationship"**
6. See the AI-powered explanation! 🎉

## 🎯 What You Can Do

- **Discover Relationships**: Find out how any two family members are related
- **Natural Language**: Get easy-to-understand explanations
- **Instant Results**: Analysis completes in 3-5 seconds
- **Multiple Analyses**: Try different combinations without refreshing

## 📝 Example Results

> "John is the father of Mary. John is married to Sarah, and Mary is their daughter."

> "Alice and Bob are siblings. They share the same parents, David and Emma."

> "Michael is the grandfather of Sophie. Michael is the father of Robert, who is the father of Sophie."

## ❓ Need Help?

- **No API Key?** Follow Step 1 above
- **Server Won't Start?** Make sure MongoDB and Neo4j are running
- **No Family Members?** Add members to your family tree first
- **More Details?** See `RELATIONSHIP_ANALYZER_README.md`

## 🎨 Features

✨ AI-powered relationship analysis  
🔍 Smart path finding through family tree  
💬 Natural language explanations  
🎯 Accurate relationship detection  
⚡ Fast response times  
🛡️ Secure API key handling  

---

**Ready to explore your family connections? Start now!** 🌳
