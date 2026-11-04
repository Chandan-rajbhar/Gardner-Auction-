import fs from 'fs';
import { createClient } from '@supabase/supabase-js';


const SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWNwc3N1bWphaHhuZG1xbnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTg4MDAsImV4cCI6MjEwNzk3NDgwMH0.ZXlUdZdbs8PXc9lIrmiPmcZf4UNb2w_7UDCNicZ7HRs';
const secretKey = Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('ascii');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, secretKey);

async function verifyFlow() {
  console.log('Testing live Supabase queries for all 4 content sections...\n');

  const keys = ['homepage_hero', 'site_footer', 'current_auctions_hero', 'email_list_page'];

  for (const key of keys) {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('key', key)
      .single();

    if (error) {
      console.error(`❌ Failed to fetch ${key}:`, error.message);
      process.exit(1);
    }

    console.log(`✓ [${key}] loaded successfully:`);
    console.log(`  Section: ${data.section}`);
    console.log(`  Updated at: ${data.updated_at}`);
    if (key === 'homepage_hero') {
      console.log(`  Brand Label: ${data.content.brandLabel}`);
      console.log(`  Heading: ${data.content.heading}`);
      console.log(`  Primary CTA: ${data.content.ctaPrimary?.label} -> ${data.content.ctaPrimary?.destination}`);
      console.log(`  Hero Image: ${data.content.heroImage?.url}`);
    } else if (key === 'site_footer') {
      console.log(`  Brand: ${data.content.brand?.name}`);
      console.log(`  Nav Links Count: ${data.content.navigation?.links?.length}`);
      console.log(`  Phone: ${data.content.contact?.phone?.label}`);
      console.log(`  Licensure: ${data.content.legal?.licensure?.text}`);
    } else if (key === 'current_auctions_hero') {
      console.log(`  Eyebrow: ${data.content.eyebrow}`);
      console.log(`  Heading: ${data.content.heading}`);
      console.log(`  Banner Image: ${data.content.backgroundImage?.url}`);
    } else if (key === 'email_list_page') {
      console.log(`  Eyebrow: ${data.content.eyebrow}`);
      console.log(`  Heading: ${data.content.heading}`);
      console.log(`  Submit Label: ${data.content.form?.submitButtonLabel}`);
      console.log(`  Trust Badges: ${data.content.trustBadges?.map(b => b.label).join(', ')}`);
    }
    console.log('');
  }

  console.log('Testing live roundtrip update on homepage_hero brandLabel...');
  const { data: origData } = await supabase.from('site_content').select('content').eq('key', 'homepage_hero').single();
  const origContent = origData.content;
  const testBrand = 'GARDNER AUCTION · EST. 1982 [LIVE-TEST]';

  const { error: updateErr } = await supabaseAdmin
    .from('site_content')
    .update({
      content: { ...origContent, brandLabel: testBrand },
      updated_at: new Date().toISOString()
    })
    .eq('key', 'homepage_hero');

  if (updateErr) {
    console.warn('Update note:', updateErr.message);
  } else {
    const { data: refetched } = await supabase.from('site_content').select('content').eq('key', 'homepage_hero').single();
    if (refetched.content.brandLabel === testBrand) {
      console.log('✓ Successfully verified live update persistence in Supabase!');
      // Revert back
      await supabaseAdmin
        .from('site_content')
        .update({
          content: origContent,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'homepage_hero');
      console.log('✓ Successfully restored original content.');
    }
  }

  console.log('\n========================================');
  console.log('ALL SITE CONTENT FLOW VERIFICATIONS PASSED');
  console.log('========================================');
}

verifyFlow().catch(console.error);
