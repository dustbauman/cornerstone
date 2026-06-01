import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ─── Lodge definitions ─────────────────────────────────────────────────────
const LODGE_DEFS = [
  { key: 'ACACIA',    name: 'Acacia Lodge',    number: '123', city: 'Tulsa',          state: 'OK', tier: 'charter',  welcome_message: 'Welcome to the Acacia Lodge business directory. All members listed here have been verified by the lodge.' },
  { key: 'GULFCOAST', name: 'Gulf Coast Lodge', number: '441', city: 'Tampa',          state: 'FL', tier: 'charter',  welcome_message: 'Gulf Coast Lodge #441 — serving Tampa Bay brothers in business.' },
  { key: 'SUNCOAST',  name: 'Suncoast Lodge',   number: '217', city: 'Sarasota',       state: 'FL', tier: 'standard', welcome_message: 'Suncoast Lodge #217 — connecting Sarasota area Masons in commerce.' },
  { key: 'KEYSTONE',  name: 'Keystone Lodge',   number: '88',  city: 'Orlando',        state: 'FL', tier: 'standard', welcome_message: null },
  { key: 'PRAIRIE',   name: 'Prairie Lodge',    number: '56',  city: 'Oklahoma City',  state: 'OK', tier: 'standard', welcome_message: null },
  { key: 'HEARTLAND', name: 'Heartland Lodge',  number: '302', city: 'Edmond',         state: 'OK', tier: 'standard', welcome_message: null },
]

