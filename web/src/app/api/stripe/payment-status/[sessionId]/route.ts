import db from '@codebuff/internal/db'
import * as schema from '@codebuff/internal/db/schema'
import { stripeServer } from '@codebuff/internal/util/stripe'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import type { NextRequest } from 'next/server'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { logger } from '@/util/logger'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID is required.' },
      { status: 400 },
    )
  }

  try {
    const checkoutSession =
      await stripeServer.checkout.sessions.retrieve(sessionId)

    // Verify ownership: check metadata.userId or match customer to user's stripe_customer_id
    const metadataUserId = checkoutSession.metadata?.userId
    if (metadataUserId && metadataUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 },
      )
    }

    // If no metadata userId, fall back to checking stripe_customer_id
    if (!metadataUserId && checkoutSession.customer) {
      const customerId =
        typeof checkoutSession.customer === 'string'
          ? checkoutSession.customer
          : checkoutSession.customer.id

      const user = await db.query.user.findFirst({
        where: eq(schema.user.id, session.user.id),
        columns: { stripe_customer_id: true },
      })

      if (user?.stripe_customer_id !== customerId) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 },
        )
      }
    }

    return NextResponse.json({
      id: checkoutSession.id,
      status: checkoutSession.status,
      paymentStatus: checkoutSession.payment_status,
      customerEmail: checkoutSession.customer_details?.email ?? null,
      amountTotal: checkoutSession.amount_total,
      currency: checkoutSession.currency,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to retrieve session'
    logger.error(
      { error: message, sessionId },
      'Failed to retrieve checkout session status',
    )
    return NextResponse.json(
      { error: 'Could not retrieve payment status.' },
      { status: 500 },
    )
  }
}
