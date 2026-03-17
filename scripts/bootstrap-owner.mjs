import { createClient } from "@supabase/supabase-js";

function readRequiredEnv(name, fallbacks = []) {
  const value = [name, ...fallbacks]
    .map((key) => process.env[key])
    .find((candidate) => typeof candidate === "string" && candidate.trim().length > 0);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function defaultUsernameForEmail(email) {
  return email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "Owner";
}

async function findUserByEmail(admin, email) {
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw error;
    }

    const match = data.users.find((user) => normalizeEmail(user.email ?? "") === email);
    if (match) {
      return match;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

function isMissingColumn(error, columnName) {
  const message = `${error?.message ?? ""}`.toLowerCase();
  return (
    (error?.code === "42703" || error?.code === "PGRST204") &&
    message.includes(columnName.toLowerCase())
  );
}

async function upsertProfile(admin, payload, ownerRole) {
  const profileWithRole = {
    ...payload,
    app_role: ownerRole,
  };

  const { error: profileErrorWithRole } = await admin.from("profiles").upsert(profileWithRole);
  if (!profileErrorWithRole) {
    return;
  }

  if (!isMissingColumn(profileErrorWithRole, "app_role")) {
    throw profileErrorWithRole;
  }

  const { error: fallbackProfileError } = await admin.from("profiles").upsert(payload);
  if (fallbackProfileError) {
    throw fallbackProfileError;
  }

  console.log("Profile table does not have app_role yet. Stored the owner role in auth metadata instead.");
}

async function main() {
  const supabaseUrl = readRequiredEnv("SUPABASE_URL", ["VITE_SUPABASE_URL"]);
  const serviceRoleKey = readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const ownerEmail = normalizeEmail(readRequiredEnv("OWNER_EMAIL"));
  const ownerPassword = readRequiredEnv("OWNER_PASSWORD");
  const ownerUsername = process.env.OWNER_USERNAME?.trim() || defaultUsernameForEmail(ownerEmail);
  const ownerRole = process.env.OWNER_ROLE?.trim() || "owner";

  if (!["owner", "admin"].includes(ownerRole)) {
    throw new Error(`OWNER_ROLE must be 'owner' or 'admin'. Received '${ownerRole}'.`);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const existingUser = await findUserByEmail(admin, ownerEmail);
  let authUserId = existingUser?.id ?? null;

  if (!existingUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: {
        username: ownerUsername,
        app_role: ownerRole,
      },
    });

    if (error) {
      throw error;
    }

    authUserId = data.user.id;
    console.log(`Created auth user ${ownerEmail}.`);
  } else {
    const { error } = await admin.auth.admin.updateUserById(existingUser.id, {
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: {
        ...(existingUser.user_metadata ?? {}),
        username: ownerUsername,
        app_role: ownerRole,
      },
    });

    if (error) {
      throw error;
    }

    authUserId = existingUser.id;
    console.log(`Updated auth user ${ownerEmail}.`);
  }

  await upsertProfile(admin, {
    id: authUserId,
    username: ownerUsername,
    avatar_id: "blue-spinner",
  }, ownerRole);

  const { error: statsError } = await admin.from("player_stats").upsert({
    user_id: authUserId,
  });

  if (statsError) {
    throw statsError;
  }

  console.log(`Owner bootstrap complete for ${ownerEmail} with role '${ownerRole}'.`);
  console.log("The password is stored only in Supabase Auth, not in the application tables.");
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exitCode = 1;
});
