import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ymjsqluhxavptsifjckz.supabase.co";
const supabaseKey = "sb_publishable_IK--d-a345s23phUjVfxCA_xKiUR0Y7";

export const supabase = createClient(supabaseUrl, supabaseKey);