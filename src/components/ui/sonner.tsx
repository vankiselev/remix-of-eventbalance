import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="eb-toaster group"
      position="top-center"
      expand={false}
      visibleToasts={3}
      duration={4000}
      gap={8}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.eb-toaster]:bg-background/95 group-[.eb-toaster]:text-foreground group-[.eb-toaster]:border-border/60 group-[.eb-toaster]:shadow-[0_4px_24px_-4px_hsl(var(--foreground)/0.08)] group-[.eb-toaster]:rounded-2xl group-[.eb-toaster]:backdrop-blur-sm group-[.eb-toaster]:px-4 group-[.eb-toaster]:py-3 group-[.eb-toaster]:max-w-[calc(100vw-2rem)] group-[.eb-toaster]:w-full group-[.eb-toaster]:break-words group-[.eb-toaster]:whitespace-normal",
          title: "group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:leading-tight",
          description: "group-[.toast]:text-[13px] group-[.toast]:text-muted-foreground group-[.toast]:leading-snug group-[.toast]:break-words group-[.toast]:whitespace-normal",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-xl group-[.toast]:text-xs group-[.toast]:h-8 group-[.toast]:px-3",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-xl group-[.toast]:text-xs group-[.toast]:h-8 group-[.toast]:px-3",
          closeButton:
            "group-[.toast]:!static group-[.toast]:!transform-none group-[.toast]:shrink-0 group-[.toast]:h-9 group-[.toast]:w-9 group-[.toast]:rounded-full group-[.toast]:border group-[.toast]:border-border/40 group-[.toast]:bg-background/80 group-[.toast]:text-foreground/60 group-[.toast]:hover:bg-accent group-[.toast]:hover:text-foreground group-[.toast]:hover:border-border group-[.toast]:transition-all group-[.toast]:active:scale-95",
          success:
            "group-[.eb-toaster]:border-[hsl(var(--success)/0.3)] group-[.eb-toaster]:bg-[hsl(var(--success)/0.08)] group-[.eb-toaster]:text-foreground",
          error:
            "group-[.eb-toaster]:border-destructive/30 group-[.eb-toaster]:bg-destructive/10 group-[.eb-toaster]:text-foreground",
          warning:
            "group-[.eb-toaster]:border-[hsl(var(--warning)/0.3)] group-[.eb-toaster]:bg-[hsl(var(--warning)/0.08)] group-[.eb-toaster]:text-foreground",
          info:
            "group-[.eb-toaster]:border-[hsl(var(--info)/0.3)] group-[.eb-toaster]:bg-[hsl(var(--info)/0.08)] group-[.eb-toaster]:text-foreground",
        },
      }}
      style={
        {
          "--normal-bg": "hsl(var(--background) / 0.95)",
          "--normal-border": "hsl(var(--border) / 0.6)",
          "--normal-text": "hsl(var(--foreground))",
        } as React.CSSProperties
      }
      offset="max(80px, calc(env(safe-area-inset-top) + 64px))"
      {...props}
    />
  )
}

export { Toaster, toast }