// ─── Listing + profile definitions ────────────────────────────────────────
const LISTING_DEFS = [
  {
    email: 'james@gulfcoastroofing.com', full_name: 'James R. Thornton',
    lodge_key: 'GULFCOAST', trade_category: 'Roofing',
    city: 'Tampa', state: 'FL', lat: 27.9506, lng: -82.4572,
    business_name: 'Gulf Coast Roofing',
    description: 'Family-owned roofing company serving the Tampa Bay area for over 20 years. We specialize in residential and light commercial roofing with a reputation for integrity and craftsmanship that reflects our Masonic values.',
    services: ['Roof Replacement', 'Roof Repair', 'Storm Damage Assessment', 'Gutters & Fascia', 'Free Inspections'],
    phone: '(813) 555-0142', website: 'https://gulfcoastroofing.com',
    google_rating: 4.9, google_rating_count: 47, travel_radius_miles: 40,
  },
  {
    email: 'marcus@thorntonelectric.com', full_name: 'Marcus D. Wells',
    lodge_key: 'SUNCOAST', trade_category: 'Electrical',
    city: 'Sarasota', state: 'FL', lat: 27.3364, lng: -82.5307,
    business_name: 'Thornton Electric',
    description: 'Licensed master electrician with 15 years of experience in residential, commercial, and industrial electrical work. Honest pricing, quality work, and always on time.',
    services: ['Panel Upgrades', 'New Construction Wiring', 'EV Charger Installation', 'Lighting Design', 'Emergency Service'],
    phone: '(941) 555-0288', website: 'https://thorntonelectric.com',
    google_rating: 4.8, google_rating_count: 39, travel_radius_miles: 30,
  },
  {
    email: 'david@keystonelegal.com', full_name: 'David A. Hartley',
    lodge_key: 'KEYSTONE', trade_category: 'Legal',
    city: 'Orlando', state: 'FL', lat: 28.5383, lng: -81.3792,
    business_name: 'Keystone Legal Group',
    description: 'Full-service law firm focused on business law, estate planning, and real estate transactions. We believe in transparent counsel and building long-term relationships with our clients.',
    services: ['Business Formation', 'Estate Planning', 'Real Estate Closings', 'Contract Review', 'Litigation'],
    phone: '(407) 555-0311', website: 'https://keystonelegal.com',
    google_rating: 5.0, google_rating_count: 28, travel_radius_miles: 50, remote_eligible: true,
  },
  {
    email: 'robert@plumblineplumbing.com', full_name: 'Robert C. Ingram',
    lodge_key: 'ACACIA', trade_category: 'Plumbing',
    city: 'Tulsa', state: 'OK', lat: 36.1540, lng: -95.9928,
    business_name: 'Plumb Line Plumbing',
    description: 'Full-service plumbing for residential and commercial clients throughout the greater Tulsa area. No upsells, no surprises — just honest work at fair prices.',
    services: ['Water Heater Install & Repair', 'Drain Cleaning', 'Leak Detection', 'Repiping', 'Bathroom & Kitchen Remodels'],
    phone: '(918) 555-0477', website: 'https://plumblineplumbing.com',
    google_rating: 4.7, google_rating_count: 62, travel_radius_miles: 35,
  },
  {
    email: 'thomas@levelgroundlandscaping.com', full_name: 'Thomas H. Brewster',
    lodge_key: 'PRAIRIE', trade_category: 'Landscaping',
    city: 'Oklahoma City', state: 'OK', lat: 35.4676, lng: -97.5164,
    business_name: 'Level Ground Landscaping',
    description: 'Designing and maintaining beautiful outdoor spaces across Oklahoma City and surrounding suburbs. We take pride in our work the same way a craftsman takes pride in his craft.',
    services: ['Lawn Care & Maintenance', 'Landscape Design', 'Irrigation Systems', 'Sod Installation', 'Tree Trimming'],
    phone: '(405) 555-0533', website: 'https://levelgroundlandscaping.com',
    google_rating: 4.6, google_rating_count: 51, travel_radius_miles: 40,
  },
  {
    email: 'william@squaredealauto.com', full_name: 'William F. Mason',
    lodge_key: 'HEARTLAND', trade_category: 'Automotive',
    city: 'Edmond', state: 'OK', lat: 35.6528, lng: -97.4781,
    business_name: 'Square Deal Auto',
    description: 'A square deal means exactly that — fair prices, honest diagnostics, and work done right. Serving Edmond and North OKC for over a decade with ASE-certified technicians.',
    services: ['Oil Changes & Maintenance', 'Engine Diagnostics', 'Brake Service', 'Transmission Repair', 'AC Service'],
    phone: '(405) 555-0622', website: 'https://squaredealauto.com',
    google_rating: 4.8, google_rating_count: 83, travel_radius_miles: 25,
  },
  {
    email: 'charles@craftsmanHVAC.com', full_name: 'Charles E. Monroe',
    lodge_key: 'GULFCOAST', trade_category: 'HVAC',
    city: 'St. Petersburg', state: 'FL', lat: 27.7676, lng: -82.6403,
    business_name: 'Craftsman HVAC Services',
    description: 'Keeping Florida comfortable year-round. We install, service, and repair all major HVAC brands and are fully licensed and insured for residential and light commercial work.',
    services: ['AC Installation', 'Heating Systems', 'Preventive Maintenance', 'Duct Cleaning', 'Indoor Air Quality'],
    phone: '(727) 555-0744', website: 'https://craftsmanHVAC.com',
    google_rating: 4.9, google_rating_count: 55, travel_radius_miles: 35,
  },
  {
    email: 'george@compassfinancial.com', full_name: 'George L. Whitfield',
    lodge_key: 'SUNCOAST', trade_category: 'Financial',
    city: 'Naples', state: 'FL', lat: 26.1420, lng: -81.7948,
    business_name: 'Compass Financial Planning',
    description: 'Fee-only financial planning firm helping families and small business owners navigate retirement, investments, and estate planning. We work for you — no commissions, no conflicts.',
    services: ['Retirement Planning', 'Investment Management', 'Tax Strategy', 'Estate Planning', 'Small Business Planning'],
    phone: '(239) 555-0855', website: 'https://compassfinancial.com',
    google_rating: 5.0, google_rating_count: 19, travel_radius_miles: 50, remote_eligible: true,
  },
  {
    email: 'henry@brotherhoodbuilt.com', full_name: 'Henry A. Price',
    lodge_key: 'ACACIA', trade_category: 'General Contractor',
    city: 'Tulsa', state: 'OK', lat: 36.1540, lng: -95.9928,
    business_name: 'Brotherhood Built Construction',
    description: "Full-service general contracting for residential and commercial builds. We manage every phase from foundation to finish with a team that treats your project like it's our own.",
    services: ['Custom Home Building', 'Commercial Buildouts', 'Additions & Remodels', 'Project Management', 'Subcontractor Coordination'],
    phone: '(918) 555-0966', website: 'https://brotherhoodbuilt.com',
    google_rating: 4.7, google_rating_count: 34, travel_radius_miles: 60,
  },
  {
    email: 'samuel@truenorthit.com', full_name: 'Samuel P. Grant',
    lodge_key: 'PRAIRIE', trade_category: 'Technology',
    city: 'Norman', state: 'OK', lat: 35.2226, lng: -97.4395,
    business_name: 'True North IT Solutions',
    description: "Managed IT services and cybersecurity for small and medium businesses. We're your dedicated technology partner — proactive, responsive, and always on your side.",
    services: ['Managed IT Support', 'Cybersecurity', 'Cloud Migration', 'Network Setup', 'Business Continuity Planning'],
    phone: '(405) 555-1044', website: 'https://truenorthit.com',
    google_rating: 4.8, google_rating_count: 27, travel_radius_miles: 40, remote_eligible: true,
  },
  {
    email: 'frank@ashlarhomeinspections.com', full_name: 'Frank J. Dexter',
    lodge_key: 'KEYSTONE', trade_category: 'Home Inspection',
    city: 'Jacksonville', state: 'FL', lat: 30.3322, lng: -81.6557,
    business_name: 'Ashlar Home Inspections',
    description: "Certified home inspector with over 2,000 inspections completed. I deliver detailed, honest reports so buyers and sellers know exactly what they're working with before closing.",
    services: ["Buyer's Inspection", 'Pre-Listing Inspection', 'New Construction Inspection', '4-Point Inspection', 'Wind Mitigation'],
    phone: '(904) 555-1177', website: 'https://ashlarhomeinspections.com',
    google_rating: 4.9, google_rating_count: 71, travel_radius_miles: 50,
  },
  {
    email: 'arthur@plumbperfectpainting.com', full_name: 'Arthur N. Webb',
    lodge_key: 'HEARTLAND', trade_category: 'Painting',
    city: 'Pensacola', state: 'FL', lat: 30.4213, lng: -87.2169,
    business_name: 'Plumb Perfect Painting',
    description: "Interior and exterior painting with meticulous prep work and clean lines. We treat every home like our own — protecting your space and delivering a finish you'll be proud of.",
    services: ['Interior Painting', 'Exterior Painting', 'Cabinet Refinishing', 'Deck & Fence Staining', 'Drywall Repair'],
    phone: '(850) 555-1233', website: 'https://plumbperfectpainting.com',
    google_rating: 4.6, google_rating_count: 44, travel_radius_miles: 30,
  },
]

