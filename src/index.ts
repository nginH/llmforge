

/*
 * 
 * 
 * 
    const client=new llmforge('openai', {config});
    const content = cient.generateMessageText(baseMesssage[])
    const content = cient.generateMessageThinking(baseMesssage[])



    // fallback for the chat

    curl https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
  "model": "o4-mini",
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "hii there"
        }
      ]
    },
    {
      "type": "reasoning",
      "id": "rs_6851f9313f20819eac89a98b7399116305cc4e86ae75718a",
      "summary": []
    },
    {
      "id": "msg_6851f931da4c819eb18c4da3b481a4dd05cc4e86ae75718a",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "Hello! How can I help you today?"
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "what can you help with"
        }
      ]
    },
    {
      "type": "reasoning",
      "id": "rs_6851f9461ff8819ebf884bdbab80788f05cc4e86ae75718a",
      "summary": []
    },
    {
      "id": "msg_6851f947473c819e9b35579adc7d3c4c05cc4e86ae75718a",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "I can help with a wide range of tasks – General knowledge (history, science, culture…)  \n  – Definitions, “how & why,” overviews  \n\n• Writing & editing  \n  – Essays, articles, blog posts  \n  – Emails, reports, cover letters, proposals  \n  – Creative writing (stories, scripts, poems)  \n  – Paraphrasing, polishing, tone/style adjustments  \n\n• Summaries & research aids  \n  – Condensing articles, papers or long texts  \n  – Outlining key points, pros & cons, comparisons  \n\n• Coding & technical support  \n  – Explaining algorithms, data structures  \n  – Writing/debugging code (Python, JavaScript, etc.)  \n  – Dev-ops concepts, version control, SQL queries  \n\n• Language services  \n  – Translations between major languages  \n  – Grammar/spelling checks, style suggestions  \n\n• Math & logic problems  \n  – Step-by-step solutions (algebra, calculus, statistics)  \n  – Logical puzzles, data analysis  \n\n• Planning & brainstorming  \n  – Project plans, timelines, task lists  \n  – Marketing ideas, product names, slogans  \n  – Meal plans, travel itineraries, event agendas  \n\n• Conversational support  \n  – Role-plays, mock interviews  \n  – Recommendations (books, movies, recipes…)  \n  – Friendly chat & motivation  \n\n• Image analysis  \n  – Describing images or diagrams  \n  – Extracting text, identifying objects  \n\nFeel free to ask for examples, templates or deeper dives in any area!"
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "hii there"
        }
      ]
    },
    {
      "type": "reasoning",
      "id": "rs_6851f9a8676c819ea75f39a07921cc8e05cc4e86ae75718a",
      "summary": []
    },
    {
      "id": "msg_6851f9a9365c819e942b82aebdde399205cc4e86ae75718a",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "{\n  \"thinking\": \"The user just saia greeting. I should respond with a friendly greeting and offer assistance.\",\n  \"final_output\": \"Hello there! How can I assist you today?\"\n}"
        }
      ]
    }
  ],
  "text": {
    "format": {
      "type": "json_schema",
      "name": "thinking_output",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "thinking": {
            "type": "string",
            "description": "Description of the thought process or reasoning."
          },
          "final_output": {
            "type": "string",
            "description": "Final result or conclusion derived from the thinking process."
          }
        },
        "required": [
          "thinking",
          "final_output"
        ],
        "additionalProperties": false
      }
    }
  },
  "reasoning": {
    "effort": "medium"
  },
  "tools": [],
  "store": true
}'
 */




