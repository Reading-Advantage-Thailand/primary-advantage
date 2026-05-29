import * as React from "react"

// @see https://usehooks.com/useLockBodyScroll.
/**
 * Hook that locks body scroll by setting overflow hidden and restoring on unmount.
 */
export function useLockBody() {
    React.useLayoutEffect((): (() => void) => {
        const originalStyle: string = window.getComputedStyle(
            document.body
        ).overflow
        document.body.style.overflow = "hidden"
        return () => (document.body.style.overflow = originalStyle)
    }, [])
}