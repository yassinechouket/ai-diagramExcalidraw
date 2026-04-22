

import { EvalResult, TestCase } from './types'
import { generateText, stepCountIs } from 'ai'
import { createOpenAI } from "@ai-sdk/openai";
import { tools } from '../src/tools'
import { SYSTEM_PROMPT } from '../src/system-prompts'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })
const start = Date.now()

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT =join(__dirname, '..')
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

async function main() {
    const datasetPath = join(ROOT, 'evals/datasets/golden.json')
    const testCases = JSON.parse(readFileSync(datasetPath, 'utf-8'))

    console.log(`Running ${testCases.length} test case${testCases.length !== 1 ? 's' : ''}...\n`)

    const results: EvalResult[] = []
    for (const testCase of testCases) {
        process.stdout.write(`[${testCase.id}] ${testCase.difficulty.padEnd(6)} `)
        const result = await RunTestCase(testCase)
        results.push(result)
        if (result.error) {
            console.log(`ERROR: ${result.error}`)
        } else {
            console.log(`${result.elements.length} elements, ${result.durationMs}ms`)
        }
    }

    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const resultsDir = join(ROOT, 'evals/results')
    mkdirSync(resultsDir, { recursive: true })
    const resultsFile = join(resultsDir, `results-${timestamp}.json`)
    
    writeFileSync(resultsFile, JSON.stringify(results, null, 2))
    console.log(`\n✓ Results saved to ${resultsFile}`)

    
    const successful = results.filter(r => !r.error).length
    const failed = results.filter(r => r.error).length
    const totalElements = results.reduce((sum, r) => sum + r.elements.length, 0)
    const avgDuration = results.filter(r => !r.error).reduce((sum, r) => sum + r.durationMs, 0) / successful

    console.log(`\nSummary:`)
    console.log(`  Passed: ${successful}/${results.length}`)
    console.log(`  Failed: ${failed}`)
    console.log(`  Total elements generated: ${totalElements}`)
    console.log(`  Avg duration: ${Math.round(avgDuration)}ms`)
}

main().catch(console.error)
