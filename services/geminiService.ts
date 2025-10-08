import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry } from '../types';
import { DetectionRule, Sensor, Weather, PatchSuggestion, PointOfInterest } from "../features/adversarial_simulator/types";


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Analyzes security event logs using the Gemini API.
 * This function remains as part of the SkySecure feature.
 */
export const analyzeSecurityEvents = async (logEntries: LogEntry[]): Promise<string> => {
  // ... (implementation is unchanged)
    if (!logEntries || logEntries.length === 0) {
    return "No security events to analyze.";
  }

  const recentLogs = logEntries.slice(0, 25).map(log =>
    `- Time: ${log.time}, Level: ${log.level}, Type: ${log.type}, Source: ${log.source}`
  ).join('\n');

  const prompt = `
    As an expert AI security analyst, analyze the following recent security event logs and provide a concise summary of the current threat landscape. 
    Your analysis should be brief, bullet-pointed, and actionable.
    - Identify potential correlated attack patterns.
    - Highlight the most critical events that require immediate attention.
    - Suggest the top 1-2 mitigation actions.
    
    Do not use a greeting or sign-off. The response should be formatted as plain text, suitable for direct display.

    Recent Logs:
    ${recentLogs}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.3,
        topK: 20,
        topP: 0.8,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Error analyzing security events with Gemini:", error);
    return "AI analysis is currently unavailable due to an API error.";
  }
};

/**
 * RED TEAM AI: Generates a complete adversarial scenario.
 */
export const generateAdversarialScenario = async (
    start: string,
    end: string,
    pointsOfInterest: { [key: string]: PointOfInterest },
    sensors: Sensor[],
    rules: DetectionRule[],
    weather: Weather,
    seed: number
): Promise<{ path: [number, number][], gpsMode: 'on' | 'off', strategy: string }> => {
    const prompt = `
        You are a red team AI operator. Your mission is to generate a stealthy infiltration plan from "${start}" to "${end}".
        You must output a JSON object with a path, a gpsMode, and a brief strategy explanation.

        ENVIRONMENT:
        - Location: Baisaran Valley, Kashmir. Rugged, forested terrain with open meadows. The area has civilian tourist traffic, especially on main trails.
        - Weather: ${weather}. ${weather === 'fog' ? 'Fog reduces visibility for cameras.' : ''}
        - Points of Interest: ${JSON.stringify(Object.keys(pointsOfInterest))}
        - Your start coordinates: ${JSON.stringify(pointsOfInterest[start].pos)}
        - Your end coordinates: ${JSON.stringify(pointsOfInterest[end].pos)}

        SENSORS:
        ${JSON.stringify(sensors.map(s => ({ id: s.id, type: s.type, range: s.range, weather_penalty: s.weather_penalty })), null, 2)}
        
        ACTIVE DETECTION RULES (Blue Team Logic):
        ${JSON.stringify(rules, null, 2)}

        YOUR TASK:
        1.  **Analyze the defenses:** Review the sensor layout and active detection rules. Find their weaknesses. Consider civilian traffic as a cover.
        2.  **Devise a plan:**
            -   **Path:** Create a sequence of at least 5 [lat, lon] waypoints. Start *exactly* at the start coordinates and end *exactly* at the end coordinates. Prioritize routes through forests and away from sensors. Exploit weather effects.
            -   **GPS Mode:** Choose 'on' or 'off'. Turn it off if you suspect GPS-based tracking rules are active or if you plan a route that deviates significantly from common paths where a GPS signal would be expected.
            -   **Strategy:** Write a short (1-2 sentences) explanation of your tactical reasoning.
        3.  **Output:** Respond with ONLY the JSON object. Do not include markdown ticks or any other text.
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            path: {
                type: Type.ARRAY,
                items: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER }
                }
            },
            gpsMode: { type: Type.STRING },
            strategy: { type: Type.STRING }
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.8,
                seed: seed,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        
        let scenario = JSON.parse(response.text);
        
        // Data validation and correction
        if (scenario.path && scenario.path.length > 0) {
            scenario.path[0] = pointsOfInterest[start].pos;
            scenario.path[scenario.path.length - 1] = pointsOfInterest[end].pos;
        } else {
            // Fallback path
            scenario.path = [pointsOfInterest[start].pos, pointsOfInterest[end].pos];
        }

        return scenario;
    } catch (error) {
        console.error("Error generating adversarial scenario:", error);
        return {
            path: [pointsOfInterest[start].pos, pointsOfInterest[end].pos],
            gpsMode: 'off',
            strategy: 'Fallback: Direct path due to generation error.'
        };
    }
};

/**
 * BLUE TEAM AI: Generates a patch (new rule) to counter a successful bypass.
 */
