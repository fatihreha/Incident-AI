import { Injectable } from '@angular/core';
import { GoogleGenAI, Type, SchemaType, Chat } from "@google/genai";

export interface IncidentAnalysis {
  category: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  rootCause: string;
  resolutionSteps: string[];
  summary: string;
  commandSuggestions: string[];
  confidenceScore: number;
  relatedKnowledgeBaseArticles: string[];
}

export interface IncidentHistoryItem {
  id: string;
  timestamp: string;
  analysis: IncidentAnalysis;
  logSnippet: string;
}

export type AnalysisPersona = 'Senior SRE' | 'CTO / Executive' | 'Junior Developer';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env['API_KEY'] || '';
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  // Helper to strip base64 prefix
  private cleanBase64(base64: string): string {
    return base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
  }

  private getMimeType(base64: string): string {
    const match = base64.match(/^data:(image\/\w+);base64,/);
    return match ? match[1] : 'image/png';
  }

  async analyzeLog(logContent: string, imageBase64?: string, persona: AnalysisPersona = 'Senior SRE'): Promise<IncidentAnalysis> {
    if (!this.apiKey) {
      throw new Error("API Key is missing. Please check your environment configuration.");
    }

    const modelId = 'gemini-2.5-flash';
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: "The category of the error (e.g., Database, Network, Frontend, Docker, Auth)."
        },
        severity: {
          type: Type.STRING,
          enum: ["Critical", "High", "Medium", "Low"],
          description: "The severity level of the incident based on banking standards."
        },
        rootCause: {
          type: Type.STRING,
          description: "A concise technical explanation of the root cause."
        },
        resolutionSteps: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Step-by-step resolution instructions. Adjust complexity based on persona."
        },
        summary: {
          type: Type.STRING,
          description: "A summary of the incident tailored specifically to the requested persona."
        },
        commandSuggestions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Specific terminal commands to fix or debug the issue."
        },
        confidenceScore: {
          type: Type.NUMBER,
          description: "Confidence score (0-100) of the diagnosis based on available log data."
        },
        relatedKnowledgeBaseArticles: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Titles of 2-3 hypothetical internal Knowledge Base articles that look similar to this incident."
        }
      },
      required: ["category", "severity", "rootCause", "resolutionSteps", "summary", "commandSuggestions", "confidenceScore", "relatedKnowledgeBaseArticles"]
    } as SchemaType;

    const parts: any[] = [];
    
    // Add image if present
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: this.getMimeType(imageBase64),
          data: this.cleanBase64(imageBase64)
        }
      });
    }

    // Persona-specific instructions
    let personaInstruction = "";
    switch (persona) {
      case 'CTO / Executive':
        personaInstruction = "AUDIENCE: CTO/Executive. Focus on business impact, downtime risks, and high-level root cause. Avoid deep jargon. Keep the summary concise and strategic.";
        break;
      case 'Junior Developer':
        personaInstruction = "AUDIENCE: Junior Developer. Be educational. Explain WHY the error happened. Break down resolution steps simply and warn about potential pitfalls.";
        break;
      case 'Senior SRE':
      default:
        personaInstruction = "AUDIENCE: Senior SRE. Be extremely technical, terse, and command-focused. Skip the basics. Focus on immediate remediation.";
        break;
    }

    // Add text prompt
    parts.push({
      text: `
      You are an AI Incident Response Unit for a Tier-1 Financial Institution.
      
      ${personaInstruction}
      
      TASK:
      1. Analyze the provided log data ${imageBase64 ? 'and the attached screenshot' : ''}.
      2. Identify the Root Cause.
      3. Search your internal (simulated) knowledge base for similar past incidents.
      4. Provide a step-by-step remediation plan.
      
      LOG DATA:
      ${logContent}
      `
    });

    try {
      const response = await this.ai.models.generateContent({
        model: modelId,
        contents: { parts: parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          systemInstruction: "You are an expert DevOps engineer and SRE. You provide precise, actionable, and safe advice for system incidents. You prioritize system stability and data integrity above all else.",
          temperature: 0.2
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("The AI returned an empty response. Please try again with more detailed logs.");
      }
      
      try {
        return JSON.parse(text) as IncidentAnalysis;
      } catch (e) {
        console.error("JSON Parse failed", text);
        throw new Error("Failed to parse the analysis result. The model output was not valid JSON.");
      }

    } catch (error: any) {
      console.error("Gemini Analysis Error:", error);
      throw this.handleError(error);
    }
  }

  // Create a chat session grounded in the initial analysis
  createChatSession(initialAnalysis: IncidentAnalysis, originalLog: string): Chat {
    return this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are a Senior SRE Assistant. 
        You have just analyzed an incident with the following details:
        
        INCIDENT REPORT:
        - Category: ${initialAnalysis.category}
        - Severity: ${initialAnalysis.severity} (Confidence: ${initialAnalysis.confidenceScore}%)
        - Root Cause: ${initialAnalysis.rootCause}
        
        EXECUTIVE SUMMARY:
        ${initialAnalysis.summary}
        
        RECOMMENDED RESOLUTION STEPS:
        ${initialAnalysis.resolutionSteps.map((s, i) => `${i + 1}. ${s}`).join('\n        ')}

        SUGGESTED COMMANDS:
        ${initialAnalysis.commandSuggestions.join('\n        ')}

        KNOWLEDGE BASE REFERENCES:
        ${initialAnalysis.relatedKnowledgeBaseArticles.join('\n        ')}
        
        ORIGINAL LOG SNIPPET:
        ${originalLog.substring(0, 5000)}...

        Your goal is to answer follow-up questions from the user about this specific incident.
        Be technical, concise, and helpful. Provide command syntax if asked.`,
      }
    });
  }

  private handleError(error: any): Error {
    if (error.message) {
      if (error.message.includes('API key')) {
         return new Error("Invalid API Key provided. Please check your credentials.");
      }
      if (error.status === 429 || error.message.includes('429')) {
          return new Error("Rate limit exceeded. Please wait a moment and try again.");
      }
      return new Error(error.message);
    }
    return new Error("An unexpected error occurred while contacting the AI service.");
  }
}