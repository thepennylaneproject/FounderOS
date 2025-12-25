/**
 * Brand Voice API Routes
 *
 * Manage brand voice profiles and analysis
 */

import { NextResponse } from 'next/server';
import {
  getBrandVoiceService,
  WizardStep1Data,
  WizardStep2Data,
  WizardStep3Data,
  DEFAULT_VOICE_ATTRIBUTES,
  INDUSTRY_PRESETS,
} from '@/ai/BrandVoice';

const brandVoice = getBrandVoiceService();

/**
 * GET /api/ai/brand-voice
 *
 * Get user's brand voice profiles
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const profileId = searchParams.get('profileId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get specific profile
    if (profileId) {
      const profiles = brandVoice.getUserProfiles(userId);
      const profile = profiles.find(p => p.id === profileId);

      if (!profile) {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ profile });
    }

    // Get all profiles
    const profiles = brandVoice.getUserProfiles(userId);
    const activeProfile = brandVoice.getActiveProfile(userId);

    return NextResponse.json({
      profiles,
      activeProfileId: activeProfile?.id,
    });
  } catch (error: any) {
    console.error('Get Brand Voice Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/brand-voice
 *
 * Create or manage brand voice profiles
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
       * Analyze content samples to suggest voice attributes
       */
      case 'analyze': {
        const { samples } = body;

        if (!samples || !Array.isArray(samples)) {
          return NextResponse.json(
            { error: 'samples array is required' },
            { status: 400 }
          );
        }

        const analysis = await brandVoice.analyzeContent(samples);

        return NextResponse.json({
          suggestedAttributes: analysis.suggestedAttributes,
          detectedPatterns: analysis.detectedPatterns,
          confidence: analysis.confidence,
        });
      }

      /**
       * Generate voice guidelines from wizard data
       */
      case 'generate-guidelines': {
        const { step1, step2, step3 } = body as {
          step1: WizardStep1Data;
          step2: WizardStep2Data;
          step3: WizardStep3Data;
        };

        if (!step1 || !step2 || !step3) {
          return NextResponse.json(
            { error: 'step1, step2, and step3 data required' },
            { status: 400 }
          );
        }

        const result = await brandVoice.generateGuidelines(
          step1,
          step2.attributes,
          step3.exampleContent,
          step3.antiExamples
        );

        return NextResponse.json({
          guidelines: result.guidelines,
          toneKeywords: result.toneKeywords,
          avoidKeywords: result.avoidKeywords,
        });
      }

      /**
       * Create complete profile from wizard
       */
      case 'create': {
        const { step1, step2, step3, step4, organizationId } = body;

        if (!step1 || !step2 || !step3 || !step4) {
          return NextResponse.json(
            { error: 'All wizard steps (step1-4) are required' },
            { status: 400 }
          );
        }

        const profile = await brandVoice.createProfile(
          userId,
          step1,
          step2,
          step3,
          step4,
          organizationId
        );

        return NextResponse.json({ profile });
      }

      /**
       * Get industry preset
       */
      case 'get-preset': {
        const { industry } = body;

        const preset = INDUSTRY_PRESETS[industry] || {};
        const attributes = { ...DEFAULT_VOICE_ATTRIBUTES, ...preset };

        return NextResponse.json({ attributes });
      }

      /**
       * Set active profile
       */
      case 'set-active': {
        const { profileId } = body;

        if (!profileId) {
          return NextResponse.json(
            { error: 'profileId is required' },
            { status: 400 }
          );
        }

        await brandVoice.setActiveProfile(userId, profileId);

        return NextResponse.json({ success: true });
      }

      /**
       * Generate voice prompt for content generation
       */
      case 'get-voice-prompt': {
        const profile = brandVoice.getActiveProfile(userId);

        if (!profile) {
          return NextResponse.json(
            { error: 'No active brand voice profile' },
            { status: 404 }
          );
        }

        const voicePrompt = brandVoice.generateVoicePrompt(profile);

        return NextResponse.json({ voicePrompt, profile });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Brand Voice Action Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai/brand-voice
 *
 * Update an existing profile
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { profileId, updates } = body;

    if (!profileId) {
      return NextResponse.json(
        { error: 'profileId is required' },
        { status: 400 }
      );
    }

    const updated = await brandVoice.updateProfile(profileId, updates);

    if (!updated) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile: updated });
  } catch (error: any) {
    console.error('Update Brand Voice Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/brand-voice
 *
 * Delete a profile
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json(
        { error: 'profileId is required' },
        { status: 400 }
      );
    }

    const deleted = await brandVoice.deleteProfile(profileId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Brand Voice Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
