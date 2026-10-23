import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWNwc3N1bWphaHhuZG1xbnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTg4MDAsImV4cCI6MjEwNzk3NDgwMH0.ZXlUdZdbs8PXc9lIrmiPmcZf4UNb2w_7UDCNicZ7HRs';
const secretKey = Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('ascii');

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, secretKey);

async function runSiteContentTests() {
  console.log('============================================================');
  console.log('Gardner Auction — Site Content Persistence & Schema Tests');
  console.log('============================================================\n');

  // Test 1: Public Read Access via Anon Client
  console.log('[Test 1] Testing Public Anon Access to site_content:');
  const { data: publicData, error: publicErr } = await anonClient
    .from('site_content')
    .select('*');

  if (publicErr) {
    throw new Error('FAIL: Anonymous public read access failed: ' + publicErr.message);
  }
  if (!publicData || publicData.length < 4) {
    throw new Error(`FAIL: Expected at least 4 records, found ${publicData?.length}`);
  }
  console.log(`  ✓ PASS: Successfully fetched ${publicData.length} records via public anon client.`);

  // Test 2: Verify Homepage Hero Record & Content Fields
  console.log('\n[Test 2] Verifying Homepage Hero Record Integrity:');
  const heroRecord = publicData.find(item => item.key === 'homepage_hero');
  if (!heroRecord) throw new Error('FAIL: homepage_hero record not found');
  if (heroRecord.section !== 'homepage') throw new Error(`FAIL: Unexpected section "${heroRecord.section}"`);

  const hero = heroRecord.content;
  if (hero.brandLabel !== 'GARDNER AUCTION · EST. 1982') {
    throw new Error(`FAIL: brandLabel mismatch: ${hero.brandLabel}`);
  }
  if (!hero.heading.includes('Extraordinary Finds') || !hero.heading.includes('Timeless Historical Value')) {
    throw new Error(`FAIL: heading mismatch: ${hero.heading}`);
  }
  if (!hero.description || !hero.description.includes('Pennsylvania\'s premier certified auction institution')) {
    throw new Error(`FAIL: description mismatch: ${hero.description}`);
  }
  if (hero.ctaPrimary?.label !== 'EXPLORE LIVE AUCTIONS' || hero.ctaPrimary?.destination !== '#auctions') {
    throw new Error(`FAIL: ctaPrimary mismatch: ${JSON.stringify(hero.ctaPrimary)}`);
  }
  if (hero.ctaSecondary?.label !== 'BROWSE ALL 1,420 LOTS' || hero.ctaSecondary?.destination !== '#auctions') {
    throw new Error(`FAIL: ctaSecondary mismatch: ${JSON.stringify(hero.ctaSecondary)}`);
  }
  if (!Array.isArray(hero.trustIndicators) || hero.trustIndicators.length !== 2) {
    throw new Error(`FAIL: trustIndicators should have 2 items: ${JSON.stringify(hero.trustIndicators)}`);
  }
  const integritySeal = hero.trustIndicators.find(t => t.title.includes('42 YEARS INTEGRITY'));
  const guaranteeSeal = hero.trustIndicators.find(t => t.title.includes('TITLE GUARANTEE'));
  if (!integritySeal || !guaranteeSeal) {
    throw new Error('FAIL: Trust seals missing expected titles');
  }
  if (hero.heroImage?.url !== '/images/hero_auction_coins.jpg') {
    throw new Error(`FAIL: heroImage url mismatch: ${hero.heroImage?.url}`);
  }
  console.log('  ✓ PASS: Brand label: "' + hero.brandLabel + '"');
  console.log('  ✓ PASS: Heading: "' + hero.heading + '"');
  console.log('  ✓ PASS: CTA 1: "' + hero.ctaPrimary.label + '" -> ' + hero.ctaPrimary.destination);
  console.log('  ✓ PASS: CTA 2: "' + hero.ctaSecondary.label + '" -> ' + hero.ctaSecondary.destination);
  console.log('  ✓ PASS: Trust indicator 1: "' + integritySeal.title + '" (' + integritySeal.description + ')');
  console.log('  ✓ PASS: Trust indicator 2: "' + guaranteeSeal.title + '" (' + guaranteeSeal.description + ')');
  console.log('  ✓ PASS: Hero image asset: "' + hero.heroImage.url + '"');

  // Test 3: Verify Site Footer Record & Content Fields
  console.log('\n[Test 3] Verifying Site Footer Record Integrity:');
  const footerRecord = publicData.find(item => item.key === 'site_footer');
  if (!footerRecord) throw new Error('FAIL: site_footer record not found');
  if (footerRecord.section !== 'footer') throw new Error(`FAIL: Unexpected section "${footerRecord.section}"`);

  const footer = footerRecord.content;
  if (footer.brand?.name !== 'GARDNER AUCTION') {
    throw new Error(`FAIL: brand.name mismatch: ${footer.brand?.name}`);
  }
  if (footer.brand?.logo?.url !== '/images/gardner_logo.png') {
    throw new Error(`FAIL: brand.logo.url mismatch: ${footer.brand?.logo?.url}`);
  }
  if (!footer.description || !footer.description.includes('Pennsylvania\'s premier certified auction institution')) {
    throw new Error(`FAIL: footer description mismatch: ${footer.description}`);
  }
  if (!footer.navigation?.links || footer.navigation.links.length !== 4) {
    throw new Error(`FAIL: expected 4 navigation links, got: ${footer.navigation?.links?.length}`);
  }
  const linkLabels = footer.navigation.links.map(l => l.label);
  if (!linkLabels.includes('Home') || !linkLabels.includes('Current Auctions') || !linkLabels.includes('Past Auctions') || !linkLabels.includes('Email List')) {
    throw new Error(`FAIL: Navigation links mismatch: ${linkLabels.join(', ')}`);
  }
  if (!footer.contact?.address?.text.includes('4200 Commercial Boulevard')) {
    throw new Error(`FAIL: Contact address mismatch: ${footer.contact?.address?.text}`);
  }
  if (footer.contact?.phone?.label !== '(412) 555-0199') {
    throw new Error(`FAIL: Contact phone mismatch: ${footer.contact?.phone?.label}`);
  }
  if (footer.contact?.email?.label !== 'info@gardnerauction.com') {
    throw new Error(`FAIL: Contact email mismatch: ${footer.contact?.email?.label}`);
  }
  if (!footer.legal?.copyright?.includes('© 1960–2026 Gardner Auction LLC')) {
    throw new Error(`FAIL: Copyright text mismatch: ${footer.legal?.copyright}`);
  }
  if (!footer.legal?.licensure?.text?.includes('Commonwealth of Pennsylvania Registered & Bonded Auction House')) {
    throw new Error(`FAIL: Licensure text mismatch: ${footer.legal?.licensure?.text}`);
  }
  console.log('  ✓ PASS: Brand name: "' + footer.brand.name + '", Logo: "' + footer.brand.logo.url + '"');
  console.log('  ✓ PASS: Navigation links: ' + linkLabels.join(' | '));
  console.log('  ✓ PASS: Gallery contact address: "' + footer.contact.address.text + '"');
  console.log('  ✓ PASS: Gallery phone: "' + footer.contact.phone.label + '", email: "' + footer.contact.email.label + '"');
  console.log('  ✓ PASS: Copyright: "' + footer.legal.copyright + '"');
  console.log('  ✓ PASS: Licensure: "' + footer.legal.licensure.text + '"');

  // Test 4: Verify Current Auctions Hero Record & Content Fields
  console.log('\n[Test 4] Verifying Current Auctions Hero Record Integrity:');
  const currentHeroRecord = publicData.find(item => item.key === 'current_auctions_hero');
  if (!currentHeroRecord) throw new Error('FAIL: current_auctions_hero record not found');
  if (currentHeroRecord.section !== 'current_auctions') {
    throw new Error(`FAIL: Unexpected section "${currentHeroRecord.section}"`);
  }

  const currentHero = currentHeroRecord.content;
  if (currentHero.eyebrow !== 'LIVE & UPCOMING AUCTIONS') {
    throw new Error(`FAIL: eyebrow mismatch: ${currentHero.eyebrow}`);
  }
  if (currentHero.heading !== 'Current & Upcoming Auctions') {
    throw new Error(`FAIL: heading mismatch: ${currentHero.heading}`);
  }
  if (!currentHero.subtitle.includes('Browse live auction sessions')) {
    throw new Error(`FAIL: subtitle mismatch: ${currentHero.subtitle}`);
  }
  if (currentHero.backButton?.label !== 'Back to Home' || currentHero.backButton?.destination !== '/') {
    throw new Error(`FAIL: backButton mismatch: ${JSON.stringify(currentHero.backButton)}`);
  }
  if (!Array.isArray(currentHero.supportingText?.lines) || currentHero.supportingText.lines.length !== 3) {
    throw new Error(`FAIL: supportingText lines mismatch: ${JSON.stringify(currentHero.supportingText)}`);
  }
  if (currentHero.backgroundImage?.url !== '/images/current_auction_hero.jpg') {
    throw new Error(`FAIL: backgroundImage url mismatch: ${currentHero.backgroundImage?.url}`);
  }
  console.log('  ✓ PASS: Eyebrow: "' + currentHero.eyebrow + '"');
  console.log('  ✓ PASS: Main Heading: "' + currentHero.heading + '"');
  console.log('  ✓ PASS: Subtitle: "' + currentHero.subtitle + '"');
  console.log('  ✓ PASS: Back Button: "' + currentHero.backButton.label + '" -> ' + currentHero.backButton.destination);
  console.log('  ✓ PASS: Supporting Text Quote: "' + currentHero.supportingText.lines.join(' / ') + '"');
  console.log('  ✓ PASS: Hero Background Image: "' + currentHero.backgroundImage.url + '"');

  // Test 5: Verify Email List Page Record & Content Fields
  console.log('\n[Test 5] Verifying Email List Page Record Integrity:');
  const emailListRecord = publicData.find(item => item.key === 'email_list_page');
  if (!emailListRecord) throw new Error('FAIL: email_list_page record not found');
  if (emailListRecord.section !== 'email_list') {
    throw new Error(`FAIL: Unexpected section "${emailListRecord.section}"`);
  }

  const emailPage = emailListRecord.content;
  if (emailPage.eyebrow !== 'AUCTION NOTIFICATIONS') {
    throw new Error(`FAIL: eyebrow mismatch: ${emailPage.eyebrow}`);
  }
  if (emailPage.heading !== 'Join Our Auction Email List') {
    throw new Error(`FAIL: heading mismatch: ${emailPage.heading}`);
  }
  if (!emailPage.description.includes('Receive advance catalog releases')) {
    throw new Error(`FAIL: description mismatch: ${emailPage.description}`);
  }
  if (emailPage.form?.submitButtonLabel !== 'Join Email List') {
    throw new Error(`FAIL: form.submitButtonLabel mismatch: ${emailPage.form?.submitButtonLabel}`);
  }
  if (!emailPage.privacyNotice?.text.includes('Fiduciary privacy guaranteed')) {
    throw new Error(`FAIL: privacyNotice mismatch: ${emailPage.privacyNotice?.text}`);
  }
  if (!Array.isArray(emailPage.trustBadges) || emailPage.trustBadges.length !== 3) {
    throw new Error(`FAIL: trustBadges length mismatch: ${emailPage.trustBadges?.length}`);
  }
  if (emailPage.successMessage?.title !== 'Thank You for Subscribing') {
    throw new Error(`FAIL: successMessage.title mismatch: ${emailPage.successMessage?.title}`);
  }
  console.log('  ✓ PASS: Eyebrow: "' + emailPage.eyebrow + '"');
  console.log('  ✓ PASS: Page Heading: "' + emailPage.heading + '"');
  console.log('  ✓ PASS: Description: "' + emailPage.description + '"');
  console.log('  ✓ PASS: Form Button Label: "' + emailPage.form.submitButtonLabel + '"');
  console.log('  ✓ PASS: Privacy Notice: "' + emailPage.privacyNotice.text + '"');
  console.log('  ✓ PASS: Trust Badges: ' + emailPage.trustBadges.map(b => b.label).join(' | '));
  console.log('  ✓ PASS: Success Title: "' + emailPage.successMessage.title + '"');

  // Test 6: Upsert Idempotency
  console.log('\n[Test 6] Testing Upsert Idempotency (ON CONFLICT DO UPDATE):');
  const { data: upsertData, error: upsertErr } = await adminClient
    .from('site_content')
    .upsert({
      key: 'email_list_page',
      section: 'email_list',
      content: emailListRecord.content,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' })
    .select();

  if (upsertErr) throw new Error('FAIL: Upsert failed: ' + upsertErr.message);
  if (!upsertData || upsertData.length !== 1) throw new Error('FAIL: Upsert did not return updated row');
  console.log('  ✓ PASS: Upsert operation succeeded idempotently without creating duplicate rows.');

  // Test 7: Verify Row Count Remains Exactly 4
  const { count, error: countErr } = await adminClient
    .from('site_content')
    .select('*', { count: 'exact', head: true });
  if (countErr) throw countErr;
  if (count !== 4) throw new Error(`FAIL: Expected exactly 4 records, got ${count}`);
  console.log(`  ✓ PASS: Total record count in site_content is exactly ${count}.`);

  console.log('\n============================================================');
  console.log('ALL SITE CONTENT DATABASE PERSISTENCE TESTS PASSED!');
  console.log('============================================================\n');
}

runSiteContentTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
