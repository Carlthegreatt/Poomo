/**
 * Shared mutable object tracking the direction of the last sidebar navigation.
 * -1 = navigating "backward/up" (new page is higher in the list)
 *  1 = navigating "forward/down" (new page is lower in the list)
 *  0 = unknown / first load
 *
 * PageTransition reads this at mount time to determine which direction to
 * slide in from, creating a spatial trail effect.
 */
export const navDirection = { value: 0 };
