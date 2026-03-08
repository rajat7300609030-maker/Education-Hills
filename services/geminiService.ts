import { GoogleGenAI } from "@google/genai";
import { AppData } from "../types";

export const askSchoolAssistant = async (
  query: string,
  appData: AppData,
  chatHistory: { role: 'user' | 'model'; parts: { text: string }[] }[]
): Promise<string> => {
  // Always use { apiKey: process.env.API_KEY } as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const systemContext = `
      You are the "Genkit AI Agent" 🤖 for EmojiSchool.
      You have access to the school's LIVE database and you can HELP MANAGE IT.
      
      Current Database Status:
      - Students: ${appData.students.filter(s => !s.isDeleted).length}
      - Fees Records: ${appData.fees.filter(f => !f.isDeleted).length}
      
      Full Data Context (Use this to answer queries):
      ${JSON.stringify({
        students: appData.students.filter(s => !s.isDeleted).map(s => ({id: s.id, name: s.name, grade: s.grade, email: s.email})),
        school: appData.schoolProfile
      })}

      **AGENT CAPABILITIES (GENKIT MODE):**
      You can perform actions if the user asks.
      
      1. **ADD STUDENT**: If user says "Add student [Name] in grade [Grade]...", return a JSON block.
      2. **ADD FEE**: If user says "Add fee for [Student Name] of amount [X]...", find the student ID and return a JSON block.

      **CRITICAL**: If you determine an action is needed, output the response text normally, AND THEN append a JSON block strictly in this format:
      
      \`\`\`json
      {
        "action": "ADD_STUDENT",
        "data": { "name": "...", "grade": "...", "parentName": "...", "phone": "...", "email": "..." }
      }
      \`\`\`
      OR
      \`\`\`json
      {
        "action": "ADD_FEE",
        "data": { "studentId": "...", "amount": 0, "type": "Tuition", "status": "Pending", "description": "..." }
      }
      \`\`\`

      Rules:
      - Use emojis in your text response.
      - If adding a fee, try to match the student name to an ID from the provided context. If ambiguous, ask for clarification instead of acting.
      - Default missing student fields to "N/A" or placeholders.
      - Default fee type to "Tuition" and status to "Pending" if not specified.
    `;

    // Using recommended model 'gemini-3-flash-preview'
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...chatHistory,
        { role: 'user', parts: [{ text: query }] }
      ],
      config: {
        systemInstruction: systemContext,
        temperature: 0.7,
      }
    });

    // Access .text property directly (it's a getter)
    return response.text || "🤖 I couldn't generate a text response.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "⚠️ Sorry, I encountered an error while processing your request. Please ensure your API key is valid in the environment settings.";
  }
};