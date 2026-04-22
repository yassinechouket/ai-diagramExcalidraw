

import { EvalResult, TestCase } from './types'
import { generateText, stepCountIs } from 'ai'
import { createOpenAI } from "@ai-sdk/openai";
import { tools } from '../src/tools'
import { SYSTEM_PROMPT } from '../src/system-prompts'

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })
const start = Date.now()


async function RunTestCase(testCase: TestCase) :Promise<EvalResult> {

    try{

    

    const result=await generateText({
        model: openai("gpt-5.4-mini"),
        system: SYSTEM_PROMPT,
        prompt: testCase.input,
        tools,
        stopWhen: stepCountIs(5),
    })

    const elements = []

    for(const step of result.steps){
        for(const tollResult of step.toolResults ?? []){
            if (tollResult.toolName === "generateDiagram"){
                const output= tollResult.output as any
                if(Array.isArray(output?.elements)){
                    elements.push(...output.elements)
                }
            }
        }
    }
    return {
        testCaseId: testCase.id,
        input: testCase.input,
        response: result.text,
        elements,
        durationMs: Date.now() - start,
        
    }
    }catch(e){
        return {
            testCaseId: testCase.id,
            input: testCase.input,
            response: "",
            elements: [],
            durationMs: 0,
            error: e instanceof Error ? e.message : String(e)
        }
    }

}
