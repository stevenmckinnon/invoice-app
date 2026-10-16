/**
 * The day strip's visual language, shared by the strip, the paper's mini
 * schedule and the legend so they always agree.
 *
 * Flat tints, never hatching: stripes ran through the leg labels and made
 * their contrast vary letter by letter. One rule throughout: outlined is the
 * lighter thing (travel, overtime at 1.5x), filled is the heavier thing
 * (work, overtime at 2x). The inset rings hold 3:1 against the card where
 * there's no label to carry the meaning.
 */
export const TRAVEL_FILL = "bg-primary/12 inset-ring inset-ring-primary";
export const OT_FIRST_FILL = "bg-warning/15 inset-ring inset-ring-warning";
export const OT_AFTER_FILL = "bg-warning";
export const DARK_FILL =
  "border-muted-foreground/50 text-muted-foreground border border-dashed";

/** 6px an hour: at 4 a single hour past the tier was a 4px sliver */
export const OT_PX_PER_HOUR = 6;

/** Share of a day's width the travel sliver takes on a travel + work day */
export const SLIVER = 0.36;
