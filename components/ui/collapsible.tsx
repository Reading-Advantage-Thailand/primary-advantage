"use client"

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

/**
 * Root collapsible component that controls the open/closed state.
 */
function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

/**
 * Trigger element that toggles the collapsible content when clicked.
 */
function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  )
}

/**
 * Content that is shown or hidden based on the collapsible state.
 */
function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  )
}

/**
 * Collapsible component with trigger and content sub-components for show/hide functionality.
 */
export { Collapsible, CollapsibleTrigger, CollapsibleContent }
