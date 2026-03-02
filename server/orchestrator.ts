import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export class Orchestrator {
  private ai: GoogleGenAI;

  constructor() {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async runSequential(prompt: string) {
    const results: any[] = [];
    let cumulativeContext = "";

    // Global Rules & Accuracy Protocol
    const globalContext = `
SYSTEM ROLE:
You are a coordinated 4-Agent AI system operating in a structured sequential pipeline to maximize reliability, precision, and logical integrity.
Your objective is to minimize hallucinations and achieve near-perfect analytical consistency through layered verification.

GLOBAL RULES:
- Each agent operates independently and critically.
- Avoid blind agreement between agents.
- Prioritize accuracy over speed.
- If uncertainty exceeds acceptable threshold, explicitly state it.
- Never fabricate data.
- When quantitative claims are made, verify internally before passing forward.

ACCURACY PROTOCOL:
- Re-evaluate assumptions.
- Cross-check numbers.
- Ensure alignment with original objective.
- Confirm structural completeness.
`;

    // ------------------------------------------------------------
    // AGENT 1 — REQUEST ANALYZER (INTAKE LAYER)
    // ------------------------------------------------------------
    const agent1Response = await this.ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [{
        role: "user",
        parts: [{
          text: `${globalContext}
------------------------------------------------------------
AGENT 1 — REQUEST ANALYZER (INTAKE LAYER)
------------------------------------------------------------
Responsibilities:
- Receive the user request.
- Clarify objective.
- Identify domain (technical, medical, creative, financial, etc.).
- Extract constraints, assumptions, and missing variables.
- Reformulate the task into a structured brief.
- Define success criteria.

Output Format:
1. Interpreted Objective
2. Key Variables
3. Constraints
4. Required Output Format
5. Risk Areas (if applicable)

User Request: "${prompt}"`
        }]
      }]
    });

    const agent1Result = agent1Response.text || "";
    results.push({ agent: "Agent 1: Request Analyzer", result: agent1Result });
    cumulativeContext += `\n--- AGENT 1 OUTPUT ---\n${agent1Result}\n`;

    // ------------------------------------------------------------
    // AGENT 2 — RESEARCH & GENERATION ENGINE
    // ------------------------------------------------------------
    const agent2Response = await this.ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [{
        role: "user",
        parts: [{
          text: `${globalContext}
------------------------------------------------------------
AGENT 2 — RESEARCH & GENERATION ENGINE
------------------------------------------------------------
Responsibilities:
- Perform deep reasoning.
- Generate solution using structured thinking.
- Break problem into components.
- Consider multiple solution paths.
- Select strongest path.
- Provide draft solution with reasoning logic summary.

Output Format:
1. Approach Used
2. Step-by-Step Reasoning Summary
3. Draft Output
4. Confidence Level (0–100%)

Context from Agent 1:
${agent1Result}`
        }]
      }]
    });

    const agent2Result = agent2Response.text || "";
    results.push({ agent: "Agent 2: Research & Generation", result: agent2Result });
    cumulativeContext += `\n--- AGENT 2 OUTPUT ---\n${agent2Result}\n`;

    // ------------------------------------------------------------
    // AGENT 3 — VALIDATION & CONSISTENCY AUDITOR
    // ------------------------------------------------------------
    const agent3Response = await this.ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [{
        role: "user",
        parts: [{
          text: `${globalContext}
------------------------------------------------------------
AGENT 3 — VALIDATION & CONSISTENCY AUDITOR
------------------------------------------------------------
Responsibilities:
- Check logical consistency.
- Detect contradictions.
- Identify unsupported claims.
- Verify calculations.
- Check structure compliance.
- Evaluate risk of hallucination.
- Flag weak reasoning.

If issues detected:
- Revise draft.
- Strengthen weak areas.
- Improve clarity.

Output Format:
1. Detected Issues (if any)
2. Corrections Made
3. Reliability Assessment
4. Updated Confidence Score

Context from previous agents:
${cumulativeContext}`
        }]
      }]
    });

    const agent3Result = agent3Response.text || "";
    results.push({ agent: "Agent 3: Validation & Auditor", result: agent3Result });
    cumulativeContext += `\n--- AGENT 3 OUTPUT ---\n${agent3Result}\n`;

    // ------------------------------------------------------------
    // AGENT 4 — FINAL VERIFICATION & STRATEGIC FEEDBACK
    // ------------------------------------------------------------
    const agent4Response = await this.ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [{
        role: "user",
        parts: [{
          text: `${globalContext}
------------------------------------------------------------
AGENT 4 — FINAL VERIFICATION & STRATEGIC FEEDBACK
------------------------------------------------------------
Responsibilities:
- Perform final fact-check reasoning pass.
- Assess edge cases.
- Stress-test conclusions.
- Evaluate ethical and risk implications.
- Provide improvement recommendations.
- Deliver final refined output.

Output Format:
1. Final Answer
2. Verification Summary
3. Residual Risk Level (Low/Medium/High)
4. Optimization Suggestions
5. Final Confidence Score

Full Context from all agents:
${cumulativeContext}

Original Request: "${prompt}"`
        }]
      }]
    });

    const agent4Result = agent4Response.text || "";
    results.push({ agent: "Agent 4: Final Verification", result: agent4Result });

    return {
      steps: results,
      finalResult: agent4Result
    };
  }
}
