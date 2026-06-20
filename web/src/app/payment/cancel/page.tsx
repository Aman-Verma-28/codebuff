'use client'

import { XCircle } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'

function PaymentCancelContent() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-4 space-y-4">
          <div className="flex justify-center">
            <XCircle className="h-16 w-16 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Payment Cancelled</h1>
          <p className="text-muted-foreground">
            Your payment was not processed. No charges have been made to your
            account.
          </p>
          <p className="text-sm text-muted-foreground">
            If you have any questions or need help, please contact our support
            team.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pb-8">
          <Link href="/pricing" className="w-full">
            <Button className="w-full" variant="default">
              View Pricing Plans
            </Button>
          </Link>
          <Link href="/" className="w-full">
            <Button className="w-full" variant="outline">
              Return to Home
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function PaymentCancelPage() {
  return (
    <Suspense>
      <PaymentCancelContent />
    </Suspense>
  )
}
