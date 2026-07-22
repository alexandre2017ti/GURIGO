import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import * as SeparatorPrimitive from "@radix-ui/react-separator"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { ChevronDown, Check, X, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

// --- BOTÃO ---
export const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-indigo-600 text-white shadow hover:bg-indigo-700",
                destructive: "bg-red-500 text-white hover:bg-red-600",
                outline: "border border-slate-200 bg-transparent hover:bg-slate-100",
                ghost: "hover:bg-slate-100",
                link: "text-indigo-600 underline-offset-4 hover:underline",
            },
            size: { default: "h-9 px-4 py-2", sm: "h-8 px-3 text-xs", lg: "h-10 px-8", icon: "h-9 w-9" },
        },
        defaultVariants: { variant: "default", size: "default" },
    }
)
export const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
})

// --- CARD ---
export const Card = ({ className, ...props }) => <div className={cn("rounded-xl border bg-white shadow-sm", className)} {...props} />
export const CardHeader = ({ className, ...props }) => <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
export const CardTitle = ({ className, ...props }) => <div className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
export const CardContent = ({ className, ...props }) => <div className={cn("p-6 pt-0", className)} {...props} />

// --- INPUT, TEXTAREA, LABEL, CHECKBOX ---
export const Label = React.forwardRef(({ className, ...props }, ref) => <label ref={ref} className={cn("text-sm font-semibold leading-none text-slate-900 peer-disabled:opacity-70", className)} {...props} />)
export const Input = React.forwardRef(({ className, type, ...props }, ref) => <input type={type} className={cn("flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 placeholder:text-slate-400", className)} ref={ref} {...props} />)

// --- DIALOG / MODAL (VERSÃO COMPLETA) ---
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal

export const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
    <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
                className
            )}
            {...props}
        >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity outline-none">
                <X className="h-4 w-4 text-slate-500" />
                <span className="sr-only">Fechar</span>
            </DialogPrimitive.Close>
        </DialogPrimitive.Content>
    </DialogPortal>
))

export const DialogHeader = ({ className, ...props }) => (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)} {...props} />
)

export const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn("text-xl font-bold leading-none tracking-tight text-slate-900", className)}
        {...props}
    />
))

// NOVA EXPORTAÇÃO: Resolve o SyntaxError no Stores.jsx e Employees.jsx
export const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
      ref={ref}
      className={cn("text-sm text-slate-500", className)}
      {...props}
    />
))

export const DialogFooter = ({ className, ...props }) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)

// --- CHECKBOX ---
export const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
        ref={ref}
        style={{ width: '16px', height: '16px' }}
        className={cn("peer shrink-0 rounded-sm border border-slate-300 bg-white shadow-sm transition-all flex items-center justify-center p-0 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600", className)}
        {...props}
    >
        <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
))

// --- RESTO DOS COMPONENTES (Badge, Separator, etc. mantidos conforme original) ---
export const Badge = ({ className, variant, ...props }) => {
    const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors", {
        variants: { variant: { default: "bg-slate-900 text-slate-50", secondary: "bg-slate-100 text-slate-900", success: "bg-emerald-100 text-emerald-700", destructive: "bg-red-100 text-red-700", outline: "text-slate-950" } },
        defaultVariants: { variant: "default" }
    })
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
// --- POPOVER (Para o Calendário Flutuante) ---
export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
    <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
            ref={ref}
            align={align}
            sideOffset={sideOffset}
            className={cn(
                "z-50 w-72 rounded-md border bg-white p-4 text-slate-900 shadow-md outline-none animate-in fade-in-20 zoom-in-95",
                className
            )}
            {...props}
        />
    </PopoverPrimitive.Portal>
))

// --- CALENDAR (Estilizado com as cores do seu sistema) ---
export function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center mb-2",
                caption_label: "text-sm font-bold text-slate-900",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-slate-500 rounded-md w-9 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-indigo-50 hover:text-indigo-600"
                ),
                day_selected:
                    "bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white focus:bg-indigo-600 focus:text-white rounded-md",
                day_today: "bg-slate-100 text-slate-900 rounded-md",
                day_outside: "text-slate-400 opacity-50",
                day_disabled: "text-slate-400 opacity-50",
                day_hidden: "invisible",
                ...classNames,
            }}
            components={{
                IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                IconRight: () => <ChevronRight className="h-4 w-4" />,
            }}
            {...props}
        />
    )
}