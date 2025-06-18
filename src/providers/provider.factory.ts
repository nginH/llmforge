import { Config } from "../types";
import { OpenAIClient } from "./openai.adapter";
import { GeminiClient } from "./google.adapter";

export class Factory{
    constructor(private readonly config:Config){}
    create(llm :string ){
        switch (llm) {
            case 'google':
                return new GeminiClient(this.config)
            case 'openai':
                return new OpenAIClient(this.config);
            default:
                throw new Error('Currently this LLM is not supported');
        }
    }
}

