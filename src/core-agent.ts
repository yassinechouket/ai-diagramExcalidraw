import { streamText,generateText,stepCountIs } from 'ai';

import {tools} from './tools'



const SYSTEM_PROMPT = `You are a diagram design assistant. You help users create and modify diagrams on an Excalidraw canvas.

When the user asks you to create a diagram, use the generateDiagram tool to produce Excalidraw elements.

Guidelines for generating diagrams:
- Give each element a unique id (e.g. "rect-1", "text-1", "arrow-1")
- Position elements with reasonable spacing (at least 20px gap between elements)
- Use rectangles for boxes/containers, ellipses for circles, diamonds for decision points
- Add text labels inside or near shapes
- Connect related elements with arrows
- Use a clean layout: left to right or top to bottom
- Default to strokeColor "#1e1e1e" and backgroundColor "transparent"
- Set roughness to 1 for a hand-drawn look

When the user asks to modify an element, use the modifyDiagram tool with the element's id.`;




export function streamAgent({model,messages,system=SYSTEM_PROMPT,maxSteps=5}){
    return streamAgent({
    model,
    system,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps)
    })
}




export async function runAgent({model,messages,system=SYSTEM_PROMPT,maxSteps=5}){
    const result = await generateText({
        model,
        system,
        messages,
        tools,
        stopWhen: stepCountIs(maxSteps)
    })

    return {
        text: result.text,
        steps: result.steps,
        elements: extarctElemets(result.steps)
    }
}

interface StepLike{
    toolResults?:{
        toolName: string;
        output: unknown;
    }[]

}


export function extarctElemets(steps:StepLike[]): unknown[]{
    const elements :unknown[]=[] ;
    for(const step of steps){
        for(const tollResult of step.toolResults ?? []){
            if (tollResult.toolName === "generateDiagram"){
                const output= tollResult.output as any
                if(Array.isArray(output?.elements)){
                    elements.push(...output.elements)
                }
            }
        }
    }
    return elements;
}