export const generateRulePatch = async (
    bypassedScenario: { path: [number, number][], gpsMode: 'on' | 'off', strategy: string },
    existingRules: DetectionRule[],
    seed: number
): Promise<PatchSuggestion> => {
    const prompt = `
        You are a blue team AI security analyst. A red team adversary just successfully bypassed your defenses by moving through an area with civilian traffic.
        Your task is to analyze their tactic and create a new, machine-readable detection rule to prevent this from happening again.

        BYPASS DETAILS:
        - Adversary Strategy: "${bypassedScenario.strategy}"
        - Adversary GPS Mode: "${bypassedScenario.gpsMode}"
        - Adversary Path Waypoints: ${JSON.stringify(bypassedScenario.path.slice(0, 5))}...

        EXISTING RULES THAT FAILED:
        ${JSON.stringify(existingRules, null, 2)}

        YOUR TASK:
        1.  **Analyze the Failure:** Why did the existing rules fail? The adversary likely exploited gaps in coverage or used civilian presence as a form of camouflage.
        2.  **Propose a New Rule:** Create a new rule as a JSON object. The most likely effective patch is to add or tune a \`group_sighting\` rule to detect suspicious clustering of individuals.
            -   Rule \`id\` should be descriptive (e.g., 'persistent_sighting_v2', 'group_sighting_meadow').
            -   Available \`type\` options: 'high_confidence_sighting', 'persistent_sighting', 'group_sighting'.
            -   The \`params\` must match the \`type\`.
                -   For \`high_confidence_sighting\`, params are: { "min_confidence": number (0-1) }
                -   For \`persistent_sighting\`, params are: { "time_window_s": number, "min_detections": number }
                -   For \`group_sighting\`, params are: { "radius_m": number, "time_window_s": number, "min_actors": number }
        3.  **Explain Your Reasoning:** Write a short, clear explanation of how your new rule counters the adversary's tactic.
        4.  **Output:** Respond with ONLY the JSON object containing the new rule and the explanation.
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            rule: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING },
                    params: {
                        type: Type.OBJECT,
                        properties: {
                            min_confidence: {
                                type: Type.NUMBER,
                                description: "For 'high_confidence_sighting': the minimum confidence score (0-1) to trigger an alert."
                            },
                            time_window_s: {
                                type: Type.NUMBER,
                                description: "For 'persistent_sighting' or 'group_sighting': the time window in seconds to count events/actors."
                            },
                            min_detections: {
                                type: Type.NUMBER,
                                description: "For 'persistent_sighting': the minimum number of detections within the time window."
                            },
                            radius_m: {
                                type: Type.NUMBER,
                                description: "For 'group_sighting': the radius in meters to check for other actors."
                            },
                            min_actors: {
                                type: Type.NUMBER,
                                description: "For 'group_sighting': the minimum number of unique actors to trigger the rule."
                            }
                        }
                    }
                }
            },
            explanation: { type: Type.STRING }
        }
    };
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.5,
                seed: seed,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        
        return JSON.parse(response.text);

    } catch (error) {
        console.error("Error generating rule patch:", error);
        return {
            rule: { id: 'fallback_rule', type: 'high_confidence_sighting', params: { min_confidence: 0.95 } },
            explanation: 'Fallback rule generated due to an API error. This increases sensitivity for all high-confidence detections.'
        };
    }
};


/**
 * POST-INCIDENT AI ANALYST: Generates a summary of the bypass and the fix.
 */
export const generatePostIncidentAnalysis = async (
    bypassedScenario: { strategy: string },
    patch: PatchSuggestion
): Promise<string> => {
    const prompt = `
        You are an AI security analyst providing a post-incident debrief. A security breach was detected and automatically patched.
        Your task is to generate a clear, concise summary for the operations team.

        **Incident Details:**
        - Adversary's successful tactic: "${bypassedScenario.strategy}"

        **Applied Patch:**
        - New Rule Added: "${patch.rule.id}" (${patch.rule.type})
        - Rule Parameters: ${JSON.stringify(patch.rule.params)}
        - Blue Team Rationale: "${patch.explanation}"

        **Your Task:**
        Generate a summary in plain text. Use the following structure:

        **Incident Summary:**
        [Briefly explain how the adversary likely bypassed the initial defenses based on their strategy.]

        **Patch Analysis:**
        [Describe the new rule that was just applied and what it does in simple terms.]

        **Threat Mitigation:**
        [Explain specifically how this new rule would likely detect and prevent this type of attack if the adversary tried again.]

        Keep the language clear, direct, and suitable for a dashboard display. Do not use markdown or greetings.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.4,
            },
        });

        return response.text;
    } catch (error) {
        console.error("Error generating post-incident analysis:", error);
        return "AI analysis is currently unavailable due to an API error.";
    }
};
