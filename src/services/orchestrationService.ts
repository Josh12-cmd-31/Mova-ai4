import { GoogleGenAI } from "@google/genai";

export interface Agent {
  id: string;
  name: string;
  responsibilities: string;
  outputFormat: string;
  model: string;
}

export interface OrchestrationConfig {
  id: string;
  userId: string;
  name: string;
  globalContext: string;
  agents: Agent[];
  isDefault: boolean;
}

export interface OrchestrationStep {
  agent: string;
  result: string;
}

export interface OrchestrationResult {
  steps: OrchestrationStep[];
  finalResult: string;
}

export class OrchestrationService {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Gemini API key is required for orchestration");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async runOrchestration(prompt: string, config: OrchestrationConfig): Promise<OrchestrationResult> {
    const results: OrchestrationStep[] = [];
    let cumulativeContext = "";

    const { globalContext, agents } = config;

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const isLastAgent = i === agents.length - 1;

      const agentPrompt = `
${globalContext}
------------------------------------------------------------
AGENT ${i + 1} — ${agent.name.toUpperCase()}
------------------------------------------------------------
Responsibilities:
${agent.responsibilities}

Output Format:
${agent.outputFormat}

${i > 0 ? `Context from previous agents:\n${cumulativeContext}` : ''}

${isLastAgent ? `Original Request: "${prompt}"` : `User Request: "${prompt}"`}
`;

      try {
        const response = await this.ai.models.generateContent({
          model: agent.model || "gemini-3.1-pro-preview",
          contents: [{
            role: "user",
            parts: [{ text: agentPrompt }]
          }]
        });

        const resultText = response.text || "";
        results.push({ agent: `Agent ${i + 1}: ${agent.name}`, result: resultText });
        cumulativeContext += `\n--- AGENT ${i + 1} OUTPUT (${agent.name}) ---\n${resultText}\n`;
      } catch (error: any) {
        console.error(`Error in Agent ${i + 1} (${agent.name}):`, error);
        throw new Error(`Orchestration failed at ${agent.name}: ${error.message}`);
      }
    }

    return {
      steps: results,
      finalResult: results[results.length - 1].result
    };
  }
}
