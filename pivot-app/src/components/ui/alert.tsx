import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const alertVariants = cva('relative w-full rounded-xl border px-3 py-2.5 text-sm', {
  variants: {
    variant: {
      default: 'bg-background text-foreground',
      info: 'border-[#cfe2f4] bg-[#eef5fc]',
      warning: 'border-[#f3dba7] bg-[#fff7e6]',
      destructive: 'border-[#f0c8c8] bg-[#fdeeee]',
      success: 'border-[#bfe5d1] bg-[#e9f7f0]',
    },
  },
  defaultVariants: { variant: 'default' },
})

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>>(
  ({ className, variant, ...props }, ref) => <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />,
)
Alert.displayName = 'Alert'

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertDescription }
