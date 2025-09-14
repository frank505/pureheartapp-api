/**
 * Curated discipleship & recovery articles.
 * Each article is ORIGINAL prose (no large verbatim quotations) and cites Scripture by reference only.
 * References array uses: { type?: 'scripture'|'resource', label: string, url?: string }
 */
export interface SeedArticleData {
  slug: string;
  title: string;
  summary?: string;
  content: string;
  references: { type?: string; label: string; url?: string }[];
  tags?: string[];
  category?: string;
}
 
// Helper to build front‑matter style heading then body
const build = (heading: string, body: string) => `# ${heading}\n\n${body.trim()}\n`;

// NOTE: Keep slugs stable. If you edit content later, increment version in DB logic if needed.
export const ARTICLES: SeedArticleData[] = [
  // 1
  {
    slug: 'christ-centered-freedom-overview',
    title: 'A Christ-Centered Overview of Freedom from Pornography',
    summary: 'Biblical theology + data + neuroscience + disciplined practices: a robust map for Christ-centered recovery.',
    content: build('A Christ-Centered Overview of Freedom from Pornography', `
> "Be killing sin or it will be killing you." – John Owen (applied through the finished work of Christ, not self-trust)

## 1. Why This Matters (Current Landscape)
Multiple reputable surveys converge: a majority of churched men and a growing proportion of women report some level of ongoing pornography exposure. Barna / Covenant Eyes research (various annual summaries) has repeatedly indicated persistent use among professing believers, and meta-analyses on problematic sexual media consumption show correlations with relational dissatisfaction, escalated novelty seeking, and dysregulated mood states. The problem is *not* simply moral failure; it is a multi-layered worship, attachment, formation, and neuro-behavior issue.

## 2. Gospel Foundation (Identity Before Modification)
Secular behavior change models (e.g., Fogg Behavior Model; habit loop literature) emphasize motivation, ability, and prompt. Scripture adds a prior layer: **new creation identity** (2 Corinthians 5:17) and **union with Christ** (Romans 8). We do not white-knuckle into holiness; we participate in grace-fueled transformation (Titus 2:11–12). Identity shapes expectancy; expectancy shapes attentional allocation; attention shapes neural reinforcement.

## 3. Anatomy of the Porn Cycle (Integrated Frame)
| Phase | Description | Strategic Disruptor |
|-------|-------------|---------------------|
| Vulnerability Baseline | Fatigue, loneliness, stress, unstructured time | Proactive rhythm (sleep, planning) |
| Trigger | Image, memory, platform algorithm, notification | Immediate pattern break (stand, breathe, pray phrase) |
| Narrative | "I deserve...", "Just a peek" cognitive distortion | Truth replacement + identity statement |
| Ritual | Privacy prep, search pathways, fantasy rehearsal | Pre-committed interruption script + relational reach |
| Act & Aftermath | Spike → Crash → Shame loop | Rapid confession + structured debrief protocol |

## 4. Neurobiology in Plain Terms
Pornography exploits designed reward circuitry (anticipation > climax dopamine). Repetition builds **cue-linked salience**; stress + secrecy amplify encoding. Hope: reward pathways remain plastic—*consistent alternative, meaningful, relational rewards + reduced trigger rehearsal = synaptic reshaping.*

## 5. Theology of Grace-Powered Discipline
Discipline minus grace → legalism (fragile). Grace minus discipline → passivity (stagnant). Hebrews 12 holds both: *"Run... looking to Jesus."* Spiritual practices (Scripture meditation, confession, corporate worship, fasting) are *means of communion*, not performance metrics.

## 6. Community Architecture
Biblical confession (James 5:16) + exhortation (Hebrews 10:24–25) counters isolation (a relapse accelerant). Design roles: mentor (wisdom), peer (mutual fight), data mirror (helps interpret patterns). Healthy accountability is *predictable, specific, grace-forward, data-informed*.

## 7. Measuring Real Growth
Not merely streak length. Robust dashboard: (a) early trigger interruption count ↑, (b) lapse confession latency ↓, (c) emotional regulation recovery time ↓, (d) Scripture recall under stress ↑, (e) sleep consistency ↑, (f) service acts per week ↑. These metrics reflect Romans 12:2 **renewal**, not cosmetic suppression.

## 8. Core Replacement Domains
1. Physiological base: sleep hygiene, movement, nutrition.
2. Cognitive renewal: truth replacement deck, identity statements.
3. Emotional literacy: HALT+ scans, structured journaling.
4. Relational attachment: scheduled touchpoints, mentoring.
5. Purpose & service: mission micro-acts front-load meaning.
6. Technical guardrails: layered filtering, device zoning.

## 9. 7-Day Starter Plan (Minimal but Potent)
Day 1: Craft identity statement (2–3 clauses + references).
Day 2: Map top 5 triggers (context + emotion) → pick 1 substitution.
Day 3: Install / configure layered tech boundaries (DNS + device).
Day 4: Build truth replacement deck (5 distortions → 5 scriptures).
Day 5: Establish morning & evening micro-liturgies (≤7 min each).
Day 6: Recruit accountability roles & set first 15‑min review.
Day 7: Implement relapse response template (write & store physically).

## 10. Hope Trajectory
Expect *trend improvement*, not instant perfection. Evaluate quarterly narrative: increased humility, quicker relational reach, deeper worship, reconstructed meaning. This is evidence of Spirit-led renovation, validating Philippians 1:6 hope.

> Freedom is not the absence of temptation; it is the presence of resilient, grace-shaped patterns that outcompete the old pathway.
`),
    references: [
      { type: 'scripture', label: '2 Corinthians 5:17' },
      { type: 'scripture', label: 'Romans 8' },
      { type: 'scripture', label: 'Titus 2:11-12' },
      { type: 'scripture', label: 'James 5:16' },
      { type: 'scripture', label: 'Hebrews 12:1-2' },
      { type: 'scripture', label: 'Philippians 1:6' },
      { type: 'scripture', label: 'Romans 12:2' },
      { type: 'resource', label: 'NIDA – Brain and Addiction', url: 'https://nida.nih.gov/publications/drugfacts/brain-and-addiction' },
      { type: 'resource', label: 'BJ Fogg Behavior Model', url: 'https://behaviormodel.org/' },
      { type: 'resource', label: 'Covenant Eyes / Barna Porn Use Data (Overview)', url: 'https://www.barna.com/' }
    ],
    tags: ['foundation','identity','neuroscience','grace'],
    category: 'foundations'
  },
  // 2
  {
    slug: 'understanding-trigger-cycles',
    title: 'Understanding Trigger Cycles and Interrupting Them Early',
    summary: 'Map the five-stage temptation sequence, insert earlier disruption, and convert urges into data for growth.',
    content: build('Understanding Trigger Cycles and Interrupting Them Early', `
## 1. Why Cycles Matter
Most people only fight *at* the explicit sexual content moment. By then, a cascading sequence (vulnerability → trigger → narrative → ritual) has already narrowed options. Intervention earlier = exponentially higher success probability (behavioral relapse research repeatedly shows ritual onset dramatically reduces inhibition capacity).

## 2. The Expanded Five-Stage Model
1. **Baseline Vulnerability** – physiological or emotional deficit (sleep debt, social isolation, stress load).
2. **Trigger Input** – sensory cue, algorithmic suggestion, memory image, boredom scan.
3. **Internal Narrative** – entitlement, minimization, despair, curiosity rationalization.
4. **Ritualization** – privacy prep, app switching, fantasy rehearsal, search priming.
5. **Act / Aftermath** – consumption, neurochemical spike, dysphoric crash, shame-fueled vow.

Your **maximum leverage** is between stages 1–3. Past stage 4, probability of consummation soars because executive function is partially downregulated.

## 3. 7-Day Trigger Mapping Exercise
Create a simple log with columns: Timestamp | Location | Emotion (primary/secondary) | Trigger Type | Narrative Phrase | Response | Outcome (Interrupted / Lapse). At week end, cluster repeating contexts (e.g., 10:30–11:30 PM phone-in-bed boredom). Choose *one* high-frequency cluster to target next week.

## 4. Interruption Toolkit (Layered)
| Layer | Tool | Rationale |
|-------|------|-----------|
| Physiological | Stand + brisk 90‑sec walk or 25 air squats | State shift breaks inertia; increases oxygen & prefrontal engagement |
| Neural | 4‑7‑8 breathing cycle x3 | Parasympathetic activation reduces urgency intensity |
| Cognitive | Identity truth card (single sentence) | Replaces distortion with anchored meaning |
| Relational | Pre-agreed keyword text | Externalizes battle; introduces social presence effect |
| Purpose | 120‑sec micro-mission (encourage, tidy, pray) | Redirects attention into productive agency |

## 5. Measuring Wins (Gamified Reinforcement)
Log *interrupted cycles* as wins. This positively reinforces early-phase vigilance (healthy dopamine tied to growth process vs fantasy reward). After 4 weeks, evaluate upward trend.

## 6. Nighttime High-Risk Window Strategy
Data across self-monitoring journals commonly shows elevated lapse frequency during circadian dip + fatigue (late evening). Pre-decide: device curfew time, off-bedroom charging dock, pre-sleep low-light anchoring routine (Scripture + gratitude list). This fosters proactive not reactive purity.

## 7. Theological Frame
"Be sober-minded" (1 Peter 5:8) + "Guard your heart" (Proverbs 4:23). Mapping cycles is *spiritual vigilance translated into operational clarity.*

> Early interruption is a gift to your future self and an act of worship—stewarding attention before it is hijacked.
`),
    references: [
      { type: 'scripture', label: '1 Peter 5:8' },
      { type: 'scripture', label: 'Proverbs 4:23' },
      { type: 'resource', label: 'Habit Loop Explanation (Duhigg)', url: 'https://charlesduhigg.com/the-power-of-habit/' },
      { type: 'resource', label: 'Basal Ganglia & Habit Learning', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC539473/' }
    ],
    tags: ['triggers','behavioral-loop','self-regulation'],
    category: 'behavior'
  },
  // 3
  {
    slug: 'identity-vs-shame-in-recovery',
    title: 'Identity vs Shame: Reframing the Inner Narrative',
    summary: 'Systematically replace shame identity fusion with Gospel-rooted cognitive-emotional scripts.',
    content: build('Identity vs Shame: Reframing the Inner Narrative', `
## 1. Why Shame Fuels Compulsion
Shame collapses *behavior* into *being*: "I failed → I *am* filthy." This amplifies distress, and distress seeks rapid soothing—often returning to the very behavior. Gospel identity (Romans 8:1; Colossians 3:3) re-establishes a non-condemned baseline from which genuine repentance (not self-hatred) flows.

## 2. Differentiating Guilt, Shame, Condemnation
| Term | Nature | Effect | Gospel Response |
|------|-------|--------|-----------------|
| Godly Guilt | Specific act | Convicts, invites change | Confession & cleansing (1 John 1:9) |
| Toxic Shame | Global self-label | Hides, isolates | Identity declaration (union with Christ) |
| Condemnation | Final verdict claim | Despair | Refuted by Romans 8:1 |

## 3. Neurocognitive Angle
Repetitive internal statements form *predictive models*—they bias interpretation of future events. Identity declarations (spoken aloud) + embodied action pairing (breathing, posture) reinforce alternative neural pathways, reducing shame-triggered sympathetic spikes (see research on self-distanced self-talk and emotional regulation).

## 4. Crafting Your Gospel Identity Statement
Template: **"In Christ I am [adopted/forgiven/purposed]; therefore I [approach boldly / walk in light / reject lies / serve in love]."** Keep ≤20 words. Attach 2–3 scripture references.

## 5. Deployment Rhythm
Morning Anchor → Post-Trigger Micro (immediately after noticing narrative) → Post-Lapse Reset. Consistency > variety. Evaluate every 30 days.

## 6. Metrics of Renewal
Track: (a) Shame spiral frequency, (b) Time from lapse to confession, (c) Emotional baseline rating (1–10 calm scale), (d) Intrusive self-accusation phrase frequency.

## 7. Theological Summary
Identity renewal is not denial of sin seriousness—it is agreeing with the atoning sufficiency of Christ while rejecting enemy accusation.

> Condemnation’s voice says: "Hide." The Gospel voice says: "Come into the light—already beloved." 
`),
    references: [
      { type: 'scripture', label: 'Romans 8:1' },
      { type: 'scripture', label: 'Colossians 3:3' },
      { type: 'scripture', label: '1 John 1:9' },
      { type: 'resource', label: 'Self-talk & Emotion Regulation (Kross et al.)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4301603/' }
    ],
    tags: ['identity','shame','self-talk'],
    category: 'identity'
  },
  // 4
  {
    slug: 'dopamine-and-porn-neurobiology',
    title: 'Dopamine, Novelty, and the Neurobiology of Pornography',
    summary: 'Plain-language neuroscience translating reward circuitry dynamics into hopeful, Christ-centered intervention.',
    content: build('Dopamine, Novelty, and the Neurobiology of Pornography', `
## 1. Clarifying Myths
Porn use does *not* permanently "destroy" dopamine. Dopamine is a neurotransmitter involved in motivation and reward prediction. Repeated high-intensity novelty exposure can recalibrate sensitivity and expectancy—making everyday pleasures feel comparatively flat *temporarily.*

## 2. Anticipation > Consumption
Research on reward prediction shows dopamine spikes most strongly in **anticipation** (scrolling, searching, preview thumbnails) rather than post-climax. Therefore, *interrupting during the anticipatory micro-steps* yields disproportionate benefit.

## 3. Supernormal Stimulus & Variable Reward
Endless novelty (tabs, categories, escalated content) creates a **variable ratio schedule** (akin to gambling), strengthening habit loops. Fantasy rehearsal further primes arousal pathways.

## 4. Neuroadaptation & Reversibility
Chronic overstimulation can contribute to reduced D2 receptor availability signaling (seen broadly in addiction literature). Encouragingly, human and animal studies indicate receptor/transporter adaptations show plastic change with abstinence + healthy, moderate natural rewards (exercise, social bonding, creative flow).

## 5. Replacement Principle
You can’t simply prune; you must *replant.* Alternative reward sources must be:
1. Relational (conversation, service)  2. Embodied (movement)  3. Purposeful (creative output)  4. Worshipful (Scripture meditation, prayer). These gradually restore baseline joy sensitivity.

## 6. Practical Interventions (Neuro-Informed)
| Target | Tool | Rationale |
|--------|------|-----------|
| Anticipation Loop | Timed grayscale + site blocking in vulnerable window | Dulls novelty salience |
| Ritual Motor Pattern | Inject movement (stand, 10 push-ups) right at search urge | State shift interrupts procedural chain |
| Reward Prediction | Gamify early interruptions (log & celebrate) | Healthy dopamine attached to growth |
| Stress Spillover | Breath + identity phrase | Reduces amygdala-driven urgency |

## 7. Gospel Integration
Romans 12:2 renewal includes **neural** and **moral** transformation—mind renewed by Spirit-led patterned obedience.

> Neuroscience removes mystique; the Gospel supplies meaning and power for re-patterning.
`),
    references: [
      { type: 'scripture', label: 'Romans 12:2' },
      { type: 'resource', label: 'Reward Prediction Error (Schultz)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4826767/' },
      { type: 'resource', label: 'Incentive Salience Theory', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2756052/' },
      { type: 'resource', label: 'NIDA Brain & Addiction Overview', url: 'https://nida.nih.gov/publications/drugfacts/brain-and-addiction' }
    ],
    tags: ['neuroscience','dopamine','behavior'],
    category: 'neuroscience'
  },
  // 5
  {
    slug: 'habit-formation-and-cue-substitution',
    title: 'Habit Formation and Cue Substitution in Sexual Integrity',
    summary: 'Engineer strategic substitutions so the brain relearns efficient, holy routines that meet the real need.',
    content: build('Habit Formation and Cue Substitution in Sexual Integrity', `
## 1. Efficiency Principle
Habits = energy conservation. Porn-related routines survive not due to moral weakness alone but because they are *fast, predictable state changers.* We must build *equally accessible* holy alternatives.

## 2. Loop Anatomy (Expanded)
Cue → Micro-Appraisal ("I feel ___") → Craving (state relief / stimulation) → Routine (old vs designed substitution) → Reward (soothing / novelty / affirmation) → Reinforced Belief ("This works"). We aim to preserve legitimate underlying needs while swapping the *behavioral path.*

## 3. 10-Urge Cue Audit
For the next 10 urges: log Time | Location | Emotion Label | Preceding Activity | Intensity (1–10). Cluster repeating patterns (e.g., late-night bed scrolling). Choose *one* cluster per week → build a substitution script.

## 4. Substitution Matrix (Sample)
| Trigger Cluster | Core Need | Substitution Script |
|-----------------|-----------|---------------------|
| Evening Loneliness | Belonging | Send 2 encouragement texts + pray by name |
| Stress Spike (afternoon) | Regulation | 4‑7‑8 breathing x3 + identity phrase + short walk |
| Mindless Scroll Drift | Meaningful Stimulation | 10 push-ups + drink water + open task list + 90‑sec focus timer |

## 5. Implementation Rules
1. Pre-load tools (saved message templates, water bottle filled). 2. Triggers → immediate script (no negotiation). 3. Log success (win tally). 4. Weekly review celebrate % executed.

## 6. Fogg Model Tie-In
Behavior = Motivation × Ability × Prompt. We reduce *ability friction* of the holy alternative (make it right there) and increase friction of the old (filters, device zoning). Motivation is fueled by identity meaning.

## 7. Spiritual Integration
1 Corinthians 10:13 assures *"a way of escape"*—substitution design is cooperating with the promised faithfulness of God.

> Repetition builds readiness; readiness disarms ritual momentum.
`),
    references: [
      { type: 'scripture', label: '1 Corinthians 10:13' },
      { type: 'scripture', label: 'Proverbs 4:26' },
      { type: 'resource', label: 'Habit Loop (Duhigg)', url: 'https://charlesduhigg.com/the-power-of-habit/' },
      { type: 'resource', label: 'BJ Fogg Behavior Model', url: 'https://behaviormodel.org/' }
    ],
    tags: ['habits','replacement','behavior-design'],
    category: 'behavior'
  },
  // 6
  {
    slug: 'building-accountability-ecosystem',
    title: 'Building an Accountability Ecosystem That Actually Works',
    summary: 'Design a layered, data-informed, grace-centered accountability architecture: roles, rhythms, metrics, escalation, and confidentiality.',
    content: build('Building an Accountability Ecosystem That Actually Works', `
## 1. Why Typical Accountability Fails
Most models = irregular “Did you look?” interrogations → shame + concealment. Effective accountability = *structured, proactive, collaborative discipleship*. It amplifies grace, supplies pattern insight, and accelerates skill acquisition.

## 2. Role Matrix (Diversify Responsibilities)
| Role | Core Function | Meeting Cadence | Risk if Missing |
|------|---------------|-----------------|-----------------|
| Mentor/Pastoral | Theological framing, prayer, perspective | Monthly / as needed | Moralism or burnout |
| Peer Ally | Mutual struggle sharing, micro-wins | Weekly 15–20 min | Isolation / discouragement |
| Data Steward | Helps interpret metrics objectively | Bi-weekly | Emotional overreaction to lapses |
| Tech Steward | Oversees filter / DNS / device zoning | Quarterly audit | Unmonitored vulnerability |

One person *should not* carry all roles → role overload breeds disengagement.

## 3. Core Metrics Dashboard (Lightweight)
Track 5–7 signals (not 30): Early Interrupt Count, Confession Latency (hrs), Sleep Consistency %, High-Risk Window Adherence (device curfew), Replacement Habit Execution %, Mood Baseline (1–10). Review trends, not perfection.

## 4. Weekly Check-In Flow (15 Minutes)
1. **Celebrate** (2 wins). 2. **Review Metrics** (pattern not minutiae). 3. **Analyze** one representative challenge (trigger chain). 4. **Adjust** plan (one tweak). 5. **Pray & Recommit** (identity statement). Keep concise to avoid emotional exhaustion.

## 5. Rapid Escalation Ladder
Trigger Surge → Keyword Text (“RED”) → 5‑minute wait + interrupt protocol → If intensity >6/10 → Live call → If still escalated → Relocate to public or communal space. Pre-defined ladder reduces paralysis.

## 6. Confidentiality & Integrity
Confidential ≠ Secretive. Pre-define boundaries: self-harm risk, abuse disclosure, or severe relapse pattern triggers escalation to appropriate pastoral / clinical help. This clarity builds trust.

## 7. Grace Tone vs Surveillance Tone
Language matters: “Let’s surface patterns to cooperate with grace” > “Report failures.” James 5:16 confession is for *healing*, not humiliation.

## 8. Quarterly Audit
Evaluate: Are roles active? Any metric stale? Are celebrations genuine? Rotate stale questions to keep engagement alive.

> Healthy accountability = structured hope delivery system.
`),
    references: [
      { type: 'scripture', label: 'James 5:16' },
      { type: 'scripture', label: 'Hebrews 10:24-25' },
      { type: 'resource', label: 'Social Support & Relapse Prevention', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4495877/' },
      { type: 'resource', label: 'Accountability & Behavior Change (Peer Support Review)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4892314/' }
    ],
    tags: ['accountability','community','structure'],
    category: 'community'
  },
  // 7
  {
    slug: 'digital-defense-fundamentals',
    title: 'Digital Defense Fundamentals: Filters, DNS, and Layered Protection',
    summary: 'Engineer layered, proportionate technical friction that protects formation time without fueling workaround obsession.',
    content: build('Digital Defense Fundamentals: Filters, DNS, and Layered Protection', `
## 1. Theology of Stewardship
Technology is *formative architecture*. Guardrails are Proverbs 4:23 wisdom—protecting attention so spiritual disciplines can root.

## 2. Layered Model (Redundancy)
| Layer | Tool | Purpose | Failure Case Covered |
|-------|------|---------|----------------------|
| Network | DNS filter (router / CleanBrowsing / OpenDNS) | Blocks broad categories early | Device factory reset still inherits network policy |
| Device | Native Screen Time / App Limits | Time windows & app categories | Public Wi-Fi risk |
| Account | Filter / accountability software | Activity visibility / reporting | Hidden browsing attempts |
| Browser | Extension whitelist | Remove search-based exploit vectors | Incognito misuse |

## 3. Speed Bump Principle
Goal: *Delay + disrupt impulse*, not paralyze life. Overly rigid setups trigger psychological reactance → circumvention attempts. Balance friction: enough to invoke reflection; low enough to preserve trust.

## 4. Device & Access Inventory
Audit: phones (primary/old), tablets, gaming consoles, smart TVs, streaming sticks, laptops, VR headsets. Identify unsupervised vectors (guest mode, forgotten tablet). Close gaps systematically, not ad hoc.

## 5. Log Review Cadence
Weekly: scan flagged domains/time-of-day spikes. Discuss *patterns* (e.g., elevated late-Saturday exploratory searches) rather than shame-laced micro-scrutiny.

## 6. Travel / Hotel Protocol
Preconfigure mobile DNS profile, carry filtered hotspot fallback, request TV adult channel disable. Pre-commit nighttime routine (call + reading + lights out). “I’ll manage” is *not* a plan.

## 7. Decommission Plan
As internalized habits strengthen (consistent year of resilient response), gradually reduce outermost layers while retaining accountability visibility. This tests internal formation without sudden exposure shock.

## 8. Metrics
Time-to-circumvention attempt (should decrease to zero), number of late-night block triggers, subjective friction rating (1–10). Optimize quarterly.

> Guardrails buy *time for truth to speak* before ritual auto-pilot takes over.
`),
    references: [
      { type: 'scripture', label: 'Ephesians 5:15-16' },
      { type: 'scripture', label: 'Proverbs 4:23' },
      { type: 'resource', label: 'Digital Self-Control Tools Review', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5851628/' },
      { type: 'resource', label: 'Psychological Reactance Theory', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2778779/' }
    ],
    tags: ['technology','filters','dns','protection'],
    category: 'technology'
  },
  // 8
  {
    slug: 'philosophy-of-screen-blocking',
    title: 'Philosophy of Screen Blocking: Stewardship not Fear',
    summary: 'Recast blocking as strategic pruning for growth—measured, transparent, temporary, and autonomy-building.',
    content: build('Philosophy of Screen Blocking: Stewardship not Fear', `
## 1. Narrative Shift
Fear narrative: “I am hopeless; I must chain everything.” Gospel stewardship narrative: “I am valuable; I curate formative inputs.” Tone shift influences compliance and long-term internalization.

## 2. Biblical Metaphors
Vigilance (1 Peter 5:8), pruning (John 15), guarding heart (Proverbs 4:23). Blocking = *practical liturgy of pruning*—making space for abiding.

## 3. Reactance Mitigation
Involve the user in: (a) selecting categories, (b) defining review cadence, (c) setting autonomy milestones. Collaborative design lowers workaround motivation.

## 4. Autonomy Ladder
Phase 1 (Acute): Hard category blocks + time windows. Phase 2 (Stabilizing): Introduce soft warnings for some categories. Phase 3 (Maintenance): Logging only + random audits. Regression triggers revert phase for 30 days (clear rule, no shame).

## 5. Transparency Covenant
Document: purpose, scope, review schedule, criteria for adjustments. Share with mentor/spouse; secrecy erodes trust.

## 6. Maturity Metrics
Circumvention attempts → 0, latency from trigger to naming urge ↓, voluntary check-ins ↑, internal narrative language: from “can’t” to “don’t want counterfeit.”

## 7. Deactivation Discernment
Remove layers only after sustained demonstration of resilient identity behaviors in *stress contexts*, not just calm seasons.

> Blocking is fertilizer removal so fruit-bearing roots access light—not a cage.
`),
    references: [
      { type: 'scripture', label: '1 Peter 5:8' },
      { type: 'scripture', label: 'John 15:2' },
      { type: 'scripture', label: 'Proverbs 4:23' },
      { type: 'resource', label: 'Psychological Reactance Theory', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2778779/' }
    ],
    tags: ['blocking','psychology','stewardship'],
    category: 'technology'
  },
  // 9
  {
    slug: 'structured-daily-liturgies',
    title: 'Structured Daily Liturgies for Recovery (Morning & Evening)',
    summary: 'Design micro-liturgies (morning, midday, evening) that regulate physiology, encode identity, and preempt triggers.',
    content: build('Structured Daily Liturgies for Recovery (Morning & Evening)', `
## 1. Definition
Liturgies = *intentional, repeatable sequences* shaping desire and attention. Predictability calms nervous system variability and lowers opportunistic trigger intrusion.

## 2. Morning Anchor (7 Minutes)
1. Grounding breath (4 slow cycles). 2. Identity statement aloud. 3. Short Scripture (lectio—notice one phrase). 4. Top 2 mission tasks spoken. 5. Intercession (1 person). 6. Gratitude (1 item). Keep minimal to ensure adherence.

## 3. Midday Micro Reset (90–150 Seconds)
HALT+ scan (Hungry / Angry / Lonely / Tired / Bored / Stressed). Address the *highest* deficit with a micro intervention (protein snack, short walk, 2-min voice note to friend, 4‑7‑8 breathing). Offer 10-second thanksgiving.

## 4. Evening Examen (6 Minutes)
| Step | Focus | Approx Time |
|------|-------|-------------|
| Gratitude | 3 specific mercies | 1 min |
| Review | 1 trigger chain noted | 2 min |
| Confess & Receive | 1 John 1:9 applied specifically | 1 min |
| Plan | Identify tomorrow’s vulnerable window + counter action | 1 min |
| Worship Stillness | 60-sec silence | 1 min |

## 5. Implementation Tips
Habit stacking (attach to brewed coffee, lunch cleanup, brushing teeth). Visual cues (open journal, pre-placed pen). Remove optional steps if compliance drops below 70% for a week.

## 6. Measurement
Track average evening urge intensity vs baseline month 1. Expect variance compression (extremes moderate) as routines stabilize affect regulation.

## 7. Theological Frame
Morning (Psalm 5:3), continual prayer (1 Thessalonians 5:17), cleansing (1 John 1:9)—liturgies operationalize abiding.

> Repetition rewires reflexes; small sacred rhythms become identity muscle memory.
`),
    references: [
      { type: 'scripture', label: 'Psalm 5:3' },
      { type: 'scripture', label: '1 Thessalonians 5:17-18' },
      { type: 'scripture', label: '1 John 1:9' },
      { type: 'resource', label: 'Habit Stacking Concept', url: 'https://jamesclear.com/habit-stacking' },
      { type: 'resource', label: 'Daily Routines & Mental Health', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6333652/' }
    ],
    tags: ['liturgies','habits','daily-routine'],
    category: 'disciplines'
  },
  // 10
  {
    slug: 'breath-regulation-and-urge-surfing',
    title: 'Breath Regulation and Urge Surfing for Sexual Integrity',
    summary: 'Use structured breathing + attentional reframing to ride out urge waves (5–10 min) without behavioral compliance.',
    content: build('Breath Regulation and Urge Surfing for Sexual Integrity', `
## 1. Urge Kinetics
Most urges spike, plateau briefly, then decay (<10 min) *unless* fed by catastrophic or indulgent rumination. Breath work dampens sympathetic arousal, extending reflective capacity.

## 2. Physiology Snapshot
Prolonged exhalation stimulates vagal pathways → lowers heart rate variability volatility → decreases amygdala-driven urgency (autonomic regulation literature). This is not mystical; it is stewardship of embodied design.

## 3. Protocol: 4–7–8 + Ground + Redirect
1. Inhale 4 (nasal)  2. Hold 7  3. Exhale 8 (audible) × 4 cycles. 4. Identity phrase (“Redeemed & Resilient”). 5. Immediate micro-task: movement or service action to occupy working memory.

## 4. Urge Surfing Mental Script
Label: “A wave is rising.” Observe sensations (tight chest, restless hands) without moral panic. Affirm choice agency: “I can ride; I am not the wave.” Each exhale = release.

## 5. Logging & Personalization
Track: Trigger context | Peak intensity (1–10) | Time to drop below 3 | Technique combo used. After 2 weeks identify fastest regulation pairing.

## 6. Prayer Pairing
Inhale: “Grace received.” Exhale: “False comfort released.” Integrates spiritual dependence with somatic regulation.

## 7. Escalation Criteria
If intensity >7/10 after 3 full sets → escalate to relational contact & environment change (public/common area) to leverage social inhibition.

> Urges are *weather*, not identity—breath slows the storm so truth can reframe desire.
`),
    references: [
      { type: 'scripture', label: 'Psalm 46:10' },
      { type: 'scripture', label: 'Philippians 4:6-7' },
      { type: 'resource', label: 'Breathing & Autonomic Regulation', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5455070/' },
      { type: 'resource', label: 'Mindfulness-Based Relapse Prevention (Urge Surfing)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3651745/' }
    ],
    tags: ['breathing','urge-surfing','regulation'],
    category: 'regulation'
  },
  // 11
  {
    slug: 'cognitive-distortions-and-truth-replacement',
    title: 'Cognitive Distortions and Gospel Truth Replacement',
    summary: 'Identifying distorted thought patterns and replacing them with Scripture-aligned truth.',
    content: build('Cognitive Distortions and Gospel Truth Replacement', `
Distortions (all-or-nothing, catastrophizing, entitlement) amplify cravings by framing escape as necessary. Truth replacement shifts emotional forecast.

## 1. Quick Distortion Inventory
Write last relapse narrative. Highlight absolute words ("always, never"). Replace with accurate, hopeful language.

## 2. Truth Replacement Steps
Trigger Thought → Examine Evidence → Scriptural Reframe → Present Tense Declaration.

## 3. Sample
"I blew it; I’m back to zero." → Evidence: progress trend improving. → Truth: "Growth includes setbacks" (Proverbs 24:16). → Declaration: "I rise in Christ’s strength; today matters." 

## 4. Practice Cadence
Weekly review 3 distortions; build a custom truth deck (index cards / app notes).

## 5. Outcome Metrics
Reduced intensity & duration of shame rumination episodes.

Truth sets free (John 8:32) by altering both neural pathways and spiritual posture.
`),
    references: [
      { type: 'scripture', label: 'John 8:32' },
      { type: 'scripture', label: 'Proverbs 24:16' },
      { type: 'resource', label: 'Cognitive distortions overview (Beck CBT)', url: 'https://beckinstitute.org/blog/cognitive-distortions/' },
      { type: 'resource', label: 'CBT efficacy meta-analysis', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3584580/' }
    ],
    tags: ['cbt','thoughts','truth'],
    category: 'cognitive'
  },
  // 12
  {
    slug: 'halt-plus-emotional-regulation',
    title: 'HALT+ Emotional Regulation: Expanding the Framework',
    summary: 'Using an expanded HALT (Hungry, Angry, Lonely, Tired + Bored, Anxious) to preempt urges.',
    content: build('HALT+ Emotional Regulation: Expanding the Framework', `
Many urges are mis-labeled emotional needs. A structured check-in reduces misdirected soothing.

## 1. Expanded Model
H Hungry | A Angry/Anxious | L Lonely | T Tired | B Bored | S Stressed | E Environmentally primed.

## 2. 60-Second Scan
Rate each 0–3. Any 2+ triggers a micro-intervention (snack/protein, journal 3 lines, 5-min power nap, text friend, environmental change).

## 3. Pre-Loaded Micro-Interventions
Prepare list BEFORE you need it. Decision fatigue undermines regulation.

## 4. Tracking
Log daily highest category. Address chronic patterns (e.g., persistent Tired → sleep hygiene plan).

## 5. Spiritual Integration
Name the need to God honestly; receive provision (Psalm 23 framing).

Emotion literacy dismantles vague cravings and clarifies actionable needs.
`),
    references: [
      { type: 'scripture', label: 'Psalm 23' },
      { type: 'scripture', label: '1 Peter 5:7' },
      { type: 'resource', label: 'Emotion regulation strategies review', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3651533/' }
    ],
    tags: ['emotion','HALT','regulation'],
    category: 'regulation'
  },
  // 13
  {
    slug: 'sleep-circadian-and-impulse-control',
    title: 'Sleep, Circadian Rhythm, and Impulse Control',
    summary: 'Why optimizing sleep architecture dramatically reduces late-night vulnerability.',
    content: build('Sleep, Circadian Rhythm, and Impulse Control', `
Sleep deprivation impairs prefrontal inhibitory control and heightens reward sensitivity—perfect storm for relapse after midnight.

## 1. Chronotype Awareness
Know your natural peak focus windows; schedule demanding tasks then to avoid evening backlog spillover.

## 2. Hygiene Basics
Consistent bedtime, 60-min screen wind-down, low-light environment, caffeine cut 8 hrs prior, magnesium-rich foods.

## 3. Technology Cutoff Ritual
Announce device curfew aloud; place phone in alternate room; pre-open morning Scripture page to reduce morning doomscrolling.

## 4. Metrics
Track: average sleep hours, bedtime variance (goal < 30 min), late-night urge frequency. Expect 20–40% urge reduction with consistent sleep.

## 5. Theology of Rest
Rest is trust (Psalm 127:2). Receiving sleep is embodied humility—a weapon against self-reliant overexertion that breeds escapism.
`),
    references: [
      { type: 'scripture', label: 'Psalm 127:2' },
      { type: 'scripture', label: 'Mark 6:31' },
      { type: 'resource', label: 'Sleep deprivation and self-control', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4341979/' },
      { type: 'resource', label: 'Circadian rhythm overview', url: 'https://www.ncbi.nlm.nih.gov/books/NBK279392/' }
    ],
    tags: ['sleep','circadian','impulse-control'],
    category: 'physiology'
  },
  // 14
  {
    slug: 'nutrition-exercise-neurochemistry',
    title: 'Nutrition, Exercise, and Neurochemistry in Recovery',
    summary: 'Stabilizing mood and motivation with movement and nutrient timing.',
    content: build('Nutrition, Exercise, and Neurochemistry in Recovery', `
Healthy neurotransmitter balance supports resilience against triggers.

## 1. Exercise & BDNF
Moderate aerobic exercise increases Brain-Derived Neurotrophic Factor, supporting plasticity for habit change.

## 2. Resistance Training
Boosts testosterone and mood-regulating endorphins—channeling physical energy constructively.

## 3. Nutrition Basics
Protein with breakfast, omega-3 sources, stable blood sugar (avoid long fasted evening crash). Hydration reduces misinterpreted thirst as restlessness.

## 4. Micro-Rule
"Move before media"—5+ minutes movement before opening entertainment apps.

## 5. Trackers
Log weekly exercise minutes vs urge intensity averages to visualize correlation.

Embodied stewardship complements spiritual disciplines—integrated, not competing.
`),
    references: [
      { type: 'scripture', label: '1 Corinthians 6:19-20' },
      { type: 'resource', label: 'Exercise and BDNF', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3951958/' },
      { type: 'resource', label: 'Omega-3 and mood', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC533861/' },
      { type: 'resource', label: 'Physical activity & addiction recovery', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6566836/' }
    ],
    tags: ['exercise','nutrition','physiology'],
    category: 'physiology'
  },
  // 15
  {
    slug: 'gamification-strategy-recovery',
    title: 'Gamification Strategy: Designing Motivating Recovery Systems',
    summary: 'Harness autonomy, competence, and relatedness (SDT) to reinforce process—not just streak—through ethical gamification.',
    content: build('Gamification Strategy: Designing Motivating Recovery Systems', `
## 1. Motivation Framework
Self-Determination Theory (SDT): Intrinsic motivation rises when **Autonomy** (ownership), **Competence** (visible progress), **Relatedness** (shared journey) are supported. Gamification should *serve* these, not manipulate.

## 2. Metric Categories
| Domain | Example Metric | Purpose |
|--------|----------------|---------|
| Behavioral | Early Interrupts / day | Reinforces proactive vigilance |
| Spiritual | Scripture Meditation Days / week | Roots identity |
| Physiological | Sleep ≥7h nights % | Supports impulse control |
| Relational | Encouragement messages sent | Outward focus |
| Recovery Health | Confession Latency (hrs) | Signals shame reduction |

## 3. Points & Levels (Light System)
Assign 1–3 points per core action (e.g., early interruption=2, scripture meditation=2, encouragement message=1). Level thresholds scale (e.g., 40, 90, 150 cumulative). Level-up ritual: gratitude prayer + healthy reward (walk, creative hour). Avoid food/sugar as primary reinforcer.

## 4. Weekly Quest Structure
Format: “This week I will achieve [Specific Behavioral Frequency].” Example: “Complete 15 early interruption logs by Sunday.” Add a narrative label ("Operation Early Light"). Quests concentrate focus → clarity boosts follow-through.

## 5. Feedback Surfaces
Simple kanban or habit tracker app; color code (green achieved, yellow partial, red missed). Visual immediacy sustains dopaminergic interest ethically.

## 6. Anti-Vanity Guardrails
Do NOT display abstinence streak as sole centerpiece. Blend with process metrics to prevent one-fail collapse mentality.

## 7. Social Layer
Share weekly XP gain snapshot with peer; celebrate mutual top *process* win, not mere streak. Encourages relatedness and humility.

## 8. Review & Sunset
Quarterly: prune metrics that are near-automatic (≥90% consistency) to prevent dashboard bloat. Gamification is *scaffolding*; remove once intrinsic meaning and identity delight dominate.

> Scoreboards should disciple attention toward grace-enabled effort, never into legalistic score-chasing.
`),
    references: [
      { type: 'scripture', label: 'Philippians 3:14' },
      { type: 'resource', label: 'Self-Determination Theory', url: 'https://selfdeterminationtheory.org/' },
      { type: 'resource', label: 'Behavioral Activation Meta Concepts', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3584580/' }
    ],
    tags: ['gamification','motivation','metrics'],
    category: 'behavior'
  },
  // 16
  {
    slug: 'streaks-vs-growth-metrics',
    title: 'Streaks vs Growth Metrics: What to Track',
    summary: 'Replace fragile streak obsession with a multidimensional discipleship dashboard that fuels hope and accuracy.',
    content: build('Streaks vs Growth Metrics: What to Track', `
## 1. The Streak Problem
Binary counters oversimplify sanctification. One lapse resets an impressive number → shame spike → "all-or-nothing" relapse rationale. We need *trend-informed*, grace-aligned metrics.

## 2. Multi-Domain Dashboard
| Domain | Metric | Why It Matters |
|--------|--------|----------------|
| Behavioral | Early Interrupts / week | Proactive vigilance evidence |
| Spiritual | Scripture Engagement Days | Internalization trajectory |
| Emotional | Average Confession Latency (hrs) | Shame diffusion speed |
| Physiological | Sleep Consistency % (within 30 min window) | Impulse control support |
| Relational | Purposeful Encouragement Acts | Outward orientation |
| Resilience | Recovery Time Post-Lapse (hrs to baseline) | Adaptive coping |

## 3. Calculating Rolling Averages
Use 7-day moving averages → reduces noise, reveals true direction. Graph simple line (paper or sheet). Celebrate *slope*, not isolated dips.

## 4. Qualitative Narrative Layer
Monthly 150-word reflection: identity shifts, emotional regulation improvements, service growth. Qualitative meaning cements motivation beyond numbers.

## 5. Spiritual Indicators (Soft Metrics)
Increased spontaneous prayer moments, faster gratitude pivot after stress, decreased catastrophic self-talk frequency. Log as weekly count estimates.

## 6. Review Cadence
Weekly micro (10 min), Monthly narrative, Quarterly strategic pivot (retire plateau metrics, add emerging blind spot metric).

## 7. Theology of Fruit
Galatians 5 fruit descriptors are *character qualities*—slower forming, richer than mere abstinence length.

> Measure what forms Christlikeness, not what flatters ego.
`),
    references: [
      { type: 'scripture', label: 'Galatians 5:22-23' },
      { type: 'resource', label: 'Behavioral Measurement Principles', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5960798/' }
    ],
    tags: ['metrics','tracking','growth'],
    category: 'behavior'
  },
  // 17
  {
    slug: 'data-journaling-pattern-analytics',
    title: 'Data Journaling and Pattern Analytics',
    summary: 'Use lean structured journaling + weekly analytics to surface leverage points without creating compulsive tracking.',
    content: build('Data Journaling and Pattern Analytics', `
## 1. Purpose
Journaling converts vague guilt into actionable insight. Target: *clarity*, not perfectionistic detail.

## 2. Lean Log Schema
Columns: Date | Time | Trigger Category (environment/emotion/cognitive) | Peak Intensity (1–10) | Intervention Used | Outcome (Interrupted / Lapse) | Sleep Hours Prior. One line per meaningful urge episode.

## 3. Weekly Pattern Review (10 Minutes)
Step 1: Tally category frequencies. Step 2: Identify top repeating cluster (e.g., "late-night loneliness"). Step 3: Design/adjust substitution script for that cluster only (focus). Step 4: Note one success story.

## 4. Visualization
Color code: Green = interrupted, Yellow = strong urge w/out lapse, Red = lapse. Humans detect color trends quickly → fosters quick retrospective learning.

## 5. Privacy Boundary
Avoid explicit fantasy detail; log *functional data* (context & response). Prevents re-triggering and sensationalization.

## 6. Anti-Obsession Safeguard
If logging itself becomes anxiety driver (rumination), narrow to ONLY: Date | Trigger Category | Intervention | Outcome for a season.

## 7. Escalation Signal
Sudden spike in a category (≥50% increase week-over-week) triggers midweek accountability touchpoint.

> Data is a servant of sanctification—never the savior.
`),
    references: [
      { type: 'scripture', label: 'Proverbs 27:23' },
      { type: 'resource', label: 'Self-Monitoring & Behavior Change', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2783595/' }
    ],
    tags: ['journaling','analytics','self-monitoring'],
    category: 'behavior'
  },
  // 18
  {
    slug: 'fasting-and-sexual-integrity',
    title: 'Fasting and Sexual Integrity',
    summary: 'Employ biblically grounded fasting to re-train desire orientation and strengthen Spirit-reliant perseverance.',
    content: build('Fasting and Sexual Integrity', `
## 1. Theological Purpose
Fasting = voluntarily abstaining from a legitimate good (food/media) to intensify undistracted dependence on God (Matthew 6:16–18). It exposes *restless compensatory appetites* that often fuel porn cycles.

## 2. Mechanism of Help
Hunger waves teach urge surfing. The body learns: intensity ≠ emergency. This generalizes to sexual urges—strengthening distress tolerance and non-impulsive choice pathways.

## 3. Formats
| Type | Description | Recovery Tie-In |
|------|-------------|-----------------|
| Partial | Skip one meal w/ prayer focus | Mild hunger training |
| Time-Bound | Sunrise→Sunset abstain (water permitted) | Identity resiliency |
| Digital Fast | Social media / entertainment pause | Reduces novelty overstimulation |
| Hybrid | Lunch fast + evening media curfew | Combined sensory reset |

## 4. Protocol (Example: Weekly Lunch Fast)
Pre: Identify single intercession + identity verse. During: 2× 5-min prayer blocks + journaling restlessness words. Break: Gentle nutritious meal + thanksgiving.

## 5. Tracking Impact
Log perceived temptation intensity on fasting day vs baseline. Many report improved evening clarity due to earlier spiritual focus.

## 6. Cautions
Avoid if history of eating disorder (unless under professional oversight). Never performance brag; secrecy before God with selective accountability (mentor) prevents pride.

## 7. Integration with Other Disciplines
Pair with Scripture meditation or service (meal time repurposed to encouragement message). Reinforces replacement reward concept.

> Fasting doesn’t earn grace; it declutters desire so grace is *tasted* more clearly.
`),
    references: [
      { type: 'scripture', label: 'Matthew 6:16-18' },
      { type: 'scripture', label: 'Joel 2:12' },
      { type: 'resource', label: 'Physiological Effects of Fasting', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3946160/' }
    ],
    tags: ['fasting','spiritual-disciplines','desire'],
    category: 'disciplines'
  },
  // 19
  {
    slug: 'prayer-practices-lectio-for-recovery',
    title: 'Prayer Practices: Lectio Divina Adapted for Recovery',
    summary: 'Lectio Divina pace trains attention, embeds identity texts, and supplies rapid recall anchors for urges.',
    content: build('Prayer Practices: Lectio Divina Adapted for Recovery', `
## 1. Why Lectio in Recovery?
Fragmented digital attention undermines deep Scripture encoding. Lectio slows intake → fosters savoring → builds a reservoir for temptation response (Psalm 1:2–3).

## 2. Passage Curating
Weekly rotation of identity & grace-rich passages (Ephesians 1:3–14, Psalm 103:1–14, Romans 8:31–39). Repetition > novelty for consolidation.

## 3. Process (5–8 Minutes)
1. **Read** (aloud, slowly). 2. **Reflect** (phrase that "shimmers"). 3. **Respond** (short prayer). 4. **Rest** (60-sec silence). 5. **Re-Read** (phrase integrated with identity statement).

## 4. Urge Integration
Select one phrase each morning (“He crowns you with steadfast love”) → deploy as *interrupt cue* during temptation wave.

## 5. Logging Effect
Journal: phrase | pre-session emotional tone (1–10) | post-session tone. Track average delta across 2 weeks to reinforce value.

## 6. Variations
Group Lectio (small group) once weekly fosters shared Scripture language—strengthens relational accountability vocabulary.

> Slow chewing produces deeper nourishment; shallow grazing leaves malnourished belief.
`),
    references: [
      { type: 'scripture', label: 'Psalm 1:2-3' },
      { type: 'scripture', label: 'Joshua 1:8' },
      { type: 'resource', label: 'Meditative Reading & Stress Modulation', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5455070/' }
    ],
    tags: ['prayer','lectio-divina','scripture'],
    category: 'disciplines'
  },
  // 20
  {
    slug: 'scripture-meditation-protocol',
    title: 'Scripture Meditation Protocol (Neuro-Focused)',
    summary: 'Structured 7-minute routine leveraging repetition, paraphrase, and personalization to speed truth retrieval.',
    content: build('Scripture Meditation Protocol (Neuro-Focused)', `
## 1. Objective
Move truth from short-term awareness → durable retrieval network accessible under stress (Colossians 3:16).

## 2. 7-Minute Flow
| Minute | Action | Rationale |
|--------|--------|-----------|
| 0–1 | Calm breathing | Prepares attention regulation |
| 1–2 | Read verse aloud (normal pace) | Auditory + visual channels |
| 2–3 | Read slowly emphasizing key verbs | Semantic salience |
| 3–4 | Paraphrase in own words | Deep processing |
| 4–5 | Personalize ("Because this is true, I...") | Application encoding |
| 5–6 | Pray response (praise / petition) | Emotional tagging |
| 6–7 | Silence & still recall attempt | Retrieval practice |

## 3. Weekly Verse Set
Repeat same passage daily for 5–7 days. Resist novelty impulse—consolidation requires spaced repetition.

## 4. Tools & Environment
Low-distraction ambience, index card or minimal note app, consistent location (context-dependent memory cue).

## 5. Evaluation
Monthly recall test: write from memory; underline gaps; fill via targeted review next week.

> Depth beats breadth; internalized few verses outpower superficially skimmed many.
`),
    references: [
      { type: 'scripture', label: 'Colossians 3:16' },
      { type: 'scripture', label: 'Psalm 119:11' },
      { type: 'resource', label: 'Memory Consolidation & Repetition', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2657603/' }
    ],
    tags: ['scripture','meditation','memory'],
    category: 'disciplines'
  },
  // 21
  {
    slug: 'relapse-response-protocol',
    title: 'Relapse Response Protocol: A 24-Hour Redemption Plan',
    summary: 'Turn a lapse into structured learning: immediate confession, analysis, service redirection, and system adjustment.',
    content: build('Relapse Response Protocol: A 24-Hour Redemption Plan', `
## 1. Philosophy
Lapse moments are hinge points: *spiral* (shame → isolation) or *scaffold* (grace → analysis → refinement). Pre-planned protocol short-circuits catastrophic scripts.

## 2. Timeline Breakdown
| Window | Action Set | Purpose |
|--------|------------|---------|
| 0–15 min | Specific confession (1 John 1:9), stand & move, hydration, send keyword to partner | Break secrecy + physiological reset |
| 15–60 min | Bullet trigger chain (≤5 points), identify earliest fork | Capture data while fresh |
| 1–6 hrs | Purposeful service act (encourage / chore) | Counter self-absorption |
| Evening | Review what partial protections worked (delay length, initial interruption) | Reinforce strengths |
| 24 hr | Partner debrief call: present analysis + *one* adjustment | System, not self, revision |

## 3. Analysis Template
Trigger → Narrative → Ritual Step 1 → Decision Fork → Outcome. Identify earliest plausible intercept next time.

## 4. Emotional Regulation Insert
If shame surge persists >30 min, deploy identity statement + breath cycle; if still elevated, escalate relationally (voice call).

## 5. Adjustment Examples
Add earlier device curfew, pre-schedule evening call, refine substitution script, tighten tech filter window.

> Grace doesn’t erase data; it redeems it for wiser obedience.
`),
    references: [
      { type: 'scripture', label: '1 John 1:9' },
      { type: 'scripture', label: 'Micah 7:8' },
      { type: 'resource', label: 'Relapse Prevention Principles', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4553654/' }
    ],
    tags: ['relapse','protocol','growth'],
    category: 'relapse'
  },
  // 22
  {
    slug: 'handling-lapses-without-collapse',
    title: 'Handling Lapses Without Full Collapse',
    summary: 'Categorize lapse severity, deploy tiered interventions, and anchor hope to prevent escalation.',
    content: build('Handling Lapses Without Full Collapse', `
## 1. Tier Definitions
| Tier | Description | Response |
|------|-------------|----------|
| Lapse | Single event; quick confession | Micro-plan adjustment |
| Relapse | Repeating pattern (≥2–3 events short interval) | Full plan review + add structure |
| Collapse | Disengagement + resignation | Immediate pastoral / clinical escalation |

## 2. Early Warning Markers
Skipped check-ins, rationalizing trigger exposure (“research”), late-night unstructured device use resurgence, reduced prayer engagement.

## 3. Intervention Ladder
Lapse → analyze earliest intercept + adjust one system variable. Relapse → re-architect schedule (curfew, added accountability touch). Collapse risk → escalate support (pastor, therapist consult).

## 4. Hope Anchors List
Maintain dynamic list of non-streak evidences: faster confession latency, increased empathy, improved sleep consistency, more service acts, deeper scripture recall. Review post-lapse to counter despair bias.

## 5. Biblical Pattern
Peter’s restoration (John 21) shows failure ≠ disqualification; repentance + recommissioning are near.

> Discernment prevents dramatizing a stumble into an identity verdict.
`),
    references: [
      { type: 'scripture', label: 'John 21:15-19' },
      { type: 'scripture', label: 'Proverbs 24:16' },
      { type: 'resource', label: 'Abstinence Violation Effect', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3652531/' }
    ],
    tags: ['lapse','relapse','mindset'],
    category: 'relapse'
  },
  // 23
  {
    slug: 'boredom-and-meaning-reconstruction',
    title: 'Boredom and Meaning Reconstruction',
    summary: 'Redeem boredom by translating value misalignment into micro-creation and service rather than passive novelty consumption.',
    content: build('Boredom and Meaning Reconstruction', `
## 1. Reframing Boredom
Not absence of stimulation—it’s a *signal of under-expressed values.* Porn exploits this vacuum with cheap novelty. We respond by activating meaningful micro-expression.

## 2. Source Diagnosis
Ask: Is this under-challenge? Social deficit? Low physical activation? Spiritual dryness? Different sources require unique interventions.

## 3. Value Activation Map
List top 5 values (Faith, Creativity, Service, Growth, Community). Predefine 2 ≤5-min micro-acts each (pray short intercession, sketch concept, send encouragement, read 1 paragraph of growth book, voice note check-in).

## 4. Boredom Protocol (90 Seconds)
Pause → Name state (“under-stimulated”) → Pick value → Execute micro-act → Record quick mood shift (1–10). Track patterns.

## 5. Replace Passive Scroll
Scrolling increases novelty tolerance → amplifies later porn trigger potency. Replace with *creation-first* rule (create before consume).

## 6. Theology
Ephesians 2:10: prepared works to walk in. Boredom becomes *call to explore prepared micro-works*.

> Boredom is a dashboard light—investigate, don’t smash it with mindless stimulation.
`),
    references: [
      { type: 'scripture', label: 'Ephesians 2:10' },
      { type: 'resource', label: 'Boredom & Self-Regulation', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7396463/' }
    ],
    tags: ['boredom','meaning','engagement'],
    category: 'motivation'
  },
  // 24
  {
    slug: 'purpose-and-vocation-integration',
    title: 'Integrating Purpose and Vocation into Recovery',
    summary: 'Reframe vocation as active discipleship stewardship to displace counterfeit excitement pathways.',
    content: build('Integrating Purpose and Vocation into Recovery', `
## 1. Purpose Void & Compulsion
Disengaged work increases susceptibility to artificial intensity (porn novelty). Aligning daily labor with Kingdom meaning provides sustainable satisfaction.

## 2. Calling Intersection Exercise
3 Lists: Skills, Burdens (issues that move you), Community Needs. Circle overlaps → initial calling hypotheses. Pray over each for refinement.

## 3. Micro-Mission Lens
If job feels mundane: define service micro-mission (encourage 1 colleague daily, pray over client list, pursue excellence as worship—Colossians 3:23). Narrate tasks as participation in God’s sustaining care.

## 4. Flow State Scheduling
Schedule one challenging, skill-matched task early (reduces later boredom triggers). Flow fosters healthy dopamine engagement.

## 5. Daily Debrief
End day: write one sentence “Today I imaged Christ by…” Builds cumulative meaning memory.

## 6. Quarterly Alignment Review
Assess: Are tasks developing stewardship? Any stagnation requiring skill growth or role renegotiation? Adjust to maintain purposeful stretch.

> Purposeful labor displaces counterfeit rewards through richer, durable satisfaction.
`),
    references: [
      { type: 'scripture', label: '1 Corinthians 15:58' },
      { type: 'scripture', label: 'Colossians 3:23-24' },
      { type: 'resource', label: 'Meaningful Work & Wellbeing', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5553810/' }
    ],
    tags: ['purpose','vocation','calling'],
    category: 'motivation'
  },
  // 25
  {
    slug: 'service-as-replacement-reward',
    title: 'Service and Altruism as Replacement Reward',
    summary: 'Redirect reward drive into prosocial, Kingdom-aligned acts that build resilience and joy.',
    content: build('Service and Altruism as Replacement Reward', `
## 1. Neuro-Theological Frame
Service activates prosocial neurochemistry (oxytocin, dopamine) and orients attention outward—countering self-focused craving loops. Ephesians 2:10 affirms prepared good works as design lane.

## 2. Rapid Service Menu
Create a laminated card: Encourage text (2 min), Pray over 2 names (3 min), Micro-donation (cause), Quick household chore, Voice note blessing. Keep visible at workstation.

## 3. Urge Conversion Protocol
Urge arises → Acknowledge (“I feel pull for counterfeit reward.”) → Select service act → Execute → Log quick checkmark. Reinforces new stimulus-response association.

## 4. Weekly Anchor Project
Longer service (mentoring, local ministry volunteering, tutoring) supplies stable baseline meaning lowering baseline urge volatility.

## 5. Boundary Guard
Service ≠ avoidance. If underlying grief/emotion unprocessed, schedule dedicated processing (journaling / conversation) *in addition* to service acts.

## 6. Metrics
Service acts per week vs average evening urge intensity trend. Expect inverse correlation as outward focus entrenches.

> Holiness is not sterile deprivation; it overflows in constructive love.
`),
    references: [
      { type: 'scripture', label: 'Ephesians 2:10' },
      { type: 'scripture', label: 'Acts 20:35' },
      { type: 'resource', label: 'Altruism & Wellbeing', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5500777/' }
    ],
    tags: ['service','altruism','replacement'],
    category: 'behavior'
  },
  // 26
  {
    slug: 'attachment-healing-secure-community',
    title: 'Attachment Healing and Building Secure Community',
    summary: 'Heal insecure attachment patterns with structured relational practices that displace porn’s counterfeit intimacy.',
    content: build('Attachment Healing and Building Secure Community', `
## 1. Why Attachment Matters in Porn Cycles
Porn offers predictable, low-risk pseudo-intimacy. In insecure attachment (anxious: fear abandonment; avoidant: downplay need) the nervous system privileges *control without vulnerability*. Healing re-trains the threat appraisal around closeness.

## 2. Self-Assessment Snapshot
| Pattern | Internal Narrative | Porn Function | Growth Shift |
|---------|-------------------|---------------|-------------|
| Anxious | “I’ll be left.” | Soothes abandonment panic | Practice delayed reply tolerance |
| Avoidant | “Need = weakness.” | Controlled stimulation without demands | Express 1 need weekly |
| Disorganized | “People = unsafe & desired.” | Self-soothing confusion | Trauma-informed therapy + gradual safe exposure |

## 3. Secure Attachment Behaviors (Daily/Weekly)
| Behavior | Implementation | Metric |
|----------|---------------|--------|
| Consistent Check-In | 1 scheduled call + 2 brief texts | % completed |
| Reciprocal Vulnerability | Share 1 emotional high + 1 low | Count / week |
| Need Expression | Clear request ("Could you pray about X") | Requests logged |
| Repair Attempts | Initiate after tension within 24h | Avg repair latency |

## 4. Healing Practices Layered
Therapy (attachment-informed) → Safe small group (predictable rhythm) → Mentoring (identity reinforcement). Sequence reduces “intimacy shock.”

## 5. Emotion Labeling Drill
3×/day timer → write single-word affect + body sensation. Over 30 days expands granular vocabulary → lowers undifferentiated distress that previously defaulted to porn.

## 6. Relational Exposure Ladder
List 6 escalating vulnerability steps (emoji reaction → surface share → personal struggle headline → detailed struggle context → prayer request → live confession). Progress intentionally; don’t leap tiers.

## 7. Gospel Integration
Adoption (Romans 8:15) supplies a *secure base*; bearing each burden (Galatians 6:2) operationalizes redeemed interdependence.

> Secure attachment is sanctified courage practiced repetitively.
`),
    references: [
      { type: 'scripture', label: 'Romans 8:15' },
      { type: 'scripture', label: 'Galatians 6:2' },
      { type: 'resource', label: 'Attachment & Compulsive Sexual Behavior', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4255472/' },
      { type: 'resource', label: 'Emotion Labeling & Regulation', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2877785/' }
    ],
    tags: ['attachment','community','healing'],
    category: 'community'
  },
  // 27
  {
    slug: 'loneliness-social-architecture',
    title: 'Loneliness and Building Social Architecture',
    summary: 'Engineer a predictable, value-aligned relational rhythm that preempts isolation-driven urge spikes.',
    content: build('Loneliness and Building Social Architecture', `
## 1. From Accidental Isolation → Intentional Architecture
Loneliness is not merely absence of people—it is lack of *felt belonging*. Porn hijacks that deficit. We counter with calendarized belonging signals.

## 2. Weekly Relational Framework (Example)
| Slot | Purpose | Example |
|------|---------|---------|
| Lord’s Day | Corporate worship & sacrament | Sunday AM service |
| Formation Circle | Confession + prayer | Tues small group |
| Mentor Touch | Wisdom & calibration | Bi-weekly call |
| Peer Ally | Mutual data review | Thurs 15‑min check |
| Service Slot | Outward focus | Sat morning outreach |

## 3. Daily Micro-Connects
1 encouragement / thanksgiving text, 1 voice prayer (≤60 sec), brief meme/humor share (light bonding) → lowers evening isolation probability.

## 4. Calendar Color Audit
Export week → highlight relational events (green) vs solo (gray). Goal: at least one green anchor each day (including digital if in-person impossible).

## 5. Vulnerability Progression Ladder
Surface logistic → Life update → Emotional headline → Specific temptation data → Real-time urge alert. Ascend only as trust & reliability proven.

## 6. Introversion Stewardship
Protect recovery by scheduling relational anchors early day; allow late-day decompression that is *structured* (reading, creative) vs unbounded scroll.

## 7. Scripture Frame
Hebrews 10:24–25: stirring up love = designed mutuality; architecture is obedience translated into calendar ink.

> Belonging must be *built*, not waited for.
`),
    references: [
      { type: 'scripture', label: 'Hebrews 10:24-25' },
      { type: 'resource', label: 'Loneliness & Health Outcomes', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3891032/' },
      { type: 'resource', label: 'Social Isolation and Mortality Risk', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5891210/' }
    ],
    tags: ['loneliness','community-design','relationships'],
    category: 'community'
  },
  // 28
  {
    slug: 'stress-cortisol-and-recovery',
    title: 'Stress, Cortisol, and Recovery Resilience',
    summary: 'Systematically audit, categorize, and downshift chronic stressors to shrink escape-driven urges.',
    content: build('Stress, Cortisol, and Recovery Resilience', `
## 1. Stress → Compulsion Link
Elevated, unbuffered cortisol narrows cognitive flexibility; the brain defaults to well-grooved relief behaviors (porn). We lower *baseline load* + increase *acute regulation capacity*.

## 2. Five-Column Stress Audit
| Stressor | Category (Control / Influence / Accept) | Primary Emotion | Current Coping | Planned Adjustment |
|----------|-----------------------------------------|-----------------|----------------|--------------------|
| Late emails | Influence | Anxiety | Scroll in bed | Set 7:30pm email cutoff |
| Conflict w/ coworker | Influence | Frustration | Rumination | Schedule clarifying convo |

## 3. Daily Regulation Stack
| Slot | Practice | Duration |
|------|----------|----------|
| Morning | Scripture anchor + identity | 5 min |
| Midday | Movement walk + breath set | 7–10 min |
| Afternoon | Gratitude jot (1 item) | 1 min |
| Evening | Wind-down (no blue light + prayer) | 30–45 min |

## 4. Boundary Engineering
Batch notifications (2 windows), hard stop for cognitively demanding work 90 min pre-bed, "No decision after 10pm" rule (reduces fatigue-driven browsing).

## 5. Sabbath Rhythm (Weekly Parasympathetic Reset)
Cease (vocational output), Delight (creative hobby, nature), Worship (corporate + private), Reflect (journal God’s provision). Exodus 20:8–10 + Matthew 11:28–30 frame rest as *received gift*.

## 6. Metrics
Perceived Stress Scale (1–10 weekly), Sleep variance (<30 min), Evening urge intensity average, Number of boundary violations. Iterate quarterly.

> Reduce load + increase replenishment = less pressure seeking counterfeit relief.
`),
    references: [
      { type: 'scripture', label: 'Matthew 11:28-30' },
      { type: 'scripture', label: 'Exodus 20:8-10' },
      { type: 'resource', label: 'Stress & Self-Control Capacity', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5501644/' },
      { type: 'resource', label: 'Work Stress & Recovery', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3944567/' }
    ],
    tags: ['stress','cortisol','sabbath'],
    category: 'regulation'
  },
  // 29
  {
    slug: 'mindfulness-and-christian-contemplation',
    title: 'Mindfulness and Christian Contemplation in Recovery',
    summary: 'Redeem attentional training: observe urges, re-anchor in Christ’s presence, and reduce compulsive fusion.',
    content: build('Mindfulness and Christian Contemplation in Recovery', `
## 1. Clarifying Terms
Secular mindfulness = nonjudgmental present awareness. Christian contemplation = attentive presence *before God* (Psalm 46:10; Acts 17:28). We are not emptying into void but re-focusing on Reality.

## 2. Urge Observation Mechanism
Noticing sensations without narrative reduces automatic identification (“I *feel* an urge” vs “I *am* compulsive”). This widens choice gap.

## 3. 4-Min Christ-Centered Observe & Release
Minute 1: Slow nasal breathing; mentally acknowledge “In Him I live.” Minute 2: Scan body top→toe; label sensations (“tight jaw”, “fluttering stomach”). Minute 3: Label the mental event (“planning”, “fantasy fragment”). Minute 4: Prayer surrender: “Jesus, I yield this desire to be rightly reordered.”

## 4. Urge Labeling Script
“A wave is present; I watch it rise; I stay rooted.” Pair with exhale phrase “Yours.”

## 5. Integration Cadence
2 micro practices (late morning, late afternoon) + on-demand during spike. Log whether intensity dropped ≥2 points.

## 6. Cautions & Modifications
Trauma/dissociation history: keep eyes partially open, add grounding object tactile focus. If rumination increases, shorten to 90 seconds and shift to Scripture meditation.

> Awareness is not the finish line; it is the doorway to worshipful reorientation.
`),
    references: [
      { type: 'scripture', label: 'Psalm 46:10' },
      { type: 'scripture', label: 'Acts 17:28' },
      { type: 'resource', label: 'Mindfulness-Based Relapse Prevention', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3651745/' },
      { type: 'resource', label: 'Attention Training & Emotion Regulation', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6612390/' }
    ],
    tags: ['mindfulness','contemplation','attention'],
    category: 'regulation'
  },
  // 30
  {
    slug: 'gratitude-and-neuroplasticity',
    title: 'Gratitude and Neuroplasticity in Recovery',
    summary: 'Employ structured gratitude practices to recalibrate reward sensitivity and dampen scarcity rumination.',
    content: build('Gratitude and Neuroplasticity in Recovery', `
## 1. Why Gratitude In Recovery?
Negative affect (discouragement, stress) often precedes porn use. Gratitude training increases positive affect & resilience, shifting salience away from artificial novelty.

## 2. Daily Specific Three (DST)
Evening: list 3 *non-repeating* specifics ("sunlit walk after rain" > "weather"). Speak them aloud turning list into praise (Psalm 103:2). Duration: ~2 minutes.

## 3. Weekly Gratitude Letter / Voice Note
Choose one person; express concrete impact. Sending social gratitude amplifies oxytocin + relational bonding benefits beyond private journaling.

## 4. Negative Thought Replacement
When scarcity narrative surfaces (“I’m behind”), immediately write a micro gratitude pair (present provision + past deliverance). This interrupts rumination loop.

## 5. Tracking Impact
Log pre/post mood (1–10) for 14 days. Calculate average uplift. If <1 point, increase specificity or add weekly letter component.

## 6. Neuroplastic Rationale
Repeated focus shifts default network bias toward scanning for gifts; lowers baseline restlessness that previously sought high-intensity digital stimulation.

> Gratitude widens awareness: counterfeit reward shrinks in perceived necessity.
`),
    references: [
      { type: 'scripture', label: '1 Thessalonians 5:18' },
      { type: 'scripture', label: 'Psalm 103:2' },
      { type: 'resource', label: 'Gratitude & Wellbeing Study', url: 'https://pubmed.ncbi.nlm.nih.gov/12585811/' },
      { type: 'resource', label: 'Positive Affect & Resilience', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3156028/' }
    ],
    tags: ['gratitude','neuroplasticity','mood'],
    category: 'motivation'
  },
  // 31
  {
    slug: 'building-a-recovery-rule-of-life',
    title: 'Building a Recovery Rule of Life',
    summary: 'Craft a concise, flexible trellis of practices and boundaries that sustain long-term fruitfulness.',
    content: build('Building a Recovery Rule of Life', `
## 1. Definition & Purpose
Rule of Life = intentional, *written* set of rhythms shaping desire toward abiding (John 15:5). It prevents decision fatigue and reactive living.

## 2. Core Domains & Sample Statements
| Domain | Aim Statement (Example) | Daily/Weekly Practice |
|--------|-------------------------|-----------------------|
| Abide | Begin grounded in Word & prayer | 7‑min morning liturgy |
| Body | Steward energy & hormones | In bed by 11; exercise 4x |
| Connect | Live transparently | 2 micro-reaches + weekly ally call |
| Guard | Protect attentional gate | Device dock 10pm; filtered DNS |
| Create/Purpose | Contribute meaningfully | 1 purposeful task before media |
| Serve | Outward love habit | 1 encouragement / day |

## 3. Drafting Process (30 Minutes)
Step 1: Silence & prayer. Step 2: Write 1 sentence per domain (limit scope). Step 3: Add 1–2 measurable practices each. Step 4: Highlight any unrealistic load; trim.

## 4. Review Cadence
Monthly micro (tweak wording), Quarterly deeper audit: Which practices now automatic (≥80% adherence)? Either elevate standard or sunset from written rule to reduce clutter.

## 5. Visibility & Engagement
Print + sign + date. Check off daily domains (binary). Weekly: mark % adherence; aim for *progressing trend* not perfection.

## 6. Accountability Integration
Share PDF/photo with ally; weekly meeting highlights 1 domain flourishing + 1 friction domain (brainstorm small experiment).

> A rule is a *rhythm contract with future you* anchored in grace, not a legalistic leash.
`),
    references: [
      { type: 'scripture', label: 'John 15:5' },
      { type: 'resource', label: 'Rule of St. Benedict (Historical)', url: 'https://www.britannica.com/topic/Rule-of-Saint-Benedict' },
      { type: 'resource', label: 'Habit Adherence & Implementation Intentions', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2562231/' }
    ],
    tags: ['rule-of-life','structure','rhythms'],
    category: 'disciplines'
  },
  // 32
  {
    slug: 'identity-statements-and-self-talk',
    title: 'Identity Statements and Compassionate Self-Talk',
    summary: 'Engineer concise, Scripture-rooted statements that reframe shame and accelerate emotional regulation.',
    content: build('Identity Statements and Compassionate Self-Talk', `
## 1. Why It Matters
Harsh self-talk heightens cortisol & prolongs dysregulation; compassionate, truthful self-address shortens relapse aftermath latency.

## 2. Statement Anatomy
| Element | Description | Example |
|---------|-------------|---------|
| Identity Anchor | Scriptural status | "Redeemed" (Eph 1:7) |
| Christ-Centered Clause | Union framing | "Hidden with Christ" |
| Action Implication | Present tense obedience | "Therefore I walk in light today." |

## 3. Crafting (Template)
“In Christ I am [identity word + ref]; therefore I [action implication] in the Spirit’s power.” Limit ≤18 words.

## 4. Deployment Rhythm
Morning triple repetition (aloud), Post-trigger whisper, Post-lapse reset. Pair with grounding posture (shoulders back, slow exhale) to somatically encode calm.

## 5. Crisis Short Form
Compress to 2–3 words ("Redeemed & Resilient"). Attach to exhale during urge surf.

## 6. Monthly Review & Rotation
Retire statements that have become rote (no emotional resonance). Introduce 1 new attribute (e.g., "Adopted") while retaining tested core.

## 7. Guardrails
Avoid outcome boasting (“unstoppable,” etc.). Keep cross-centered humility to prevent spiritual pride distortions.

> Identity statements are *verbal liturgies* re-inscribing grace over neural shame grooves.
`),
    references: [
      { type: 'scripture', label: 'Ephesians 1:7' },
      { type: 'scripture', label: '1 Peter 2:9' },
      { type: 'resource', label: 'Self-Compassion & Behavior Change', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2790748/' },
      { type: 'resource', label: 'Self-Talk & Emotion Regulation', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4301603/' }
    ],
    tags: ['identity','self-talk','compassion'],
    category: 'identity'
  },
  // 33
  {
    slug: 'deconstructing-fantasy-scripts',
    title: 'Deconstructing Fantasy Scripts and Rewriting Desire',
    summary: 'Decode recurring fantasy to expose the real need, then script holy replacement imagery and practices.',
    content: build('Deconstructing Fantasy Scripts and Rewriting Desire', `
## 1. Purpose
Fantasy scripts are *compressed emotional strategies* (affirmation, control, escape). Dissection weakens their automatic authority.

## 2. Capture & Contain
Immediately after urge: jot 2–3 neutral descriptors (location, relational dynamic) + perceived emotional payoff. Avoid explicit sensory detail to prevent reinforcement.

## 3. Need Translation Framework
| Fantasy Payoff | Core Legit Need | Healthy Provision Strategy |
|----------------|-----------------|----------------------------|
| Admired | Affirmation | Receive spoken encouragement (don’t deflect); gratitude journal God’s acceptance |
| Power | Agency | Complete a challenging task; service leadership act |
| Escape | Relief | Breath + movement + short Psalm meditation |
| Novelty | Stimulation | Creative micro-project (music loop, sketch) |

## 4. Replacement Imagery
Pre-build 2 holy visual anchors: (a) Christ’s welcoming presence (Hebrews 4:16 image), (b) Future purposeful fruit moment (serving others with integrity). Deploy on first fantasy fragment appearance.

## 5. Accountability Script
Share: need category + chosen replacement action + whether imagery helped (binary). Avoid lurid replays—protect both parties.

## 6. Outcome Measurement
Track: frequency of intrusive fantasy start, % interrupted pre-escalation, intensity rating drop after replacement (<3 within 5 minutes?). Iterate imagery if ineffective.

> Unmasked fantasy loses enchantment; truth-fed imagination becomes ally of holiness.
`),
    references: [
      { type: 'scripture', label: '2 Corinthians 10:5' },
      { type: 'scripture', label: 'Psalm 37:4' },
      { type: 'resource', label: 'Imagery & Craving Regulation', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3261310/' }
    ],
    tags: ['fantasy','desire','cognition'],
    category: 'cognitive'
  },
  // 34
  {
    slug: 'environmental-design-device-zoning',
    title: 'Environmental Design and Device Zoning',
    summary: 'Engineer spatial zones and friction points so integrity-friendly behaviors become default.',
    content: build('Environmental Design and Device Zoning', `
## 1. Choice Architecture Principle
Environment silently cues behavior frequency. We shift from willpower reliance → structural bias for holiness (Proverbs 4:26).

## 2. Zone Map & Rules
| Zone | Allowed Activities | Prohibited | Anchor Cue |
|------|--------------------|-----------|------------|
| Focus Desk | Work / study / creation | Entertainment scroll | Open task list card |
| Rest (Bed) | Sleep / prayer / reading print | Phone, streaming | Book + dim lamp |
| Social Room | Fellowship / conversation / group prayer | Isolated late-night browsing | Conversation prompt card |
| Prayer Corner | Scripture / journaling / silence | General work | Journal & verse card |

## 3. Device Dock & Curfew
Central multi-charger in visible area (living room). Curfew alarm triggers physical dock (10pm). Phone remains until morning liturgy complete.

## 4. Visual Replacement Strategy
Remove former ritual objects (e.g., secondary pillow used for late-night phone prop) → replace with Scripture card or gratitude journal. Conditioned cue chain is disrupted.

## 5. Lighting & Soundscape
Warm bulbs evening + low-volume ambient worship reduce arousal; supports melatonin & decreases impulsive browsing probability.

## 6. Travel Adaptation Kit
Portable phone stand (keeps device off bed), preconfigured DNS profile, printed mini identity card. Recreate *familiar protected micro-environment*.

> Structure your space so the path of least resistance is the path of obedience.
`),
    references: [
      { type: 'scripture', label: 'Proverbs 4:26' },
      { type: 'resource', label: 'Choice Architecture (Nudge Theory)', url: 'https://nudges.org/' },
      { type: 'resource', label: 'Environment & Self-Control', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5851628/' }
    ],
    tags: ['environment','design','habits'],
    category: 'technology'
  },
  // 35
  {
    slug: 'minimalist-notification-strategy',
    title: 'Minimalist App & Notification Strategy',
    summary: 'Strip digital noise, batch inputs, and lower salience to reclaim executive bandwidth for formation.',
    content: build('Minimalist App & Notification Strategy', `
## 1. Problem
Interrupt-driven attention lowers working memory fidelity; depleted focus craves easy dopamine (doom scroll → potential porn escalation).

## 2. App Audit Framework
| Category | Keep? | Rationale | Action |
|----------|-------|-----------|--------|
| Messaging (family) | Yes | Relational core | Allow notifications |
| High-trigger social | No | Novelty loop | Remove mobile; desktop only |
| News aggregator | Limit | Anxiety spikes | 1 scheduled check |

## 3. Notification Batching
Disable all except priority contacts. Create 2 daily check windows (e.g., 11:30, 16:30). Outside windows device on Focus mode.

## 4. Visual De-Salience
Enable grayscale + minimal home screen (1 productive folder, calendar, phone). Move browsers off dock. Friction lowers impulsive tapping frequency.

## 5. Measurement & Iteration
Log: average uninterrupted focus block length, number of impulsive unlocks (screen time stats), evening urge intensity. Expect correlation: as focus block ↑, urge volatility ↓.

## 6. Theological Lens
1 Corinthians 10:31—attention stewardship = worship. Curating inputs honors finite cognitive resources.

> Every removed ping returns a slice of contemplative capacity.
`),
    references: [
      { type: 'scripture', label: '1 Corinthians 10:31' },
      { type: 'resource', label: 'Attention Economy & Wellbeing', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5403814/' },
      { type: 'resource', label: 'Digital Self-Control Tools Review', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5851628/' }
    ],
    tags: ['notifications','attention','focus'],
    category: 'technology'
  },
  // 36
  {
    slug: 'travel-and-hotel-safeguards',
    title: 'Travel & Hotel Safeguards for Integrity',
    summary: 'Engineer a portable integrity protocol: pre-plan, environmental zoning, relational tethering, and structured debriefs.',
    content: build('Travel & Hotel Safeguards for Integrity', `
## 1. Risk Profile of Travel
Disrupted circadian rhythm + anonymity + unstructured evenings = amplified temptation probability. We import *structure* & *tether*.

## 2. Pre-Trip Checklist (48–24 Hrs Before)
| Item | Action | Status |
|------|--------|--------|
| Itinerary Share | Send flight + hotel + time zone to ally |  |
| Filter Upgrade | Enable stricter DNS / install temporary mobile profile |  |
| Hotel Call | Request adult channels disabled (many can) |  |
| Evening Anchor Plan | Schedule specific activities (book, course module, call) |  |
| Identity Card | Pack laminated identity & SOS card |  |

## 3. Hotel Room Environmental Design
Immediately: place Bible / journal visibly on desk, designate bed = *sleep & prayer only*, set device charging station far from bed (desk or bathroom counter).

## 4. Evening Flow (Example: 9–11 PM Local)
| Time | Action | Purpose |
|------|--------|---------|
| 21:00 | 10‑min walk or light bodyweight circuit | Shake travel lethargy |
| 21:15 | Call / voice note ally (2–5 min) | Relational presence |
| 21:30 | Reading (physical book) + herbal tea | Wind-down / reduce novelty craving |
| 22:15 | Identity statement + gratitude jot (3 items) | Anchor |
| 22:30 | Lights out (phone docked) | Sleep hygiene |

## 5. SOS Escalation Ladder (If Urge ≥7/10)
1. Leave bed immediately. 2. Identity phrase aloud. 3. 4‑7‑8 breathing ×3. 4. 25 air squats. 5. Text keyword ("TRAVEL RED"). 6. If persists → go to lobby or public area.

## 6. Daily Integrity Debrief (2 Minutes)
Message Format: Sleep hours / Urge peak & response / Trigger anomaly / Plan tweak. Keeps narrative data-rich & concise.

## 7. Return Integration
Within 24h back home: short debrief call → identify any new triggers uncovered (e.g., jet lag evenings) and integrate into main plan.

> Take your *ecosystem* with you; do not travel as a different person.
`),
    references: [
      { type: 'scripture', label: 'Proverbs 21:5' },
      { type: 'resource', label: 'Environmental Triggers & Relapse', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4553654/' },
      { type: 'resource', label: 'Sleep & Travel Fatigue Impact', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5579396/' }
    ],
    tags: ['travel','planning','environment'],
    category: 'technology'
  },
  // 37
  {
    slug: 'weekend-and-holiday-planning',
    title: 'Weekend & Holiday Vulnerability Planning',
    summary: 'Convert high-risk unstructured days into balanced renewal: anchors, substitution, Sabbath delight, and review.',
    content: build('Weekend & Holiday Vulnerability Planning', `
## 1. Why Weekends Derail
Removal of weekday scaffolds increases decision fatigue + boredom windows. Pre-structured renewal prevents drift into novelty seeking.

## 2. Anchor Event Matrix
| Pillar | Example | Slot |
|--------|---------|------|
| Physical | Group hike / workout | Sat 9:00 |
| Relational | Brunch w/ friend / family board game | Sat 11:30 / Sun 14:00 |
| Service | Volunteer hour / encouragement batch texts | Sat 16:00 |
| Spiritual | Corporate worship + extended scripture reflect | Sun AM |
| Creative | Music / writing sprint | Sat 13:30 |

## 3. Tech Zoning Windows
Designate 2 leisure screen blocks (e.g., Sat 17:30–18:30; Sun 15:30–16:15). Outside windows: purposeful or analog activities. Reduce “ambient grazing.”

## 4. Sabbath Distinction (One 24h Period or Split Blocks)
Cease (vocational work), Delight (taste good food, nature), Worship (gathering + private prayer), Rest (nap / unhurried reading). Resist binge streaming marketed as “rest” that leaves you restless.

## 5. Pre-Emptive Vulnerability Script
Friday evening journal: “Likely danger windows:” list times (late-night Sat). Attach concrete substitutions for each.

## 6. Monday 5-Min Review
Questions: Which anchor most life-giving? Any unplanned idle >60 min? Adjust next weekend schedule. Track weekend urge intensity vs anchored hours count.

> Rest without structure decays into restless scrolling; planned delight fortifies resilience.
`),
    references: [
      { type: 'scripture', label: 'Exodus 20:8-10' },
      { type: 'resource', label: 'Unstructured Time & Risk Behaviors', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5382309/' },
      { type: 'resource', label: 'Sabbath & Psychological Wellbeing', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7999949/' }
    ],
    tags: ['weekend','planning','rhythms'],
    category: 'behavior'
  },
  // 38
  {
    slug: 'crisis-moments-sos-toolkit',
    title: 'Crisis Moments & SOS Toolkit',
    summary: 'Pre-packed micro-system for urge spikes: identity, breath, movement, relational tether, and debrief.',
    content: build('Crisis Moments & SOS Toolkit', `
## 1. Rationale
High-intensity urges narrow cognitive bandwidth. A *pre-assembled sequence* removes decision friction and leverages multi-modal regulation.

## 2. Physical Toolkit Contents
| Item | Purpose |
|------|---------|
| Identity & Truth Card | Rapid cognitive reframe |
| Pre-Written Prayer | Low-friction Godward pivot |
| Breath Protocol Card | Somatic downshift |
| Replacement Action List (3) | Immediate substitution |
| Ally Contact (starred) | Relational presence |
| Elastic Band / Grip Tool | Channel nervous energy |

## 3. 180-Second Flow (Timestamp Each)
0:00 Grab card + speak identity statement. 0:30 4‑7‑8 breathing (x3 cycles). 1:30 25 air squats or brisk stairs (state shift). 2:00 Text keyword “SOS” + intensity (1–10). 2:15 Execute selected replacement act (service text / gratitude jot). 3:00 Reassess intensity; if >6 relocate to public space.

## 4. Intensity Grading & Escalation
| Level | Description | Action |
|-------|-------------|--------|
| 1–3 | Mild wave | Standard flow |
| 4–6 | Moderate | Add second movement set |
| 7–8 | High | Immediate call (voice) |
| 9–10 | Critical | Public relocation + extended call |

## 5. Post-Event Debrief (≤2 Minutes)
Log: trigger context + earliest sensation + tool steps completed + intensity drop delta. Celebrate completion even if intensity remained high (process win).

## 6. Weekly Optimization
Review logs: remove unused toolkit item; add emerging effective action. Keep kit lean (≤6 components).

> Preparedness converts panic into practiced liturgy.
`),
    references: [
      { type: 'scripture', label: '1 Corinthians 10:13' },
      { type: 'resource', label: 'Implementation Intentions & Self-Control', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2562231/' },
      { type: 'resource', label: 'Acute Stress Response Regulation', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5579396/' }
    ],
    tags: ['crisis','toolkit','planning'],
    category: 'regulation'
  },
  // 39
  {
    slug: 'progress-plateaus-adjustments',
    title: 'Progress Plateaus and Adaptive Adjustments',
    summary: 'Diagnose plateau domain, run small experiments, and renew spiritual meaning to restore slope.',
    content: build('Progress Plateaus and Adaptive Adjustments', `
## 1. Plateau ≠ Failure
It indicates adaptation; stimuli no longer stretch. We reintroduce *novel challenge* while honoring consistency.

## 2. Plateau Diagnostic Grid
| Domain | Symptom | Root Possibility | Experiment |
|--------|---------|------------------|-----------|
| Spiritual | Mechanical devotions | Low engagement | Switch to lectio or psalm singing 14 days |
| Behavioral | Replacement habit autopilot | Under-challenged | Add complexity (service + prayer pairing) |
| Physiological | Evening fatigue spike | Sleep regression | Enforce device curfew + earlier wind-down |
| Relational | Check-ins shallow | Vulnerability stagnation | Add midweek micro call |
| Purpose | Rising boredom | Underutilized gifts | Start creative/service micro-project |

## 3. Experiment Protocol (2 Weeks)
Define one hypothesis → implement minimal change → record target metric (e.g., early interruptions). After 14 days decide: adopt / modify / discard.

## 4. Accountability Granularity Burst
Shift to twice-weekly 10‑min check-ins for one month to recapture momentum (avoid indefinite frequency increase which causes fatigue).

## 5. Spiritual Renewal Injection
Add 10‑min praise + gratitude journaling block daily for 7 days. Often re-sensitizes heart; then taper to sustainable rhythm.

## 6. Retrospective Gratitude Audit
List last quarter improvements (confession latency, empathy growth). This combats cognitive bias focusing only on current stagnation.

> Plateaus are invitations to *curious iteration*, not condemnation.
`),
    references: [
      { type: 'scripture', label: 'Galatians 6:9' },
      { type: 'resource', label: 'Habit Plateau & Variability', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6124958/' },
      { type: 'resource', label: 'Behavioral Activation Concepts', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3584580/' }
    ],
    tags: ['plateau','adaptation','motivation'],
    category: 'behavior'
  },
  // 40
  {
    slug: 'celebrating-milestones-healthily',
    title: 'Celebrating Milestones Without Pride or Complacency',
    summary: 'Construct grace-centered celebration rituals that reinforce process and humility.',
    content: build('Celebrating Milestones Without Pride or Complacency', `
## 1. Theology of Celebration
Biblical pattern: remember & give thanks (Psalm 115:1). Celebrations *seal memory*, counter apathy, and clarify grace source.

## 2. Milestone Categories
| Category | Example | Why |
|----------|---------|-----|
| Process | 100 early interruptions logged | Reinforces proactive skill |
| Resilience | Confession latency <1h for 30 days | Normalizes quick light-walking |
| Spiritual | 60 consecutive Scripture meditation days | Identity embedding |
| Physiological | 45 nights ≥7h sleep | Neuro support consistency |

## 3. Ritual Blueprint
1. Thanksgiving Prayer (name specific grace). 2. Brief Testimony Share (focus on God’s sustaining). 3. Healthy Reward (nature hike, creative session). 4. Recommitment Declaration (short statement pointing forward). 5. Encourage Another (pass on principle learned).

## 4. Pride / Complacency Safeguards
Avoid publicly posting streak numbers for validation. Emphasize *character fruit* & process metrics. Schedule next humble goal within 24h.

## 5. Documentation & Archive
Milestone log: date, category, reflection (≤80 words). Re-read during discouragement to reactivate hope networks.

> Celebration is worshipful remembrance—fuel for future faithfulness.
`),
    references: [
      { type: 'scripture', label: 'Psalm 115:1' },
      { type: 'scripture', label: '1 Corinthians 15:10' }
    ],
    tags: ['celebration','milestones','gratitude'],
    category: 'motivation'
  },
  // 41
  {
    slug: 'leading-others-after-initial-recovery',
    title: 'Leading Others After Your Recovery Starts',
    summary: 'Disciple others from overflow: timing, scope control, safeguards, and sustainable rhythms.',
    content: build('Leading Others After Your Recovery Starts', `
## 1. When to Begin
Minimum: demonstrable pattern of early interruption + rapid confession + stable spiritual disciplines (mentor affirmation). Premature leadership risks fragile identity outsourcing to helping role.

## 2. Leadership Role Definition
| Aspect | Healthy | Unhealthy |
|--------|--------|-----------|
| Identity | Servant witness | Savior persona |
| Content | Share tools & failures | Offer grandiose guarantees |
| Boundaries | Scheduled check-ins | 24/7 on-call rescuer |

## 3. Guardrails
Maintain your own accountability unchanged; report leadership hours & emotional load monthly to mentor. Decline situations triggering unresolved trauma without support.

## 4. Output / Input Ratio
Adopt 1:1 rule: for each hour of output (helping), invest comparable time in Word/prayer/rest across week.

## 5. Replenishment Plan
Weekly silence block (30 min), quarterly mini retreat (half-day reflection), journaling leadership lessons (preventing pride & drift).

## 6. Script of Humility
“Here is what God is teaching me *in process*; not perfection—dependence.” Normalizes growth orientation for those you serve.

> You lead best when your identity is anchored apart from outcomes of those you help.
`),
    references: [
      { type: 'scripture', label: '2 Corinthians 1:4' },
      { type: 'scripture', label: '1 Peter 5:5' }
    ],
    tags: ['leadership','service','humility'],
    category: 'community'
  },
  // 42
  {
    slug: 'integrating-therapy-and-pastoral-care',
    title: 'Integrating Therapy and Pastoral Care',
    summary: 'Clarify complementary roles, referral indicators, and ethical coordination for holistic care.',
    content: build('Integrating Therapy and Pastoral Care', `
## 1. Rationale
Porn recovery intersects theology (identity, repentance) and psychology (trauma, conditioning). Integrated approach addresses both layers without conflation.

## 2. Referral Indicators
| Indicator | Description |
|-----------|------------|
| Persistent Trauma Symptoms | Flashbacks, hypervigilance, dissociation |
| Unresponsive Compulsivity | Minimal change after structured plan adherence |
| Co-Occurring Mood Disorders | Major depression / clinically significant anxiety |
| Suicidal Ideation | Immediate clinical referral priority |

## 3. Role Distinctions
Pastor: sacramental life, moral/theological framing, prayer support. Therapist: evidence-based interventions (CBT, EMDR, ACT), skill building, trauma processing.

## 4. Communication Protocol (With Consent)
High-level updates only (themes, progress focus areas). No sharing of session intimate details. Maintain secure channel; schedule quarterly sync if needed.

## 5. Integration Practice Example
Therapist assigns cognitive reframe skill → counselee brings reframe to pastoral prayer; Scripture used to reinforce adaptive thought (aligning Philippians 4:8 focus) without weaponizing it against emotion.

## 6. Measuring Synergy
Track: reduction in intrusive thoughts, stabilization of mood baseline, decreased relapse frequency, improved emotional labeling. If plateau occurs, re-evaluate role clarity.

> Distinct gifts; one mission: Christ-formed wholeness.
`),
    references: [
      { type: 'scripture', label: 'Proverbs 11:14' },
      { type: 'resource', label: 'Integrated Care Models Overview', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7151204/' },
      { type: 'resource', label: 'CBT Efficacy Meta-Analysis', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3584580/' }
    ],
    tags: ['therapy','pastoral','integration'],
    category: 'healing'
  },
  // 43
  {
    slug: 'trauma-informed-considerations',
    title: 'Trauma-Informed Considerations in Recovery',
    summary: 'Sequence stabilization, grounding, paced processing, and compassionate self-regulation for trauma-linked compulsion.',
    content: build('Trauma-Informed Considerations in Recovery', `
## 1. Functional Role of Porn in Trauma Context
Often becomes *affect regulation hack* numbing hyperarousal or filling hypoarousal void. We replace with safer regulation repertoire.

## 2. Three-Phase Trauma Model Application
| Phase | Goal | Recovery Translation |
|-------|------|----------------------|
| Stabilization | Safety & regulation | Sleep schedule, grounding, supportive relationships |
| Processing | Traumatic memory integration | Therapist-guided EMDR/CBT as appropriate |
| Integration | Re-engagement & meaning | Service, purpose, leadership-in-measure |

## 3. Grounding Toolkit
5-4-3-2-1 sensory scan (name senses), Temperature shift (cool water wrists), Tactile object (textured stone), Breath pacing + Scripture whisper (“The Lord is near” Psalm 34:18).

## 4. Pacing & Window of Tolerance
Avoid forcing full narrative disclosure early; watch for signs of overwhelm (numbing, spiraling anxiety). If exceeded, return to stabilization tools before continuing content.

## 5. Somatic Integration
Gentle stretching, paced walking, diaphragmatic breathing to reconnect interoceptive awareness → reduces dissociation frequency.

## 6. Compassionate Reframe
Shift self-talk: “This coping kept me surviving; now I’m learning truer refuge.” This neutralizes shame that would sabotage healing velocity.

> Trauma-aware grace: patient, paced, purposeful.
`),
    references: [
      { type: 'scripture', label: 'Psalm 34:18' },
      { type: 'resource', label: 'Trauma & Addiction Link', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4654895/' },
      { type: 'resource', label: 'Window of Tolerance Concept', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6626311/' }
    ],
    tags: ['trauma','safety','grounding'],
    category: 'healing'
  },
  // 44
  {
    slug: 'deconstructing-lies-about-sex',
    title: 'Deconstructing Cultural Lies About Sex',
    summary: 'Expose cultural narratives, contrast with covenant theology, and script personal counter-lies.',
    content: build('Deconstructing Cultural Lies About Sex', `
## 1. Lie vs Truth Matrix
| Cultural Lie | Narrative Effect | Biblical Counter (Ref) | Discipleship Practice |
|--------------|------------------|------------------------|-----------------------|
| "Sex = Core Identity" | Sexualizes self-concept | Image-bearing & adoption (Gen 1; Eph 1) | Identity statements wider than sexuality |
| "Consent = Sole Moral Bar" | Neglects covenant & holiness | Covenant fidelity (Gen 2:24; Eph 5) | Study marriage metaphors in Scripture |
| "Fantasy Harms No One" | Minimizes objectification | Heart-level purity (Matt 5:27–28) | Thought capture journal |
| "Desire = Authentic Self" | Justifies indulgence | Fallen desires needing ordering (1 Th 4:3–5) | Desire naming + surrender |

## 2. Empathy Erosion Mechanism
Objectification research shows repeated sexual object viewing decreases empathic response activation—undermines Christlike love capacity.

## 3. Holiness as Flourishing
Boundaries protect interpersonal safety → deeper trust → richer intimacy (Ephesians 5 mutual self-giving). Holiness ≠ deprivation; it is alignment.

## 4. Personal Lie Inventory Exercise
Write top 3 internalized lies. For each: (a) Source exposure (media, peers), (b) Felt pull, (c) Scripture counter, (d) Replacement declaration. Review weekly.

## 5. Community Dialog Circles
Facilitated small group discussion using matrix; emphasize humility & compassion for cultural saturation rather than smugness.

> Truth dismantles counterfeit promises and frees desire for covenantal joy.
`),
    references: [
      { type: 'scripture', label: 'Genesis 2:24' },
      { type: 'scripture', label: 'Ephesians 5:25-27' },
      { type: 'scripture', label: 'Matthew 5:27-28' },
      { type: 'resource', label: 'Objectification & Empathy', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3522443/' }
    ],
    tags: ['sexual-theology','culture','truth'],
    category: 'theology'
  },
  // 45
  {
    slug: 'redeeming-sexual-desire',
    title: 'Redeeming Sexual Desire',
    summary: 'Reframe, name, and reorder sexual desire as covenantal worship energy rather than shame trigger.',
    content: build('Redeeming Sexual Desire', `
## 1. Theological Frame
Desire is a creational good distorted by the fall—not erased. Redemption = reorientation (1 Th 4:3–5). Suppression alone backfires; *ordering* is key.

## 2. Desire Dissection Exercise
| Felt Sensation | Surface Story | Underlying Legit Longing | Holy Provision Path |
|----------------|---------------|--------------------------|---------------------|
| Restless arousal | “Need release” | Connection / affirmation | Reach out; encouragement exchange |
| Fantasy drift | “Escape stress” | Relief / safety | Breath + Psalm + walk |

## 3. Sublimation Channels
Movement (resistance set), Creative output (write 8 bars music), Service (encouragement message), Focus block on purposeful project. Pair each with brief prayer of offering (“I offer this energy to build, not to consume”).

## 4. Gratitude Ritual
Daily: thank God for design of covenant intimacy (future or present) & capacity to love sacrificially. Gratitude reframes desire from enemy → stewarded gift.

## 5. Fantasy Guard & Redirect
Detect initial narrative fragment → verbal label (“counterfeit script”) → shift into prepared replacement imagery (see fantasy article) + short worship phrase.

## 6. Metrics
Track: instances of arousal energy redirected, resulting emotional state 5 minutes later, frequency of unprocessed arousal leading to lapse. Adjust channel menu.

> Redeemed desire becomes fuel for creative service and covenantal faithfulness.
`),
    references: [
      { type: 'scripture', label: '1 Thessalonians 4:3-5' },
      { type: 'scripture', label: 'Song of Songs 2:7' }
    ],
    tags: ['desire','redemption','sexuality'],
    category: 'theology'
  },
  // 46
  {
    slug: 'relationship-preparation-integrity',
    title: 'Preparing for Future Marriage / Relationships with Integrity',
  summary: 'Form transferable covenant skills: emotional literacy, stewardship, boundaries, intercession, and character metrics.',
  content: build('Preparing for Future Marriage / Relationships with Integrity', `
## 1. Principle
You do not “magically level up” at engagement. Present patterns (attention stewardship, confession speed, emotional avoidance) *export* into future covenant.

## 2. Core Preparation Domains
| Domain | Present Practice | Future Benefit |
|--------|------------------|----------------|
| Emotional Literacy | Daily feeling label + share w/ ally | Conflict clarity |
| Self-Regulation | Urge surfing + breath protocols | De-escalation in marital tension |
| Stewardship | Budget tracking, time blocking | Financial trust / reliability |
| Service Orientation | Daily encouragement act | Other-centered intimacy |
| Sexual Integrity | Replacement & confession rhythm | Trust foundation |

## 3. Emotional Communication Drill (5–4–1)
5 sensations (body scan) → choose 4 emotion words (nuanced, not just “stressed”) → speak 1 core need. Practice weekly with a trusted friend/mentor to reduce future relational mind-reading expectations.

## 4. Financial & Time Stewardship
Baseline budget (categories: giving, essentials, debt, saving, margin). Weekly 10‑min review. Time: color-code calendar (work, recovery, community, rest). Integrity across domains signals future reliability (Luke 16:10 principle).

## 5. Intercessory Rhythm
Weekly 3-minute prayer block for future spouse (growth in Christ, protection, calling). Keeps longing oriented toward *blessing* not fantasy consumption.

## 6. Boundary Pre-Definition
Write personal standards now: media guardrails, physical progression convictions, emotional pacing. Having a document reduces reactive compromise when feelings intensify.

## 7. Character Metrics Dashboard
Track monthly: patience incidents (count moments you paused vs reacted), kindness acts, confession latency, empathy reflections, service hours. These are *fruit growth indicators* (Galatians 5) superior to streak.

> Future covenant health is largely built in hidden present disciplines.
`),
    references: [
      { type: 'scripture', label: 'Galatians 5:22-23' },
      { type: 'scripture', label: 'Proverbs 19:14' }
    ],
    tags: ['marriage-prep','character','future'],
    category: 'relationships'
  },
  // 47
  {
    slug: 'accountability-conversation-framework',
    title: 'Accountability Conversation Framework',
  summary: 'Use a tight five-phase, data-informed, grace-centered check-in template with measurable follow-through.',
  content: build('Accountability Conversation Framework', `
## 1. Philosophy
Predictable structure lowers avoidance, amplifies actionable learning, and protects conversations from shame spirals or superficiality.

## 2. 18-Min Standard Flow
| Min | Phase | Aim | Prompt |
|-----|-------|-----|--------|
| 0–3 | Celebrate | Reinforce progress | 2 concrete wins? |
| 3–8 | Data Review | Trend insight | Any metric slope changes? |
| 8–13 | Root Analysis | Understand one chain | Walk me through earliest intercept? |
| 13–16 | Adjustment | System tweak | One micro-experiment? |
| 16–18 | Prayer & Identity | Grace reinforcement | Identity statement + intercession |

## 3. Data Packet (Sent Pre-Call)
Simple snapshot: early interrupts, confession latency avg, sleep consistency %, replacement execution %, resilience (time to emotional baseline). Reduces live fumbling; fuels focused analysis.

## 4. Pattern-Focused Dialogue Rules
No lurid detail; describe trigger context & narrative phrase. Ask: “What earlier decision point existed?” rather than “Why did you mess up?”

## 5. Mutuality & Equity
Both participants present a metric + a learning. Prevents one-directional interrogation dynamic.

## 6. Action Item Spec (SMART-Lite)
One-liner: Verb + metric + timeframe ("Execute device dock by 10:15pm ≥5 nights"). Logged in shared doc; reviewed next week first.

## 7. Quarterly Framework Refresh
Swap one stale question (“Any lapses?”) for deeper growth question (“Where did you practice self-compassion this month?”) to avoid checkbox fatigue.

> Consistency + curiosity + grace = accountability that heals.
`),
    references: [
      { type: 'scripture', label: 'Ecclesiastes 4:9-10' },
      { type: 'resource', label: 'Peer support effectiveness', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4892314/' }
    ],
    tags: ['accountability','framework','community'],
    category: 'community'
  },
  // 48
  {
    slug: 'ninety-day-sprint-plan',
    title: 'Building a 90-Day Recovery Sprint Plan',
  summary: 'Design a structured 90-day experiment: pillar selection, cascading goals, review cadences, and adaptive pruning.',
  content: build('Building a 90-Day Recovery Sprint Plan', `
## 1. Sprint Rationale
90 days = long enough for neuro & habit consolidation; short enough for urgency & focused thematic emphasis (avoid amorphous “get better”).

## 2. Pillar Selection (Choose 3–5)
| Pillar | Example Sprint Focus | Primary Metric |
|--------|----------------------|----------------|
| Behavioral | Early interruption mastery | # interruptions/week |
| Spiritual | Scripture meditation consistency | Days practiced % |
| Physiological | Sleep regularity | Bedtime variance <30m |
| Community | Accountability upgrade | Check-in adherence % |
| Purpose | Launch service micro-project | Milestone completion |

## 3. Goal Laddering
Quarter Goal → Monthly Sub-Goal → Weekly Activity Target. Example: Quarter: “Reduce confession latency to <1h average.” Month 1: map baselines; Month 2: implement immediate text script; Month 3: refine emotion naming.

## 4. Metrics Dashboard (Minimal)
5 rows (one per pillar) × columns (Week 1..12). Fill with actual values; color trend lines (green improving, yellow flat, red regression). Visual slope keeps motivation.

## 5. Weekly 10-Min Review
Ask: (1) What moved? (2) What stalled? (3) One micro-adjust? Capture in log. Protect from sprawling analysis.

## 6. Mid-Sprint Retrofit (Day 45)
Retire any metric at ≥85% consistency (habit established) → introduce emerging weak spot to avoid plateau.

## 7. Sprint Close Ritual
Testimony share (2 learnings), quantitative before/after summary, gratitude prayer, select next sprint’s thematic anchor (different pillar emphasis to keep freshness).

> Sprints convert aspiration into time-bound discipleship experiments.
`),
    references: [
      { type: 'scripture', label: 'Habakkuk 2:2' },
      { type: 'resource', label: 'Goal setting performance meta-analysis', url: 'https://pubmed.ncbi.nlm.nih.gov/19116899/' }
    ],
    tags: ['planning','goals','sprint'],
    category: 'behavior'
  },
  // 49
  {
    slug: 'long-term-maintenance-legacy-vision',
    title: 'Long-Term Maintenance and Legacy Vision',
  summary: 'Shift from acute change to durable legacy: broaden metrics, codify vision, invest downstream.',
  content: build('Long-Term Maintenance and Legacy Vision', `
## 1. Transition Markers to Maintenance
Reduced urge volatility, stable confession latency, internal motivation (identity joy) > external tool reliance. Now reframe objective: *fruitfulness & multiplication*.

## 2. Legacy Vision Craft
Statement Template: “By grace I will model [trait cluster] so that [relational / generational impact].” Example: “Model patient, wholehearted obedience so families I influence taste Christ’s purity & hope.” Read first day monthly; journal one alignment action.

## 3. Expanded Maintenance Metrics (Monthly)
| Domain | Metric | Threshold | Action If Below |
|--------|--------|-----------|-----------------|
| Spiritual Vitality | Scripture meditation days % | <70% | Reintroduce 7‑min protocol |
| Relational Investment | Meaningful outbound encouragements | <8 | Schedule encouragement block |
| Service / Mentoring | Hours / month | <2 | Recommit or recruit mentee |
| Resilience | Avg confession latency (hrs) | >2 | Refresh relapse protocol |
| Purpose Development | Project milestone progress | Stalled 2 months | Re-scope or pivot |

## 4. Multiplication Strategy
Mentor 1–2 others (structured; not overload). Document distilled lessons (personal “Recovery Field Notes”). Possibly create teaching outline for small group.

## 5. Purpose Diversification
Initiate creative/mission projects (writing devotional series, community service initiative). New meaning streams prevent stagnation and reduce relapse risk.

## 6. Drift Early-Warning Indicators
Rationalizing soft boundaries, reduced prayer spontaneity, creeping secrecy in device usage. Immediate 30-day intensification cycle (restore weekly audit, add midweek check) if two indicators appear.

> Legacy is cultivated, not assumed—maintained through rhythmic recalibration.
`),
    references: [
      { type: 'scripture', label: 'Psalm 78:4' },
      { type: 'scripture', label: '2 Timothy 2:2' }
    ],
    tags: ['legacy','maintenance','vision'],
    category: 'motivation'
  },
  // 50
  {
    slug: 'eternal-perspective-and-perseverance',
    title: 'Eternal Perspective and Perseverance',
  summary: 'Anchor effort in eschatological hope: structured meditation, reframing suffering, and endurance metrics.',
  content: build('Eternal Perspective and Perseverance', `
## 1. Eschatological Reframe
2 Corinthians 4:17–18 contrasts “momentary light affliction” with “eternal weight of glory.” Eternity recalibrates perceived scale of present urges + setbacks.

## 2. Morning Hope Liturgy (60 Seconds)
1. Read one future promise (Revelation 21:3–5). 2. Whisper: “Future wholeness is certain; today’s fight is meaningful.” 3. Brief breath prayer of surrender. Fast, repeatable.

## 3. Suffering → Formation Chain
Romans 5:3–5 progression: tribulation → perseverance → proven character → hope. Journal weekly: identify one hardship and trace where perseverance emerged.

## 4. Discouragement Recovery Metric
Track: (a) Frequency of discouragement dips, (b) Time to re-anchor in hope (minutes). Aim to shrink (b) while acknowledging dips honestly (not denial).

## 5. Worship as Future Foretaste
Select 3 “hope hymns/songs” playlist. Use during post-lapse debrief to *pull gaze forward* rather than spiraling inward.

## 6. Community Hope Exchange
Monthly: share one hope verse + short reflection with ally; receive theirs. Cross-pollination broadens scriptural hope reservoir.

> Perseverance is sustained by the gravity of coming glory, not the novelty of current tactics.
`),
    references: [
      { type: 'scripture', label: '2 Corinthians 4:17-18' },
      { type: 'scripture', label: 'Romans 5:3-5' },
      { type: 'scripture', label: 'Revelation 21:3-5' }
    ],
    tags: ['hope','eternity','perseverance'],
    category: 'theology'
  }
];

export default ARTICLES;
