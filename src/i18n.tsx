import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { GAME_NAME } from './config';
import { patchPrefs, prefsStore, type Lang } from './lib/storage';
import { useStore } from './lib/store';

const bn = {
  'nav.play': 'খেলুন',
  'nav.how': 'নিয়ম',
  'nav.stats': 'পরিসংখ্যান',
  'nav.news': 'খবর',
  'nav.board': 'লিডারবোর্ড',
  'nav.install': 'ইনস্টল',
  'nav.menu': 'মেনু',
  'nav.lang': 'English',
  'nav.langLabel': 'Switch to English',
  'nav.skip': 'মূল অংশে যান',

  'common.fictional': 'কাল্পনিক · গেম কনটেন্ট',

  'hero.tag': 'ব্যঙ্গাত্মক থ্রিডি ড্রাইভিং গেম',
  'hero.desc': 'ইলেকট্রিক অটো নিয়ে ঢাকার ব্যস্ত রাস্তায় নামুন। বাস, ট্রাক, সিএনজি আর গর্ত এড়িয়ে চার্জ বাঁচান, ক্ষ্যাপা বাসের হাত থেকে পালান — সবই মজার ছলে, সম্পূর্ণ কাল্পনিক।',
  'hero.start': 'রাস্তায় নামুন',
  'hero.howto': 'নিয়ম দেখুন',
  'hero.traffic.title': 'লাইভ-লুকিং ট্র্যাফিক প্যানেল',
  'hero.traffic.jam': 'জ্যামের মাত্রা',
  'hero.traffic.speed': 'গড় গতি',
  'hero.traffic.mood': 'হর্নের মেজাজ',
  'hero.traffic.note': 'এই প্যানেলের সংখ্যাগুলো সম্পূর্ণ কাল্পনিক এবং বাস্তব ট্র্যাফিক নির্দেশ করে না।',
  'hero.mood.calm': 'শান্ত (ভান)',
  'hero.mood.angry': 'ক্ষ্যাপা',
  'hero.mood.chaos': 'পুরো কেয়স',

  'stage.loading': 'গেম লোড হচ্ছে…',
  'stage.error': 'থ্রিডি গেম চালু করা গেল না। আপনার ব্রাউজার WebGL সমর্থন করে কিনা দেখুন।',
  'stage.retry': 'আবার চেষ্টা করুন',
  'stage.nickname': 'ডাকনাম',
  'stage.nickPlaceholder': 'যেমন: জ্যাম-সম্রাট',
  'stage.start': 'রাস্তায় নামুন',
  'stage.pause': 'বিরতি',
  'stage.resume': 'আবার চালু',
  'stage.restart': 'নতুন করে শুরু',
  'stage.menu': 'মেনুতে ফিরুন',
  'stage.paused': 'বিরতি চলছে',
  'stage.soundOn': 'শব্দ চালু',
  'stage.soundOff': 'শব্দ বন্ধ',
  'stage.quality': 'গ্রাফিক্স',
  'stage.qualityLow': 'কম',
  'stage.qualityHigh': 'বেশি',
  'stage.fullscreen': 'বড় পর্দা',
  'stage.exitFullscreen': 'ছোট পর্দা',
  'stage.preview': 'লাইভ প্রিভিউ — অটোপাইলট চলছে',
  'stage.label': 'গেম এলাকা',

  'hud.score': 'স্কোর',
  'hud.distance': 'দূরত্ব',
  'hud.time': 'সময়',
  'hud.damage': 'জাতীয় ক্ষতি',
  'hud.battery': 'ব্যাটারি',
  'hud.speed': 'গতি',
  'hud.kmh': 'কিমি/ঘ',
  'hud.pursuit': 'ক্ষ্যাপা বাস',
  'hud.level': 'লেভেল',
  'hud.shield': 'শিল্ড',
  'hud.boost': 'বুস্ট',
  'hud.ready': 'প্রস্তুত',

  'res.title': 'যাত্রা শেষ!',
  'res.reasonBattery': 'ব্যাটারি ফুরিয়ে গেছে',
  'res.reasonCaught': 'ক্ষ্যাপা বাস ধরে ফেলেছে',
  'res.player': 'চালক',
  'res.score': 'মোট স্কোর',
  'res.distance': 'দূরত্ব',
  'res.collisions': 'সংঘর্ষ',
  'res.battery': 'ব্যাটারি বাকি',
  'res.time': 'টিকে থাকার সময়',
  'res.damage': 'জাতীয় ক্ষতি (কাল্পনিক)',
  'res.submit': 'স্কোর জমা দিন',
  'res.submitted': 'জমা হয়েছে ✓',
  'res.again': 'আবার খেলুন',
  'res.newBest': 'নতুন ব্যক্তিগত রেকর্ড!',
  'res.headlineLabel': 'আজকের কাল্পনিক শিরোনাম',
  'res.anon': 'অজানা চালক',

  'ctl.title': 'কীভাবে খেলবেন',
  'ctl.sub': 'কিবোর্ড বা টাচ — যেটা সুবিধা। ব্যাটারি বাঁচান, ক্ষ্যাপা বাসকে এড়ান, আর যত পারেন সংঘর্ষ কম করুন।',
  'ctl.accel': 'গতি বাড়ান',
  'ctl.brake': 'ব্রেক',
  'ctl.left': 'বামে',
  'ctl.right': 'ডানে',
  'ctl.boost': 'বুস্ট',
  'ctl.special': 'জুগাড় শিল্ড',
  'ctl.horn': 'হর্ন',
  'ctl.mute': 'শব্দ চালু/বন্ধ',
  'ctl.pause': 'বিরতি / চালু',
  'ctl.keysTitle': 'কিবোর্ড',
  'ctl.touchTitle': 'মোবাইল / টাচ',
  'ctl.touchDesc': 'পর্দার নিচে বড় বোতামগুলো ব্যবহার করুন: বাম-ডান স্টিয়ারিং, অ্যাক্সিলারেটর, ব্রেক, বুস্ট, হর্ন ও শিল্ড। একসঙ্গে একাধিক বোতাম চাপা যায়।',
  'ctl.rulesTitle': 'খেলার নিয়ম',
  'ctl.rule1': 'ব্যাটারি কমতেই থাকে — ⚡ চার্জ সংগ্রহ করুন, বুস্ট কম ব্যবহার করুন।',
  'ctl.rule2': 'ধাক্কা লাগলে ব্যাটারি, গতি আর পেছনের দূরত্ব কমে।',
  'ctl.rule3': 'ক্ষ্যাপা বাস পেছনে তাড়া করছে — গতি ধরে রাখুন, নইলে ধরা!',
  'ctl.rule4': 'সময় যত যায় জ্যাম তত বাড়ে। সুতোর ব্যবধানে বাঁচলে বোনাস পয়েন্ট।',
  'ctl.rule5': 'হর্ন সামনের ধীর গাড়িকে লেন বদলাতে ঠেলে দিতে পারে (সবসময় নয়)।',
  'ctl.rule6': 'জুগাড় শিল্ড কিছুক্ষণ ধাক্কা থেকে বাঁচায়, তবে ব্যাটারি খরচ করে।',

  'stats.title': 'পরিসংখ্যান ও কাউন্টার',
  'stats.note': '"আপনার রেকর্ড" আপনার এই ডিভাইসে সংরক্ষিত বাস্তব গেম-ডেটা। "কাল্পনিক শহর-কাউন্টার" সম্পূর্ণ বানানো, কোনো বাস্তব তথ্য নয়।',
  'stats.yours': 'আপনার রেকর্ড (এই ডিভাইসে)',
  'stats.games': 'খেলা হয়েছে',
  'stats.best': 'সেরা স্কোর',
  'stats.collisions': 'মোট সংঘর্ষ',
  'stats.distance': 'মোট দূরত্ব',
  'stats.damage': 'জাতীয় ক্ষতি (গেমে)',
  'stats.time': 'মোট সময়',
  'stats.city': 'কাল্পনিক শহর-কাউন্টার',
  'stats.jamMinutes': 'কল্পিত জ্যাম-মিনিট আজ',
  'stats.potholes': 'গোপন সুইমিং পুল আবিষ্কৃত',
  'stats.honks': 'অকারণ হর্ন বাজানো',
  'stats.teaCups': 'জ্যামে ঢালা চা (কাপ)',

  'news.title': 'আজকের ট্র্যাফিক খবর',
  'news.note': 'প্রতিটি শিরোনাম গেমের ভেতরে তৈরি কাল্পনিক ব্যঙ্গ। এগুলো বাস্তব সংবাদ নয়।',
  'news.refresh': 'নতুন শিরোনাম',
  'news.fictionalTag': 'কাল্পনিক',

  'board.title': 'মোস্ট ওয়ান্টেড ড্রাইভার',
  'board.note': 'স্কোর শুধু আপনার ব্রাউজারে সংরক্ষিত হয় (লোকাল লিডারবোর্ড)। "কাল্পনিক" চিহ্নিত চালকরা গেমের বানানো চরিত্র।',
  'board.rank': 'র‍্যাংক',
  'board.driver': 'চালক',
  'board.score': 'স্কোর',
  'board.distance': 'দূরত্ব',
  'board.collisions': 'সংঘর্ষ',
  'board.fictionalBadge': 'কাল্পনিক',
  'board.you': 'আপনি',
  'board.clear': 'লোকাল স্কোর মুছুন',
  'board.clearConfirm': 'এই ডিভাইসের সব সংরক্ষিত স্কোর মুছে ফেলবেন?',
  'board.empty': 'এখনও কোনো স্কোর জমা হয়নি। খেলুন আর নাম লেখান!',
  'board.nick': 'আপনার ডাকনাম',
  'board.nickHelp': 'সর্বোচ্চ ১৬ অক্ষর। খেলা শেষে "স্কোর জমা দিন" চাপলে এই নামে তালিকায় উঠবে।',
  'board.offlineNote': 'গ্লোবাল লিডারবোর্ড এই সংস্করণে নেই — স্কোর শুধু এই ডিভাইসে।',

  'nl.title': 'নিউজলেটার',
  'nl.desc': 'নতুন লেভেল ও কাল্পনিক শিরোনামের খবর পেতে ইমেইল দিন।',
  'nl.email': 'ইমেইল ঠিকানা',
  'nl.submit': 'সাবস্ক্রাইব',
  'nl.invalid': 'সঠিক ইমেইল ঠিকানা লিখুন।',
  'nl.savedLocal': 'ইমেইল শুধু এই ডিভাইসে সংরক্ষিত হয়েছে। (সাইটে ইমেইল পাঠানোর সার্ভার সংযুক্ত নেই।)',
  'nl.sent': 'ধন্যবাদ! আপনার ইমেইল জমা হয়েছে।',
  'nl.error': 'জমা দেওয়া গেল না। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।',
  'nl.offline': 'আপনি অফলাইনে আছেন — অনলাইনে ফিরে আবার চেষ্টা করুন।',

  'social.title': 'সামাজিক যোগাযোগ',

  'inst.title': 'হোম স্ক্রিনে ইনস্টল করুন',
  'inst.desc': 'অ্যাপের মতো চালান — ইনস্টল ছাড়াই, অফলাইনেও গেম খেলা যাবে।',
  'inst.button': 'এখনই ইনস্টল করুন',
  'inst.installed': 'ইনস্টল হয়েছে ✓',
  'inst.android': 'অ্যান্ড্রয়েড / ক্রোম: ব্রাউজার মেনু (⋮) → "হোম স্ক্রিনে যোগ করুন" বা "অ্যাপ ইনস্টল করুন"।',
  'inst.ios': 'আইফোন / আইপ্যাড (Safari): শেয়ার বোতাম → "Add to Home Screen"।',
  'inst.desktop': 'ডেস্কটপ (Chrome/Edge): ঠিকানা বারের ডানদিকের ইনস্টল আইকনে ক্লিক করুন।',

  'offline.banner': 'আপনি অফলাইনে আছেন। গেম চলবে, কিন্তু নিউজলেটারের মতো অনলাইন সুবিধা কাজ করবে না।',
  'offline.ready': 'অফলাইনে খেলার জন্য প্রস্তুত।',

  'foot.rights': 'গেমের সব চরিত্র, ঘটনা ও পরিসংখ্যান কাল্পনিক।',
  'foot.privacy': 'গোপনীয়তা নীতি',
  'foot.disclaimer': 'দাবিত্যাগ',
  'foot.about': 'আমাদের সম্পর্কে',
  'foot.contact': 'যোগাযোগ',
  'foot.top': 'উপরে যান',
  'legal.close': 'বন্ধ করুন',
  'legal.privacy.title': 'গোপনীয়তা নীতি',
  'legal.privacy.body':
    'এই সাইট আপনার কাছ থেকে কোনো ব্যক্তিগত তথ্য সার্ভারে পাঠায় না।\n\nআপনার ডাকনাম, ভাষা/শব্দের পছন্দ, স্কোর ও পরিসংখ্যান শুধু আপনার ব্রাউজারের লোকাল স্টোরেজে থাকে। ব্রাউজারের সাইট-ডেটা মুছলে এগুলোও মুছে যায়।\n\nনিউজলেটারে ইমেইল দিলে, সার্ভার সংযুক্ত না থাকলে তা শুধু আপনার ডিভাইসে সংরক্ষিত হয়। সার্ভার সংযুক্ত করা হলে ইমেইলটি সেই সার্ভারে পাঠানো হবে এবং এই নীতি হালনাগাদ করা উচিত।\n\nসাইটে কোনো বিজ্ঞাপন বা ট্র্যাকার যুক্ত নেই।',
  'legal.disclaimer.title': 'দাবিত্যাগ',
  'legal.disclaimer.body':
    'এটি একটি ব্যঙ্গাত্মক বিনোদনমূলক গেম। এর সব ঘটনা, শিরোনাম, চালকের নাম, "জাতীয় ক্ষতি" এবং পরিসংখ্যান কাল্পনিক ও গেমের ভেতরে তৈরি।\n\nএগুলো বাস্তব ট্র্যাফিক পরিস্থিতি, বাস্তব সংবাদ, কোনো ব্যক্তি, প্রতিষ্ঠান বা কর্তৃপক্ষকে নির্দেশ করে না। বাস্তব রাস্তায় সবসময় ট্র্যাফিক আইন মেনে চলুন।\n\nএই প্রকল্প কোনো বিদ্যমান ওয়েবসাইট বা গেমের সঙ্গে সম্পর্কিত নয়; সব গ্রাফিক্স ও শব্দ কোডের মাধ্যমে তৈরি মৌলিক সৃষ্টি।',
  'legal.about.title': 'আমাদের সম্পর্কে',
  'legal.about.body':
    'ঢাকার রাস্তার হাস্যরসকে ভালোবাসা থেকে তৈরি একটি ব্রাউজার-গেম। কোনো অ্যাপ ইনস্টল ছাড়াই খেলা যায়।\n\nপ্রযুক্তি: React, TypeScript, Vite, Three.js ও Tailwind CSS। সব থ্রিডি মডেল প্রসিডিউরালি তৈরি, শব্দ WebAudio দিয়ে তৈরি, তাই কোনো তৃতীয়-পক্ষের অ্যাসেট নেই।\n\nনাম বদলাতে চাইলে src/config.ts ফাইলে GAME_NAME পরিবর্তন করুন।'
} as const;