const REVIEW_DEFS = [
  {
    listing_business: 'Gulf Coast Roofing',
    reviewer_email: 'robert@plumblineplumbing.com',
    rating: 5,
    body: 'James did my whole roof after the storm and was incredible to work with. Fair price, on time, and zero drama.',
  },
  {
    listing_business: 'Gulf Coast Roofing',
    reviewer_email: 'marcus@thorntonelectric.com',
    rating: 5,
    body: 'Recommended by my lodge. He inspected, quoted, and completed the job in under 2 weeks. Top tier.',
  },
  {
    listing_business: 'Gulf Coast Roofing',
    reviewer_email: 'david@keystonelegal.com',
    rating: 5,
    body: 'Honest inspection report that saved me from buying a house with a bad roof. Worth every penny.',
  },
  {
    listing_business: 'Plumb Line Plumbing',
    reviewer_email: 'james@gulfcoastroofing.com',
    rating: 5,
    body: "Robert fixed a slab leak that two other plumbers couldn't find. Methodical, clean, fair.",
  },
  {
    listing_business: 'Plumb Line Plumbing',
    reviewer_email: 'thomas@levelgroundlandscaping.com',
    rating: 5,
    body: 'Did the plumbing for my whole addition. Showed up every day, no excuses, and the inspection passed first try.',
  },
  {
    listing_business: 'Plumb Line Plumbing',
    reviewer_email: 'william@squaredealauto.com',
    rating: 4,
    body: 'Solid plumber, fair rates. Takes his time which means quality work. Scheduling took a few days.',
  },
  {
    listing_business: 'Thornton Electric',
    reviewer_email: 'robert@plumblineplumbing.com',
    rating: 5,
    body: 'Marcus upgraded my panel and installed 2 EV chargers. Explained everything clearly, no surprises on the bill.',
  },
  {
    listing_business: 'Thornton Electric',
    reviewer_email: 'charles@craftsmanHVAC.com',
    rating: 5,
    body: 'He wired a new workshop for me. Showed up early every day and left the place cleaner than he found it.',
  },
  {
    listing_business: 'Thornton Electric',
    reviewer_email: 'samuel@truenorthit.com',
    rating: 5,
    body: 'Did the electrical for our office buildout. On budget, on time, all code compliant. Will use again.',
  },
]

