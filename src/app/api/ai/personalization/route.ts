/**
 * AI Personalization Engine API Routes
 *
 * Personalize email content with merge tags, dynamic blocks, and AI
 */

import { NextResponse } from 'next/server';
import {
  getPersonalizationEngine,
  ContactData,
  ContentRule,
  STANDARD_MERGE_TAGS,
} from '@/ai/PersonalizationEngine';

const engine = getPersonalizationEngine();

/**
 * GET /api/ai/personalization
 *
 * Get merge tags, dynamic blocks, and configuration
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'merge-tags';

    switch (action) {
      /**
       * Get available merge tags
       */
      case 'merge-tags': {
        const customFields = searchParams.get('customFields')?.split(',');
        const tags = engine.getAvailableMergeTags(customFields);

        // Group by category
        const grouped = tags.reduce((acc, tag) => {
          if (!acc[tag.category]) acc[tag.category] = [];
          acc[tag.category].push(tag);
          return acc;
        }, {} as Record<string, typeof tags>);

        return NextResponse.json({ tags, grouped });
      }

      /**
       * Get all dynamic blocks
       */
      case 'dynamic-blocks': {
        const blocks = engine.getDynamicBlocks();
        return NextResponse.json({ blocks });
      }

      /**
       * Get a specific dynamic block
       */
      case 'dynamic-block': {
        const blockId = searchParams.get('blockId');
        if (!blockId) {
          return NextResponse.json(
            { error: 'blockId is required' },
            { status: 400 }
          );
        }

        const block = engine.getDynamicBlock(blockId);
        if (!block) {
          return NextResponse.json(
            { error: 'Block not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({ block });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Personalization GET Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/personalization
 *
 * Personalize content, create blocks, get suggestions
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId } = body;

    switch (action) {
      /**
       * Personalize content for a contact
       */
      case 'personalize': {
        const { content, contact, dynamicBlockIds } = body as {
          content: string;
          contact: ContactData;
          dynamicBlockIds?: string[];
        };

        if (!content || !contact) {
          return NextResponse.json(
            { error: 'content and contact are required' },
            { status: 400 }
          );
        }

        const result = await engine.personalizeContent(content, contact, dynamicBlockIds);

        return NextResponse.json(result);
      }

      /**
       * Batch personalize for multiple contacts
       */
      case 'batch-personalize': {
        const { content, contacts, dynamicBlockIds } = body as {
          content: string;
          contacts: ContactData[];
          dynamicBlockIds?: string[];
        };

        if (!content || !contacts || !Array.isArray(contacts)) {
          return NextResponse.json(
            { error: 'content and contacts array are required' },
            { status: 400 }
          );
        }

        const results = await engine.batchPersonalize(content, contacts, dynamicBlockIds);

        // Convert Map to object for JSON
        const resultsObject: Record<string, any> = {};
        results.forEach((value, key) => {
          resultsObject[key] = value;
        });

        return NextResponse.json({ results: resultsObject });
      }

      /**
       * Get AI personalization suggestions
       */
      case 'suggest': {
        const { content, availableFields } = body as {
          content: string;
          availableFields: string[];
        };

        if (!content) {
          return NextResponse.json(
            { error: 'content is required' },
            { status: 400 }
          );
        }

        const fields = availableFields || STANDARD_MERGE_TAGS.map(t => t.tag.replace(/[{}]/g, ''));
        const suggestions = await engine.getSuggestions(content, fields);

        return NextResponse.json({ suggestions });
      }

      /**
       * Generate AI-personalized content
       */
      case 'ai-personalize': {
        const { content, contact, intensity } = body as {
          content: string;
          contact: ContactData;
          intensity: 'subtle' | 'moderate' | 'aggressive';
        };

        if (!content || !contact) {
          return NextResponse.json(
            { error: 'content and contact are required' },
            { status: 400 }
          );
        }

        const result = await engine.generatePersonalizedContent(
          content,
          contact,
          intensity || 'moderate'
        );

        return NextResponse.json(result);
      }

      /**
       * Create a dynamic content block
       */
      case 'create-block': {
        const { name, rules, defaultContent, description } = body as {
          name: string;
          rules: ContentRule[];
          defaultContent: string;
          description?: string;
        };

        if (!name || !rules || !defaultContent) {
          return NextResponse.json(
            { error: 'name, rules, and defaultContent are required' },
            { status: 400 }
          );
        }

        const block = engine.createDynamicBlock(name, rules, defaultContent, description);

        return NextResponse.json({ block });
      }

      /**
       * Preview dynamic block for a contact
       */
      case 'preview-block': {
        const { blockId, contact } = body as {
          blockId: string;
          contact: ContactData;
        };

        if (!blockId || !contact) {
          return NextResponse.json(
            { error: 'blockId and contact are required' },
            { status: 400 }
          );
        }

        const content = engine.previewDynamicBlock(blockId, contact);

        return NextResponse.json({ content });
      }

      /**
       * Validate merge tags in content
       */
      case 'validate': {
        const { content, customFields } = body as {
          content: string;
          customFields?: string[];
        };

        if (!content) {
          return NextResponse.json(
            { error: 'content is required' },
            { status: 400 }
          );
        }

        const availableTags = engine.getAvailableMergeTags(customFields);
        const validation = engine.validateMergeTags(content, availableTags);

        return NextResponse.json(validation);
      }

      /**
       * Generate smart fallbacks for missing fields
       */
      case 'smart-fallbacks': {
        const { content, contact } = body as {
          content: string;
          contact: ContactData;
        };

        if (!content || !contact) {
          return NextResponse.json(
            { error: 'content and contact are required' },
            { status: 400 }
          );
        }

        const fallbacks = await engine.generateSmartFallbacks(content, contact);

        return NextResponse.json({ fallbacks });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Personalization POST Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai/personalization
 *
 * Update dynamic blocks
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { blockId, updates } = body;

    if (!blockId) {
      return NextResponse.json(
        { error: 'blockId is required' },
        { status: 400 }
      );
    }

    const block = engine.updateDynamicBlock(blockId, updates);

    if (!block) {
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ block });
  } catch (error: any) {
    console.error('Personalization PUT Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/personalization
 *
 * Delete dynamic blocks
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get('blockId');

    if (!blockId) {
      return NextResponse.json(
        { error: 'blockId is required' },
        { status: 400 }
      );
    }

    const deleted = engine.deleteDynamicBlock(blockId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Personalization DELETE Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
