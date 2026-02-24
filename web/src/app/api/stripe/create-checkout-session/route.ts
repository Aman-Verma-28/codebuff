import { getPriceIdFromTier } from '@codebuff/billing'
import { SUBSCRIPTION_TIERS } from '@codebuff/common/constants/subscription-plans'
import db from '@codebuff/internal/db'
import * as schema from '@codebuff/internal/db/schema'
import { env } from '@codebuff/internal/env'
import { stripeServer } from '@codebuff/internal/util/stripe'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import type { SubscriptionTierPrice } from '@codebuff/common/constants/subscription-plans'
import type { NextRequest } from 'next/server'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { logger } from '@/util/logger'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Accept either a priceId directly or a tier number
  const { priceId: rawPriceId, tier: rawTier, mode } = body as {
    priceId?: string
    tier?: number
    mode?: 'payment' | 'subscription'
  }

  let priceId = rawPriceId
  const checkoutMode = mode ?? 'subscription'

  // If tier is provided instead of priceId, resolve it
  if (!priceId && rawTier) {
    const tierNum = Number(rawTier)
    if (!(tierNum in SUBSCRIPTION_TIERS)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${Object.keys(SUBSCRIPTION_TIERS).join(', ')}.` },
        { status: 400 },
      )
    }
    priceId = getPriceIdFromTier(tierNum as SubscriptionTierPrice) ?? undefined
  }

  if (!priceId) {
    return NextResponse.json(
      { error: 'A valid priceId or tier is required.' },
      { status: 400 },
    )
  }

  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, userId),
    columns: { stripe_customer_id: true, banned: true },
  })

  if (user?.banned) {
    logger.warn({ userId }, 'Banned user attempted to create checkout session')
    return NextResponse.json(
      { error: 'Your account has been suspended. Please contact support.' },
      { status: 403 },
    )
  }

  if (!user?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'Stripe customer not found.' },
      { status: 400 },
    )
  }

  try {
    const successUrl =
      body.successUrl ??
      `${env.NEXT_PUBLIC_CODEBUFF_APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl =
      body.cancelUrl ??
      `${env.NEXT_PUBLIC_CODEBUFF_APP_URL}/payment/cancel`

    const checkoutSession = await stripeServer.checkout.sessions.create({
      customer: user.stripe_customer_id,
      mode: checkoutMode,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      tax_id_collection: { enabled: true },
      customer_update: { name: 'auto', address: 'auto' },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        type: 'checkout_session',
      },
      ...(checkoutMode === 'subscription'
        ? {
            subscription_data: {
              metadata: { userId },
            },
          }
        : {}),
    })

    if (!checkoutSession.url) {
      logger.error({ userId }, 'Stripe checkout session created without a URL')
      return NextResponse.json(
        { error: 'Could not create checkout session.' },
        { status: 500 },
      )
    }

    logger.info(
      { userId, sessionId: checkoutSession.id, mode: checkoutMode },
      'Created checkout session',
    )

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error: unknown) {
    const message =
      (error as { raw?: { message?: string } })?.raw?.message ||
      'Internal server error creating checkout session.'
    logger.error(
      { error: message, userId },
      'Failed to create checkout session',
    )
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
