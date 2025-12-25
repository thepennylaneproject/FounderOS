/**
 * AI Visual Generator API Routes
 *
 * Generate images for email campaigns
 */

import { NextResponse } from 'next/server';
import {
  getVisualGenerator,
  ImageGenerationRequest,
  ImageStyle,
  ImagePurpose,
  AspectRatio,
  IMAGE_TEMPLATES,
} from '@/ai/VisualGenerator';

const visualGenerator = getVisualGenerator();

/**
 * GET /api/ai/visual
 *
 * Get templates or previously generated images
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'templates';
    const userId = searchParams.get('userId');

    switch (action) {
      /**
       * Get available templates
       */
      case 'templates': {
        const purpose = searchParams.get('purpose') as ImagePurpose | null;
        const style = searchParams.get('style') as ImageStyle | null;
        const tags = searchParams.get('tags')?.split(',');

        const templates = visualGenerator.getTemplates({
          purpose: purpose || undefined,
          style: style || undefined,
          tags: tags || undefined,
        });

        return NextResponse.json({ templates });
      }

      /**
       * Get generated image by ID
       */
      case 'image': {
        const imageId = searchParams.get('imageId');
        if (!imageId) {
          return NextResponse.json(
            { error: 'imageId is required' },
            { status: 400 }
          );
        }

        const image = visualGenerator.getImage(imageId);
        if (!image) {
          return NextResponse.json(
            { error: 'Image not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({ image });
      }

      /**
       * Get user's generated images
       */
      case 'history': {
        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required' },
            { status: 400 }
          );
        }

        const images = visualGenerator.getUserImages(userId);
        return NextResponse.json({ images });
      }

      /**
       * Get available styles and purposes
       */
      case 'options': {
        const styles: ImageStyle[] = [
          'photorealistic', 'illustration', 'flat-design', '3d-render',
          'watercolor', 'minimalist', 'vintage', 'abstract', 'corporate', 'hand-drawn'
        ];

        const purposes: ImagePurpose[] = [
          'hero-banner', 'product-showcase', 'social-proof', 'announcement',
          'feature-highlight', 'testimonial-bg', 'cta-background', 'header-image',
          'icon-set', 'pattern-bg'
        ];

        const aspectRatios: { value: AspectRatio; label: string; dimensions: string }[] = [
          { value: '1:1', label: 'Square', dimensions: '1024×1024' },
          { value: '16:9', label: 'Wide Banner', dimensions: '1792×1024' },
          { value: '4:3', label: 'Standard', dimensions: '1024×768' },
          { value: '2:1', label: 'Email Header', dimensions: '1792×896' },
          { value: '3:2', label: 'Product Image', dimensions: '1024×683' },
          { value: '9:16', label: 'Mobile Story', dimensions: '1024×1792' },
        ];

        return NextResponse.json({ styles, purposes, aspectRatios });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Visual Generator GET Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/visual
 *
 * Generate images
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      /**
       * Generate image from description
       */
      case 'generate': {
        const {
          description,
          style,
          purpose,
          aspectRatio,
          useBrandColors,
          brandColors,
          provider,
          quality,
          variantCount,
          mood,
          excludeElements,
        } = body;

        if (!description || !style || !purpose) {
          return NextResponse.json(
            { error: 'description, style, and purpose are required' },
            { status: 400 }
          );
        }

        const imageRequest: ImageGenerationRequest = {
          userId,
          description,
          style,
          purpose,
          aspectRatio: aspectRatio || '2:1',
          useBrandColors,
          brandColors,
          provider,
          quality: quality || 'standard',
          variantCount: variantCount || 1,
          mood,
          excludeElements,
        };

        const images = await visualGenerator.generateImage(imageRequest);

        return NextResponse.json({
          images,
          cost: images.reduce((sum, img) => sum + img.cost, 0),
        });
      }

      /**
       * Generate from template
       */
      case 'from-template': {
        const { templateId, variables, options } = body;

        if (!templateId || !variables) {
          return NextResponse.json(
            { error: 'templateId and variables are required' },
            { status: 400 }
          );
        }

        const images = await visualGenerator.generateFromTemplate(
          userId,
          templateId,
          variables,
          options
        );

        return NextResponse.json({
          images,
          cost: images.reduce((sum, img) => sum + img.cost, 0),
        });
      }

      /**
       * Get image suggestions for an email
       */
      case 'suggest': {
        const { emailSubject, emailBody, emailPurpose } = body;

        if (!emailSubject || !emailBody || !emailPurpose) {
          return NextResponse.json(
            { error: 'emailSubject, emailBody, and emailPurpose are required' },
            { status: 400 }
          );
        }

        const result = await visualGenerator.suggestImages(
          userId,
          emailSubject,
          emailBody,
          emailPurpose
        );

        return NextResponse.json(result);
      }

      /**
       * Optimize image for email
       */
      case 'optimize': {
        const { imageUrl, maxWidth } = body;

        if (!imageUrl) {
          return NextResponse.json(
            { error: 'imageUrl is required' },
            { status: 400 }
          );
        }

        const result = await visualGenerator.optimizeForEmail(imageUrl, maxWidth);

        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Visual Generator POST Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