const REQUEST_DEFS = [
  { posted_by_name: 'R. Calloway', posted_by_email: 'rcalloway@demo.tyrian.work', lodge_key: 'GULFCOAST', lodge_display: 'Gulf Coast Lodge #441', category: 'Legal', title: 'Looking for a Mason attorney — estate planning, no rush', details: 'Need help getting my affairs in order. Looking for a trust and estate attorney who understands the lodge context.', city: 'Naples', state: 'FL', lat: 26.1420, lng: -81.7948, budget: 'Flexible', timeline: 'Flexible', remote_eligible: true, is_verified_member: true },
  { posted_by_name: 'P. Nguyen', posted_by_email: 'pnguyen@demo.tyrian.work', lodge_key: 'PRAIRIE', lodge_display: 'Prairie Lodge #56', category: 'Financial', title: 'Small business bookkeeping — ongoing monthly engagement', details: 'Running a small contracting company. Need someone to handle monthly books, reconciliation, and quarterly estimates.', city: 'Oklahoma City', state: 'OK', lat: 35.4676, lng: -97.5164, budget: '$200–400/mo', timeline: 'Flexible', remote_eligible: true, is_verified_member: true },
  { posted_by_name: 'D. Harrison', posted_by_email: 'dharrison@demo.tyrian.work', lodge_key: 'SUNCOAST', lodge_display: 'Suncoast Lodge #217', category: 'Technology', title: 'Need IT help — setting up secure network for my law office', details: 'Small law office with 4 staff. Need secure file sharing, encrypted email, and proper firewall setup.', city: 'Sarasota', state: 'FL', lat: 27.3364, lng: -82.5307, budget: '~$800', timeline: 'Within 1 week', remote_eligible: true, is_verified_member: true },
  { posted_by_name: 'H. Price', posted_by_email: 'hprice@demo.tyrian.work', lodge_key: 'ACACIA', lodge_display: 'Acacia Lodge #123', category: 'Plumbing', title: 'Pipe leak under kitchen sink — need someone this week', details: 'Active drip under the kitchen sink. Shutoff valve not fully stopping it. Need a licensed plumber.', city: 'Tulsa', state: 'OK', lat: 36.1540, lng: -95.9928, budget: '~$300', timeline: 'ASAP', remote_eligible: false, is_verified_member: true },
  { posted_by_name: 'T. Simmons', posted_by_email: 'tsimmons@demo.tyrian.work', lodge_key: null, lodge_display: 'Acacia Lodge #123', category: 'Plumbing', title: 'Full bathroom remodel — plumbing rough-in needed', details: 'Gutting a master bath, moving the toilet 18 inches and adding a double vanity. Need rough-in and finish work.', city: 'Tulsa', state: 'OK', lat: 36.1300, lng: -95.9500, budget: '~$2,400', timeline: 'Within 1 week', remote_eligible: false, is_verified_member: true },
  { posted_by_name: 'A. Fleming', posted_by_email: 'afleming@demo.tyrian.work', lodge_key: null, lodge_display: 'Acacia Lodge #123', category: 'Roofing', title: 'Roofing inspection before home sale — need report fast', details: 'Listing the house next week. Realtor says we need a roof inspection report. Roof is about 12 years old.', city: 'Broken Arrow', state: 'OK', lat: 36.0526, lng: -95.7908, budget: '~$350', timeline: 'ASAP', remote_eligible: false, is_verified_member: true },
  { posted_by_name: 'L. Graves', posted_by_email: 'lgraves@demo.tyrian.work', lodge_key: 'HEARTLAND', lodge_display: 'Heartland Lodge #302', category: 'HVAC', title: 'HVAC system replacement — 2,200 sq ft home', details: 'Current system is 18 years old and struggling. Looking to replace the whole system before summer.', city: 'Edmond', state: 'OK', lat: 35.6528, lng: -97.4781, budget: '~$6,000', timeline: 'Flexible', remote_eligible: false, is_verified_member: true },
  { posted_by_name: 'W. Mason', posted_by_email: 'wmason@demo.tyrian.work', lodge_key: 'HEARTLAND', lodge_display: 'Heartland Lodge #302', category: 'Automotive', title: 'Auto repair — transmission issue, daily driver', details: 'Slipping between 2nd and 3rd gear. 2019 F-150 with 87k miles. Need an honest shop.', city: 'Edmond', state: 'OK', lat: 35.6500, lng: -97.4800, budget: 'Market rate', timeline: 'ASAP', remote_eligible: false, is_verified_member: false },
  { posted_by_name: 'C. Monroe', posted_by_email: 'cmonroe@demo.tyrian.work', lodge_key: 'HEARTLAND', lodge_display: 'Heartland Lodge #302', category: 'Electrical', title: 'Electrical panel upgrade — older home, 200 amp service', details: '1960s home with original 100A panel. Getting an EV charger installed and need to upgrade first.', city: 'Edmond', state: 'OK', lat: 35.6600, lng: -97.4900, budget: '~$2,000', timeline: 'Flexible', remote_eligible: false, is_verified_member: true },
  { posted_by_name: 'G. Whitfield', posted_by_email: 'gwhitfield@demo.tyrian.work', lodge_key: 'PRAIRIE', lodge_display: 'Prairie Lodge #56', category: 'Plumbing', title: 'Plumbing for new build — need rough-in and finish work', details: '2,800 sq ft custom home. General contractor has scheduled rough-in to start in 3 weeks.', city: 'Oklahoma City', state: 'OK', lat: 35.4676, lng: -97.5164, budget: '~$8,500', timeline: 'Flexible', remote_eligible: false, is_verified_member: true },
  { posted_by_name: 'T. Brewster', posted_by_email: 'tbrewster@demo.tyrian.work', lodge_key: 'PRAIRIE', lodge_display: 'Prairie Lodge #56', category: 'Landscaping', title: 'Landscaping overhaul — front and back yard, 0.5 acres', details: 'Moving in next month and the yard is a blank slate. Want full design-build: sod, beds, irrigation, trees.', city: 'Oklahoma City', state: 'OK', lat: 35.4800, lng: -97.5000, budget: '~$4,000', timeline: 'Within 1 week', remote_eligible: false, is_verified_member: true },
]

