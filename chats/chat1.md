# Clearly: Parent communication hub

_Started 2026-07-30 01:04 UTC_

---

## User

Design a mobile app concept called "Clearly" — a personal life communication hub for busy parents.
The core problem it solves: modern parents are members of too many single-purpose communication apps simultaneously — school apps, sports clubs, medical portals, community groups — each demanding attention independently. The result is notification overload, disengagement, and missed important information. Clearly aggregates these channels, filters the noise, and surfaces only what requires attention or has a date attached.
Design the following screens:
Screen one — the home dashboard. This is the daily view. It should feel calm, not overwhelming. Show a prioritised summary of today and the next 7 days across all connected channels. Use a clear visual hierarchy that separates "action required" items from "for your awareness" items. Include a gentle indicator of what has been read versus unread. The tone should feel like a trusted personal assistant, not another notification source.
Screen two — the channel connections screen. Show 6 to 8 connected app tiles including Seesaw, QKR, a sports club app, a medical portal, a body corporate app, and a community group. Each tile shows connection status, last synced time, and a mute or priority toggle. Include space for an "add new channel" button.
Screen three — a single item detail view. Show what a summarised communication looks like after Clearline has processed it. The original message is collapsed. Above it sits an AI-generated two sentence summary. If there is a date or action required, it is pulled out and highlighted separately with a one tap option to add to calendar.
Screen four — the weekly digest view. A simple, scannable summary of everything across all channels for the coming week. Organised by day, not by channel. The visual priority is dates and deadlines, not which app it came from.
Design language: clean, minimal, and warm. Not clinical. Think somewhere between the calm of Headspace and the utility of Fantastical. Use a muted colour palette with one accent colour for action items. Rounded corners, generous white space, readable typography. Designed for someone who opens this app first thing in the morning and needs to feel oriented, not anxious.
The name Clearly should appear in the interface. The tagline is: "Everything that matters. Nothing that doesn't."
Make it feel like a real product a busy parent would actually pay for.

## Assistant

_[tool: questions_v2]_

## User

Questions answered:
- navigation: Decide for me
- interactivity: Clickable prototype — tap through real flows (mark read/unread, mute toggles, add to calendar, navigate between screens)
- channels: Seesaw (school), QKR (school payments), Community group (e.g. WhatsApp/Facebook group)
- item_example: A school note requiring action (e.g. permission slip / RSVP by date)
- digest_structure: Day split into 'Action required' vs 'FYI' sub-sections
- read_unread: Unread items have a subtle tint/highlight, read items fade back
- tone_depth: Rich realistic content (named kids, named schools/clubs, real-feeling dates)
- device_frame: Inside a phone/device frame (iOS style)
- extra_screens: Decide for me

## Assistant

_[tool: copy_starter_component]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

Built Clearly as a single interactive DC with an iOS device frame — Home dashboard, Digest, Channels, and item Detail screens, fully clickable (tab nav, mark-read on open, add-to-calendar toggle, mute/priority toggles, expand original message). Warm neutral palette with terracotta accent for action items, Sora/Figtree type pairing. Out for verification now.

## User

Found issues — fixing…

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Fixed — replaced the compound `&&`/`!` expressions in sc-if with precomputed `showHome`/`showDigest`/`showChannels` booleans. Back out for verification.

## User

Add tweakable controls to Clearly.dc.html (declare with dc_set_props, read via this.props): Add a calendar function or ability to show the upcoming appointments or things of note on a linked outlook or gmail

## Assistant

_[tool: dc_set_props]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now add the banner markup on Home (after header, above action list) and a matching note on Digest.

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Added a "Calendar sync" tweak (None / Google Calendar / Outlook) — shows a synced-events banner on Home and updates the detail view's Add-to-Calendar button/label to match the linked provider.

## User

Add the ability to look at the digest page in a calendar view either daily, weekly, work weekly, monthly or yearly

## User

Found issues — fixing…

## User

Found issues — fixing…

## Assistant

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Fixed — `showDigest` was self-referenced inside its own object literal, throwing before render. Now computed as a local variable first. Re-verifying.

