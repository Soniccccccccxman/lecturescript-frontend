import OpenAI from 'openai';
import type { TranscriptSegment, LectureSession } from '../types';

export class SummaryService {
  private openai: OpenAI | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.setApiKey(apiKey);
    }
  }

  setApiKey(apiKey: string): void {
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  private validateApiKey(): void {
    if (!this.openai) {
      throw new Error('OpenAI API key is required for summary generation.');
    }
  }

  async generateSummary(
    session: LectureSession,
    options: {
      language?: 'zh' | 'en' | 'auto';
      style?: 'bullet' | 'paragraph' | 'outline';
      length?: 'short' | 'medium' | 'detailed';
      includeKeyTerms?: boolean;
    } = {}
  ): Promise<{
    summary: string;
    keyPoints: string[];
    keyTerms: string[];
    cost: number;
  }> {
    this.validateApiKey();

    const {
      language = 'auto',
      style = 'bullet',
      length = 'medium',
      includeKeyTerms = true,
    } = options;

    try {
      const transcript = session.segments.map(s => s.text).join(' ');
      const wordCount = transcript.split(' ').length;

      if (wordCount < 50) {
        throw new Error('Transcript too short for meaningful summary (minimum 50 words)');
      }

      const prompt = this.createSummaryPrompt(transcript, {
        language,
        style,
        length,
        includeKeyTerms,
        sessionName: session.name,
        duration: session.duration,
      });

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(language),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: this.getMaxTokens(length),
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Failed to generate summary');
      }

      const parsed = this.parseSummaryResponse(content);
      const cost = this.calculateSummaryCost(response.usage?.total_tokens || 0);

      return {
        ...parsed,
        cost,
      };
    } catch (error) {
      console.error('Summary generation failed:', error);

      if (error instanceof Error) {
        if (error.message.includes('api_key')) {
          throw new Error('Invalid API key for summary generation.');
        }
        if (error.message.includes('quota')) {
          throw new Error('API quota exceeded for summary generation.');
        }
      }

      throw new Error('Failed to generate summary. Please try again.');
    }
  }

  async generateKeyInsights(segments: TranscriptSegment[]): Promise<{
    insights: string[];
    concepts: string[];
    questions: string[];
  }> {
    this.validateApiKey();

    const transcript = segments.map(s => s.text).join(' ');
    const wordCount = transcript.split(' ').length;

    if (wordCount < 100) {
      return {
        insights: ['Transcript too short for detailed insights'],
        concepts: [],
        questions: [],
      };
    }

    try {
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant specialized in analyzing university lecture content.
Extract key insights, important concepts, and generate thoughtful questions for review.
Respond in JSON format with three arrays: "insights", "concepts", and "questions".`,
          },
          {
            role: 'user',
            content: `Analyze this lecture transcript and provide:
1. Key insights (3-5 main takeaways)
2. Important concepts (academic terms and ideas)
3. Review questions (3-5 questions for study)

Transcript: ${transcript}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Failed to generate insights');
      }

      try {
        return JSON.parse(content);
      } catch {
        // Fallback parsing if JSON fails
        return this.parseInsightsFromText(content);
      }
    } catch (error) {
      console.error('Insights generation failed:', error);
      return {
        insights: ['Unable to generate insights at this time'],
        concepts: [],
        questions: [],
      };
    }
  }

  private createSummaryPrompt(
    transcript: string,
    options: {
      language: string;
      style: string;
      length: string;
      includeKeyTerms: boolean;
      sessionName: string;
      duration: number;
    }
  ): string {
    const { language, style, length, includeKeyTerms, sessionName, duration } = options;

    let prompt = `Please summarize this university lecture transcript from "${sessionName}" (${Math.round(duration / 60)} minutes).\n\n`;

    // Language instruction
    if (language === 'zh') {
      prompt += 'Please provide the summary in Traditional Chinese.\n';
    } else if (language === 'en') {
      prompt += 'Please provide the summary in English.\n';
    } else {
      prompt += 'Please provide the summary in the same language mix as the original transcript.\n';
    }

    // Style instruction
    switch (style) {
      case 'bullet':
        prompt += 'Format: Use bullet points for easy reading.\n';
        break;
      case 'paragraph':
        prompt += 'Format: Use flowing paragraphs.\n';
        break;
      case 'outline':
        prompt += 'Format: Use a structured outline with headings and subpoints.\n';
        break;
    }

    // Length instruction
    switch (length) {
      case 'short':
        prompt += 'Length: Concise summary (2-3 main points).\n';
        break;
      case 'medium':
        prompt += 'Length: Comprehensive summary (5-7 main points).\n';
        break;
      case 'detailed':
        prompt += 'Length: Detailed summary with examples and context.\n';
        break;
    }

    if (includeKeyTerms) {
      prompt += '\nAlso provide:\n- Key terms and definitions\n- Main concepts covered\n\n';
    }

    prompt += `Transcript:\n${transcript}`;

    return prompt;
  }

  private getSystemPrompt(language: string): string {
    const basePrompt = `You are an expert academic assistant specializing in summarizing university lectures.
You understand the context of Hong Kong higher education and are familiar with both English and Chinese academic terminology.
Create clear, well-structured summaries that help students review and understand the material.`;

    if (language === 'zh') {
      return basePrompt + '\n\nAlways respond in Traditional Chinese, using appropriate academic vocabulary.';
    } else if (language === 'en') {
      return basePrompt + '\n\nAlways respond in clear, academic English.';
    } else {
      return basePrompt + '\n\nMaintain the language balance of the original content (Cantonese/English mix if present).';
    }
  }

  private getMaxTokens(length: string): number {
    switch (length) {
      case 'short':
        return 300;
      case 'medium':
        return 600;
      case 'detailed':
        return 1000;
      default:
        return 600;
    }
  }

  private parseSummaryResponse(content: string): {
    summary: string;
    keyPoints: string[];
    keyTerms: string[];
  } {
    // Try to extract structured information
    const lines = content.split('\n').filter(line => line.trim());

    let summary = '';
    const keyPoints: string[] = [];
    const keyTerms: string[] = [];

    let currentSection = 'summary';

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect section headers
      if (trimmed.toLowerCase().includes('key term') || trimmed.toLowerCase().includes('definitions')) {
        currentSection = 'terms';
        continue;
      }
      if (trimmed.toLowerCase().includes('main point') || trimmed.toLowerCase().includes('key point')) {
        currentSection = 'points';
        continue;
      }

      // Extract content based on current section
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const point = trimmed.substring(1).trim();
        if (currentSection === 'terms') {
          keyTerms.push(point);
        } else {
          keyPoints.push(point);
        }
      } else if (trimmed.match(/^\d+\./)) {
        const point = trimmed.replace(/^\d+\./, '').trim();
        if (currentSection === 'terms') {
          keyTerms.push(point);
        } else {
          keyPoints.push(point);
        }
      } else if (trimmed && currentSection === 'summary') {
        summary += trimmed + ' ';
      }
    }

    // Fallback: if no structure detected, use the entire content as summary
    if (!summary && keyPoints.length === 0) {
      summary = content;
    }

    return {
      summary: summary.trim(),
      keyPoints,
      keyTerms,
    };
  }

  private parseInsightsFromText(content: string): {
    insights: string[];
    concepts: string[];
    questions: string[];
  } {
    const lines = content.split('\n').filter(line => line.trim());

    const insights: string[] = [];
    const concepts: string[] = [];
    const questions: string[] = [];

    let currentSection = 'insights';

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.toLowerCase().includes('concept')) {
        currentSection = 'concepts';
        continue;
      }
      if (trimmed.toLowerCase().includes('question')) {
        currentSection = 'questions';
        continue;
      }

      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.match(/^\d+\./)) {
        const item = trimmed.replace(/^[•\-\d\.]\s*/, '');

        switch (currentSection) {
          case 'insights':
            insights.push(item);
            break;
          case 'concepts':
            concepts.push(item);
            break;
          case 'questions':
            questions.push(item);
            break;
        }
      }
    }

    return { insights, concepts, questions };
  }

  private calculateSummaryCost(totalTokens: number): number {
    // GPT-4o-mini pricing: $0.00015 per 1K input tokens, $0.0006 per 1K output tokens
    // Rough estimate: assume 70% input, 30% output
    const inputTokens = Math.floor(totalTokens * 0.7);
    const outputTokens = Math.floor(totalTokens * 0.3);

    const inputCost = (inputTokens / 1000) * 0.00015;
    const outputCost = (outputTokens / 1000) * 0.0006;

    return Number((inputCost + outputCost).toFixed(6));
  }
}