// ─── Helpers ───────────────────────────────────────────────────────────────
async function getOrCreateUser(email: string): Promise<string> {
  // Try to find existing user first
  let page = 1
  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 50 })
    if (error) throw error
    const existing = users.find(u => u.email === email)
    if (existing) return existing.id
    if (users.length < 50) break
    page++
  }

  // Create new user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (error) throw new Error(`createUser(${email}): ${error.message}`)
  return data.user.id
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Tyrian seed starting...\n')

  // ── 1. Lodges ─────────────────────────────────────────────────────────────
  console.log('1/4  Inserting lodges...')
  const lodgeIds: Record<string, string> = {}

  for (const lodge of LODGE_DEFS) {
    const { data, error } = await supabase
      .from('lodges')
      .insert({
        name: lodge.name,
        number: lodge.number,
        city: lodge.city,
        state: lodge.state,
        status: 'active',
        tier: lodge.tier,
        welcome_message: lodge.welcome_message,
      })
      .select('id')
      .single()

    if (error) {
      // Already exists — fetch it
      const { data: existing } = await supabase
        .from('lodges')
        .select('id')
        .eq('name', lodge.name)
        .eq('number', lodge.number)
        .single()
      if (!existing) throw new Error(`Could not upsert lodge ${lodge.name}: ${error.message}`)
      lodgeIds[lodge.key] = existing.id
      console.log(`   ↳ ${lodge.name} #${lodge.number} already exists`)
    } else {
      lodgeIds[lodge.key] = data.id
      console.log(`   ✓ ${lodge.name} #${lodge.number}`)
    }
  }

  // ── 2. Users + profiles + listings ────────────────────────────────────────
  console.log('\n2/4  Seeding members + listings...')

  const listingIdByBusiness: Record<string, string> = {}
  const userIdByEmail: Record<string, string> = {}

  for (const def of LISTING_DEFS) {
    try {
      const userId = await getOrCreateUser(def.email)
      userIdByEmail[def.email] = userId

      // Update profile with full data
      const lodgeId = lodgeIds[def.lodge_key]
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: def.email,
          full_name: def.full_name,
          lodge_id: lodgeId,
          trade_category: def.trade_category,
          city: def.city,
          state: def.state,
          lat: def.lat,
          lng: def.lng,
          verification_status: 'verified',
          visibility: 'public',
        })

      if (profileError) throw new Error(`profile upsert: ${profileError.message}`)

      // Check if listing already exists for this profile
      const { data: existing } = await supabase
        .from('listings')
        .select('id')
        .eq('profile_id', userId)
        .eq('business_name', def.business_name)
        .maybeSingle()

      if (existing) {
        listingIdByBusiness[def.business_name] = existing.id
        console.log(`   ↳ ${def.business_name} already exists`)
        continue
      }

      const { data: insertedListing, error: listingError } = await supabase.from('listings').insert({
        profile_id: userId,
        business_name: def.business_name,
        description: def.description,
        trade_category: def.trade_category,
        city: def.city,
        state: def.state,
        lat: def.lat,
        lng: def.lng,
        phone: def.phone,
        email: def.email,
        website: def.website,
        google_rating: def.google_rating,
        google_rating_count: def.google_rating_count,
        services: def.services,
        travel_radius_miles: def.travel_radius_miles ?? 25,
        remote_eligible: (def as any).remote_eligible ?? false,
        visibility: 'public',
        is_active: true,
        views_count: Math.floor(Math.random() * 300) + 50,
      }).select('id').single()

      if (listingError) throw new Error(`listing insert: ${listingError.message}`)
      listingIdByBusiness[def.business_name] = insertedListing.id
      console.log(`   ✓ ${def.full_name} — ${def.business_name}`)
    } catch (err) {
      console.error(`   ✗ ${def.email}: ${err}`)
    }
  }

  // ── 3. Member reviews ─────────────────────────────────────────────────────
  console.log('\n3/4  Seeding member reviews...')

  for (const rev of REVIEW_DEFS) {
    let resolvedListingId = listingIdByBusiness[rev.listing_business]
    let reviewerId = userIdByEmail[rev.reviewer_email]

    if (!resolvedListingId) {
      const { data: listingRow } = await supabase
        .from('listings')
        .select('id')
        .eq('business_name', rev.listing_business)
        .maybeSingle()
      if (!listingRow) {
        console.log(`   ✗ skip review — listing not found: ${rev.listing_business}`)
        continue
      }
      resolvedListingId = listingRow.id
      listingIdByBusiness[rev.listing_business] = resolvedListingId
    }

    if (!reviewerId) {
      reviewerId = await getOrCreateUser(rev.reviewer_email)
      userIdByEmail[rev.reviewer_email] = reviewerId
    }

    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('listing_id', resolvedListingId)
      .eq('reviewer_id', reviewerId)
      .maybeSingle()

    if (existingReview) {
      console.log(`   ↳ review exists for ${rev.listing_business}`)
      continue
    }

    const { error: reviewError } = await supabase.from('reviews').insert({
      listing_id: resolvedListingId,
      reviewer_id: reviewerId,
      rating: rev.rating,
      body: rev.body,
    })

    if (reviewError) {
      console.error(`   ✗ ${rev.listing_business}: ${reviewError.message}`)
    } else {
      console.log(`   ✓ review on ${rev.listing_business}`)
    }
  }

  // ── 4. Requests ───────────────────────────────────────────────────────────
  console.log('\n4/4  Seeding requests...')

  for (const req of REQUEST_DEFS) {
    // Skip if already exists
    const { data: existing } = await supabase
      .from('requests')
      .select('id')
      .eq('posted_by_email', req.posted_by_email)
      .eq('title', req.title)
      .maybeSingle()

    if (existing) {
      console.log(`   ↳ "${req.title.slice(0, 50)}" already exists`)
      continue
    }

    const lodgeId = req.lodge_key ? lodgeIds[req.lodge_key] ?? null : null

    const { error } = await supabase.from('requests').insert({
      posted_by_name: req.posted_by_name,
      posted_by_email: req.posted_by_email,
      lodge_id: lodgeId,
      lodge_display: req.lodge_display,
      category: req.category,
      title: req.title,
      details: req.details,
      city: req.city,
      state: req.state,
      lat: req.lat,
      lng: req.lng,
      budget: req.budget,
      timeline: req.timeline as any,
      status: 'open',
      remote_eligible: req.remote_eligible,
      is_verified_member: req.is_verified_member,
      responses_count: 0,
    })

    if (error) {
      console.error(`   ✗ "${req.title.slice(0, 40)}": ${error.message}`)
    } else {
      console.log(`   ✓ "${req.title.slice(0, 50)}"`)
    }
  }

  console.log('\n✅ Seed complete.')
}

main().catch(err => {
  console.error('\n💥 Seed failed:', err)
  process.exit(1)
})
