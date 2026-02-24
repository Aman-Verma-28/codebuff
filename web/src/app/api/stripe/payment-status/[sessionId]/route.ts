import { stripeServer } from '@codebuff/internal/util/stripe'
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
