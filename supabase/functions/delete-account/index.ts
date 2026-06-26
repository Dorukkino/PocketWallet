import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { getRequiredEnv, MissingEnvError } from '../_shared/env.ts';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status,
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  try {
    const supabaseUrl = getRequiredEnv('SUPABASE_URL');
    const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(401, { error: 'Missing authorization token.' });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    const userId = userData.user?.id;

    if (userError || !userId) {
      return jsonResponse(401, { error: 'Invalid authorization token.' });
    }

    const deleteResults = await Promise.all([
      adminClient.from('expenses').delete().eq('user_id', userId),
      adminClient.from('expense_categories').delete().eq('user_id', userId),
      adminClient.from('user_settings').delete().eq('user_id', userId),
      adminClient.from('users').delete().eq('id', userId),
    ]);
    const tableDeleteError = deleteResults.find((result) => result.error)?.error;

    if (tableDeleteError) {
      return jsonResponse(500, { error: 'User data could not be deleted.' });
    }

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      return jsonResponse(500, { error: 'Auth user could not be deleted.' });
    }

    return jsonResponse(200, { deleted: true });
  } catch (error) {
    if (error instanceof MissingEnvError) {
      return jsonResponse(500, { error: 'Supabase function environment is not configured.' });
    }

    throw error;
  }
});
