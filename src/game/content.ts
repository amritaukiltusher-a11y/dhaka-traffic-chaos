import type { EventType, GameResult } from './engine';
import type { Lang } from '../lib/storage';

/** All humour below is original, fictional game content. */

type Pool = { bn: string[]; en: string[] };

export const EVENT_MESSAGES: Record<EventType, Pool> = {
  crash: {
    bn: ['ঠকাস! আজকের গল্প জমে গেল।', 'বাম্পার-টু-বাম্পার ভালোবাসা!', 'ব্রেকটা পায়ের নিচেই ছিল, ভাই!', 'ধাক্কা লাগল, আর সবাই বলছে "দোষ আপনার"!'],
    en: ['Bang! Today’s story just got better.', 'Bumper-to-bumper love!', 'The brake was right under your foot, friend!', 'A bump — and everyone says it was your fault!']
  },
  nearMiss: {
    bn: ['সুতোর ব্যবধানে বাঁচলেন!', 'চুল পরিমাণ ফাঁক দিয়ে গলে গেলেন!', 'এটাকে বলে ওস্তাদি ড্রাইভিং!'],
    en: ['Saved by a thread!', 'Squeezed through a hair’s gap!', 'That’s master-class driving!']
  },
  pickup: {
    bn: ['চার্জ পেলেন! আজ রাতে ঘুমটা নিশ্চিন্ত।', 'ব্যাটারি ফুলফুল!', 'বিদ্যুৎ আছে, তাই ভরসা আছে!'],
    en: ['Charged up! Sleep easy tonight.', 'Battery full-full!', 'Power is here, so hope is here!']
  },
  pothole: {
    bn: ['গর্ত না, এটা গোপন সুইমিং পুল!', 'ঝাঁকুনিতেই সকালের নাস্তা হজম।', 'রাস্তা না, রোলার-কোস্টার!'],
    en: ['Not a pothole — a secret swimming pool!', 'That jolt digested your breakfast.', 'Not a road — a roller coaster!']
  },
  pedestrian: {
    bn: ['মামা ঠিক ওই মুহূর্তেই রাস্তা পার হচ্ছিলেন!', 'পথচারী লাফিয়ে সরলেন — অলিম্পিক মানের!', 'জেব্রা ক্রসিং নেই, তবু ক্রসিং চলছে!'],
    en: ['Uncle chose that exact moment to cross!', 'The pedestrian hopped away — Olympic quality!', 'No zebra crossing, yet crossing continues!']
  },
  horn: {
    bn: ['পুঁ-পুঁ! কেউ শোনেনি, তবুও বাজালেন।', 'হর্নই আজ আপনার ব্রেক!', 'হর্ন বাজালে নাকি জ্যাম কমে (গুজব)!'],
    en: ['Honk-honk! Nobody listened, but you honked.', 'The horn is your brake today!', 'They say honking clears jams (rumour)!']
  },
  boost: {
    bn: ['টার্বো মোড! (রিকশার সম্মান রেখে)', 'ফুল স্পিড, ফুল স্টাইল!'],
    en: ['Turbo mode! (respecting the rickshaw)', 'Full speed, full style!']
  },
  levelUp: {
    bn: ['জ্যাম বেড়েছে! নতুন লেভেল', 'রাস্তা আরও জমজমাট! লেভেল'],
    en: ['The jam grows! New level', 'The street gets livelier! Level']
  },
  lowBattery: {
    bn: ['ব্যাটারি কমছে — চার্জিং স্টেশন খুঁজুন!', 'বিদ্যুৎ ফুরোচ্ছে, ⚡ খুঁজুন!'],
    en: ['Battery is draining — find a charging spot!', 'Running out of power — look for ⚡!']
  },
  pursuit: {
    bn: ['ক্ষ্যাপা বাস পেছনে! জোরে চালান!', 'পেছনে গর্জন! বাসটা রেগে আছে!'],
    en: ['The Angry Bus is right behind you! Go faster!', 'A roar behind you! The bus is furious!']
  },
  shield: {
    bn: ['জুগাড় শিল্ড চালু! কিছুক্ষণ অদৃশ্য ভান করুন।', 'জুগাড় শিল্ড! ধাক্কা আজ ছুটিতে।'],
    en: ['Jugaad Shield on! Pretend to be invisible for a bit.', 'Jugaad Shield! Crashes are on holiday.']
  }
};

export function eventMessage(type: EventType, lang: Lang, value?: number): string {
  const pool = EVENT_MESSAGES[type][lang];
  const base = pool[Math.floor(Math.random() * pool.length)];
  if (type === 'levelUp' && value) return `${base} ${value}`;
  return base;
}

/* ---------------------------------------------------- procedural headlines */

