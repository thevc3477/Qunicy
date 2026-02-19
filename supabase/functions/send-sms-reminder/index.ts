import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = "a935a3d7f2130c0fd6e9806122a9a405";
const TWILIO_PHONE_NUMBER = "+16823700628";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sendSms(to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: TWILIO_PHONE_NUMBER,
      To: to,
      Body: body,
    }),
  });

  const data = await res.json();
  return { ok: res.ok, data };
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the active event
    const { data: event } = await supabase
      .from("events")
      .select("id, title, starts_at, venue_name")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!event) {
      return new Response(JSON.stringify({ message: "No active event" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get all RSVPs for this event
    const { data: rsvps } = await supabase
      .from("rsvps")
      .select("user_id")
      .eq("event_id", event.id)
      .eq("status", "going");

    if (!rsvps?.length) {
      return new Response(JSON.stringify({ message: "No RSVPs" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userIds = rsvps.map((r: any) => r.user_id);

    // Get users who have NOT uploaded a record for this event
    const { data: uploads } = await supabase
      .from("vinyl_records")
      .select("user_id")
      .eq("event_id", event.id)
      .in("user_id", userIds);

    const uploadedUserIds = new Set((uploads || []).map((u: any) => u.user_id));
    const needsReminder = userIds.filter((id: string) => !uploadedUserIds.has(id));

    if (!needsReminder.length) {
      return new Response(JSON.stringify({ message: "Everyone has uploaded!", sent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get phone numbers from auth.users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      return new Response(JSON.stringify({ error: "Failed to list users" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userMap = new Map(users.map((u: any) => [u.id, u.phone]));

    // Determine message based on query param
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "upload_reminder";

    const eventDate = new Date(event.starts_at);
    const eventDay = eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    const messages: Record<string, string> = {
      upload_reminder: `Hey! 🎶 Don't forget to share the record you're bringing to ${event.title}. The Vinyl Wall is filling up — upload yours so you don't miss a connection! 👉 Open Quincy to upload`,
      day_before: `Tomorrow's the day! 🔥 ${event.title} at ${event.venue_name}. Make sure your record is on the Vinyl Wall so people can find you before the meetup. 👉 Open Quincy`,
      last_chance: `${event.title} is almost here! 🎵 People are already swiping and matching. Upload your record now or you'll miss out on connections. 👉 Open Quincy`,
    };

    const messageBody = messages[type] || messages.upload_reminder;

    // Send SMS to each user who hasn't uploaded
    let sent = 0;
    const errors: any[] = [];

    for (const userId of needsReminder) {
      const phone = userMap.get(userId);
      if (!phone) continue;

      const result = await sendSms(phone, messageBody);
      if (result.ok) {
        sent++;
      } else {
        errors.push({ userId, error: result.data });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${sent} reminders`,
        sent,
        total_need_reminder: needsReminder.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
