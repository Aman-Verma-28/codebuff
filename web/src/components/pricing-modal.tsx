'use client'

import {
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_DISPLAY_NAME,
} from '@codebuff/common/constants/subscription-plans'
import { DEFAULT_FREE_CREDITS_GRANT } from '@codebuff/common/old-constants'
import { env } from '@codebuff/common/env'
import { loadStripe } from '@stripe/stripe-js'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import type { SubscriptionTierPrice } from '@codebuff/common/constants/subscription-plans'
import type { SubscriptionResponse } from '@codebuff/common/types/subscription'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

const FREE_FEATURES = [
  `${DEFAULT_FREE_CREDITS_GRANT} credits/month`,
  'All coding modes',
  'Community support',
  'GitHub integration',
]

const PRO_FEATURES = [
  'Higher weekly usage limits',
  '5-hour sessions',
  'All coding modes',
  'Priority support',
  'Promotion codes accepted',
]

function PricingModalCard({
  title,
  price,
  period,
  features,
  buttonLabel,
  buttonAction,
  isLoading,
  isHighlighted,
  isCurrent,
}: {
  title: string
  price: string
  period: string
  features: string[]
  buttonLabel: string
  buttonAction: () => void
  isLoading: boolean
  isHighlighted: boolean
  isCurrent: boolean
}) {
  return (
    <div
      className={cn(
        'relative rounded-xl p-6 border flex flex-col transition-all duration-300',
        isHighlighted
          ? 'border-acid-green/40 bg-acid-green/[0.06] shadow-[0_0_40px_rgba(0,255,149,0.12)]'
          : 'border-white/10 bg-white/[0.02]',
      )}
    >
      {isHighlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-acid-green px-3 py-0.5 text-xs font-semibold text-black">
            <Sparkles className="h-3 w-3" />
            Recommended
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-3xl font-bold text-white">{price}</span>
          <span className="text-sm text-white/40">{period}</span>
        </div>
      </div>

      <ul className="space-y-2.5 mb-6 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-white/70">
            <Check className="h-4 w-4 text-acid-green shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={buttonAction}
        disabled={isLoading || isCurrent}
        className={cn(
          'w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200',
          isCurrent
            ? 'bg-white/10 text-white/60 border border-white/20 cursor-default'
            : isHighlighted
              ? 'bg-acid-green text-black hover:bg-acid-green/90 shadow-[0_0_30px_rgba(0,255,149,0.2)]'
              : 'bg-white/10 text-white border border-white/20 hover:bg-white/20',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          isCurrent && 'disabled:opacity-100',
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          buttonLabel
        )}
      </button>
    </div>
  )
}

export function PricingModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)

  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ['subscription'],
    queryFn: async () => {
      const res = await fetch('/api/user/subscription')
      if (!res.ok) throw new Error('Failed to fetch subscription')
      return res.json()
    },
    enabled: status === 'authenticated' && open,
    staleTime: 30_000,
  })

  const currentTier = subscriptionData?.hasSubscription
    ? subscriptionData.subscription.tier
    : null

  // Use the middle tier ($200) as the recommended Pro plan
  const proTier = 200 as SubscriptionTierPrice
  const proConfig = SUBSCRIPTION_TIERS[proTier]

  const handleSubscribe = async () => {
    if (status !== 'authenticated') {
      onOpenChange(false)
      router.push(`/login?callbackUrl=${pathname ?? '/pricing'}`)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: proTier }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to start checkout')
      }
      const { sessionId } = await res.json()
      const stripe = await loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      if (!stripe) throw new Error('Stripe failed to load')
      const { error } = await stripe.redirectToCheckout({ sessionId })
      if (error) throw new Error(error.message)
    } catch (err) {
      toast({
        title: 'Error',
        description:
          err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] bg-black/95 border-white/10 p-0 overflow-hidden">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Choose Your Plan
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Upgrade to {SUBSCRIPTION_DISPLAY_NAME} for higher usage limits and
              longer sessions
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
          <PricingModalCard
            title="Free"
            price="$0"
            period="/month"
            features={FREE_FEATURES}
            buttonLabel={currentTier === null ? 'Current Plan' : 'Free Plan'}
            buttonAction={() => {
              onOpenChange(false)
            }}
            isLoading={false}
            isHighlighted={false}
            isCurrent={currentTier === null}
          />

          <PricingModalCard
            title={SUBSCRIPTION_DISPLAY_NAME}
            price={`$${proConfig.monthlyPrice}`}
            period="/month"
            features={PRO_FEATURES}
            buttonLabel={
              currentTier === proTier
                ? 'Current Plan'
                : currentTier !== null
                  ? 'Change Plan'
                  : 'Upgrade'
            }
            buttonAction={handleSubscribe}
            isLoading={isLoading}
            isHighlighted={true}
            isCurrent={currentTier === proTier}
          />
        </div>

        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-white/30">
            Cancel anytime · All plans include a 5-hour session limit ·{' '}
            <button
              onClick={() => {
                onOpenChange(false)
                router.push('/pricing')
              }}
              className="text-acid-green/60 hover:text-acid-green transition-colors underline"
            >
              View all plans
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
