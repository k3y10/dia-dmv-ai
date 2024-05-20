import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'
import Link from 'next/link'

export function EmptyScreen() {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="flex flex-col gap-2 rounded-lg border bg-background p-8">
        <h1 className="text-lg font-semibold">
          Welcome to DIA-DMV-AI. Your Personal Health and DMV Assistant
        </h1>
        <p className="leading-normal text-muted-foreground">
          Experience the future of DIAbetes management and DMV record updates with DIA-DMV-AI, your personal health and driving assistant powered by AI.
        </p>
        <p className="leading-normal text-muted-foreground">
          DIA-DMV-AI offers seamless integration of health data management, doctor communication, and DMV record updates. Sign up below to get early access upon its release.
        </p>
        <div className="flex items-center mt-4 bg-primary text-black px-4 py-2 rounded-md hover:bg-primary-dark transition-colors duration-300">
          <Link href="https://dia-dmv-ai/signup">
              Sign Up for Early Access
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Stay updated and be among the first to explore DIA-DMV-AI's capabilities.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Learn more about DIA-DMV-AI on{' '}
          <ExternalLink href="https://DIA-dmv-ai.ai">DIA-dmv-ai.ai</ExternalLink>.
        </p>
      </div>
    </div>
  )
}
