// supabase/functions/verify-expert-payment/index.ts
//
// Deploy with:
//   supabase functions deploy verify-expert-payment
// (Reuses the PAYSTACK_SECRET_KEY secret already set for verify-payment.)
//
// Verifies a monthly-fee payment directly with Paystack (secret key,
// server-side only), checks the amount paid matches the expert's
// monthly_fee, and only then extends subscription_paid_until by one
// month and flips status to 'active'.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { reference, expertId } = await req.json();

        if (!reference || !expertId) {
            return json({ verified: false, message: "Missing reference or expertId" }, 400);
        }

        const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!paystackSecretKey || !supabaseUrl || !serviceRoleKey) {
            console.error("Missing required environment secrets for verify-expert-payment.");
            return json({ verified: false, message: "Server misconfigured" }, 500);
        }

        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const verifyRes = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            { headers: { Authorization: `Bearer ${paystackSecretKey}` } }
        );
        const verifyData = await verifyRes.json();

        if (!verifyRes.ok || verifyData?.data?.status !== "success") {
            return json({ verified: false, message: "Payment was not successful." });
        }

        const { data: expert, error: expertError } = await supabase
            .from("expert_profiles")
            .select("monthly_fee, subscription_paid_until")
            .eq("id", expertId)
            .single();

        if (expertError || !expert) {
            return json({ verified: false, message: "Expert profile not found." }, 404);
        }

        const paidAmount = verifyData.data.amount / 100;
        const expectedFee = Number(expert.monthly_fee);

        if (Math.abs(paidAmount - expectedFee) > 0.01) {
            console.warn(`Amount mismatch for expert ${expertId}: paid ${paidAmount}, expected ${expectedFee}`);
            return json({ verified: false, message: "Amount paid does not match the monthly fee." });
        }

        const today = new Date();
        const currentPaidUntil = expert.subscription_paid_until ? new Date(expert.subscription_paid_until) : null;
        const base = currentPaidUntil && currentPaidUntil > today ? currentPaidUntil : today;
        const newPaidUntil = new Date(base);
        newPaidUntil.setMonth(newPaidUntil.getMonth() + 1);
        const newPaidUntilStr = newPaidUntil.toISOString().slice(0, 10);

        await supabase
            .from("expert_profiles")
            .update({ status: "active", subscription_paid_until: newPaidUntilStr, updated_at: new Date().toISOString() })
            .eq("id", expertId);

        return json({ verified: true, paid_until: newPaidUntilStr });
    } catch (err) {
        console.error("verify-expert-payment error:", err);
        return json({ verified: false, message: "Unexpected server error." }, 500);
    }
});

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}