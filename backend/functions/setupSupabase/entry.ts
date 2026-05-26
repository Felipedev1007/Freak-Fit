import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Missing Supabase credentials' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create tables
    const { error: userProfileError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_profile (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_email TEXT NOT NULL UNIQUE,
          nickname TEXT,
          full_name TEXT,
          age INT,
          weight FLOAT,
          height FLOAT,
          sex TEXT,
          biotype TEXT,
          experience_level TEXT,
          main_goal TEXT,
          weekly_frequency INT,
          training_days TEXT[],
          session_duration INT,
          training_location TEXT,
          available_equipment TEXT[],
          food_restrictions TEXT[],
          physical_limitations TEXT[],
          onboarding_completed BOOLEAN DEFAULT false,
          primary_color TEXT DEFAULT '#00D4AA',
          theme TEXT DEFAULT 'dark',
          avatar_url TEXT,
          imc FLOAT,
          tdee FLOAT,
          daily_calories FLOAT,
          protein_grams FLOAT,
          carbs_grams FLOAT,
          fat_grams FLOAT,
          meal_notifications BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    });

    const { error: dietPlanError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS diet_plan (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_email TEXT NOT NULL,
          week_plan JSONB,
          daily_plan JSONB,
          total_calories FLOAT,
          protein_grams FLOAT,
          carbs_grams FLOAT,
          fat_grams FLOAT,
          health_tips TEXT[],
          generated_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    });

    const { error: workoutPlanError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS workout_plan (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_email TEXT NOT NULL,
          week_plan JSONB,
          generated_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    });

    const { error: mealAnalysisError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS meal_analysis (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_email TEXT NOT NULL,
          image_url TEXT,
          identified_foods JSONB,
          total_calories FLOAT,
          protein_grams FLOAT,
          carbs_grams FLOAT,
          fat_grams FLOAT,
          ai_explanation TEXT,
          analyzed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    });

    const { error: progressLogError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS progress_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_email TEXT NOT NULL,
          log_date DATE NOT NULL,
          weight FLOAT,
          waist FLOAT,
          chest FLOAT,
          hips FLOAT,
          calories_consumed FLOAT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    });

    return Response.json({
      message: 'Supabase tables setup complete',
      errors: {
        userProfile: userProfileError?.message,
        dietPlan: dietPlanError?.message,
        workoutPlan: workoutPlanError?.message,
        mealAnalysis: mealAnalysisError?.message,
        progressLog: progressLogError?.message
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});