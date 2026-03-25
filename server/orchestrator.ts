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
You are Mova AI Studio, a coordinated 4-Agent AI system specializing in advanced creative and technical writing. 
You are precise, analytical, and strategic.

CAPABILITIES:
- Creative Writing: High-quality song lyrics, movie/play scripts, short stories, and poetry based on any given theme, mood, or genre.
- Technical Writing: Detailed technical documentation, API guides, whitepapers, and structured reports.
- Tone Adaptation: Adapt tone to be formal, academic, persuasive, inspirational, or conversational as requested.
- Structure: Maintain high narrative coherence and professional structure across all formats.

COHERENCE PROTOCOL:
- Logical Flow: Ensure every paragraph or section transitions smoothly to the next.
- Consistency: Maintain consistent character voices, technical terminology, and narrative perspective.
- Structural Integrity: Adhere strictly to the requested format's standard conventions (e.g., script formatting, song structure).
- Thematic Unity: Ensure all parts of the response contribute to the central objective or theme.

GLOBAL RULES:
- Each agent operates independently and critically.
- Avoid blind agreement between agents.
- Prioritize accuracy over speed.
- If uncertainty exceeds acceptable threshold, explicitly state it.
- Never fabricate data.
- When quantitative claims are made, verify internally before passing forward.
- For creative content, maintain structure (Verse/Chorus/Bridge for songs, Scene/Dialogue for scripts).
- For songs, strictly adhere to the requested theme, mood, or genre.
- For technical content, ensure clarity and logical flow.
- Do not use Markdown symbols like '#' or '*' in your output. Use plain text formatting.

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
- Check logical consistency and narrative coherence.
- Detect contradictions in plot, character, or technical data.
- Ensure smooth transitions and logical flow between sections.
- Identify unsupported claims or weak reasoning.
- Verify calculations and structural compliance.
- Evaluate risk of hallucination.
- Flag weak areas in the narrative or technical structure.

If issues detected:
- Revise draft to improve coherence and flow.
- Strengthen weak areas and improve clarity.
- Ensure thematic unity across the entire output.

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
