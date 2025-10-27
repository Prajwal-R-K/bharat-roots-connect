import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
let genAI = null;
let model = null;

export const initializeGemini = (apiKey) => {
  if (!apiKey) {
    console.warn('⚠️  Gemini API key not provided. Relationship analysis feature will be disabled.');
    return false;
  }
  
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.0-flash-exp (latest and fastest model)
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    console.log('✅ Gemini API initialized successfully with gemini-2.0-flash-exp');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Gemini API:', error);
    return false;
  }
};

export const isGeminiAvailable = () => {
  return model !== null;
};

/**
 * Format relationship path data into a human-readable string for the prompt
 */
const formatPathForPrompt = (path) => {
  if (!path || !path.nodes || path.nodes.length === 0) {
    return 'No path data available';
  }
  
  const { nodes, relationships } = path;
  let pathDescription = '';
  
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    pathDescription += `${i + 1}. ${node.name} (${node.gender || 'unknown gender'})`;
    
    if (i < relationships.length) {
      const rel = relationships[i];
      const isForward = rel.direction === node.userId;
      
      let relType = '';
      switch (rel.type) {
        case 'PARENTS_OF':
          relType = isForward ? 'is parent of' : 'is child of';
          break;
        case 'MARRIED_TO':
          relType = 'is married to';
          break;
        case 'SIBLING':
          relType = 'is sibling of';
          break;
        default:
          relType = `has relationship ${rel.type} with`;
      }
      
      pathDescription += ` → ${relType} → `;
    }
    
    pathDescription += '\n';
  }
  
  return pathDescription.trim();
};

/**
 * Analyze relationship between two people using Gemini AI
 */
export const analyzeRelationship = async (path, personA, personB) => {
  if (!isGeminiAvailable()) {
    throw new Error('Gemini API is not initialized');
  }
  
  const formattedPath = formatPathForPrompt(path);
  
  const prompt = `You are a family relationship expert. Analyze the following family tree path and explain the relationship between two people in BOTH directions.

Person A: ${personA.name} (Gender: ${personA.gender || 'unknown'})
Person B: ${personB.name} (Gender: ${personB.gender || 'unknown'})

Relationship Path:
${formattedPath}

IMPORTANT Instructions:
1. You MUST use the actual names (${personA.name} and ${personB.name}) in your explanation
2. Explain the relationship in BOTH directions:
   - First: How ${personA.name} is related to ${personB.name}
   - Second: How ${personB.name} is related to ${personA.name}
3. Use proper relationship terminology (father, mother, son, daughter, sibling, spouse, etc.)
4. Format your response like this:
   "${personA.name} is the [relationship] of ${personB.name}."
   "${personB.name} is the [relationship] of ${personA.name}."

Example format:
"John is the father of Mary."
"Mary is the daughter of John."

Provide BOTH directions using the actual names. Keep it clear and concise.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text.trim();
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw new Error('Failed to analyze relationship with AI');
  }
};
