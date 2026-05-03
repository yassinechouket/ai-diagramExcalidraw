import type { ModelMessage } from "ai";

interface Seed {
  userPrompt: string;
  elements: unknown[];
  assistantConfirmation: string;
}

interface GoldenTestCase {
  id: string;
  input: string;
  seed?: Seed;
}


export type Difficulty = "simple" | "medium" | "hard" | "edge";
export type Category = "create" | "modify" | "domain" | "edge";




export function buildMessages(tc: GoldenTestCase): ModelMessage[] {
  if (!tc.seed) {
    return [{ role: "user", content: tc.input }];
  }

  const callId = `seed_${tc.id}`;

  return [
    {
      role: "user",
      content: tc.seed.userPrompt,
    },

    {
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: callId,
          toolName: "generateDiagram",
          input: { elements: tc.seed.elements },
        },
      ],
    },

    {
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: callId,
          toolName: "generateDiagram",
          output: {
            type: "json",
            value: {
              elements: tc.seed.elements as never,
            },
          },
        },
      ],
    },

    {
      role: "assistant",
      content: tc.seed.assistantConfirmation,
    },

    {
      role: "user",
      content: tc.input,
    },
  ];
}