import { Client } from "ldapts";

export interface LdapAuthResult {
  success: boolean;
  role: "admin" | "readonly";
  error?: string;
}

export async function authenticateWithLdap(opts: {
  url: string;
  baseDn: string;
  bindDn?: string;
  bindPassword?: string;
  userFilter: string;
  username: string;
  password: string;
  adminGroup?: string;
  readonlyGroup?: string;
}): Promise<LdapAuthResult> {
  const { url, baseDn, bindDn, bindPassword, userFilter, username, password, adminGroup, readonlyGroup } = opts;

  // Escape special chars in username to prevent LDAP injection
  const safeUsername = username.replace(/[*()\\\0]/g, (c) => `\\${c.charCodeAt(0).toString(16).padStart(2, "0")}`);
  const filter = userFilter.replace("{{username}}", safeUsername);

  const client = new Client({ url, connectTimeout: 5000 });

  try {
    // Bind with service account to search for user
    if (bindDn && bindPassword) {
      await client.bind(bindDn, bindPassword);
    }

    // Search for user entry
    const { searchEntries } = await client.search(baseDn, {
      scope: "sub",
      filter,
      attributes: ["dn", "memberOf"],
    });

    if (searchEntries.length === 0) {
      await client.unbind();
      return { success: false, role: "readonly", error: "User not found in directory" };
    }

    const userDn = searchEntries[0].dn;
    const memberOf = searchEntries[0].memberOf;
    const groups: string[] = Array.isArray(memberOf)
      ? (memberOf as string[])
      : memberOf
      ? [memberOf as string]
      : [];

    // Bind as user to verify their password
    await client.bind(userDn, password);
    await client.unbind();

    // Determine role
    let role: "admin" | "readonly" = "admin";

    if (adminGroup || readonlyGroup) {
      const norm = (dn: string) => dn.toLowerCase();
      const inAdmin = adminGroup ? groups.some((g) => norm(g) === norm(adminGroup)) : false;
      const inReadonly = readonlyGroup ? groups.some((g) => norm(g) === norm(readonlyGroup)) : false;

      if (adminGroup && inAdmin) {
        role = "admin";
      } else if (inReadonly) {
        role = "readonly";
      } else if (adminGroup && !inAdmin) {
        return { success: false, role: "readonly", error: "Access denied — account not in an authorized group" };
      }
    }

    return { success: true, role };
  } catch (err) {
    try { await client.unbind(); } catch { /* ignore */ }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("InvalidCredentialsError") || msg.includes("49")) {
      return { success: false, role: "readonly", error: "Invalid credentials" };
    }
    return { success: false, role: "readonly", error: `LDAP error: ${msg}` };
  }
}
