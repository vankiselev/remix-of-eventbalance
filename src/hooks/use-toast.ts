import { toast as sonnerToast } from "sonner";

/**
 * Adapter: translates legacy useToast / toast({ title, description, variant })
 * calls into sonner's API so the entire project uses one toast stack.
 */

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
  action?: React.ReactNode;
  [key: string]: unknown;
}

function toast(opts: ToastOptions) {
  const message = opts.title || "";
  const options: Record<string, unknown> = {};

  if (opts.description) options.description = opts.description;
  if (opts.duration) options.duration = opts.duration;

  if (opts.variant === "destructive") {
    return sonnerToast.error(message, options);
  }

  return sonnerToast(message, options);
}

/** Drop-in replacement — returns { toast, dismiss } like the old hook. */
function useToast() {
  return {
    toast,
    dismiss: (id?: string | number) => {
      if (id !== undefined) {
        sonnerToast.dismiss(id);
      } else {
        sonnerToast.dismiss();
      }
    },
    toasts: [] as never[], // compat: old Toaster iterated this
  };
}

export { useToast, toast };