// Parallel arrays: index i in `bn` matches index i in `en`.
const SUBJECTS = {
  bn: ['এক রিকশাচালক', 'সিএনজি চালক মামা', 'লোকাল বাসের কন্ডাক্টর', 'একটি ইলেকট্রিক অটো', 'সিগন্যালের লাল বাতি', 'মোটরবাইক আরোহী', 'ফুটপাতের চা-দোকানি', 'এক পথচারী ভাই'],
  en: ['A rickshaw puller', 'A CNG uncle', 'A local-bus conductor', 'An electric auto', 'A red traffic light', 'A motorbike rider', 'A footpath tea seller', 'A pedestrian']
};
const ACTIONS = {
  bn: [
    'জ্যামে আটকে নতুন রেকর্ড গড়লেন',
    'গর্তে পড়ে গোপন সুড়ঙ্গ আবিষ্কার করলেন',
    'ইউ-টার্ন নিয়ে নিজেই পথ হারালেন',
    'হর্ন বাজিয়ে পুরো পাড়া জাগালেন',
    'লেন মেনে চলার চেষ্টা করে সবাইকে অবাক করলেন',
    'অফিসে পৌঁছে দেখলেন ছুটির ঘণ্টা বাজছে',
    'রাস্তার মাঝখানে হঠাৎ ধ্যানে বসলেন'
  ],
  en: [
    'set a new record while stuck in a jam',
    'fell into a pothole and discovered a secret tunnel',
    'took a U-turn and lost the way',
    'honked and woke up the whole neighbourhood',
    'tried to follow the lane rules and shocked everyone',
    'reached the office just as the closing bell rang',
    'suddenly sat down to meditate mid-road'
  ]
};
const OUTCOMES = {
  bn: ['— বিশেষজ্ঞরা বলছেন, ধৈর্য নাকি ফ্রি!', '— সবাই মোবাইলে ভিডিও করছে।', '— ম্যাপ অ্যাপও হাল ছেড়েছে।', '— চা-বিস্কুটের বিক্রি হু-হু করে বাড়ছে।', '— সবাই বলছে, "আমি আগেই বলেছিলাম!"', '— ঘটনাস্থলে কৌতূহলী জনতার ভিড়।'],
  en: ['— experts say patience is free!', '— everyone is filming it.', '— even the map app has given up.', '— tea-and-biscuit sales are soaring.', '— everyone says, "I told you so!"', '— curious crowds gather at the scene.']
};

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface Headline {
  bn: string;
  en: string;
}

export function generateHeadline(rnd: () => number = Math.random): Headline {
  const si = Math.floor(rnd() * SUBJECTS.bn.length);
  const ai = Math.floor(rnd() * ACTIONS.bn.length);
  const oi = Math.floor(rnd() * OUTCOMES.bn.length);
  return {
    bn: `${SUBJECTS.bn[si]} ${ACTIONS.bn[ai]} ${OUTCOMES.bn[oi]}`,
    en: `${SUBJECTS.en[si]} ${ACTIONS.en[ai]} ${OUTCOMES.en[oi]}`
  };
}

export function generateHeadlines(count: number, seed: number): Headline[] {
  const rnd = mulberry32(seed);
  const out: Headline[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < count && guard++ < 200) {
    const h = generateHeadline(rnd);
    if (!seen.has(h.bn)) {
      seen.add(h.bn);
      out.push(h);
    }
  }
  return out;
}

const OVER_POOLS: Record<GameResult['reason'] | 'generic', Headline[]> = {
  battery: [
    { bn: 'ব্যাটারি শেষ! অটো চালক ঠেলে ঠেলে অফিসে রওনা', en: 'Battery dead! Auto driver pushes it all the way to work' },
    { bn: 'চার্জ ফুরোতেই রাস্তার মাঝে চা-আড্ডা শুরু', en: 'Charge ran out, and a tea session began mid-road' },
    { bn: '"আরেকটু হলেই পৌঁছে যেতাম" — ব্যাটারি-হীন চালকের আক্ষেপ', en: '"I was almost there" — the powerless driver laments' }
  ],
  caught: [
    { bn: 'ক্ষ্যাপা বাস ধরে ফেলল! চালককে চা-বিরতিতে বাধ্য করা হলো', en: 'The Angry Bus caught up! Driver forced into a tea break' },
    { bn: 'পেছনের গর্জন থামল, সামনে শুধু হাসি-মুখ বাস', en: 'The roar behind stopped — only a smiling bus remained' },
    { bn: 'বাসের সঙ্গে দৌড়ে হার, তবে রিকশার মান বেঁচে গেল', en: 'Lost the race to the bus, but the auto kept its dignity' }
  ],
  generic: [
    { bn: 'আজও ঢাকার রাস্তা জিতে গেল', en: 'Once again, the street won' },
    { bn: 'নতুন চালকের আগমনে জ্যামও উত্তেজিত', en: 'Even the jam is excited by the new driver' },
    { bn: 'গর্তগুলো বলছে: "আবার এসো!"', en: 'The potholes say: "Come again!"' }
  ]
};

export function resultHeadline(result: GameResult): Headline {
  const specific = OVER_POOLS[result.reason];
  const extra: Headline[] = [];
  if (result.collisions === 0) extra.push({ bn: 'ধাক্কাহীন যাত্রা! এমন চালক নাকি কাল্পনিক জগতেও বিরল', en: 'A crash-free ride! Rare even in a fictional world' });
  if (result.collisions >= 8) extra.push({ bn: 'এত ধাক্কা! গাড়ির রংমিস্ত্রি আজ ব্যস্ত', en: 'So many bumps! The body-shop is busy today' });
  if (result.score >= 3000) extra.push({ bn: 'স্কোরে আকাশছোঁয়া! গুজব: মেয়র নাকি চাকরি অফার করেছেন (কাল্পনিক)', en: 'Sky-high score! Rumour: the mayor offered a job (fictional)' });
  const pool = [...specific, ...OVER_POOLS.generic, ...extra];
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ---------------------------------------------------------- fictional stats */

export const NEWS_CATEGORIES = {
  bn: ['জ্যাম', 'গর্ত', 'হর্ন', 'চা-বিরতি', 'সিগন্যাল', 'লেন-যুদ্ধ'],
  en: ['Jam', 'Pothole', 'Honk', 'Tea break', 'Signal', 'Lane war']
};
