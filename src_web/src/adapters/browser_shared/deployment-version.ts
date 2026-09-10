interface DeploymentVersion {
  readonly version: string;
}

export function versionedPageUrl(
  currentHref: string,
  deployedVersion: string,
): string {
  const url = new URL(currentHref);
  url.searchParams.set("v", deployedVersion);
  return url.href;
}

function isDeploymentVersion(value: unknown): value is DeploymentVersion {
  return (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    typeof value.version === "string" &&
    value.version.length > 0
  );
}

export async function refreshForNewDeployment(): Promise<void> {
  if (!import.meta.env.PROD) return;

  const manifestUrl = new URL(
    "version.json",
    new URL(import.meta.env.BASE_URL, location.origin),
  );
  manifestUrl.searchParams.set("cache", String(Date.now()));

  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (!response.ok) return;

    const deployment: unknown = await response.json();
    if (
      !isDeploymentVersion(deployment) ||
      deployment.version === import.meta.env.VITE_BUILD_VERSION
    ) {
      return;
    }

    const currentUrl = new URL(location.href);
    if (currentUrl.searchParams.get("v") === deployment.version) return;
    location.replace(versionedPageUrl(currentUrl.href, deployment.version));
  } catch {
    // A failed version check must not prevent the currently cached build from running.
  }
}
