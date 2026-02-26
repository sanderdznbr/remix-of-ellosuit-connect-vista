import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-center"
      toastOptions={{
        style: {
          background: 'rgba(20, 20, 28, 0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          borderRadius: '12px',
          fontSize: '13px',
        },
        classNames: {
          toast: "group toast",
          description: "!text-[rgba(255,255,255,0.45)]",
          actionButton: "!bg-[#8B5CF6] !text-white",
          cancelButton: "!bg-[rgba(255,255,255,0.08)] !text-[rgba(255,255,255,0.5)]",
          success: "!border-[rgba(139,92,246,0.3)]",
          error: "!border-[rgba(239,68,68,0.3)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
