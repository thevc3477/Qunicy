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

  return { ok: res.ok, data: await res.json() };
}

serve(async (req) => {
  try {
    const { user_id, matched_with_name } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user's phone number
    const { data: { user }, error } = await supabase.auth.admin.getUserById(user_id);

    if (error || !user?.phone) {
      return new Response(JSON.stringify({ error: "User not found or no phone" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const name = matched_with_name || "someone";
    const body = `You matched with ${name} on Quincy! 🎉🎶 Say hi before the meetup — open Quincy to start chatting.`;

    const result = await sendSms(user.phone, body);

    return new Response(
      JSON.stringify({ sent: result.ok, data: result.data }),
      { status: result.ok ? 200 : 500, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
