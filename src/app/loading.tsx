// Every app route is a client page that draws its own skeleton, shaped like the
// page, once it mounts. A visible fallback here would show a different loading
// state first and flash spinner → skeleton → content. So the boundary stays
// (navigation commits instantly), but it only announces itself to screen readers.
export default function Loading() {
  return (
    <p role="status" className="sr-only">
      Loading
    </p>
  );
}
