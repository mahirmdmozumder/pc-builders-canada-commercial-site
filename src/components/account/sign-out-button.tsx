export function SignOutButton() {
  return (
    <form action="/logout" method="post">
      <button
        type="submit"
        className="rounded-md border border-ink-600 px-3 py-1.5 text-sm text-ink-200 transition-colors hover:text-white"
      >
        Sign out
      </button>
    </form>
  );
}
