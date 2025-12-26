/**
 * AI Copywriter API Routes
 *
 * Generate email subject lines, body content, and CTAs
 */

import { NextResponse } from 'next/server';
import {
  getCopywriter,
  SubjectLineRequest,
  EmailBodyRequest,
  CTARequest,
} from '@/ai/Copywriter';

const copywriter = getCopywriter();

/**
 * POST /api/ai/copywriter
 *
 * Generate copy based on action type
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
       * Generate subject line variants
       */
      case 'subject-lines': {
        const {
          emailPurpose,
          productOrService,
          targetAction,
          recipientName,
          companyName,
          customVariables,
          variantCount,
          maxLength,
          includeEmoji,
          urgencyLevel,
          toneOverride,
        } = body;

        if (!emailPurpose) {
          return NextResponse.json(
            { error: 'emailPurpose is required' },
            { status: 400 }
          );
        }

        const subjectRequest: SubjectLineRequest = {
          userId,
          emailPurpose,
          productOrService,
          targetAction,
          recipientName,
          companyName,
          customVariables,
          variantCount,
          maxLength,
          includeEmoji,
          urgencyLevel,
          toneOverride,
        };

        const variants = await copywriter.generateSubjectLines(subjectRequest);

        return NextResponse.json({ variants });
      }

      /**
       * Generate email body
       */
      case 'email-body': {
        const {
          subjectLine,
          emailPurpose,
          keyPoints,
          callToAction,
          recipientName,
          recipientContext,
          companyName,
          customVariables,
          format,
          lengthPreference,
          includePSLine,
          toneOverride,
        } = body;

        if (!subjectLine || !emailPurpose || !keyPoints || !callToAction) {
          return NextResponse.json(
            { error: 'subjectLine, emailPurpose, keyPoints, and callToAction are required' },
            { status: 400 }
          );
        }

        const emailRequest: EmailBodyRequest = {
          userId,
          subjectLine,
          emailPurpose,
          keyPoints,
          callToAction,
          recipientName,
          recipientContext,
          companyName,
          customVariables,
          format: format || 'simple-html',
          lengthPreference: lengthPreference || 'medium',
          includePSLine,
          toneOverride,
        };

        const email = await copywriter.generateEmailBody(emailRequest);

        return NextResponse.json({ email });
      }

      /**
       * Generate CTA variants
       */
      case 'ctas': {
        const { context, targetAction, buttonOrLink, variantCount } = body;

        if (!context || !targetAction) {
          return NextResponse.json(
            { error: 'context and targetAction are required' },
            { status: 400 }
          );
        }

        const ctaRequest: CTARequest = {
          userId,
          context,
          targetAction,
          buttonOrLink: buttonOrLink || 'both',
          variantCount,
        };

        const variants = await copywriter.generateCTAs(ctaRequest);

        return NextResponse.json({ variants });
      }

      /**
       * Improve existing copy
       */
      case 'improve': {
        const { text, goal } = body;

        if (!text || !goal) {
          return NextResponse.json(
            { error: 'text and goal are required' },
            { status: 400 }
          );
        }

        const validGoals = ['clarity', 'engagement', 'persuasion', 'brevity', 'personalization'];
        if (!validGoals.includes(goal)) {
          return NextResponse.json(
            { error: `goal must be one of: ${validGoals.join(', ')}` },
            { status: 400 }
          );
        }

        const result = await copywriter.improveCopy(userId, text, goal);

        return NextResponse.json(result);
      }

      /**
       * Analyze copy effectiveness
       */
      case 'analyze': {
        const { text, type } = body;

        if (!text || !type) {
          return NextResponse.json(
            { error: 'text and type are required' },
            { status: 400 }
          );
        }

        const validTypes = ['subject', 'body', 'cta'];
        if (!validTypes.includes(type)) {
          return NextResponse.json(
            { error: `type must be one of: ${validTypes.join(', ')}` },
            { status: 400 }
          );
        }

        const analysis = await copywriter.analyzeCopy(userId, text, type);

        return NextResponse.json(analysis);
      }

      /**
       * Generate complete email (subject + body)
       */
      case 'complete-email': {
        const {
          emailPurpose,
          productOrService,
          keyPoints,
          targetAction,
          recipientName,
          companyName,
          format,
          lengthPreference,
        } = body;

        if (!emailPurpose || !keyPoints || !targetAction) {
          return NextResponse.json(
            { error: 'emailPurpose, keyPoints, and targetAction are required' },
            { status: 400 }
          );
        }

        // Generate subject lines first
        const subjectVariants = await copywriter.generateSubjectLines({
          userId,
          emailPurpose,
          productOrService,
          targetAction,
          recipientName,
          companyName,
          variantCount: 3,
        });

        // Generate email body using top subject
        const email = await copywriter.generateEmailBody({
          userId,
          subjectLine: subjectVariants[0].text,
          emailPurpose,
          keyPoints,
          callToAction: targetAction,
          recipientName,
          companyName,
          format: format || 'simple-html',
          lengthPreference: lengthPreference || 'medium',
          includePSLine: true,
        });

        // Generate CTA variants
        const ctas = await copywriter.generateCTAs({
          userId,
          context: keyPoints.join('. '),
          targetAction,
          buttonOrLink: 'both',
          variantCount: 3,
        });

        return NextResponse.json({
          subjectVariants,
          email,
          ctaVariants: ctas,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Copywriter Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
