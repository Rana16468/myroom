export function loginRedirectHref(redirect: string) {
  return `/login?redirect=${encodeURIComponent(redirect)}`;
}

export function safePostLoginRedirect(redirect: string | null) {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//") || redirect.includes("\\")) {
    return null;
  }

  return redirect;
}