export type Key = keyof typeof bn;

const en: Record<Key, string> = {
  'nav.play': 'Play',
  'nav.how': 'How to play',
  'nav.stats': 'Stats',
  'nav.news': 'News',
  'nav.board': 'Leaderboard',
  'nav.install': 'Install',
  'nav.menu': 'Menu',
  'nav.lang': 'বাংলা',
  'nav.langLabel': 'বাংলায় দেখুন',
  'nav.skip': 'Skip to main content',

  'common.fictional': 'Fictional · game content',

  'hero.tag': 'Satirical 3D driving game',
  'hero.desc': 'Hit Dhaka’s busy streets in an electric auto. Dodge buses, trucks, CNGs and potholes, save your charge and escape the Angry Bus — all in good fun, entirely fictional.',
  'hero.start': 'Start Driving',
  'hero.howto': 'See the rules',
  'hero.traffic.title': 'Live-looking traffic panel',
  'hero.traffic.jam': 'Jam level',
  'hero.traffic.speed': 'Average speed',
  'hero.traffic.mood': 'Horn mood',
  'hero.traffic.note': 'The numbers on this panel are entirely fictional and do not describe real traffic.',
  'hero.mood.calm': 'Calm (pretend)',
  'hero.mood.angry': 'Furious',
  'hero.mood.chaos': 'Full chaos',

  'stage.loading': 'Loading the game…',
  'stage.error': 'Could not start the 3D game. Please check that your browser supports WebGL.',
  'stage.retry': 'Try again',
  'stage.nickname': 'Nickname',
  'stage.nickPlaceholder': 'e.g. Jam Emperor',
  'stage.start': 'Start Driving',
  'stage.pause': 'Pause',
  'stage.resume': 'Resume',
  'stage.restart': 'Restart',
  'stage.menu': 'Back to menu',
  'stage.paused': 'Paused',
  'stage.soundOn': 'Sound on',
  'stage.soundOff': 'Sound off',
  'stage.quality': 'Graphics',
  'stage.qualityLow': 'Low',
  'stage.qualityHigh': 'High',
  'stage.fullscreen': 'Expand',
  'stage.exitFullscreen': 'Shrink',
  'stage.preview': 'Live preview — autopilot running',
  'stage.label': 'Game area',

  'hud.score': 'Score',
  'hud.distance': 'Distance',
  'hud.time': 'Time',
  'hud.damage': 'National loss',
  'hud.battery': 'Battery',
  'hud.speed': 'Speed',
  'hud.kmh': 'km/h',
  'hud.pursuit': 'Angry Bus',
  'hud.level': 'Level',
  'hud.shield': 'Shield',
  'hud.boost': 'Boost',
  'hud.ready': 'Ready',

  'res.title': 'Ride over!',
  'res.reasonBattery': 'The battery ran out',
  'res.reasonCaught': 'The Angry Bus caught you',
  'res.player': 'Driver',
  'res.score': 'Total score',
  'res.distance': 'Distance',
  'res.collisions': 'Collisions',
  'res.battery': 'Battery left',
  'res.time': 'Survival time',
  'res.damage': 'National loss (fictional)',
  'res.submit': 'Submit score',
  'res.submitted': 'Submitted ✓',
  'res.again': 'Play again',
  'res.newBest': 'New personal best!',
  'res.headlineLabel': 'Today’s fictional headline',
  'res.anon': 'Unknown driver',

  'ctl.title': 'How to play',
  'ctl.sub': 'Keyboard or touch — whichever you like. Save your battery, avoid the Angry Bus, and keep crashes low.',
  'ctl.accel': 'Accelerate',
  'ctl.brake': 'Brake',
  'ctl.left': 'Steer left',
  'ctl.right': 'Steer right',
  'ctl.boost': 'Boost',
  'ctl.special': 'Jugaad Shield',
  'ctl.horn': 'Horn',
  'ctl.mute': 'Sound on/off',
  'ctl.pause': 'Pause / resume',
  'ctl.keysTitle': 'Keyboard',
  'ctl.touchTitle': 'Mobile / touch',
  'ctl.touchDesc': 'Use the large on-screen buttons: left/right steering, accelerator, brake, boost, horn and shield. Several buttons can be pressed at once.',
  'ctl.rulesTitle': 'Rules of the road',
  'ctl.rule1': 'The battery keeps draining — collect ⚡ charges and use boost sparingly.',
  'ctl.rule2': 'Crashes cost battery, speed and your lead over the bus.',
  'ctl.rule3': 'The Angry Bus is chasing you — keep your speed up or you are caught!',
  'ctl.rule4': 'The jam grows over time. Thin escapes earn bonus points.',
  'ctl.rule5': 'The horn can nudge slow cars ahead into another lane (not always).',
  'ctl.rule6': 'The Jugaad Shield protects you briefly but costs battery.',

  'stats.title': 'Stats & counters',
  'stats.note': '"Your record" is real game data saved on this device. "Fictional city counters" are completely made up, not real-world data.',
  'stats.yours': 'Your record (on this device)',
  'stats.games': 'Games played',
  'stats.best': 'Best score',
  'stats.collisions': 'Total collisions',
  'stats.distance': 'Total distance',
  'stats.damage': 'National loss (in-game)',
  'stats.time': 'Total time',
  'stats.city': 'Fictional city counters',
  'stats.jamMinutes': 'Imaginary jam-minutes today',
  'stats.potholes': 'Secret swimming pools discovered',
  'stats.honks': 'Pointless honks',
  'stats.teaCups': 'Tea poured during jams (cups)',

  'news.title': 'Today’s traffic news',
  'news.note': 'Every headline is fictional satire generated inside the game. None of it is real news.',
  'news.refresh': 'New headlines',
  'news.fictionalTag': 'Fictional',

  'board.title': 'Most Wanted Drivers',
  'board.note': 'Scores are stored only in your browser (local leaderboard). Drivers marked "Fictional" are made-up game characters.',
  'board.rank': 'Rank',
  'board.driver': 'Driver',
  'board.score': 'Score',
  'board.distance': 'Distance',
  'board.collisions': 'Crashes',
  'board.fictionalBadge': 'Fictional',
  'board.you': 'You',
  'board.clear': 'Clear local scores',
  'board.clearConfirm': 'Delete all scores saved on this device?',
  'board.empty': 'No scores yet. Play and get your name up here!',
  'board.nick': 'Your nickname',
  'board.nickHelp': 'Up to 16 characters. When you press "Submit score" after a run, it is listed under this name.',
  'board.offlineNote': 'There is no global leaderboard in this version — scores stay on this device.',

  'nl.title': 'Newsletter',
  'nl.desc': 'Leave your email for news about new levels and fictional headlines.',
  'nl.email': 'Email address',
  'nl.submit': 'Subscribe',
  'nl.invalid': 'Please enter a valid email address.',
  'nl.savedLocal': 'Your email was saved on this device only. (No email server is connected to this site.)',
  'nl.sent': 'Thank you! Your email has been submitted.',
  'nl.error': 'Could not submit. Check your connection and try again.',
  'nl.offline': 'You are offline — please try again once you are back online.',

  'social.title': 'Social',

  'inst.title': 'Install to your home screen',
  'inst.desc': 'Run it like an app — no store needed, and the game also works offline.',
  'inst.button': 'Install now',
  'inst.installed': 'Installed ✓',
  'inst.android': 'Android / Chrome: browser menu (⋮) → "Add to Home screen" or "Install app".',
  'inst.ios': 'iPhone / iPad (Safari): Share button → "Add to Home Screen".',
  'inst.desktop': 'Desktop (Chrome/Edge): click the install icon at the right of the address bar.',

  'offline.banner': 'You are offline. The game still works, but online features like the newsletter will not.',
  'offline.ready': 'Ready to play offline.',

  'foot.rights': 'All characters, events and statistics in the game are fictional.',
  'foot.privacy': 'Privacy policy',
  'foot.disclaimer': 'Disclaimer',
  'foot.about': 'About',
  'foot.contact': 'Contact',
  'foot.top': 'Back to top',
  'legal.close': 'Close',
  'legal.privacy.title': 'Privacy policy',
  'legal.privacy.body':
    'This site does not send any personal data from you to a server.\n\nYour nickname, language and sound choices, scores and statistics live only in your browser’s local storage. Clearing the site data in your browser removes them.\n\nIf you enter an email for the newsletter and no server is connected, it is saved on your device only. If a server is connected, the email will be sent to it and this policy should be updated.\n\nThe site contains no ads and no trackers.',
  'legal.disclaimer.title': 'Disclaimer',
  'legal.disclaimer.body':
    'This is a satirical entertainment game. Every event, headline, driver name, "national loss" figure and statistic is fictional and generated inside the game.\n\nNone of it describes real traffic conditions, real news, or any person, organisation or authority. On real roads, always follow traffic laws.\n\nThis project is not affiliated with any existing website or game; all graphics and sounds are original and created in code.',
  'legal.about.title': 'About',
  'legal.about.body':
    'A browser game made out of affection for the humour of Dhaka’s streets. Play it with no app install.\n\nBuilt with React, TypeScript, Vite, Three.js and Tailwind CSS. All 3D models are procedural and all sounds are synthesised with WebAudio, so there are no third-party assets.\n\nTo rename the game, change GAME_NAME in src/config.ts.'
};

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
  gameName: string;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const prefs = useStore(prefsStore);
  const lang = prefs.lang;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `${GAME_NAME[lang]} · ${lang === 'bn' ? 'ব্যঙ্গাত্মক ড্রাইভিং গেম' : 'Satirical driving game'}`;
  }, [lang]);

  const t = useCallback((k: Key) => (lang === 'bn' ? bn[k] : en[k]), [lang]);
  const value = useMemo<LangCtx>(() => ({ lang, setLang: (l) => patchPrefs({ lang: l }), t, gameName: GAME_NAME[lang] }), [lang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLang must be used inside <LangProvider>');
  return v;
}
