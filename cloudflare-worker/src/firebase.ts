export interface FirebaseEnv {
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
}

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  idToken: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

const base64Url = (input: Uint8Array | string) => {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const privateKeyBytes = (pem: string) => {
  const normalized = pem.replace(/\\n/g, "\n");
  const body = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(body);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

async function getServiceAccessToken(env: FirebaseEnv): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: env.FIREBASE_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsignedJwt = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes(env.FIREBASE_PRIVATE_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedJwt),
  );
  const assertion = `${unsignedJwt}.${base64Url(new Uint8Array(signature))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error("Firebase service authentication failed");

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: value.toString() }
      : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === "object") {
    return { mapValue: { fields: toFirestoreFields(value as Record<string, unknown>) } };
  }
  throw new Error("Unsupported Firestore value");
}

function fromFirestoreValue(value: FirestoreValue): unknown {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  if ("mapValue" in value) return fromFirestoreFields(value.mapValue.fields ?? {});
  return null;
}

function toFirestoreFields(data: Record<string, unknown>): Record<string, FirestoreValue> {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)]));
}

function fromFirestoreFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]));
}

const documentUrl = (env: FirebaseEnv, path: string) =>
  `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;

async function firestoreFetch(
  env: FirebaseEnv,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getServiceAccessToken(env);
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export async function getDocument(
  env: FirebaseEnv,
  path: string,
): Promise<{ data: Record<string, unknown>; updateTime: string } | null> {
  const response = await firestoreFetch(env, documentUrl(env, path));
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Firestore read failed");
  const document = (await response.json()) as FirestoreDocument;
  return {
    data: fromFirestoreFields(document.fields ?? {}),
    updateTime: document.updateTime ?? "",
  };
}

export async function writeDocument(
  env: FirebaseEnv,
  path: string,
  data: Record<string, unknown>,
  updateTime?: string,
): Promise<boolean> {
  const url = new URL(documentUrl(env, path));
  if (updateTime) url.searchParams.set("currentDocument.updateTime", updateTime);
  else url.searchParams.set("currentDocument.exists", "false");

  const response = await firestoreFetch(env, url.toString(), {
    method: "PATCH",
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  if (response.status === 409 || response.status === 412) return false;
  if (!response.ok) throw new Error("Firestore write failed");
  return true;
}

export async function mutateDocument(
  env: FirebaseEnv,
  path: string,
  create: Record<string, unknown>,
  mutate: (data: Record<string, unknown>) => Record<string, unknown>,
): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = await getDocument(env, path);
    const next = mutate(current?.data ?? create);
    const written = await writeDocument(env, path, next, current?.updateTime);
    if (written) return next;
  }
  throw new Error("Concurrent update conflict");
}

export async function createDocument(
  env: FirebaseEnv,
  collection: string,
  id: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  return writeDocument(env, `${collection}/${id}`, data);
}

export async function deleteDocument(env: FirebaseEnv, path: string): Promise<void> {
  const response = await firestoreFetch(env, documentUrl(env, path), { method: "DELETE" });
  if (!response.ok && response.status !== 404) throw new Error("Firestore delete failed");
}

export async function queryDocuments(
  env: FirebaseEnv,
  collectionId: string,
  field: string,
  value: string,
): Promise<string[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
  const response = await firestoreFetch(env, url, {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: "EQUAL",
            value: { stringValue: value },
          },
        },
        limit: 500,
      },
    }),
  });
  if (!response.ok) throw new Error("Firestore query failed");
  const rows = (await response.json()) as { document?: FirestoreDocument }[];
  return rows
    .map((row) => row.document?.name?.split("/documents/")[1])
    .filter((path): path is string => Boolean(path));
}

export async function authenticateRequest(
  request: Request,
  env: FirebaseEnv,
): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const idToken = authorization.slice(7);
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  if (!response.ok) throw new Error("UNAUTHORIZED");
  const payload = (await response.json()) as {
    users?: { localId: string; email?: string; emailVerified?: boolean }[];
  };
  const user = payload.users?.[0];
  if (!user) throw new Error("UNAUTHORIZED");
  return {
    uid: user.localId,
    email: user.email,
    emailVerified: user.emailVerified === true,
    isAnonymous: !user.email,
    idToken,
  };
}

export async function deleteFirebaseAccount(
  env: FirebaseEnv,
  user: AuthenticatedUser,
): Promise<void> {
  const historyPaths = await queryDocuments(env, "dream_history", "uid", user.uid);
  await Promise.all(historyPaths.map((path) => deleteDocument(env, path)));
  await deleteDocument(env, `users/${user.uid}`);

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${env.FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: user.idToken }),
    },
  );
  if (!response.ok) throw new Error("Account deletion failed");
}
